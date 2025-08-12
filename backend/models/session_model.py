"""
Database models for GAMGUI Session API.
These models represent the database schema for session-related entities.
"""

from typing import Optional

from pydantic import Field

from models.base_model import BaseModel
from schemas.common import SessionStatus


class PodInfo(BaseModel):
    """Pod information model"""

    name: Optional[str] = Field(None, description="Pod name")
    namespace: str = Field(..., description="Kubernetes namespace")


class Session(BaseModel):
    """Session model"""

    user_id: str = Field(..., description="User ID reference")
    name: str = Field(..., description="Session name")
    description: Optional[str] = Field(None, description="Session description")
    status: SessionStatus = Field(SessionStatus.PENDING, description="Session status")
    pod_name: str = Field(..., description="Kubernetes POD name")
    pod_namespace: str = Field(..., description="Kubernetes POD namespace")
