"""
Main entry point for GAMGUI Session Manager
"""

from contextlib import asynccontextmanager
import logging
import sys
from typing import Any, Dict

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import environment
from config.logging import configure_logging
from controllers.auth_controller import AuthController
from controllers.websocket_controller import WebSocketController
from services.gam_service import GamService
from services.startup_service import StartupService

# Configure logging before anything else
configure_logging()
logger = logging.getLogger(__name__)

# Validate environment configuration
errors = environment.validate_environment()
if errors:
    for error in errors:
        logger.error(error)
    logger.error("Environment configuration is invalid, exiting")
    sys.exit(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting GAMGUI Session Manager")
    logger.info(f"Environment: {environment.ENVIRONMENT}")
    logger.info(f"Project ID: {environment.PROJECT_ID}")
    logger.info(f"Session ID: {environment.SESSION_ID}")

    # Initialize session and mount secrets
    startup_service = StartupService()
    initialization_success = await startup_service.initialize_session()

    if not initialization_success:
        logger.error("Session initialization failed, application will not start")
        raise RuntimeError("Session initialization failed")

    logger.info("Session initialization completed successfully")

    yield

    # Shutdown
    logger.info("Shutting down GAMGUI Session Manager")
    logger.info("GAMGUI Session Manager shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="GAMGUI Session Manager",
    description=f"WebSocket server for GAM command execution in session {environment.SESSION_ID}",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=environment.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint that confirms the service is running"""
    return {
        "status": "healthy",
        "session_id": environment.SESSION_ID,
        "environment": environment.ENVIRONMENT,
        "project_id": environment.PROJECT_ID,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for GAM command execution"""

    logger.info("WebSocket connection request received")

    auth_controller = AuthController()
    auth_success, user_info = await auth_controller.authenticate_websocket(websocket)

    # If authentication failed, the connection would have been closed in auth_controller
    if not auth_success:
        logger.warning("Authentication failed, connection closed")
        return

    logger.info(f"Authentication successful for user: {user_info.get('email')}")

    # Create remaining services
    gam_service = GamService()

    # Check if GAM is available
    gam_available = gam_service.is_gam_available()
    if gam_available:
        logger.info("GAM is available and ready")
    else:
        logger.warning("GAM is not available - commands will fail")

    # Create controller for handling commands
    websocket_controller = WebSocketController(gam_service=gam_service)

    # Handle the connection
    await websocket_controller.handle_connection(websocket)


if __name__ == "__main__":
    logger.info(f"Starting GAMGUI Session Manager on port {environment.PORT}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=environment.PORT,
        reload=environment.IS_DEVELOPMENT,
        log_level=environment.LOG_LEVEL.lower(),
    )
