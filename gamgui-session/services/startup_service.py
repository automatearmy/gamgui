"""
Startup service for GAMGUI Session Manager.
Handles session initialization and secret mounting.
"""

import logging
import os
from typing import Optional

from clients.firestore_client import get_db
from clients.secret_manager_client import get_client
from config import environment
from models.session_model import Session
from schemas.common import SecretType
from services.gam_config_service import GamConfigService

logger = logging.getLogger(__name__)


class StartupService:
    """Service for handling session startup and initialization"""

    def __init__(self):
        self.db = get_db()
        self.secret_client = get_client()
        self.project_id = environment.PROJECT_ID
        self.session_id = environment.SESSION_ID
        self.gam_config_dir = environment.GAM_CONFIG_DIR

    async def initialize_session(self) -> bool:
        """
        Initialize the session by:
        1. Fetching session information from Firestore
        2. Retrieving user secrets from Secret Manager
        3. Mounting secrets as files in GAM configuration directory

        Returns:
            True if initialization successful, False otherwise
        """
        try:
            logger.info(f"Starting session initialization for session: {self.session_id}")

            # Step 1: Fetch session information from Firestore
            try:
                session = await self._fetch_session_from_firestore()
                if not session:
                    logger.error("Failed to fetch session information from Firestore")
                    return False
                logger.info(f"Session found for user: {session.user_id}")
            except Exception as e:
                logger.error(f"Firestore connection failed: {e}")
                return False

            # Step 2: Ensure GAM config directory exists
            try:
                await self._ensure_gam_config_directory()
            except Exception as e:
                logger.error(f"Failed to create GAM config directory: {e}")
                return False

            # Step 3: Fetch and mount user secrets
            try:
                secrets_mounted = await self._mount_user_secrets(session.user_id)
                if not secrets_mounted:
                    logger.error("Failed to mount user secrets")
                    return False
            except Exception as e:
                logger.error(f"Secret mounting failed: {e}")
                return False

            # Step 4: Generate GAM configuration file and directories
            try:
                await self._generate_gam_config()
            except Exception as e:
                logger.error(f"Failed to generate GAM config file: {e}")
                return False

            logger.info("Session initialization completed successfully")
            return True

        except Exception as e:
            logger.error(f"Unexpected error during session initialization: {e}")
            logger.exception("Full traceback:")
            return False

    async def _fetch_session_from_firestore(self) -> Optional[Session]:
        """
        Fetch session information from Firestore.

        Returns:
            Session object if found, None otherwise
        """
        try:
            # Query sessions collection for the session ID
            sessions_ref = self.db.collection("sessions")
            doc_ref = sessions_ref.document(self.session_id)
            doc = doc_ref.get()

            if not doc.exists:
                logger.error(f"Session {self.session_id} not found in Firestore")
                return None

            # Convert Firestore document to Session model
            session_data = doc.to_dict()
            session_data["id"] = doc.id

            session = Session.from_dict(session_data)
            logger.info(f"Successfully fetched session: {session.name}")

            return session

        except Exception as e:
            logger.error(f"Error fetching session from Firestore: {e}")
            return None

    async def _ensure_gam_config_directory(self) -> None:
        """
        Ensure the GAM configuration directory exists.
        """
        try:
            os.makedirs(self.gam_config_dir, exist_ok=True)
            logger.info(f"GAM config directory ready: {self.gam_config_dir}")
        except Exception as e:
            logger.error(f"Error creating GAM config directory: {e}")
            raise

    async def _mount_user_secrets(self, user_id: str) -> bool:
        """
        Fetch user secrets from Secret Manager and mount them as files.

        Args:
            user_id: User ID for the session

        Returns:
            True if all secrets mounted successfully, False otherwise
        """
        try:
            # Define the secrets we need to fetch and their target filenames
            secrets_config = [
                {"secret_type": SecretType.OAUTH2, "filename": "oauth2.txt"},
                {"secret_type": SecretType.OAUTH2SERVICE, "filename": "oauth2service.json"},
                {"secret_type": SecretType.CLIENT_SECRETS, "filename": "client_secrets.json"},
            ]

            # Fetch and mount each secret
            for secret_config in secrets_config:
                secret_content = await self._fetch_secret_content(user_id, secret_config["secret_type"])

                if not secret_content:
                    logger.error(f"Failed to fetch {secret_config['secret_type']} for user {user_id}")
                    return False

                file_path = os.path.join(self.gam_config_dir, secret_config["filename"])
                await self._write_secret_to_file(file_path, secret_content)

                logger.info(f"Successfully mounted {secret_config['filename']}")

            logger.info("All user secrets mounted successfully")
            return True

        except Exception as e:
            logger.error(f"Error mounting user secrets: {e}")
            return False

    async def _fetch_secret_content(self, user_id: str, secret_type: SecretType) -> Optional[str]:
        """
        Fetch secret content from Secret Manager.

        Args:
            user_id: User ID
            secret_type: Type of secret to fetch

        Returns:
            Secret content as string, None if not found
        """
        try:
            # Create secret ID in format "secret_type___user_id"
            secret_id = f"{secret_type.value}___{user_id}"
            secret_name = f"projects/{self.project_id}/secrets/{secret_id}/versions/latest"

            logger.info(f"Fetching secret: {secret_id}")

            # Fetch the secret version
            response = self.secret_client.access_secret_version(request={"name": secret_name})

            # Decode the secret content
            secret_content = response.payload.data.decode("UTF-8")

            logger.info(f"Successfully fetched secret: {secret_id}")
            return secret_content

        except Exception as e:
            logger.error(f"Error fetching secret {secret_type.value} for user {user_id}: {e}")
            return None

    async def _write_secret_to_file(self, file_path: str, content: str) -> None:
        """
        Write secret content to a file.

        Args:
            file_path: Full path to the target file
            content: Content to write

        Raises:
            Exception: If file writing fails
        """
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)

            # Set appropriate permissions (readable by owner only)
            os.chmod(file_path, 0o600)

            logger.info(f"Secret written to file: {file_path}")

        except Exception as e:
            logger.error(f"Error writing secret to file {file_path}: {e}")
            raise

    async def _generate_gam_config(self) -> None:
        """
        Generate GAM configuration file and required directories.
        """
        try:
            # Create GAM config service instance
            gam_config_service = GamConfigService(self.gam_config_dir)

            # Generate the GAM configuration file
            gam_config_service.generate_gam_config()

            # Create required directories
            gam_config_service.create_downloads_directory()
            gam_config_service.create_cache_directory()

            logger.info("GAM configuration setup completed successfully")

        except Exception as e:
            logger.error(f"Error generating GAM configuration: {e}")
            raise
