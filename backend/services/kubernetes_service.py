"""Kubernetes service for managing session pods"""

import asyncio
import base64
import io
import logging
import os
import tarfile
import tempfile
from typing import Any, Dict, Optional

from fastapi import UploadFile
from google.auth import default as auth
from google.auth.transport import requests as auth_requests
from google.cloud import container_v1
from kubernetes import client, stream
from kubernetes.client.rest import ApiException

from config import environment

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
            cls._instance.networking_v1_api = None

            cls._instance._temp_files = []
            cls._instance._ssl_ca_cert = None

            cls._instance._configure_kubernetes_client()
        return cls._instance

    def __init__(self):
        """Constructor that's safe to call multiple times"""
        # No initialization here since it's done in __new__
        pass

    def _configure_kubernetes_client(self):
        """
        Configure the Kubernetes client for GKE access.
        """
        try:
            # Create GKE client
            self.gke_client = container_v1.ClusterManagerClient()

            # Get credentials with proper scopes
            SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
            self.credentials, _ = auth(scopes=SCOPES)

            # Load Kubernetes configuration
            self._configure_gke()

            # Create Kubernetes API clients
            self.core_v1_api = client.CoreV1Api()
            self.networking_v1_api = client.NetworkingV1Api()

            logger.info("Kubernetes client initialized successfully for GKE")

        except Exception as e:
            logger.error(f"Failed to initialize Kubernetes client: {e}")
            raise

    def _configure_gke(self):
        """Configure authentication for GKE when running in Cloud Run."""
        # Get cluster info
        cluster_path = (
            f"projects/{environment.PROJECT_ID}/locations/{environment.REGION}/clusters/{environment.CLUSTER_NAME}"
        )
        cluster = self.gke_client.get_cluster(name=cluster_path)

        # Use internal IP in Cloud Run, public endpoint locally
        if environment.ENVIRONMENT in ["production", "staging"]:
            endpoint = cluster.private_cluster_config.private_endpoint or cluster.endpoint
        else:
            endpoint = cluster.endpoint

        # Configure kubernetes client with auto-refreshing credentials
        configuration = client.Configuration()
        configuration.host = f"https://{endpoint}"

        # Configure SSL verification
        if cluster.master_auth and cluster.master_auth.cluster_ca_certificate:
            ca_cert_b64 = cluster.master_auth.cluster_ca_certificate
            ca_cert_bytes = base64.b64decode(ca_cert_b64)

            # Create a temporary file to store the CA certificate
            temp_ca_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pem", mode="wb")
            temp_ca_file.write(ca_cert_bytes)
            temp_ca_file.close()
            self._temp_files.append(temp_ca_file.name)

            self._ssl_ca_cert = temp_ca_file.name
            configuration.ssl_ca_cert = self._ssl_ca_cert
            configuration.verify_ssl = True

            logger.debug("Configured Kubernetes client with SSL verification using CA cert")
        else:
            logger.warning(
                "Cluster CA certificate not found. Disabling SSL verification for Kubernetes client. "
                "This is insecure and should be addressed."
            )
            configuration.verify_ssl = False

        # Define token refresh function as local function to avoid serialization issues
        def refresh_token(conf):
            logger.debug("Refreshing GKE API token...")
            auth_req = auth_requests.Request()
            self.credentials.refresh(auth_req)
            token = self.credentials.token
            conf.api_key = {"authorization": "Bearer " + token}
            logger.debug("GKE API token refreshed successfully")

        # Set up configuration with refresh hook
        configuration.refresh_api_key_hook = refresh_token
        refresh_token(configuration)  # Initial token setup
        client.Configuration.set_default(configuration)

    def is_available(self) -> bool:
        """Check if Kubernetes client is available"""
        return self.core_v1_api is not None

    def _get_pod_template(self, pod_name: str, session_id: str, user_id: str, user_email: str = None) -> Dict[str, Any]:
        """Get the pod template for a session"""

        # Build environment variables - USER_ID is required
        env_vars = [
            {"name": "TERM", "value": "xterm-256color"},
            {"name": "SESSION_ID", "value": session_id},
            {"name": "PROJECT_ID", "value": environment.PROJECT_ID},
            {"name": "USER_ID", "value": user_id},
        ]

        # Add user email if provided
        if user_email:
            env_vars.append({"name": "USER_EMAIL", "value": user_email})

        # Construct session image URL from registry configuration
        registry_base = f"{environment.REGISTRY_REGION}-docker.pkg.dev"
        registry_path = f"{environment.REGISTRY_PROJECT_ID}/{environment.REGISTRY_REPOSITORY_NAME}"
        session_image = f"{registry_base}/{registry_path}/{environment.SESSION_IMAGE_NAME}:latest"

        return {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {
                "name": pod_name,
                "namespace": "default",
                "labels": {"app": "cloud-shell", "session-id": session_id},
            },
            "spec": {
                "serviceAccountName": "session-ksa",
                "containers": [
                    {
                        "name": "shell",
                        "image": session_image,
                        "command": ["/usr/local/bin/start-session.sh"],
                        "stdin": True,
                        "tty": True,
                        "resources": {
                            "requests": {"memory": "512Mi", "cpu": "250m"},
                            "limits": {"memory": "1Gi", "cpu": "500m"},
                        },
                        "env": env_vars,
                    }
                ],
                "restartPolicy": "Never",
                "terminationGracePeriodSeconds": 30,
            },
        }

    async def create_session_pod(
        self, pod_name: str, session_id: str, user_id: str, user_email: str = None, namespace: str = "default"
    ) -> bool:
        """Create a new pod for the session"""
        try:
            # Get pod template
            pod_manifest = self._get_pod_template(pod_name, session_id, user_id, user_email)

            # Create the pod
            resp = self.core_v1_api.create_namespaced_pod(namespace=namespace, body=pod_manifest)

            logger.info(f"Created pod {resp.metadata.name} for session {session_id}")
            return True

        except ApiException as e:
            logger.error(f"Failed to create pod for session {session_id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error creating pod for session {session_id}: {e}")
            return False

    async def delete_session_pod(self, pod_name: str, namespace: str = "default") -> bool:
        """Delete pod for the session"""
        try:
            self.core_v1_api.delete_namespaced_pod(name=pod_name, namespace=namespace)

            logger.info(f"Deleted pod {pod_name}")
            return True

        except ApiException as e:
            if e.status == 404:
                logger.info(f"Pod {pod_name} not found, already deleted")
                return True
            logger.error(f"Failed to delete pod {pod_name}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting pod {pod_name}: {e}")
            return False

    async def get_pod_status(self, pod_name: str, namespace: str = "default") -> Optional[str]:
        """Get the current status of the pod"""
        try:
            pod = self.core_v1_api.read_namespaced_pod(name=pod_name, namespace=namespace)

            return pod.status.phase

        except ApiException as e:
            if e.status == 404:
                logger.debug(f"Pod {pod_name} not found")
                return None
            logger.error(f"Failed to get pod status for {pod_name}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting pod status for {pod_name}: {e}")
            return None

    async def wait_for_pod_ready(self, pod_name: str, namespace: str = "default", timeout: int = 60) -> bool:
        """Wait for pod to be ready"""
        for _ in range(timeout):
            try:
                pod = self.core_v1_api.read_namespaced_pod(name=pod_name, namespace=namespace)

                if pod.status.phase == "Running":
                    # Check if all containers are ready
                    if pod.status.container_statuses:
                        all_ready = all(container.ready for container in pod.status.container_statuses)
                        if all_ready:
                            logger.info(f"Pod {pod_name} is ready")
                            return True

                await asyncio.sleep(1)

            except ApiException as e:
                if e.status == 404:
                    logger.debug(f"Pod {pod_name} not found while waiting for ready")
                    await asyncio.sleep(1)
                    continue
                logger.error(f"Error checking pod readiness for {pod_name}: {e}")
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Unexpected error checking pod readiness for {pod_name}: {e}")
                await asyncio.sleep(1)

        logger.warning(f"Pod {pod_name} did not become ready within {timeout} seconds")
        return False

    def create_exec_stream(self, pod_name: str, namespace: str = "default"):
        """Create an exec stream to the pod's shell"""
        # Command to attach to or create tmux session
        exec_command = [
            "/bin/zsh",
            "-c",
            "if tmux has-session -t main 2>/dev/null; then tmux attach-session -t main; else tmux new-session -s main; fi",
        ]

        try:
            resp = stream.stream(
                self.core_v1_api.connect_get_namespaced_pod_exec,
                pod_name,
                namespace,
                container="shell",
                command=exec_command,
                stderr=True,
                stdin=True,
                stdout=True,
                tty=True,
                _preload_content=False,
            )

            logger.info(f"Created exec stream for pod {pod_name}")
            return resp

        except ApiException as e:
            logger.error(f"Failed to create exec stream for pod {pod_name}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating exec stream for pod {pod_name}: {e}")
            raise

    async def copy_file_to_pod(self, pod_name: str, namespace: str, file: UploadFile, target_path: str):
        """
        Copy a file to a pod using tar stream

        Args:
            pod_name: Name of the pod
            namespace: Kubernetes namespace
            file: File to upload (UploadFile object)
            target_path: Target directory path in the pod
        """
        try:
            logger.info(f"Copying file {file.filename} to pod {pod_name} at {target_path}")

            # Read file content
            file_content = await file.read()

            # Create a tar archive in memory
            tar_buffer = io.BytesIO()
            with tarfile.open(fileobj=tar_buffer, mode="w") as tar:
                # Create tarinfo for the file
                tarinfo = tarfile.TarInfo(name=file.filename)
                tarinfo.size = len(file_content)
                tarinfo.mode = 0o644  # readable by owner and group

                # Add file to tar
                tar.addfile(tarinfo, io.BytesIO(file_content))

            # Reset buffer position
            tar_buffer.seek(0)

            # Create exec command to extract tar in target directory
            exec_command = ["/bin/sh", "-c", f"mkdir -p {target_path} && cd {target_path} && tar -xf -"]

            # Execute command with tar stream as stdin
            exec_stream = stream.stream(
                self.core_v1_api.connect_get_namespaced_pod_exec,
                pod_name,
                namespace,
                container="shell",
                command=exec_command,
                stderr=True,
                stdin=True,
                stdout=True,
                tty=False,
                _preload_content=False,
            )

            # Send tar data to stdin
            tar_data = tar_buffer.read()
            exec_stream.write_stdin(tar_data)
            exec_stream.close()

            logger.info(f"Successfully copied {file.filename} to pod {pod_name}")

        except ApiException as e:
            logger.error(f"Failed to copy file to pod {pod_name}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error copying file to pod {pod_name}: {e}")
            raise

    def cleanup(self):
        """Clean up temporary files created during initialization"""
        for temp_file in self._temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    logger.debug(f"Cleaned up temporary file: {temp_file}")
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file {temp_file}: {e}")

        self._temp_files.clear()
        self._ssl_ca_cert = None

    def __del__(self):
        """Destructor to ensure cleanup of temporary files"""
        if hasattr(self, "_temp_files"):
            self.cleanup()
