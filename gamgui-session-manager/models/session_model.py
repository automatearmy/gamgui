"""
Database models for GAMGUI Session Manager.
These models represent the database schema for session-related entities.
"""

from datetime import datetime
from typing import Optional

from pydantic import Field

from models.base_model import BaseModel
from schemas.common import SessionStatus


class PodInfo(BaseModel):
    """Pod information model"""

    name: Optional[str] = Field(None, description="Pod name")
    namespace: str = Field(..., description="Kubernetes namespace")
    ip: Optional[str] = Field(None, description="Pod IP address")
    port: int = Field(8080, description="Pod port")


class Session(BaseModel):
    """Session model"""

    user_id: str = Field(..., description="User ID reference")
    organization_id: str = Field(..., description="Organization ID reference")
    name: str = Field(..., description="Session name")
    description: Optional[str] = Field(None, description="Session description")
    status: SessionStatus = Field(SessionStatus.CREATING, description="Session status")
    pod_info: PodInfo = Field(..., description="Pod information")
    expires_at: datetime = Field(..., description="Session expiration timestamp")
    last_activity_at: Optional[datetime] = Field(None, description="Last activity timestamp")
    terminated_at: Optional[datetime] = Field(None, description="Termination timestamp")
    websocket_url: Optional[str] = Field(None, description="WebSocket URL for direct connection")
