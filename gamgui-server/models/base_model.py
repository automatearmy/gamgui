"""Base model for all GAMGUI models"""

from datetime import UTC, datetime
from typing import Any, Dict

from pydantic import BaseModel as BD
from pydantic import Field


class BaseModel(BD):
    """Base model that all GAMGUI models extend"""

    id: str = Field(..., description="Unique identifier")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Creation timestamp")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Last update timestamp")

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for Firestore"""
        return self.model_dump(exclude_none=True)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BaseModel":
        """Create model instance from Firestore dictionary"""
        return cls(**data)
