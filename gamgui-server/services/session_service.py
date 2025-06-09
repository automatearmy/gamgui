"""
Session management service for GAMGUI API.
"""

from datetime import datetime, timedelta
import logging
from typing import List, Optional
import uuid

from config import environment
from errors.exceptions import APIException
from models.session_model import PodInfo, Session
from repositories.session_repository import SessionRepository
from schemas.common import SessionStatus
from schemas.session_schemas import CreateSessionRequest, SessionListItem
from services.kubernetes_service import KubernetesService

logger = logging.getLogger(__name__)


class SessionService:
    """Service for managing user sessions"""

    def __init__(self):
        self.kubernetes_service = KubernetesService()
        self.session_repository = SessionRepository()

    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return f"sess_{uuid.uuid4().hex[:12]}"

    def _calculate_expiry(self, timeout_minutes: int) -> datetime:
        """Calculate session expiry time"""
        return datetime.utcnow() + timedelta(minutes=timeout_minutes)

    async def create_session(self, user_id: str, request: CreateSessionRequest) -> Session:
        """Create a new session"""
        try:
            # Check user session limits
            db_sessions = await self.session_repository.get_by_user(user_id)
            active_sessions = [s for s in db_sessions if s.status in [SessionStatus.CREATING, SessionStatus.RUNNING]]

            if len(active_sessions) >= environment.MAX_SESSIONS_PER_USER:
                raise APIException(
                    message=f"User has reached maximum sessions limit ({environment.MAX_SESSIONS_PER_USER})",
                    error_code="SESSION_LIMIT_REACHED",
                )

            # Generate session ID and calculate expiry
            session_id = self._generate_session_id()
            timeout_minutes = request.timeout_minutes or environment.SESSION_TIMEOUT_MINUTES
            expires_at = self._calculate_expiry(timeout_minutes)

            # First, create the Kubernetes pod and service
            # This will create the actual container and networking in Kubernetes
            try:
                # Create the pod and wait for it to be ready
                k8s_pod = await self.kubernetes_service.create_session_pod(session_id=session_id, user_id=user_id)

                # Get pod details from the Kubernetes service response
                pod_name = k8s_pod["pod_name"]
                pod_namespace = k8s_pod["namespace"]
                # The websocket_url is now constructed by the kubernetes service using the ingress path
                websocket_url = k8s_pod["websocket_url"]

                # Now create the pod info for the database
                pod_info = PodInfo(
                    id=f"pod_{uuid.uuid4().hex[:8]}",
                    name=pod_name,
                    namespace=pod_namespace,
                    port=k8s_pod["external_port"],
                )

                # Create the session record in the database
                db_session = Session(
                    id=session_id,
                    user_id=user_id,
                    organization_id="default_org",  # Using default organization ID
                    name=request.name,
                    description=request.description,
                    status=SessionStatus.RUNNING,  # Already running since K8s pod is ready
                    pod_info=pod_info,
                    expires_at=expires_at,
                    last_activity_at=datetime.utcnow(),
                    websocket_url=websocket_url,
                )

                # Save to database
                await self.session_repository.create(db_session)

                logger.info(f"Created session {session_id} for user {user_id}")
                return db_session

            except Exception as e:
                logger.error(f"Failed to create Kubernetes resources for session {session_id}: {e}")
                # Clean up any Kubernetes resources that may have been created
                try:
                    await self.kubernetes_service.delete_session_pod(session_id)
                    await self.kubernetes_service.delete_session_service(session_id)
                    await self.kubernetes_service.delete_session_ingress(session_id)
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up Kubernetes resources: {cleanup_error}")

                if isinstance(e, APIException):
                    raise  # Re-raise API exceptions
                else:
                    raise APIException(
                        message="Failed to create Kubernetes resources for session",
                        error_code="SESSION_CREATION_FAILED",
                        exception=str(e),
                    )

        except APIException:
            # Re-raise APIExceptions without modification
            raise
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise APIException(
                message="Failed to create session",
                error_code="SESSION_CREATION_FAILED",
                exception=str(e),
            )

    async def get_session(self, session_id: str, user_id: Optional[str] = None) -> Optional[Session]:
        """Get session by ID"""
        try:
            # Get session from Firestore
            db_session = await self.session_repository.get_by_id(session_id)

            if not db_session:
                return None

            # Check if user has access to this session
            if user_id and db_session.user_id != user_id:
                return None

            # Update last activity timestamp
            await self.session_repository.update_last_activity(session_id)

            # Check actual pod status from Kubernetes
            try:
                pod_status = await self.kubernetes_service.get_pod_status(session_id)
                # Update session status if changed
                if db_session.status != pod_status["status"]:
                    db_session.status = pod_status["status"]
                    await self.session_repository.update_status(session_id, pod_status["status"])
            except Exception as e:
                logger.warning(f"Failed to get pod status for session {session_id}: {e}")
                # We continue anyway, using the stored status

            # Return the updated session directly
            return db_session

        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}")
            return None

    async def list_user_sessions(self, user_id: str) -> List[SessionListItem]:
        """List all sessions for a user"""
        try:
            # Get all sessions for user from Firestore
            db_sessions = await self.session_repository.get_by_user(user_id)

            session_items = []
            for db_session in db_sessions:
                session_item = SessionListItem(
                    id=db_session.id,
                    name=db_session.name,
                    status=db_session.status,
                    created_at=db_session.created_at,
                    expires_at=db_session.expires_at,
                )
                session_items.append(session_item)

            # Sort by creation time (newest first)
            session_items.sort(key=lambda s: s.created_at, reverse=True)

            return session_items

        except Exception as e:
            logger.error(f"Error listing sessions for user {user_id}: {e}")
            # Return empty list on error to avoid breaking the UI
            return []

    async def delete_session(self, session_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a session"""
        try:
            # Get session from Firestore
            db_session = await self.session_repository.get_by_id(session_id)

            if not db_session:
                return False

            # Check if user has access to this session
            if user_id and db_session.user_id != user_id:
                return False

            # Update status to stopping
            await self.session_repository.update_status(session_id, SessionStatus.STOPPING)

            try:
                # Delete Kubernetes resources
                await self.kubernetes_service.delete_session_pod(session_id)
                await self.kubernetes_service.delete_session_service(session_id)
                await self.kubernetes_service.delete_session_ingress(session_id)

                # Delete session from Firestore after successful Kubernetes cleanup
                await self.session_repository.delete(session_id)

                logger.info(f"Deleted session {session_id}")
                return True

            except APIException:
                # Re-raise APIExceptions without modification
                raise
            except Exception as e:
                logger.error(f"Failed to delete Kubernetes resources for session {session_id}: {e}")

                # Mark as error but don't delete from Firestore for debugging
                await self.session_repository.update_status(session_id, SessionStatus.ERROR)

                raise APIException(
                    message="Failed to delete Kubernetes resources for session",
                    error_code="SESSION_DELETION_FAILED",
                    exception=str(e),
                )

        except APIException:
            # Re-raise APIExceptions without modification
            raise
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")
            raise APIException(
                message="Failed to delete session",
                error_code="SESSION_DELETION_FAILED",
                exception=str(e),
            )
