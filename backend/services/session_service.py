"""
Session service for GAMGUI API.
Handles session management operations including Kubernetes pod management.
"""

import logging
from typing import List, Optional
import uuid

from fastapi import UploadFile, status

from errors.exceptions import APIException
from models.session_model import Session
from repositories.session_repository import SessionRepository
from schemas.common import SessionStatus
from schemas.session_schemas import CreateSessionRequest
from services.kubernetes_service import KubernetesService

logger = logging.getLogger(__name__)


class SessionService:
    """Service for managing terminal sessions"""

    def __init__(self):
        self.session_repository = SessionRepository()
        self.k8s_service = KubernetesService()

    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return f"sess_{uuid.uuid4().hex[:8]}"

    def _generate_pod_name(self, session_id: str) -> str:
        """Generate a pod name from session ID"""
        # Remove 'sess_' prefix and use first 8 characters
        short_id = session_id.replace("sess_", "")[:8]
        return f"gam-session-{short_id}"

    async def create_session(self, user_id: str, request: CreateSessionRequest) -> Session:
        """
        Create a new terminal session.

        Args:
            user_id: ID of the user creating the session
            request: Session creation parameters

        Returns:
            Created session object

        Raises:
            APIException: If session creation fails
        """
        session_id = self._generate_session_id()
        pod_name = self._generate_pod_name(session_id)
        pod_namespace = "default"

        logger.info(f"Creating session {session_id} for user {user_id}")

        try:
            # Create Kubernetes pod first - if this fails, we don't create the session
            # Always use "User" session type regardless of request
            pod_created = await self.k8s_service.create_session_pod(
                pod_name, session_id, user_id, namespace=pod_namespace, session_type="User"
            )

            if not pod_created:
                logger.error(f"Failed to create pod for session {session_id}")
                raise APIException(
                    message="Failed to create Kubernetes pod for session",
                    error_code="POD_CREATION_FAILED",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Create session object - always create as "User" type
            session = Session(
                id=session_id,
                user_id=user_id,
                name=request.name,
                description=request.description,
                status=SessionStatus.PENDING,
                pod_name=pod_name,
                pod_namespace=pod_namespace,
                session_type="User",  # Force all sessions to be User type
            )

            # Save session to repository
            await self.session_repository.create(session)

            # Wait for pod to be ready and update status accordingly
            pod_ready = await self.k8s_service.wait_for_pod_ready(pod_name, pod_namespace)

            if pod_ready:
                session.status = SessionStatus.RUNNING
                logger.info(f"Session {session_id} pod is running")
            else:
                # Get actual pod status from Kubernetes
                pod_status = await self.k8s_service.get_pod_status(pod_name, pod_namespace)
                if pod_status:
                    session.status = SessionStatus(pod_status)
                else:
                    session.status = SessionStatus.FAILED
                logger.warning(f"Session {session_id} pod failed to become ready, status: {session.status}")

            # Update session status in repository
            await self.session_repository.update_status(session_id, session.status)

            return session

        except APIException:
            # Re-raise APIExceptions without modification
            raise
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            # Clean up pod if it was created
            try:
                await self.k8s_service.delete_session_pod(pod_name, pod_namespace)
            except Exception as cleanup_error:
                logger.error(f"Failed to clean up pod after session creation failure: {cleanup_error}")

            raise APIException(
                message="Failed to create session",
                error_code="SESSION_CREATION_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def list_user_sessions(self, user_id: str, user_role: str = None) -> List[Session]:
        """
        List all sessions for a user.
        Since all sessions are now User type, only return user's own sessions.

        Args:
            user_id: ID of the user
            user_role: Role of the user (Admin or User) - kept for compatibility

        Returns:
            List of session items sorted by created_at (newest first)

        Raises:
            APIException: If listing sessions fails
        """
        try:
            logger.info(f"Listing sessions for user {user_id}")

            # Get user's own sessions (all sessions are now User type)
            user_sessions = await self.session_repository.get_by_user(user_id)

            session_items = []
            for session in user_sessions:
                # Update status based on current pod status if session was active
                if session.status in [SessionStatus.PENDING, SessionStatus.RUNNING]:
                    current_pod_status = await self.k8s_service.get_pod_status(session.pod_name, session.pod_namespace)

                    if current_pod_status and current_pod_status != session.status.value:
                        # Update status in repository if it changed
                        new_status = SessionStatus(current_pod_status)
                        await self.session_repository.update_status(session.id, new_status)
                        session.status = new_status

                session_items.append(session)

            # Sort sessions by created_at in descending order (newest first)
            session_items.sort(key=lambda x: x.created_at, reverse=True)

            logger.info(f"Found {len(session_items)} sessions for user {user_id}")
            return session_items

        except Exception as e:
            logger.error(f"Failed to list sessions for user {user_id}: {e}")
            raise APIException(
                message="Failed to list sessions",
                error_code="SESSION_LIST_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def get_session(self, session_id: str, user_id: str, user_role: str = None) -> Optional[Session]:
        """
        Get a specific session by ID.
        Since all sessions are now User type, only allow access to own sessions.

        Args:
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            user_role: Role of the user (Admin or User) - kept for compatibility

        Returns:
            Session object if found and user has access, None otherwise

        Raises:
            APIException: If getting session fails
        """
        try:
            logger.info(f"Getting session {session_id} for user {user_id}")

            # Get session from repository
            session = await self.session_repository.get_by_id(session_id)

            if not session:
                logger.info(f"Session {session_id} not found")
                return None

            # Check if user owns this session (all sessions are User type now)
            if session.user_id != user_id:
                logger.warning(f"User {user_id} attempted to access session {session_id} owned by {session.user_id}")
                return None

            # Update status based on current pod status if session was active
            if session.status in [SessionStatus.PENDING, SessionStatus.RUNNING]:
                current_pod_status = await self.k8s_service.get_pod_status(session.pod_name, session.pod_namespace)

                if current_pod_status and current_pod_status != session.status.value:
                    # Update status in repository if it changed
                    new_status = SessionStatus(current_pod_status)
                    await self.session_repository.update_status(session.id, new_status)
                    session.status = new_status

            return session

        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            raise APIException(
                message="Failed to get session details",
                error_code="SESSION_RETRIEVAL_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def end_session(self, session_id: str, user_id: str, user_role: str = None) -> Optional[Session]:
        """
        Gracefully end a session by running exit command and updating status to Succeeded.
        Since all sessions are now User type, only allow users to end their own sessions.

        Args:
            session_id: ID of the session to end
            user_id: ID of the user (for authorization)
            user_role: Role of the user (Admin or User) - kept for compatibility

        Returns:
            Updated session object if found and user has access, None otherwise

        Raises:
            APIException: If ending session fails
        """
        try:
            logger.info(f"Ending session {session_id} for user {user_id}")

            # Get session from repository
            session = await self.session_repository.get_by_id(session_id)

            if not session:
                logger.info(f"Session {session_id} not found")
                return None

            # Check if user owns this session (all sessions are User type now)
            if session.user_id != user_id:
                logger.warning(f"User {user_id} attempted to end session {session_id} owned by {session.user_id}")
                return None

            # Only allow ending running or pending sessions
            if session.status not in [SessionStatus.RUNNING, SessionStatus.PENDING]:
                logger.info(f"Session {session_id} cannot be ended - current status: {session.status}")
                raise APIException(
                    message=f"Session cannot be ended - current status: {session.status}",
                    error_code="SESSION_CANNOT_BE_ENDED",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            # Delete the pod to end the session
            try:
                pod_deleted = await self.k8s_service.delete_session_pod(session.pod_name, session.pod_namespace)
                if pod_deleted:
                    logger.info(f"Deleted pod {session.pod_name} for session {session_id}")
                else:
                    logger.warning(f"Failed to delete pod {session.pod_name} for session {session_id}")
            except Exception as delete_error:
                logger.error(f"Error deleting pod for session {session_id}: {delete_error}")
                # Continue with status update even if pod deletion fails

            # Update session status to Succeeded
            session.status = SessionStatus.SUCCEEDED
            await self.session_repository.update_status(session_id, session.status)

            logger.info(f"Ended session {session_id} - pod deleted and status updated to Succeeded")
            return session

        except APIException:
            # Re-raise APIExceptions without modification
            raise
        except Exception as e:
            logger.error(f"Failed to end session {session_id}: {e}")
            raise APIException(
                message="Failed to end session",
                error_code="SESSION_END_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def update_session_status(self, session_id: str, status: SessionStatus):
        """
        Update the status of a session.

        Args:
            session_id: ID of the session
            status: New status

        Raises:
            APIException: If updating session status fails
        """
        try:
            await self.session_repository.update_status(session_id, status)
            logger.info(f"Updated session {session_id} status to {status}")
        except Exception as e:
            logger.error(f"Failed to update session {session_id} status: {e}")
            raise APIException(
                message="Failed to update session status",
                error_code="SESSION_STATUS_UPDATE_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def upload_file_to_session(self, session_id: str, user_id: str, file: UploadFile):
        """
        Upload a file to a session pod.

        Args:
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            file: File to upload

        Raises:
            APIException: If uploading file fails
        """
        try:
            logger.info(f"Uploading file {file.filename} to session {session_id} for user {user_id}")

            # Get session and validate access
            session = await self.get_session(session_id, user_id)
            if not session:
                raise APIException(
                    message=f"Session {session_id} not found",
                    error_code="SESSION_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND,
                )

            # Check if session is running
            if session.status != SessionStatus.RUNNING:
                raise APIException(
                    message=f"Session {session_id} is not running (status: {session.status})",
                    error_code="SESSION_NOT_RUNNING",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            # Upload file to pod using Kubernetes service
            await self.k8s_service.copy_file_to_pod(
                pod_name=session.pod_name,
                namespace=session.pod_namespace,
                file=file,
                target_path="/uploaded",
            )

            logger.info(f"Successfully uploaded {file.filename} to session {session_id}")

        except APIException:
            # Re-raise APIExceptions without modification
            raise
        except Exception as e:
            logger.error(f"Failed to upload file to session {session_id}: {e}")
            raise APIException(
                message="Failed to upload file to session",
                error_code="FILE_UPLOAD_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
