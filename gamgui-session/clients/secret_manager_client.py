"""
Secret Manager client for GAMGUI Session Manager.
Provides a singleton instance of the Secret Manager client.
"""

import logging
from typing import Optional

from google.cloud import secretmanager

logger = logging.getLogger(__name__)

# Global Secret Manager client instance
_client: Optional[secretmanager.SecretManagerServiceClient] = None


def get_client() -> secretmanager.SecretManagerServiceClient:
    """
    Get or initialize the Secret Manager client instance.
    This implements a singleton pattern to ensure only one client is created.

    Returns:
        Secret Manager client instance

    Raises:
        RuntimeError: If initialization fails
    """
    global _client

    if _client is None:
        try:
            # Create Secret Manager client with Application Default Credentials
            _client = secretmanager.SecretManagerServiceClient()
            logger.info("Secret Manager client initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Secret Manager client: {e}")
            raise RuntimeError(f"Secret Manager initialization error: {e}")

    return _client
