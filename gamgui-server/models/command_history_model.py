"""Command history model for GAMGUI"""

from pydantic import Field

from models.base_model import BaseModel


class CommandHistory(BaseModel):
    """Command history model"""

    session_id: str = Field(..., description="Session ID reference")
    user_id: str = Field(..., description="User ID reference")
    command: str = Field(..., description="Command executed")
    output: str = Field(..., description="Command output")
    exit_code: int = Field(0, description="Command exit code")
    duration: int = Field(0, description="Execution duration in milliseconds")
