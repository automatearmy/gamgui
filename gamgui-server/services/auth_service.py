"""
Authentication service for GAMGUI API.
Handles user authentication and session management.
"""

import datetime
import logging
from typing import Optional
import uuid

from fastapi import Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import jwt

from config import environment
from errors.exceptions import APIException
from models.user_model import User
from repositories.user_repository import UserRepository
from schemas.auth_schemas import SessionResponse, TokenResponse
from schemas.responses import SuccessResponse

logger = logging.getLogger(__name__)


class AuthService:
    """Service for handling authentication"""

    def __init__(self):
        self.user_repository = UserRepository()

    async def sign_in(self, google_token: str) -> SuccessResponse[TokenResponse]:
        """
        Sign in with a Google ID token.
        Verifies the token and creates a JWT for future API requests.
        """
        try:
            # Verify the Google ID token
            request_adapter = google_requests.Request()

            try:
                # Verify the token against Google's servers
                id_info = id_token.verify_oauth2_token(
                    google_token, request_adapter, environment.CLIENT_OAUTH_CLIENT_ID
                )

                # Check if the token is expired
                if id_info["exp"] < datetime.datetime.now().timestamp():
                    logger.warning("Expired Google ID token")
                    raise APIException(
                        message="Token expired",
                        error_code="EXPIRED_TOKEN",
                        status_code=status.HTTP_401_UNAUTHORIZED,
                    )

                # Extract user email
                email = id_info.get("email")

                if not email:
                    logger.warning("Email not found in Google ID token")
                    raise APIException(
                        message="Email not found in token",
                        error_code="MISSING_EMAIL",
                        status_code=status.HTTP_401_UNAUTHORIZED,
                    )

                # Ensure user exists in Firestore and get user object
                user = await self._ensure_user_exists(
                    email=email,
                    name=id_info.get("name", ""),
                    picture=id_info.get("picture"),
                )

                if not user:
                    logger.error(f"Failed to create or retrieve user with email: {email}")
                    raise APIException(
                        message="Failed to create or retrieve user account",
                        error_code="USER_CREATION_FAILED",
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Create JWT token expiring based on environment setting
                now = datetime.datetime.now(datetime.UTC)
                expires_at = now + datetime.timedelta(hours=24)  # Expires in 24h

                # Create token payload with proper JWT claims
                payload = {
                    "sub": user.id,  # User ID as the subject
                    "iss": "gamgui-server",  # Issuer
                    "iat": now,  # Issued at time
                    "exp": expires_at,  # Expiration time
                    "email": email,
                    "name": user.display_name,
                    "picture": user.picture,
                }

                jwt_token = jwt.encode(
                    payload,
                    environment.JWT_SECRET,
                    algorithm="HS256",
                )

                # Create token response
                token_response = TokenResponse(
                    token=jwt_token,
                    email=email,
                    name=id_info.get("name"),
                    picture=id_info.get("picture"),
                    expires_at=expires_at,
                )

                # Return standardized success response
                return SuccessResponse(success=True, message="Authentication successful", data=token_response)

            except ValueError as e:
                # Invalid token
                logger.error(f"Invalid Google ID token: {str(e)}")
                raise APIException(
                    message="Invalid Google ID token",
                    error_code="INVALID_GOOGLE_TOKEN",
                    exception=str(e),
                    status_code=status.HTTP_401_UNAUTHORIZED,
                )

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            # Other errors
            logger.error(f"Error during sign-in: {str(e)}")
            raise APIException(
                message="Authentication failed",
                error_code="AUTHENTICATION_ERROR",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def get_session(self, request: Request) -> SuccessResponse[SessionResponse]:
        """
        Get the current user session.
        Uses user data from the request state populated by verify_token middleware.
        """
        try:
            # User data is already verified and available in request.state.user
            user_data = request.state.user
            email = user_data.get("email")

            # Verify user exists in Firestore
            user = await self.user_repository.get_by_email(email)
            if not user:
                logger.warning(f"User {email} not found in database despite valid token")
                raise APIException(
                    message="User not found in system",
                    error_code="USER_NOT_FOUND",
                    status_code=status.HTTP_401_UNAUTHORIZED,
                )

            # Create and return the session info
            session_response = SessionResponse(
                authenticated=True,
                email=user_data.get("email"),
                name=user_data.get("name"),
                picture=user_data.get("picture"),
            )

            return SuccessResponse(success=True, message="Session validated successfully", data=session_response)

        except APIException:
            # Re-raise APIExceptions without modification to preserve status code and error details
            raise
        except Exception as e:
            logger.error(f"Error getting session: {str(e)}")
            raise APIException(
                message="Failed to get session information",
                error_code="SESSION_ERROR",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, environment.JWT_SECRET, algorithms=["HS256"])
            return payload
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None

    async def _ensure_user_exists(self, email: str, name: str, picture: Optional[str] = None) -> User:
        """
        Ensure a user exists in Firestore.
        If the user doesn't exist, create a new one with default values.

        Args:
            email: User email
            name: User display name
            picture: Optional profile picture URL

        Returns:
            User: The user object (either existing or newly created)

        Raises:
            APIException: If user creation fails
        """
        try:
            # Check if user exists
            user = await self.user_repository.get_by_email(email)

            if user:
                # User exists, update last login time
                await self.user_repository.update_last_login(user.id)
                logger.info(f"Updated last login for existing user: {email}")
                return user

            # User doesn't exist, create new user
            # Get default role and organization (for simplicity, using defaults)
            # [!UPDATE_LATER!]
            default_role_id = "role_default"
            default_org_id = "org_default"

            # Create new user
            new_user = User(
                id=f"user_{uuid.uuid4().hex[:12]}",
                email=email,
                display_name=name,
                picture=picture,
                role_id=default_role_id,
                organization_id=default_org_id,
                theme="light",
                timezone="UTC",
                status="active",
                last_login_at=datetime.datetime.now(datetime.UTC),
            )

            # Save to repository
            await self.user_repository.create(new_user)
            logger.info(f"Created new user: {email}")

            return new_user

        except Exception as e:
            logger.error(f"Error ensuring user exists: {e}")
            raise APIException(
                message="Failed to create or update user account",
                error_code="USER_CREATION_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
