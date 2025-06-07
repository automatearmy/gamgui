"""
Session schemas for GAMGUI API.
Defines data models for session operations.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from schemas.common import SessionStatus


class CreateSessionRequest(BaseModel):
    """Request model for session creation"""

    name: str = Field(..., description="Session name", min_length=1, max_length=100)
    description: str = Field(..., description="Session description", max_length=500)
    timeout_minutes: int = Field(60, description="Session timeout in minutes", ge=1, le=480)
    domain: str = Field(..., description="Google Workspace domain for the session")


class SessionListItem(BaseModel):
    """Simplified session information for listings"""

    id: str
    name: Optional[str] = None
    status: SessionStatus
    created_at: datetime
    expires_at: Optional[datetime] = None
