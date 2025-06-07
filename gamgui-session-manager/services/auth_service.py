"""Authentication service for GAMGUI Session Manager"""

import logging
from typing import Any, Dict, Optional

import jwt

from config import environment

logger = logging.getLogger(__name__)


class AuthService:
    """Service for handling authentication"""

    def __init__(self):
        pass

    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, environment.JWT_SECRET, algorithms=["HS256"])

            # Basic validation
            if not payload.get("email"):
                logger.error("Token missing subject email")
                return None

            logger.info(f"Token verified for user: {payload.get('email')}")
            return payload

        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None

    def extract_user_info(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Extract user information from JWT payload"""
        return {
            "user_id": payload.get("sub", "unknown"),
            "email": payload.get("email", "unknown"),
            "name": payload.get("name", "unknown"),
        }
