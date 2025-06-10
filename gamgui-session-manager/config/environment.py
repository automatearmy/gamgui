"""
Environment configuration for GAMGUI Session Manager.
Handles loading and validating all environment variables with comprehensive type checking and validation.
"""

from enum import Enum
import logging
import os
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError, field_validator

# Load environment variables from .env file if present
load_dotenv()

# Suppress gRPC fork warnings in development
os.environ.setdefault("GRPC_ENABLE_FORK_SUPPORT", "0")
os.environ.setdefault("GRPC_POLL_STRATEGY", "poll")

logger = logging.getLogger(__name__)


class Environment(str, Enum):
    """Valid environment types"""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class LogLevel(str, Enum):
    """Valid log levels"""

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class AppConfig(BaseModel):
    """Application configuration model with validation"""

    # Required Configuration
    project_id: str = Field(..., min_length=1, description="Google Cloud Project ID")
    region: str = Field(..., min_length=1, description="Google Cloud Region")
    environment: Environment = Field(..., description="Application environment")
    domain: str = Field(..., min_length=1, description="Application domain")
    session_id: str = Field(..., min_length=1, description="Session ID")
    port: int = Field(..., ge=1, le=65535, description="Server port")
    jwt_secret: str = Field(..., min_length=32, description="JWT secret key")

    # Optional Configuration
    log_level: LogLevel = Field(LogLevel.INFO, description="Logging level")
    allowed_origins: List[str] = Field(["*"], description="CORS allowed origins")
    gam_path: str = Field("/usr/local/gam/gam7/gam", description="Path to GAM executable")
    gam_config_dir: str = Field("/gam-config", description="GAM configuration directory")

    model_config = {
        "use_enum_values": True,
        "validate_assignment": True,
    }

    @field_validator("project_id")
    @classmethod
    def validate_project_id(cls, v: str) -> str:
        """Validate Google Cloud Project ID format"""
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Project ID must contain only alphanumeric characters, hyphens, and underscores")
        if len(v) < 6 or len(v) > 30:
            raise ValueError("Project ID must be between 6 and 30 characters")
        return v

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        """Basic domain validation"""
        if "." not in v:
            raise ValueError("Domain must contain at least one dot")
        return v

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, v: str) -> str:
        """Validate session ID format"""
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Session ID must contain only alphanumeric characters, hyphens, and underscores")
        return v

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        """Validate JWT secret strength"""
        if len(v) < 20:
            raise ValueError("JWT secret must be at least 20 characters long")
        return v

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def validate_allowed_origins(cls, v) -> List[str]:
        """Parse and validate CORS origins"""
        if isinstance(v, str):
            # Split comma-separated string into list
            origins = [origin.strip() for origin in v.split(",") if origin.strip()]
            return origins if origins else ["*"]
        return v

    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == Environment.DEVELOPMENT

    @property
    def is_staging(self) -> bool:
        """Check if running in staging environment"""
        return self.environment == Environment.STAGING

    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == Environment.PRODUCTION


def _get_env_var(name: str, default: Optional[str] = None, required: bool = True) -> Optional[str]:
    """
    Get environment variable with proper error handling.

    Args:
        name: Environment variable name
        default: Default value if not set
        required: Whether the variable is required

    Returns:
        Environment variable value or default

    Raises:
        ValueError: If required variable is not set
    """
    value = os.environ.get(name, default)

    if required and (value is None or value == ""):
        raise ValueError(f"Required environment variable '{name}' is not set")

    return value


def _load_config() -> AppConfig:
    """
    Load and validate application configuration from environment variables.

    Returns:
        Validated AppConfig instance

    Raises:
        ValueError: If configuration is invalid
    """
    try:
        # Collect all environment variables
        config_data = {
            "project_id": _get_env_var("PROJECT_ID"),
            "region": _get_env_var("REGION"),
            "environment": _get_env_var("ENVIRONMENT"),
            "domain": _get_env_var("DOMAIN"),
            "session_id": _get_env_var("SESSION_ID"),
            "port": int(_get_env_var("PORT")),
            "jwt_secret": _get_env_var("JWT_SECRET"),
            "log_level": _get_env_var("LOG_LEVEL", "INFO", required=False),
            "allowed_origins": _get_env_var("ALLOWED_ORIGINS", "*", required=False),
            "gam_path": _get_env_var("GAM_PATH", "/usr/local/gam/gam7/gam", required=False),
            "gam_config_dir": _get_env_var("GAM_CONFIG_DIR", "/gam-config", required=False),
        }

        # Create and validate configuration
        config = AppConfig(**config_data)
        logger.info("Environment configuration loaded and validated successfully")
        return config

    except ValidationError as e:
        error_messages = []

        for error in e.errors():
            field = " -> ".join(str(x) for x in error["loc"])
            message = error["msg"]
            error_messages.append(f"{field}: {message}")

        raise ValueError("Configuration validation failed:\n" + "\n".join(error_messages))

    except ValueError as e:
        raise ValueError(f"Configuration error: {e}")

    except Exception as e:
        raise ValueError(f"Unexpected configuration error: {e}")


def validate_environment() -> List[str]:
    """
    Validate environment configuration and return any errors.

    Returns:
        List of validation error messages (empty if valid)
    """
    try:
        _load_config()
        return []
    except ValueError as e:
        return [str(e)]
    except Exception as e:
        return [f"Unexpected validation error: {e}"]


# Load configuration at module level
try:
    config = _load_config()

    # Export individual values for backward compatibility
    PROJECT_ID = config.project_id
    REGION = config.region
    ENVIRONMENT = config.environment
    DOMAIN = config.domain
    SESSION_ID = config.session_id
    PORT = config.port
    JWT_SECRET = config.jwt_secret
    LOG_LEVEL = config.log_level
    ALLOWED_ORIGINS = config.allowed_origins
    GAM_PATH = config.gam_path
    GAM_CONFIG_DIR = config.gam_config_dir

    # Derived boolean values
    IS_DEVELOPMENT = config.is_development
    IS_STAGING = config.is_staging
    IS_PRODUCTION = config.is_production

    logger.info(f"Configuration loaded: {config.environment} environment")

except Exception as e:
    logger.error(f"Failed to load configuration: {e}")
    # Re-raise to prevent application startup with invalid config
    raise
