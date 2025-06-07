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

    if value is None:
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
REGISTRY_PROJECT_REGION = _get_required_env("REGISTRY_PROJECT_REGION")
REGISTRY_REPOSITORY_NAME = _get_required_env("REGISTRY_REPOSITORY_NAME")
REGISTRY_SERVER_IMAGE_NAME = _get_required_env("REGISTRY_SERVER_IMAGE_NAME")
REGISTRY_CLIENT_IMAGE_NAME = _get_required_env("REGISTRY_CLIENT_IMAGE_NAME")
REGISTRY_SESSION_MANAGER_IMAGE_NAME = _get_required_env("REGISTRY_SESSION_MANAGER_IMAGE_NAME")

# OAuth Configuration
SERVER_SERVICE_ACCOUNT_EMAIL = _get_required_env("SERVER_SERVICE_ACCOUNT_EMAIL")
SERVER_OAUTH_CLIENT_ID = _get_required_env("SERVER_OAUTH_CLIENT_ID")
SERVER_OAUTH_CLIENT_SECRET = _get_required_env("SERVER_OAUTH_CLIENT_SECRET")
CLIENT_OAUTH_CLIENT_ID = _get_required_env("CLIENT_OAUTH_CLIENT_ID")
CLIENT_OAUTH_UI_CLIENT_SECRET = _get_required_env("CLIENT_OAUTH_UI_CLIENT_SECRET")

# Authentication
JWT_SECRET = _get_optional_env("JWT_SECRET", f"{SERVER_OAUTH_CLIENT_SECRET}{CLIENT_OAUTH_UI_CLIENT_SECRET}")

# Session Configuration
SESSION_IMAGE_PULL_POLICY = _get_optional_env("SESSION_IMAGE_PULL_POLICY", "Always")
SESSION_DEFAULT_PORT = int(_get_optional_env("SESSION_DEFAULT_PORT", 8080))
SESSION_CPU_LIMIT = _get_optional_env("SESSION_CPU_LIMIT", "1")
SESSION_MEMORY_LIMIT = _get_optional_env("SESSION_MEMORY_LIMIT", "1Gi")
SESSION_CPU_REQUEST = _get_optional_env("SESSION_CPU_REQUEST", "0.5")
SESSION_MEMORY_REQUEST = _get_optional_env("SESSION_MEMORY_REQUEST", "512Mi")
SESSION_TIMEOUT_MINUTES = int(_get_optional_env("SESSION_TIMEOUT_MINUTES", 60))
MAX_SESSIONS_PER_USER = int(_get_optional_env("MAX_SESSIONS_PER_USER", 5))

# Logging
LOG_LEVEL = _get_optional_env("LOG_LEVEL", "INFO" if IS_DEVELOPMENT else "WARNING")

# Security
ALLOWED_ORIGINS = _get_optional_env("ALLOWED_ORIGINS", "*").split(",")

# Firestore collection names
USERS_COLLECTION = "users"
ROLES_COLLECTION = "roles"
ORGANIZATIONS_COLLECTION = "organizations"
SESSIONS_COLLECTION = "sessions"
AUDIT_LOGS_COLLECTION = "audit_logs"
COMMAND_HISTORY_COLLECTION = "command_history"


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

    # Validate SESSION_DEFAULT_PORT
    try:
        SESSION_PORT = int(SESSION_DEFAULT_PORT)
        if SESSION_PORT < 1 or SESSION_PORT > 65535:
            errors.append(f"Invalid SESSION_DEFAULT_PORT value: {SESSION_PORT}. Must be between 1 and 65535")
    except ValueError:
        errors.append(f"Invalid SESSION_DEFAULT_PORT value: {SESSION_PORT}. Must be an integer")

    # Validate MAX_SESSIONS_PER_USER
    try:
        max_sessions = int(MAX_SESSIONS_PER_USER)
        if max_sessions < 1:
            errors.append(f"Invalid MAX_SESSIONS_PER_USER value: {MAX_SESSIONS_PER_USER}. Must be at least 1")
    except ValueError:
        errors.append(f"Invalid MAX_SESSIONS_PER_USER value: {MAX_SESSIONS_PER_USER}. Must be an integer")

    # Validate ENVIRONMENT
    valid_environments = ["development", "staging", "production"]
    if ENVIRONMENT.lower() not in valid_environments:
        errors.append(f"Invalid ENVIRONMENT value: {ENVIRONMENT}. Must be one of: {', '.join(valid_environments)}")

    # Validate LOG_LEVEL
    valid_log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
    if LOG_LEVEL not in valid_log_levels:
        errors.append(f"Invalid LOG_LEVEL value: {LOG_LEVEL}. Must be one of: {', '.join(valid_log_levels)}")

    return errors
