"""
Environment configuration for GAMGUI.
Handles loading and validating all environment variables required by the application.
"""

import logging
import os
from typing import Any, List, Optional

from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()


def _get_required_env(name: str) -> str:
    """
    Get the value of a required environment variable.

    Args:
        name: The name of the environment variable

    Returns:
        The value of the environment variable

    Raises:
        ValueError: If the environment variable is not set
    """
    value = os.environ.get(name)

    if not value or value is None:
        logging.error(f"Required environment variable '{name}' is not set")
        raise ValueError(f"Required environment variable '{name}' is not set")
    return value


def _get_optional_env(name: str, default: Optional[Any] = None) -> Any:
    """
    Get the value of an optional environment variable.

    Args:
        name: The name of the environment variable
        default: The default value to return if the environment variable is not set

    Returns:
        The value of the environment variable or the default value
    """
    return os.environ.get(name, default)


# API Configuration
PROJECT_ID = _get_required_env("PROJECT_ID")
REGION = _get_required_env("REGION")
ENVIRONMENT = _get_optional_env("ENVIRONMENT", "development")
PORT = int(_get_optional_env("PORT", 8000))

# Derived values
IS_DEVELOPMENT = ENVIRONMENT.lower() == "development"
IS_STAGING = ENVIRONMENT.lower() == "staging"
IS_PRODUCTION = ENVIRONMENT.lower() == "production"

# Registry Configuration
REGISTRY_PROJECT_ID = _get_required_env("REGISTRY_PROJECT_ID")
REGISTRY_REGION = _get_required_env("REGISTRY_REGION")
REGISTRY_REPOSITORY_NAME = _get_required_env("REGISTRY_REPOSITORY_NAME")
# Images
BACKEND_IMAGE_NAME = _get_required_env("BACKEND_IMAGE_NAME")
FRONTEND_IMAGE_NAME = _get_required_env("FRONTEND_IMAGE_NAME")
SESSION_IMAGE_NAME = _get_required_env("SESSION_IMAGE_NAME")

# OAuth Configuration
BACKEND_SERVICE_ACCOUNT_EMAIL = _get_required_env("BACKEND_SERVICE_ACCOUNT_EMAIL")
BACKEND_OAUTH_CLIENT_ID = _get_required_env("BACKEND_OAUTH_CLIENT_ID")
BACKEND_OAUTH_CLIENT_SECRET = _get_required_env("BACKEND_OAUTH_CLIENT_SECRET")
FRONTEND_OAUTH_CLIENT_ID = _get_required_env("FRONTEND_OAUTH_CLIENT_ID")
FRONTEND_OAUTH_CLIENT_SECRET = _get_required_env("FRONTEND_OAUTH_CLIENT_SECRET")

# Authentication
JWT_SECRET = _get_optional_env("JWT_SECRET", f"{BACKEND_OAUTH_CLIENT_SECRET}{FRONTEND_OAUTH_CLIENT_SECRET}")

# Kubernetes/GKE Configuration
CLUSTER_NAME = _get_optional_env("CLUSTER_NAME", "gamgui-sessions")

# Logging
LOG_LEVEL = _get_optional_env("LOG_LEVEL", "INFO" if IS_DEVELOPMENT else "WARNING")


# Validate environment configuration
def validate_environment() -> List[str]:
    """
    Validate the environment configuration.

    Returns:
        A list of validation errors, empty if no errors
    """
    errors = []

    # Validate PORT
    try:
        port = int(PORT)
        if port < 1 or port > 65535:
            errors.append(f"Invalid PORT value: {PORT}. Must be between 1 and 65535")
    except ValueError:
        errors.append(f"Invalid PORT value: {PORT}. Must be an integer")

    # Validate ENVIRONMENT
    valid_environments = ["development", "staging", "production"]
    if ENVIRONMENT.lower() not in valid_environments:
        errors.append(f"Invalid ENVIRONMENT value: {ENVIRONMENT}. Must be one of: {', '.join(valid_environments)}")

    # Validate LOG_LEVEL
    valid_log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
    if LOG_LEVEL not in valid_log_levels:
        errors.append(f"Invalid LOG_LEVEL value: {LOG_LEVEL}. Must be one of: {', '.join(valid_log_levels)}")

    return errors
