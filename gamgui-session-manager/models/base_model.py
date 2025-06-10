"""
Base model for GAMGUI Session Manager.
Provides common functionality for all models.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field


class BaseModel(PydanticBaseModel):
    """Base model with common fields and functionality"""

    id: Optional[str] = Field(None, description="Document ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

    class Config:
        """Pydantic configuration"""

        json_encoders = {datetime: lambda v: v.isoformat()}
        validate_assignment = True
        use_enum_values = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return self.model_dump(exclude_none=True)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BaseModel":
        """Create model from dictionary"""
        return cls(**data)
