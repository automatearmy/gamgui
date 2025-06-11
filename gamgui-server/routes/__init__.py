"""
API routes for GAMGUI.
"""

from fastapi import FastAPI

from routes.auth_routes import router as auth_router
from routes.health_routes import router as health_router
from routes.secret_routes import router as secret_router
from routes.session_routes import router as session_router

routes = [auth_router, health_router, session_router, secret_router]


def register_routes(app: FastAPI) -> None:
    """
    Register all API routes with the FastAPI application.

    Args:
        app: FastAPI application instance
    """
    # Register all routes
    for route in routes:
        app.include_router(route)
