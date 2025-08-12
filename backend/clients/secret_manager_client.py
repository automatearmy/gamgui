"""
Secret Manager client for GAMGUI.
Provides functions to interact with Google Secret Manager.
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
    """
    global _client

    if _client is None:
        _client = secretmanager.SecretManagerServiceClient()
        logger.info("Secret Manager client initialized successfully")

    return _client


def get_secret_path(project_id: str, secret_id: str, version: str = "latest") -> str:
    """
    Get the full path to a secret version.

    Args:
        project_id: Google Cloud project ID
        secret_id: Secret ID
        version: Secret version (default: "latest")

    Returns:
        Full path to the secret version
    """
    return f"projects/{project_id}/secrets/{secret_id}/versions/{version}"
