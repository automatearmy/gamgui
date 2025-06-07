"""
Authentication controller for GAMGUI API.
Handles user authentication and session management.
"""

import logging

from fastapi import Request

from schemas.auth_schemas import SessionResponse, TokenResponse
from schemas.responses import SuccessResponse
from services.auth_service import AuthService

logger = logging.getLogger(__name__)


class AuthController:
    """Controller for authentication-related endpoints"""

    def __init__(self):
        self.auth_service = AuthService()

    async def sign_in(self, google_token: str) -> SuccessResponse[TokenResponse]:
        """
        Sign in with a Google ID token.
        Verifies the token and creates a JWT for future API requests.
        """
        return await self.auth_service.sign_in(google_token)

    async def get_session(self, request: Request) -> SuccessResponse[SessionResponse]:
        """
        Get the current user session.
        Uses user data from the request state populated by verify_token middleware.
        """
        return await self.auth_service.get_session(request)
