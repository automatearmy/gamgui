"""
Authentication controller for GAMGUI Session Manager.
Handles authentication of WebSocket connections.
"""

from datetime import datetime
import json
import logging
from typing import Dict, Optional, Tuple

from fastapi import WebSocket, status

from services.auth_service import AuthService

logger = logging.getLogger(__name__)


class AuthController:
    """Controller for authentication-related operations"""

    def __init__(self):
        self.auth_service = AuthService()

    async def authenticate_websocket(self, websocket: WebSocket) -> Tuple[bool, Optional[Dict]]:
        """
        Authenticate a WebSocket connection.

        Args:
            websocket: The WebSocket connection to authenticate

        Returns:
            Tuple of (success, user_info)
            - success: True if authentication succeeded, False otherwise
            - user_info: User information if authentication succeeded, None otherwise
        """

        # Accept the WebSocket connection
        await websocket.accept()

        try:
            # Extract token from query parameters or headers
            token = self._extract_token(websocket)

            if not token:
                await self._send_auth_error(websocket, "Authentication token required")
                return False, None

            # Verify the token
            payload = await self.auth_service.verify_token(token)
            if not payload:
                await self._send_auth_error(websocket, "Invalid authentication token")
                return False, None

            # Extract user info from token
            user_info = self.auth_service.extract_user_info(payload)

            # Store in WebSocket state for other components to use
            websocket.state.user = user_info
            websocket.state.authenticated = True

            logger.info(f"Authenticated WebSocket connection for user: {user_info.get('email')}")

            return True, user_info

        except Exception as e:
            logger.error(f"WebSocket authentication error: {e}")
            await self._send_auth_error(websocket, "Authentication error")
            return False, None

    def _extract_token(self, websocket: WebSocket) -> Optional[str]:
        """Extract JWT token from query parameters"""
        token = websocket.query_params.get("token")
        print(websocket.query_params)

        if token and token.startswith("Bearer "):
            token = token[7:]  # Remove 'Bearer ' prefix

        return token

    async def _send_auth_error(self, websocket: WebSocket, message: str) -> None:
        """Send authentication error message and close the connection"""
        try:
            # Send error message
            error_message = {
                "type": "error",
                "message": message,
                "authenticated": False,
                "timestamp": datetime.utcnow().isoformat(),
            }
            await websocket.send_text(json.dumps(error_message))

            # Close the connection
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=message)

        except Exception as e:
            logger.error(f"Error sending authentication error: {e}")
