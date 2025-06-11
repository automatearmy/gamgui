"""
Schemas for GAM secrets management.
"""

from enum import Enum

from pydantic import BaseModel, Field


class SecretType(str, Enum):
    """Types of GAM secrets"""

    CLIENT_SECRETS = "client_secrets"
    OAUTH2 = "oauth2"
    OAUTH2SERVICE = "oauth2service"


class SecretUploadRequest(BaseModel):
    """Request model for uploading a GAM secret"""

    secret_type: SecretType = Field(..., description="Type of GAM secret")
    content: str = Field(..., description="Content of the secret file")


class SecretStatusResponse(BaseModel):
    """Response model for secret status check"""

    client_secrets_exists: bool = Field(..., description="Whether client_secrets.json exists")
    oauth2_exists: bool = Field(..., description="Whether oauth2.txt exists")
    oauth2service_exists: bool = Field(..., description="Whether oauth2service.json exists")
    all_secrets_exist: bool = Field(..., description="Whether all required secrets exist")
