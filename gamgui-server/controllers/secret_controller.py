"""
Secret controller for GAMGUI API.
Handles GAM secrets management.
"""

import logging

from fastapi import Request, UploadFile, status

from errors.exceptions import APIException
from schemas.responses import SuccessResponse
from schemas.secret_schemas import SecretStatusResponse, SecretType
from services.secret_service import SecretService

logger = logging.getLogger(__name__)


class SecretController:
    """Controller for GAM secrets-related endpoints"""

    def __init__(self):
        self.secret_service = SecretService()

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
