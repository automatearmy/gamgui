"""
Secret management service for GAMGUI API.
Handles operations related to GAM secrets.
"""

import logging

from google.api_core.exceptions import NotFound

from clients.secret_manager_client import get_client
from config import environment
from errors.exceptions import APIException
from schemas.secret_schemas import SecretStatusResponse, SecretType

logger = logging.getLogger(__name__)


class SecretService:
    """Service for handling GAM secrets"""

    def __init__(self):
        self.client = get_client()
        self.project_id = environment.PROJECT_ID

    async def upload_secret(self, user_id: str, secret_type: SecretType, content: str) -> bool:
        """
        Upload a GAM secret to Secret Manager.

        Args:
            user_id: User ID
            secret_type: Type of secret
            content: Content of the secret file

        Returns:
            True if successful

        Raises:
            APIException: If the operation fails
        """
        try:
            # Create secret ID in format "secret_type___user_id"
            secret_id = f"{secret_type.value}___{user_id}"

            # Check if secret exists
            secret_exists = await self._secret_exists(secret_id)

            if not secret_exists:
                # Create new secret
                parent = f"projects/{self.project_id}"

                self.client.create_secret(
                    request={
                        "parent": parent,
                        "secret_id": secret_id,
                        "secret": {"replication": {"automatic": {}}},
                    }
                )
                logger.info(f"Created new secret: {secret_id}")

            # Add new version with the content
            parent = f"projects/{self.project_id}/secrets/{secret_id}"

            self.client.add_secret_version(
                request={
                    "parent": parent,
                    "payload": {"data": content.encode("UTF-8")},
                }
            )
            logger.info(f"Added new version to secret: {secret_id}")

            return True

        except Exception as e:
            logger.error(f"Error uploading secret: {e}")
            raise APIException(
                message=f"Failed to upload {secret_type} secret",
                error_code="SECRET_UPLOAD_FAILED",
                exception=str(e),
            )

    async def upload_admin_secret(self, secret_type: SecretType, content: str) -> bool:
        """
        Upload a GAM admin secret to Secret Manager.

        Args:
            secret_type: Type of secret
            content: Content of the secret file

        Returns:
            True if successful

        Raises:
            APIException: If the operation fails
        """
        try:
            # Create secret ID in format "secret_type___admin"
            secret_id = f"{secret_type.value}___admin"

            # Check if secret exists
            secret_exists = await self._secret_exists(secret_id)

            if not secret_exists:
                # Create new secret
                parent = f"projects/{self.project_id}"

                self.client.create_secret(
                    request={
                        "parent": parent,
                        "secret_id": secret_id,
                        "secret": {"replication": {"automatic": {}}},
                    }
                )
                logger.info(f"Created new admin secret: {secret_id}")

            # Add new version with the content
            parent = f"projects/{self.project_id}/secrets/{secret_id}"

            self.client.add_secret_version(
                request={
                    "parent": parent,
                    "payload": {"data": content.encode("UTF-8")},
                }
            )
            logger.info(f"Added new version to admin secret: {secret_id}")

            return True

        except Exception as e:
            logger.error(f"Error uploading admin secret: {e}")
            raise APIException(
                message=f"Failed to upload admin {secret_type} secret",
                error_code="ADMIN_SECRET_UPLOAD_FAILED",
                exception=str(e),
            )

    async def get_secrets_status(self, user_id: str) -> SecretStatusResponse:
        """
        Check if all required GAM secrets exist for a user.

        Args:
            user_id: User ID

        Returns:
            SecretStatusResponse with status of each secret
        """
        try:
            # Check each secret type
            client_secrets_exists = await self._secret_exists(f"{SecretType.CLIENT_SECRETS.value}___{user_id}")
            oauth2_exists = await self._secret_exists(f"{SecretType.OAUTH2.value}___{user_id}")
            oauth2service_exists = await self._secret_exists(f"{SecretType.OAUTH2SERVICE.value}___{user_id}")

            # All secrets exist if each individual secret exists
            all_secrets_exist = client_secrets_exists and oauth2_exists and oauth2service_exists

            return SecretStatusResponse(
                client_secrets_exists=client_secrets_exists,
                oauth2_exists=oauth2_exists,
                oauth2service_exists=oauth2service_exists,
                all_secrets_exist=all_secrets_exist,
            )

        except Exception as e:
            logger.error(f"Error checking secrets status: {e}")
            raise APIException(
                message="Failed to check secrets status",
                error_code="SECRET_STATUS_CHECK_FAILED",
                exception=str(e),
            )

    async def get_admin_secrets_status(self) -> SecretStatusResponse:
        """
        Check if all required GAM admin secrets exist.

        Returns:
            SecretStatusResponse with status of each admin secret
        """
        try:
            # Check each admin secret type
            client_secrets_exists = await self._secret_exists(f"{SecretType.CLIENT_SECRETS.value}___admin")
            oauth2_exists = await self._secret_exists(f"{SecretType.OAUTH2.value}___admin")
            oauth2service_exists = await self._secret_exists(f"{SecretType.OAUTH2SERVICE.value}___admin")

            # All secrets exist if each individual secret exists
            all_secrets_exist = client_secrets_exists and oauth2_exists and oauth2service_exists

            return SecretStatusResponse(
                client_secrets_exists=client_secrets_exists,
                oauth2_exists=oauth2_exists,
                oauth2service_exists=oauth2service_exists,
                all_secrets_exist=all_secrets_exist,
            )

        except Exception as e:
            logger.error(f"Error checking admin secrets status: {e}")
            raise APIException(
                message="Failed to check admin secrets status",
                error_code="ADMIN_SECRET_STATUS_CHECK_FAILED",
                exception=str(e),
            )

    async def _secret_exists(self, secret_id: str) -> bool:
        """
        Check if a secret exists.

        Args:
            secret_id: Secret ID

        Returns:
            True if the secret exists, False otherwise
        """
        try:
            name = f"projects/{self.project_id}/secrets/{secret_id}"
            self.client.get_secret(request={"name": name})
            return True
        except NotFound:
            return False
        except Exception as e:
            logger.error(f"Error checking if secret exists: {e}")
            return False
