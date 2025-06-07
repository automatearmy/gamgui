"""Kubernetes service for managing session pods"""

import asyncio
import logging
from typing import Any, Dict, Optional
import uuid

from kubernetes import client, config
from kubernetes.client.rest import ApiException

from config import environment
from schemas.common import SessionStatus

logger = logging.getLogger(__name__)


class KubernetesService:
    """Service for managing Kubernetes pods for sessions"""

    # Class variable to store the singleton instance
    _instance = None

    def __new__(cls):
        """Singleton pattern implementation"""
        if cls._instance is None:
            logger.info("Creating new KubernetesService instance")
            cls._instance = super(KubernetesService, cls).__new__(cls)
            cls._instance.core_v1_api = None
            cls._instance._initialize_client()
        return cls._instance

    def __init__(self):
        """Constructor that's safe to call multiple times"""
        # No initialization here since it's done in __new__
        pass

    def _initialize_client(self) -> None:
        """Initialize Kubernetes client"""
        try:
            config.load_kube_config()
            logger.info("Loaded kubeconfig configuration")

            self.core_v1_api = client.CoreV1Api()
            logger.info("Kubernetes client initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Kubernetes client: {e}")
            raise

    def _generate_pod_name(self, session_id: str) -> str:
        """Generate a unique pod name for the session"""
        # Take first 8 characters of session ID for brevity
        short_id = session_id.replace("sess_", "")[:8]
        return f"gam-session-{short_id}"

    def _sanitize_label_value(self, value: str) -> str:
        """Sanitize a value to be a valid Kubernetes label"""
        import re

        # Replace invalid characters with hyphens
        sanitized = re.sub(r"[^a-zA-Z0-9\-_.]", "-", value)
        # Ensure it starts and ends with alphanumeric
        sanitized = re.sub(r"^[^a-zA-Z0-9]+", "", sanitized)
        sanitized = re.sub(r"[^a-zA-Z0-9]+$", "", sanitized)
        # Limit length to 63 characters (Kubernetes limit)
        return sanitized[:63] if sanitized else "unknown"

    def _create_pod_spec(self, session_id: str, user_id: str) -> client.V1Pod:
        """Create pod specification for session worker"""
        pod_name = self._generate_pod_name(session_id)

        # Environment variables for the session worker
        env_vars = [
            client.V1EnvVar(name="PROJECT_ID", value=environment.PROJECT_ID),
            client.V1EnvVar(name="REGION", value=environment.REGION),
            client.V1EnvVar(name="ENVIRONMENT", value=environment.ENVIRONMENT),
            client.V1EnvVar(name="SESSION_ID", value=session_id),
            client.V1EnvVar(name="PORT", value=str(environment.SESSION_DEFAULT_PORT)),
            client.V1EnvVar(name="JWT_SECRET", value=environment.JWT_SECRET),
            client.V1EnvVar(name="LOG_LEVEL", value=environment.LOG_LEVEL),
        ]

        # Container specification
        container = client.V1Container(
            name="session-manager",
            image="lamonlopes/nodejs-terminal-app:0.0.5",
            image_pull_policy=environment.SESSION_IMAGE_PULL_POLICY,
            ports=[client.V1ContainerPort(container_port=environment.SESSION_DEFAULT_PORT)],
            env=env_vars,
            resources=client.V1ResourceRequirements(
                requests={"cpu": environment.SESSION_CPU_REQUEST, "memory": environment.SESSION_MEMORY_REQUEST},
                limits={"cpu": environment.SESSION_CPU_LIMIT, "memory": environment.SESSION_MEMORY_LIMIT},
            ),
        )

        # Pod specification
        pod_spec = client.V1PodSpec(
            containers=[container],
            restart_policy="Never",
            tolerations=[client.V1Toleration(key="session-node", operator="Equal", value="true", effect="NoSchedule")],
        )

        # Pod metadata with labels
        pod_metadata = client.V1ObjectMeta(
            name=pod_name,
            namespace="default",
            labels={
                "app": "gam-session-worker",
                "session-id": session_id,
                "user-id": self._sanitize_label_value(user_id),
                "managed-by": "gamgui-server",
            },
        )

        return client.V1Pod(api_version="v1", kind="Pod", metadata=pod_metadata, spec=pod_spec)

    async def create_session_pod(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Create a new session pod and load balancer service"""
        try:
            pod_spec = self._create_pod_spec(session_id, user_id)

            # Create the pod
            pod = self.core_v1_api.create_namespaced_pod(namespace="default", body=pod_spec)

            logger.info(f"Created pod {pod.metadata.name} for session {session_id}")

            # Create LoadBalancer service for the pod
            service_info = await self._create_load_balancer_service(session_id, pod.metadata.name)

            # Wait for pod to be ready
            await self._wait_for_pod_ready(pod.metadata.name)

            # Wait for load balancer to get external IP
            external_ip = await self._wait_for_load_balancer_ip(service_info["service_name"])

            return {
                "pod_name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "creation_timestamp": pod.metadata.creation_timestamp,
                "status": "running",
                "service_name": service_info["service_name"],
                "external_ip": external_ip,
                "external_port": 8080,
            }

        except ApiException as e:
            logger.error(f"Failed to create pod for session {session_id}: {e}")
            raise Exception(f"Kubernetes API error: {e.reason}")
        except Exception as e:
            logger.error(f"Unexpected error creating pod for session {session_id}: {e}")
            raise

    async def get_pod_status(self, session_id: str) -> Dict[str, Any]:
        """Get status of a session pod"""
        try:
            pod_name = self._generate_pod_name(session_id)

            pod = self.core_v1_api.read_namespaced_pod(name=pod_name, namespace="default")

            # Determine pod status
            pod_phase = pod.status.phase
            pod_ip = pod.status.pod_ip

            # Map Kubernetes phases to our session status
            status_mapping = {
                "Pending": SessionStatus.CREATING,
                "Running": SessionStatus.RUNNING,
                "Succeeded": SessionStatus.STOPPED,
                "Failed": SessionStatus.ERROR,
                "Unknown": SessionStatus.ERROR,
            }

            session_status = status_mapping.get(pod_phase, SessionStatus.ERROR)

            return {
                "pod_name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "status": session_status,
                "pod_ip": pod_ip,
                "phase": pod_phase,
                "creation_timestamp": pod.metadata.creation_timestamp,
                "conditions": pod.status.conditions or [],
            }

        except ApiException as e:
            if e.status == 404:
                logger.warning(f"Pod not found for session {session_id}")
                return {"status": SessionStatus.STOPPED, "message": "Pod not found"}
            else:
                logger.error(f"Failed to get pod status for session {session_id}: {e}")
                raise Exception(f"Kubernetes API error: {e.reason}")
        except Exception as e:
            logger.error(f"Unexpected error getting pod status for session {session_id}: {e}")
            raise

    async def delete_session_pod(self, session_id: str) -> bool:
        """Delete a session pod"""
        try:
            pod_name = self._generate_pod_name(session_id)

            # Delete the pod
            self.core_v1_api.delete_namespaced_pod(name=pod_name, namespace="default", body=client.V1DeleteOptions())

            logger.info(f"Deleted pod {pod_name} for session {session_id}")
            return True

        except ApiException as e:
            if e.status == 404:
                logger.warning(f"Pod {pod_name} not found for session {session_id}")
                return True  # Already deleted
            else:
                logger.error(f"Failed to delete pod for session {session_id}: {e}")
                raise Exception(f"Kubernetes API error: {e.reason}")
        except Exception as e:
            logger.error(f"Unexpected error deleting pod for session {session_id}: {e}")
            raise

    async def list_session_pods(self, user_id: Optional[str] = None) -> list[Dict[str, Any]]:
        """List all session pods, optionally filtered by user"""
        try:
            # Build label selector
            label_selector = "app=gam-session-worker"
            if user_id:
                label_selector += f",user-id={user_id}"

            pods = self.core_v1_api.list_namespaced_pod(namespace="default", label_selector=label_selector)

            pod_list = []
            for pod in pods.items:
                labels = pod.metadata.labels or {}
                session_id = labels.get("session-id", "unknown")

                pod_info = {
                    "pod_name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "session_id": session_id,
                    "user_id": labels.get("user-id", "unknown"),
                    "status": pod.status.phase,
                    "pod_ip": pod.status.pod_ip,
                    "creation_timestamp": pod.metadata.creation_timestamp,
                }
                pod_list.append(pod_info)

            return pod_list

        except ApiException as e:
            logger.error(f"Failed to list session pods: {e}")
            raise Exception(f"Kubernetes API error: {e.reason}")
        except Exception as e:
            logger.error(f"Unexpected error listing session pods: {e}")
            raise

    async def _create_load_balancer_service(self, session_id: str, pod_name: str) -> Dict[str, Any]:
        """Create a LoadBalancer service for the session pod"""
        service_name = f"{pod_name}-{uuid.uuid4().hex[:5]}"

        service_spec = client.V1Service(
            api_version="v1",
            kind="Service",
            metadata=client.V1ObjectMeta(
                name=service_name,
                namespace="default",
                labels={"app": "gam-session-worker", "session-id": session_id, "managed-by": "gamgui-session-api"},
            ),
            spec=client.V1ServiceSpec(
                type="LoadBalancer",
                selector={"session-id": session_id},
                ports=[
                    client.V1ServicePort(
                        port=environment.SESSION_DEFAULT_PORT,
                        target_port=environment.SESSION_DEFAULT_PORT,
                        protocol="TCP",
                    )
                ],
            ),
        )

        service = self.core_v1_api.create_namespaced_service(namespace="default", body=service_spec)

        logger.info(f"Created LoadBalancer service {service_name} for session {session_id}")

        return {"service_name": service_name, "creation_timestamp": service.metadata.creation_timestamp}

    async def _wait_for_pod_ready(self, pod_name: str, timeout_seconds: int = 300) -> None:
        """Wait for pod to be ready"""
        logger.info(f"Waiting for pod {pod_name} to be ready...")

        for _ in range(timeout_seconds):
            try:
                pod = self.core_v1_api.read_namespaced_pod(name=pod_name, namespace="default")

                if pod.status.phase == "Running" and pod.status.conditions:
                    for condition in pod.status.conditions:
                        if condition.type == "Ready" and condition.status == "True":
                            logger.info(f"Pod {pod_name} is ready")
                            return

                await asyncio.sleep(1)

            except Exception as e:
                logger.warning(f"Error checking pod status: {e}")
                await asyncio.sleep(1)

        raise Exception(f"Pod {pod_name} did not become ready within {timeout_seconds} seconds")

    async def _wait_for_load_balancer_ip(self, service_name: str, timeout_seconds: int = 300) -> str:
        """Wait for LoadBalancer service to get external IP"""
        logger.info(f"Waiting for LoadBalancer service {service_name} to get external IP...")

        for _ in range(timeout_seconds):
            try:
                service = self.core_v1_api.read_namespaced_service(name=service_name, namespace="default")

                if service.status.load_balancer and service.status.load_balancer.ingress:
                    for ingress in service.status.load_balancer.ingress:
                        if ingress.ip:
                            logger.info(f"LoadBalancer service {service_name} got external IP: {ingress.ip}")
                            return ingress.ip
                        elif ingress.hostname:
                            logger.info(f"LoadBalancer service {service_name} got hostname: {ingress.hostname}")
                            return ingress.hostname

                await asyncio.sleep(1)

            except Exception as e:
                logger.warning(f"Error checking service status: {e}")
                await asyncio.sleep(1)

        raise Exception(f"LoadBalancer service {service_name} did not get external IP within {timeout_seconds} seconds")

    async def delete_session_service(self, session_id: str) -> bool:
        """Delete LoadBalancer service for session"""
        try:
            # Find service by session-id label
            services = self.core_v1_api.list_namespaced_service(
                namespace="default", label_selector=f"session-id={session_id}"
            )

            for service in services.items:
                self.core_v1_api.delete_namespaced_service(name=service.metadata.name, namespace="default")
                logger.info(f"Deleted service {service.metadata.name} for session {session_id}")

            return True

        except ApiException as e:
            if e.status == 404:
                logger.warning(f"Service not found for session {session_id}")
                return True
            else:
                logger.error(f"Failed to delete service for session {session_id}: {e}")
                raise Exception(f"Kubernetes API error: {e.reason}")
        except Exception as e:
            logger.error(f"Unexpected error deleting service for session {session_id}: {e}")
            raise

    def is_available(self) -> bool:
        """Check if Kubernetes client is available"""
        return self.core_v1_api is not None
