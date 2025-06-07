"""
API routes for GAMGUI.
"""

from fastapi import FastAPI

from middlewares.auth_middleware import protect_router
from routes.auth_routes import router as auth_router
from routes.health_routes import router as health_router
from routes.session_routes import router as session_router

routes = {
    # Public routes (no authentication required)
    "public": [auth_router, health_router],
    # Protected routes (authentication required)
    "protected": [session_router],
}


def register_routes(app: FastAPI) -> None:
    """
    Register all API routes with the FastAPI application.

    Args:
        app: FastAPI application instance
    """
    # Register public routes
    for route in routes["public"]:
        app.include_router(route)

    # Register protected routes with authentication
    for route in routes["protected"]:
        # Apply authentication protection
        protected_router = protect_router(route)
        app.include_router(protected_router)
