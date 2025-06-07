"""
Health routes for GAMGUI API.
Provides health check and environment information endpoints.
"""

from fastapi import APIRouter

from controllers.health_controller import HealthController
from schemas.health_schemas import EnvironmentInfoResponse, HealthResponse
from schemas.responses import SuccessResponse

# Create router
router = APIRouter(
    prefix="/health",
    tags=["Health"],
)

# Create controller instance
health_controller = HealthController()

# Register routes using add_api_route
router.add_api_route(
    path="/",
    endpoint=health_controller.health_check,
    methods=["GET"],
    response_model=SuccessResponse[HealthResponse],
    summary="Health check",
    description="Basic health check endpoint that confirms the API is running",
)

router.add_api_route(
    path="/info",
    endpoint=health_controller.get_environment_info,
    methods=["GET"],
    response_model=SuccessResponse[EnvironmentInfoResponse],
    summary="Environment information",
    description="Detailed information about the API environment",
)
