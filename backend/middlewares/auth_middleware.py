"""
Authentication middleware for GAMGUI API.
Provides functions to verify JWT tokens and authenticate users.
"""

import logging
from typing import Dict

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketException, status
import jwt

from config import environment
from errors.exceptions import APIException

logger = logging.getLogger(__name__)


async def verify_token(request: Request) -> Dict:
    """
    Verify JWT token and attach user data to request state.
    This function can be used as a dependency for protected routes.

    Args:
        request: FastAPI request object

    Returns:
        Dict with user information from token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    # Get token from X-Access-Token header
    token = request.headers.get("X-Access-Token")
    if not token:
        logger.warning(f"Missing X-Access-Token header for request to {request.url.path}")
        raise APIException(
            message="Authentication required: X-Access-Token header missing",
            error_code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        # Verify the token
        payload = jwt.decode(token, environment.JWT_SECRET, algorithms=["HS256"])

        # Validate email exists in token
        email = payload.get("email")
        if not email:
            logger.warning("Email not found in token payload")
            raise APIException(
                message="Invalid token: email not found",
                error_code="UNAUTHORIZED",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        # Store user data in request state for route handlers to access
        request.state.user = payload

        # Return the payload which contains user information
        return payload

    except jwt.ExpiredSignatureError:
        logger.warning("Expired JWT token")
        raise APIException(
            message="Token expired",
            error_code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    except jwt.InvalidTokenError:
        logger.warning("Invalid JWT token")
        raise APIException(
            message="Invalid token",
            error_code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


async def verify_websocket_token(websocket: WebSocket) -> Dict:
    """
    Verify JWT token and attach user data to websocket state.
    This function can be used as a dependency for websocket routes.

    Args:
        websocket: FastAPI websocket object

    Returns:
        Dict with user information from token payload

    Raises:
        WebSocketException: If token is invalid or expired
    """
    # Get token from X-Access-Token header
    token = websocket.headers.get("X-Access-Token")
    if not token:
        logger.warning("Missing X-Access-Token header for websocket connection")
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required: X-Access-Token header missing"
        )

    try:
        # Verify the token
        payload = jwt.decode(token, environment.JWT_SECRET, algorithms=["HS256"])

        # Validate email exists in token
        email = payload.get("email")
        if not email:
            logger.warning("Email not found in token payload")
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token: email not found")

        # Store user data in websocket state for handlers to access (similar to request.state.user)
        websocket.state.user = payload

        # Return the payload which contains user information
        return payload

    except jwt.ExpiredSignatureError:
        logger.warning("Expired JWT token")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Token expired")

    except jwt.InvalidTokenError:
        logger.warning("Invalid JWT token")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")


def protect_router(router: APIRouter) -> APIRouter:
    """
    Add authentication protection to all routes in a router.
    This function adds the verify_token dependency to all routes in the router.

    Args:
        router: The APIRouter to protect

    Returns:
        The protected APIRouter
    """
    # Add verify_token as a dependency for all routes in the router
    router.dependencies.append(Depends(verify_token))
    return router
