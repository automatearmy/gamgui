"""
Authentication schemas for GAMGUI API.
Defines data models for authentication operations.
"""

import datetime
from typing import Optional

from pydantic import BaseModel


class TokenResponse(BaseModel):
    """Response model for successful authentication"""

    token: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    expires_at: datetime.datetime


class SessionResponse(BaseModel):
    """Response model for session status"""

    authenticated: bool
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
