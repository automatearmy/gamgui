"""
Secret routes for GAMGUI API.
Defines routes for GAM secrets management.
"""

from fastapi import APIRouter, Depends

from controllers.secret_controller import SecretController
from middlewares.auth_middleware import verify_token
from schemas.responses import SuccessResponse
from schemas.secret_schemas import SecretStatusResponse

# Create router
router = APIRouter(include_in_schema=True, prefix="/secrets", tags=["Secrets"], dependencies=[Depends(verify_token)])

# Create a single controller instance to be used by all routes
secret_controller = SecretController()

# Register routes using add_api_route
router.add_api_route(
    path="/upload/{secret_type}",
    endpoint=secret_controller.upload_secret,
    methods=["POST"],
    response_model=SuccessResponse,
    summary="Upload GAM secret",
    description="Upload a GAM secret file (client_secrets.json, oauth2.txt, or oauth2service.json)",
)

router.add_api_route(
    path="/status",
    endpoint=secret_controller.get_secrets_status,
    methods=["GET"],
    response_model=SuccessResponse[SecretStatusResponse],
    summary="Get secrets status",
    description="Check if all required GAM secrets exist for the current user",
)

router.add_api_route(
    path="/admin/upload/{secret_type}",
    endpoint=secret_controller.upload_admin_secret,
    methods=["POST"],
    response_model=SuccessResponse,
    summary="Upload GAM admin secret",
    description="Upload a GAM admin secret file (client_secrets.json, oauth2.txt, or oauth2service.json). Admin role required.",
)

router.add_api_route(
    path="/admin/status",
    endpoint=secret_controller.get_admin_secrets_status,
    methods=["GET"],
    response_model=SuccessResponse[SecretStatusResponse],
    summary="Get admin secrets status",
    description="Check if all required GAM admin secrets exist. Admin role required.",
)
