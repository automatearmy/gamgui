"""Audit log model for GAMGUI"""

from typing import List, Optional

from pydantic import Field

from models.base_model import BaseModel


class AuditLogMetadata(BaseModel):
    """Audit log metadata model"""

    command: Optional[str] = Field(None, description="Command executed")
    args: Optional[List[str]] = Field(None, description="Command arguments")
    error: Optional[str] = Field(None, description="Error message if failed")
    duration: Optional[int] = Field(None, description="Duration in milliseconds")


class AuditLog(BaseModel):
    """Audit log model"""

    session_id: Optional[str] = Field(None, description="Session ID reference")
    user_id: str = Field(..., description="User ID reference")
    organization_id: str = Field(..., description="Organization ID reference")
    type: str = Field(..., description="Log type (command, session, system)")
    action: str = Field(..., description="Action performed")
    status: str = Field(..., description="Status (success, error)")
    metadata: AuditLogMetadata = Field(default_factory=AuditLogMetadata, description="Additional metadata")
