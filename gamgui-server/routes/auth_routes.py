"""
Authentication routes for GAMGUI API.
Defines routes for user authentication and session management.
"""

from fastapi import APIRouter, Depends

from controllers.auth_controller import AuthController
from middlewares.auth_middleware import verify_token
from schemas.auth_schemas import SessionResponse, TokenResponse
from schemas.responses import SuccessResponse

# Create router
router = APIRouter(
    include_in_schema=True,
    prefix="/auth",
    tags=["Authentication"],
)

# Create a single controller instance to be used by all routes
auth_controller = AuthController()

# Register routes using add_api_route
router.add_api_route(
    path="/sign-in",
    endpoint=auth_controller.sign_in,
    methods=["POST"],
    response_model=SuccessResponse[TokenResponse],
    summary="Sign in with Google ID token",
    description="Validates Google ID token from request body and returns a JWT token for API access",
)

router.add_api_route(
    path="/session",
    endpoint=auth_controller.get_session,
    methods=["GET"],
    response_model=SuccessResponse[SessionResponse],
    summary="Get current session",
    description="Verifies if the user is authenticated and returns session information",
    dependencies=[Depends(verify_token)],
)
