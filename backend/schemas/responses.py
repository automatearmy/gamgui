"""
Response schemas for GAMGUI API.
Provides standardized response models for consistent API responses.
"""

from typing import Any, Dict, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

# Type variable for generic response data
T = TypeVar("T")


class ResponseBase(BaseModel):
    """Base class for all API responses"""

    success: bool = Field(description="Whether the request was successful")
    message: Optional[str] = Field(None, description="Human-readable message about the response")


class SuccessResponse(ResponseBase, Generic[T]):
    """Standard success response with generic data"""

    success: bool = True
    data: Optional[T] = Field(None, description="Response data payload")
    error: None = None


class ErrorResponse(ResponseBase):
    """Standard error response"""

    success: bool = False
    data: None = None
    error: Dict[str, Any] = Field(..., description="Error details")
