"""
Firestore client for GAMGUI.
Provides a singleton instance of the Firestore client.
"""

import logging
from typing import Optional

from firebase_admin import firestore, initialize_app

logger = logging.getLogger(__name__)

# Global Firestore client instance
_db: Optional[firestore.Client] = None


def get_db() -> firestore.Client:
    """
    Get or initialize the Firestore client instance.
    This implements a singleton pattern to ensure only one client is created.

    Returns:
        Firestore client instance

    Raises:
        RuntimeError: If initialization fails
    """
    global _db

    if _db is None:
        try:
            # Initialize Firebase Admin SDK with Application Default Credentials
            initialize_app()
            logger.info("Firebase Admin SDK initialized")

            # Create Firestore client
            _db = firestore.client()
            logger.info("Firestore client initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Firestore client: {e}")
            raise RuntimeError(f"Firestore initialization error: {e}")

    return _db
