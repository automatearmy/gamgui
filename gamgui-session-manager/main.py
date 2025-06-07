"""Main application for GAM Session Worker"""
import logging
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from config.environment import env
from services.secret_service import SecretService
from services.auth_service import AuthService
from services.gam_service import GamService
from controllers.websocket_controller import WebSocketController

# Configure logging
logging.basicConfig(
    level=getattr(logging, env.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service instances
secret_service: SecretService
auth_service: AuthService
gam_service: GamService
websocket_controller: WebSocketController


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    logger.info("Starting GAM Session Worker...")
    
    # Validate environment
    try:
        env.validate()
        logger.info("Environment validation passed")
    except ValueError as e:
        logger.error(f"Environment validation failed: {e}")
        raise
    
    # Initialize services
    global secret_service, auth_service, gam_service, websocket_controller
    
    secret_service = SecretService()
    auth_service = AuthService(secret_service)
    gam_service = GamService()
    websocket_controller = WebSocketController(auth_service, gam_service)
    
    logger.info(f"Services initialized for session: {env.session_id}")
    
    # Check GAM availability
    if gam_service.is_gam_available():
        logger.info("GAM is available and ready")
    else:
        logger.warning("GAM is not available - commands will fail")
    
    logger.info(f"GAM Session Worker started on port {env.port}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down GAM Session Worker...")
    
    # Cancel any running commands
    if gam_service:
        cancelled_count = gam_service.cancel_all_commands()
        if cancelled_count > 0:
            logger.info(f"Cancelled {cancelled_count} running commands during shutdown")
    
    logger.info("GAM Session Worker shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="GAM Session Worker",
    description=f"WebSocket server for GAM command execution in session {env.session_id}",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=env.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    gam_available = gam_service.is_gam_available() if gam_service else False
    
    return {
        "status": "healthy",
        "session_id": env.session_id,
        "gam_available": gam_available,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/info")
async def session_info():
    """Get detailed session information"""
    if not websocket_controller or not gam_service:
        return {
            "session_id": env.session_id,
            "status": "initializing",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    return {
        "session_id": env.session_id,
        "active_connections": websocket_controller.get_connection_count(),
        "connected_users": websocket_controller.get_connected_users(),
        "running_commands": gam_service.get_running_commands(),
        "gam_available": gam_service.is_gam_available(),
        "secret_manager_available": secret_service.is_available() if secret_service else False,
        "environment": {
            "gam_path": env.gam_path,
            "gam_config_dir": env.gam_config_dir,
            "project_id": env.project_id,
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for GAM command execution (no auth)"""
    if not websocket_controller:
        await websocket.close(code=1011, reason="Service not ready")
        return
    
    await websocket_controller.handle_connection(websocket)


if __name__ == "__main__":
    logger.info(f"Starting GAM Session Worker for session {env.session_id}")
    logger.info(f"Listening on port {env.port}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=env.port,
        log_level=env.log_level.lower(),
        access_log=True
    )
