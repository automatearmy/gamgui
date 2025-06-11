"""Role model for GAMGUI"""

from typing import List

from pydantic import Field

from models.base_model import BaseModel


class RolePermissions(BaseModel):
    """Role permissions model"""

    can_create_sessions: bool = Field(False, description="Can create GAM sessions")
    can_view_all_sessions: bool = Field(False, description="Can view all user sessions")
    can_manage_users: bool = Field(False, description="Can manage users")
    can_view_audit_logs: bool = Field(False, description="Can view audit logs")
    max_concurrent_sessions: int = Field(1, description="Maximum concurrent sessions")
    allowed_gam_commands: List[str] = Field(default_factory=list, description="Allowed GAM commands")


class Role(BaseModel):
    """Role model"""

    name: str = Field(..., description="Role name")
    permissions: RolePermissions = Field(default_factory=RolePermissions, description="Role permissions")
