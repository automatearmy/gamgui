"""
Session routes for GAMGUI API.
Defines routes for managing user sessions.
"""

from typing import List

from fastapi import APIRouter, Depends

from controllers.session_controller import SessionController
from middlewares.auth_middleware import verify_token
from models.session_model import Session
from schemas.responses import SuccessResponse

# Create router
router = APIRouter(prefix="/sessions", tags=["Sessions"], dependencies=[Depends(verify_token)])

# Create a single controller instance to be used by all routes
session_controller = SessionController()

router.add_api_route(
    path="/",
    endpoint=session_controller.list_sessions,
    methods=["GET"],
    response_model=SuccessResponse[List[Session]],
    summary="List sessions",
    description="Lists all active sessions for the current user",
)

router.add_api_route(
    path="/",
    endpoint=session_controller.create_session,
    methods=["POST"],
    response_model=SuccessResponse[Session],
    summary="Create session",
    description="Creates a new session for the current user",
)

router.add_api_route(
    path="/{session_id}",
    endpoint=session_controller.get_session,
    methods=["GET"],
    response_model=SuccessResponse[Session],
    summary="Get session details",
    description="Returns details for a specific session",
)

router.add_api_route(
    path="/{session_id}/end",
    endpoint=session_controller.end_session,
    methods=["POST"],
    response_model=SuccessResponse[Session],
    summary="End session",
    description="Gracefully ends a session by running exit command and updating status to Succeeded",
)

router.add_api_route(
    path="/{session_id}/upload",
    endpoint=session_controller.upload_file_to_session,
    methods=["POST"],
    response_model=SuccessResponse,
    summary="Upload file to session",
    description="Upload a file to the session pod's /uploaded directory (up to 100MB)",
)

router.add_api_route(
    path="/{session_id}/audit-logs",
    endpoint=session_controller.get_audit_logs,
    methods=["GET"],
    response_model=SuccessResponse[List[dict]],
    summary="Get session audit logs",
    description="Returns audit logs for a specific session including commands and outputs",
)
