"""
Main entry point for GAMGUI Session
"""

from contextlib import asynccontextmanager
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from clients.firestore_client import get_db
from config import environment
from config.logging import configure_logging
from errors.exceptions import register_exception_handlers
from routes import register_routes

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
    logger.info("Starting GAMGUI Session API")
    logger.info(f"Environment: {environment.ENVIRONMENT}")
    logger.info(f"Project ID: {environment.PROJECT_ID}")

    # Initialize Firestore client
    get_db()  # Initialize the client
    logger.info("Firestore client initialized")

    # Initialize Kubernetes client if needed
    # TODO: Initialize Kubernetes client

    yield

    # Shutdown
    logger.info("Shutting down GAMGUI Session API")


# Create FastAPI app
app = FastAPI(
    title="GAMGUI Session API",
    description="API for managing GAMGUI sessions",
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

# Register API routes - public and protected
register_routes(app)

# Register exception handlers
register_exception_handlers(app)

if __name__ == "__main__":
    logger.info(f"Starting GAMGUI Session API on port {environment.PORT}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=environment.PORT,
        reload=environment.IS_DEVELOPMENT,
        log_level=environment.LOG_LEVEL.lower(),
    )
