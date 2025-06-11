"""Role repository for GAMGUI"""

from typing import List, Optional

from models.role_model import Role
from repositories.base_repository import BaseRepository


class RoleRepository(BaseRepository[Role]):
    """Repository for Role model"""

    def __init__(self):
        """Initialize repository with Role model and collection name"""
        super().__init__(Role, "roles")

    async def get_by_name(self, name: str) -> Optional[Role]:
        """Get role by name"""
        roles = await self.query("name", "==", name)
        return roles[0] if roles else None

    async def get_default_role(self) -> Optional[Role]:
        """Get the default role for new users"""
        roles = await self.query("name", "==", "User")
        return roles[0] if roles else None

    async def get_admin_roles(self) -> List[Role]:
        """Get all admin roles"""
        admin_roles = []
        roles = await self.get_all()
        for role in roles:
            if role.permissions.can_manage_users:
                admin_roles.append(role)
        return admin_roles
