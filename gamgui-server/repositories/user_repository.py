"""User repository for GAMGUI"""

from datetime import UTC, datetime
from typing import List, Optional

from models.user_model import User
from repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model"""

    def __init__(self):
        """Initialize repository with User model and collection name"""
        super().__init__(User, "users")

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        users = await self.query("email", "==", email)
        return users[0] if users else None

    async def get_by_organization(self, organization_id: str) -> List[User]:
        """Get all users in an organization"""
        return await self.query("organization_id", "==", organization_id)

    async def get_by_role(self, role_id: str) -> List[User]:
        """Get all users with a specific role"""
        return await self.query("role_id", "==", role_id)

    async def update_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp"""
        user = await self.get_by_id(user_id)
        if user:
            user.last_login_at = datetime.now(UTC)
            await self.update(user)
            return True
        return False
