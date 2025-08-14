"""
Session schemas for GAMGUI API.
Defines data models for session operations.
"""

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    """Request model for session creation"""

    name: str = Field(..., description="Session name", min_length=1, max_length=100)
    description: str = Field(..., description="Session description", max_length=500)
    session_type: str = Field("User", description="Session type: 'User' or 'Admin'")
