"""
Session controller for GAMGUI API.
Handles session management operations.
"""

import logging
from typing import Dict, List

from fastapi import Request, status

from errors.exceptions import APIException
from models.session_model import Session
from schemas.responses import SuccessResponse
from schemas.session_schemas import CreateSessionRequest, SessionListItem
from services.session_service import SessionService

logger = logging.getLogger(__name__)


class SessionController:
    """Controller for session management endpoints"""

    def __init__(self):
        self.session_service = SessionService()

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

    async def list_sessions(self, request: Request) -> SuccessResponse[List[SessionListItem]]:
        """
        List all sessions for the authenticated user.

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

            # Get the user's sessions
            sessions = await self.session_service.list_user_sessions(user_id)

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

            # Get the session
            session = await self.session_service.get_session(session_id=session_id, user_id=user_id)

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

    async def delete_session(self, request: Request, session_id: str) -> SuccessResponse[Dict]:
        """
        Delete a session.

        Args:
            request: FastAPI request object
            session_id: ID of the session to delete

        Returns:
            SuccessResponse with deletion confirmation

        Raises:
            APIException: If session not found or deletion fails
        """
        try:
            # User data is already verified and available in request.state.user
            user_id = request.state.user.get("sub")

            # Delete the session
            deleted = await self.session_service.delete_session(session_id=session_id, user_id=user_id)

            if not deleted:
                raise APIException(
                    message=f"Session {session_id} not found",
                    error_code="SESSION_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND,
                )

            return SuccessResponse(
                success=True, message="Session deleted successfully", data={"session_id": session_id}
            )

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            raise APIException(
                message="Failed to delete session",
                error_code="SESSION_DELETION_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
