"""
Health schemas for GAMGUI API.
Defines data models for health and environment information.
"""

from datetime import datetime

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Response model for health check"""

    status: str
    timestamp: datetime
    environment: str
    project_id: str
    version: str = "1.0.0"


class EnvironmentInfoResponse(BaseModel):
    """Response model for environment information"""

    environment: str
    project_id: str
    system_info: dict
    api_info: dict
