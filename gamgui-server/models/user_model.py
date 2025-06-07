"""User model for GAMGUI"""

from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field

from models.base_model import BaseModel


class User(BaseModel):
    """User model"""

    email: EmailStr = Field(..., description="User email address")
    display_name: str = Field(..., description="User display name")
    picture: Optional[str] = Field(None, description="Profile picture URL")
    role_id: str = Field(..., description="Role ID reference")
    organization_id: str = Field(..., description="Organization ID reference")
    theme: str = Field("light", description="UI theme")
    timezone: str = Field("UTC", description="User timezone")
    status: str = Field("active", description="User status")
    last_login_at: Optional[datetime] = Field(None, description="Last login timestamp")
