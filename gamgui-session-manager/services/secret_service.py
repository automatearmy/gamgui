"""Secret management service for GAM Session Worker"""
import logging
from typing import Optional

from google.cloud import secretmanager
from config.environment import env

logger = logging.getLogger(__name__)


class SecretService:
    """Service for managing secrets from Google Secret Manager"""
    
    def __init__(self):
        self.client: Optional[secretmanager.SecretManagerServiceClient] = None
        self._initialize_client()
    
    def _initialize_client(self) -> None:
        """Initialize Google Secret Manager client if project_id is available"""
        if env.project_id:
            try:
                self.client = secretmanager.SecretManagerServiceClient()
                logger.info("Google Secret Manager client initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Secret Manager client: {e}")
                self.client = None
        else:
            logger.info("No PROJECT_ID set, Secret Manager client not initialized")
    
    async def get_secret(self, secret_name: str, version: str = "latest") -> Optional[str]:
        """Get secret value from Google Secret Manager"""
        if not self.client or not env.project_id:
            logger.warning(f"Secret Manager not available, cannot retrieve secret: {secret_name}")
            return None
        
        try:
            secret_path = f"projects/{env.project_id}/secrets/{secret_name}/versions/{version}"
            response = self.client.access_secret_version(request={"name": secret_path})
            secret_value = response.payload.data.decode("UTF-8")
            
            logger.info(f"Successfully retrieved secret: {secret_name}")
            return secret_value
            
        except Exception as e:
            logger.error(f"Failed to retrieve secret {secret_name}: {e}")
            return None
    
    def is_available(self) -> bool:
        """Check if Secret Manager is available"""
        return self.client is not None and env.project_id is not None
