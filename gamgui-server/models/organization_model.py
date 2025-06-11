"""Organization model for GAMGUI"""

from typing import List

from pydantic import Field

from models.base_model import BaseModel


class OrganizationSettings(BaseModel):
    """Organization settings model"""

    max_users: int = Field(100, description="Maximum number of users")
    max_sessions_per_user: int = Field(5, description="Maximum sessions per user")
    session_timeout_minutes: int = Field(60, description="Default session timeout in minutes")


class Organization(BaseModel):
    """Organization model"""

    name: str = Field(..., description="Organization name")
    domains: List[str] = Field(..., description="Google Workspace domains")
    settings: OrganizationSettings = Field(default_factory=OrganizationSettings, description="Organization settings")
