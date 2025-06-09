"""
Session routes for GAMGUI API.
Defines routes for managing user sessions.
"""

from typing import Dict, List

from fastapi import APIRouter, Depends

from controllers.session_controller import SessionController
from middlewares.auth_middleware import verify_token
from models.session_model import Session
from schemas.responses import SuccessResponse
from schemas.session_schemas import SessionListItem

# Create router
router = APIRouter(prefix="/sessions", tags=["Sessions"], dependencies=[Depends(verify_token)])

# Create a single controller instance to be used by all routes
session_controller = SessionController()

router.add_api_route(
    path="/",
    endpoint=session_controller.list_sessions,
    methods=["GET"],
    response_model=SuccessResponse[List[SessionListItem]],
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
    path="/{session_id}",
    endpoint=session_controller.delete_session,
    methods=["DELETE"],
    response_model=SuccessResponse[Dict],
    summary="Delete session",
    description="Terminates and deletes a specific session",
)
