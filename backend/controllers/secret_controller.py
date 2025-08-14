"""
Secret controller for GAMGUI API.
Handles GAM secrets management.
"""

import logging

from fastapi import Request, UploadFile, status

from errors.exceptions import APIException
from repositories.user_repository import UserRepository
from schemas.responses import SuccessResponse
from schemas.secret_schemas import SecretStatusResponse, SecretType
from services.secret_service import SecretService

logger = logging.getLogger(__name__)


class SecretController:
    """Controller for GAM secrets-related endpoints"""

    def __init__(self):
        self.secret_service = SecretService()
        self.user_repository = UserRepository()

    async def upload_secret(self, request: Request, file: UploadFile, secret_type: str) -> SuccessResponse:
        """
        Upload a GAM secret file.

        Args:
            request: FastAPI request object
            file: Uploaded file
            secret_type: Type of secret (client_secrets, oauth2, oauth2service)

        Returns:
            Success response
        """
        try:
            # Get user ID from authenticated request
            user_id = request.state.user.get("sub")

            # Read file content
            content = await file.read()
            content_str = content.decode("utf-8")

            # Validate secret type
            try:
                secret_type_enum = SecretType(secret_type)
            except ValueError:
                raise APIException(
                    message=f"Invalid secret type: {secret_type}",
                    error_code="INVALID_SECRET_TYPE",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            # Upload secret
            await self.secret_service.upload_secret(
                user_id=user_id,
                secret_type=secret_type_enum,
                content=content_str,
            )

            return SuccessResponse(
                success=True,
                message=f"Successfully uploaded {secret_type} secret",
            )

        except APIException:
            # Re-raise API exceptions
            raise
        except Exception as e:
            logger.error(f"Error uploading secret: {e}")
            raise APIException(
                message="Failed to upload secret",
                error_code="SECRET_UPLOAD_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def get_secrets_status(self, request: Request) -> SuccessResponse[SecretStatusResponse]:
        """
        Get status of all GAM secrets for the current user.

        Args:
            request: FastAPI request object

        Returns:
            Success response with secrets status
        """
        try:
            # Get user ID from authenticated request
            user_id = request.state.user.get("sub")

            # Get secrets status
            status = await self.secret_service.get_secrets_status(user_id)

            return SuccessResponse(
                success=True,
                message="Successfully retrieved secrets status",
                data=status,
            )

        except APIException:
            # Re-raise API exceptions
            raise
        except Exception as e:
            logger.error(f"Error getting secrets status: {e}")
            raise APIException(
                message="Failed to get secrets status",
                error_code="SECRET_STATUS_CHECK_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def upload_admin_secret(self, request: Request, file: UploadFile, secret_type: str) -> SuccessResponse:
        """
        Upload a GAM admin secret file. Only accessible by admin users.

        Args:
            request: FastAPI request object
            file: Uploaded file
            secret_type: Type of secret (client_secrets, oauth2, oauth2service)

        Returns:
            Success response
        """
        try:
            # Get user ID from authenticated request
            user_id = request.state.user.get("sub")
            
            # Check if user is admin
            user = await self.user_repository.get_by_id(user_id)
            if not user or user.role_id != "Admin":
                raise APIException(
                    message="Access denied. Admin role required.",
                    error_code="ADMIN_ACCESS_REQUIRED",
                    status_code=status.HTTP_403_FORBIDDEN,
                )

            # Read file content
            content = await file.read()
            content_str = content.decode("utf-8")

            # Validate secret type
            try:
                secret_type_enum = SecretType(secret_type)
            except ValueError:
                raise APIException(
                    message=f"Invalid secret type: {secret_type}",
                    error_code="INVALID_SECRET_TYPE",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            # Upload admin secret
            await self.secret_service.upload_admin_secret(
                secret_type=secret_type_enum,
                content=content_str,
            )

            return SuccessResponse(
                success=True,
                message=f"Successfully uploaded admin {secret_type} secret",
            )

        except APIException:
            # Re-raise API exceptions
            raise
        except Exception as e:
            logger.error(f"Error uploading admin secret: {e}")
            raise APIException(
                message="Failed to upload admin secret",
                error_code="ADMIN_SECRET_UPLOAD_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def get_admin_secrets_status(self, request: Request) -> SuccessResponse[SecretStatusResponse]:
        """
        Get status of all GAM admin secrets. Only accessible by admin users.

        Args:
            request: FastAPI request object

        Returns:
            Success response with admin secrets status
        """
        try:
            # Get user ID from authenticated request
            user_id = request.state.user.get("sub")
            
            # Check if user is admin
            user = await self.user_repository.get_by_id(user_id)
            if not user or user.role_id != "Admin":
                raise APIException(
                    message="Access denied. Admin role required.",
                    error_code="ADMIN_ACCESS_REQUIRED",
                    status_code=status.HTTP_403_FORBIDDEN,
                )

            # Get admin secrets status
            status = await self.secret_service.get_admin_secrets_status()

            return SuccessResponse(
                success=True,
                message="Successfully retrieved admin secrets status",
                data=status,
            )

        except APIException:
            # Re-raise API exceptions
            raise
        except Exception as e:
            logger.error(f"Error getting admin secrets status: {e}")
            raise APIException(
                message="Failed to get admin secrets status",
                error_code="ADMIN_SECRET_STATUS_CHECK_FAILED",
                exception=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
