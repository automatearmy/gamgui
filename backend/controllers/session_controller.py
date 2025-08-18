"""
Session controller for GAMGUI API.
Handles session management operations.
"""

import logging
from typing import List

from fastapi import Request, UploadFile, status

from errors.exceptions import APIException
from models.session_model import Session
from repositories.user_repository import UserRepository
from schemas.responses import SuccessResponse
from schemas.session_schemas import CreateSessionRequest
from services.audit_service import AuditService
from services.session_service import SessionService

logger = logging.getLogger(__name__)


class SessionController:
    """Controller for session management endpoints"""

    def __init__(self):
        self.session_service = SessionService()
        self.audit_service = AuditService()
        self.user_repository = UserRepository()

    async def create_session(self, request: Request, create_request: CreateSessionRequest) -> SuccessResponse[Session]:
        """
        Create a new session for the authenticated user.

        Args:
            request: FastAPI request object
            create_request: Session creation parameters

        Returns:
            SuccessResponse with the created session info

        Raises:
            APIException: If session creation fails
        """
        try:
            user_id = request.state.user.get("sub")

            # Create the session
            session = await self.session_service.create_session(
                user_id=user_id,
                request=create_request,
            )

            return SuccessResponse(success=True, message="Session created successfully", data=session)

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise APIException(
                message="Failed to create session",
                error_code="SESSION_CREATION_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def list_sessions(self, request: Request) -> SuccessResponse[List[Session]]:
        """
        List all sessions for the authenticated user.
        If user is admin, also includes all admin sessions from other users.

        Args:
            request: FastAPI request object

        Returns:
            SuccessResponse with the list of user sessions

        Raises:
            APIException: If listing sessions fails
        """
        try:
            # User data is already verified and available in request.state.user
            user_id = request.state.user.get("sub")

            # Get user from database to check role
            user = await self.user_repository.get_by_id(user_id)
            user_role = user.role_id if user else "User"

            # Get the user's sessions (including admin sessions if user is admin)
            sessions = await self.session_service.list_user_sessions(user_id, user_role)

            return SuccessResponse(success=True, message=f"Found {len(sessions)} sessions", data=sessions)

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            logger.error(f"Failed to list sessions: {e}")
            raise APIException(
                message="Failed to list sessions",
                error_code="SESSION_LIST_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def get_session(self, request: Request, session_id: str) -> SuccessResponse[Session]:
        """
        Get detailed information for a specific session.

        Args:
            request: FastAPI request object
            session_id: ID of the session to retrieve

        Returns:
            SuccessResponse with the session details

        Raises:
            APIException: If session not found or retrieval fails
        """
        try:
            # User data is already verified and available in request.state.user
            user_id = request.state.user.get("sub")

            # Get user from database to check role
            user = await self.user_repository.get_by_id(user_id)
            user_role = user.role_id if user else "User"

            # Get the session
            session = await self.session_service.get_session(session_id=session_id, user_id=user_id, user_role=user_role)

            if not session:
                raise APIException(
                    message=f"Session {session_id} not found",
                    error_code="SESSION_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND,
                )

            return SuccessResponse(success=True, message="Session retrieved successfully", data=session)

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            raise APIException(
                message="Failed to get session details",
                error_code="SESSION_RETRIEVAL_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def end_session(self, request: Request, session_id: str) -> SuccessResponse[Session]:
        """
        Gracefully end a session by running exit command and updating status to Succeeded.

        Args:
            request: FastAPI request object
            session_id: ID of the session to end

        Returns:
            SuccessResponse with the updated session

        Raises:
            APIException: If session not found or ending fails
        """
        try:
            # User data is already verified and available in request.state.user
            user_id = request.state.user.get("sub")

            # Get user from database to check role
            user = await self.user_repository.get_by_id(user_id)
            user_role = user.role_id if user else "User"

            # End the session
            session = await self.session_service.end_session(session_id=session_id, user_id=user_id, user_role=user_role)

            if not session:
                raise APIException(
                    message=f"Session {session_id} not found",
                    error_code="SESSION_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND,
                )

            return SuccessResponse(
                success=True, message="Session ended successfully", data=session
            )

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            logger.error(f"Failed to end session {session_id}: {e}")
            raise APIException(
                message="Failed to end session",
                error_code="SESSION_END_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def upload_file_to_session(self, request: Request, session_id: str, file: UploadFile) -> SuccessResponse:
        """
        Upload a file to a session pod.

        Args:
            request: FastAPI request object
            session_id: ID of the session to upload file to
            file: Uploaded file

        Returns:
            SuccessResponse with upload confirmation

        Raises:
            APIException: If upload fails
        """
        try:
            # User data is already verified and available in request.state.user
            user_id = request.state.user.get("sub")

            # Validate file size (100MB limit)
            if file.size and file.size > 100 * 1024 * 1024:  # 100MB
                raise APIException(
                    message="File size must be less than 100MB",
                    error_code="FILE_TOO_LARGE",
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )

            # Upload file to session pod
            await self.session_service.upload_file_to_session(
                session_id=session_id,
                user_id=user_id,
                file=file,
            )

            return SuccessResponse(
                success=True,
                message=f"Successfully uploaded {file.filename} to session {session_id}",
            )

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            logger.error(f"Failed to upload file to session {session_id}: {e}")
            raise APIException(
                message="Failed to upload file",
                error_code="FILE_UPLOAD_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def get_audit_logs(self, request: Request, session_id: str, limit: int = 500) -> SuccessResponse[List[dict]]:
        """
        Get audit logs for a specific session.

        Args:
            request: FastAPI request object
            session_id: ID of the session to get audit logs for
            limit: Maximum number of log entries to return

        Returns:
            SuccessResponse with the audit logs

        Raises:
            APIException: If session not found or audit log retrieval fails
        """
        try:
            # User data is already verified and available in request.state.user
            user_id = request.state.user.get("sub")

            # Verify user owns this session
            session = await self.session_service.get_session(session_id=session_id, user_id=user_id)
            if not session:
                raise APIException(
                    message=f"Session {session_id} not found",
                    error_code="SESSION_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND,
                )

            # Get audit logs
            logs = await self.audit_service.get_session_logs(session_id=session_id, user_id=user_id, limit=limit)

            return SuccessResponse(
                success=True,
                message=f"Retrieved {len(logs)} audit log entries",
                data=logs
            )

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            logger.error(f"Failed to get audit logs for session {session_id}: {e}")
            raise APIException(
                message="Failed to retrieve audit logs",
                error_code="AUDIT_LOGS_RETRIEVAL_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
