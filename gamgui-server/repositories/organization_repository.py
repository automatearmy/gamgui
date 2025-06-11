"""Organization repository for GAMGUI"""

from typing import Optional

from models.organization_model import Organization
from repositories.base_repository import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):
    """Repository for Organization model"""

    def __init__(self):
        """Initialize repository with Organization model and collection name"""
        super().__init__(Organization, "organizations")

    async def get_by_domain(self, domain: str) -> Optional[Organization]:
        """Get organization by domain"""
        orgs = await self.get_all()
        for org in orgs:
            if domain in org.domains:
                return org
        return None

    async def get_by_name(self, name: str) -> Optional[Organization]:
        """Get organization by name"""
        orgs = await self.query("name", "==", name)
        return orgs[0] if orgs else None

    async def update_settings(self, org_id: str, settings: dict) -> bool:
        """Update organization settings"""
        org = await self.get_by_id(org_id)
        if not org:
            return False

        # Update only provided settings
        for key, value in settings.items():
            if hasattr(org.settings, key):
                setattr(org.settings, key, value)

        await self.update(org)
        return True

    async def add_domain(self, org_id: str, domain: str) -> bool:
        """Add domain to organization"""
        org = await self.get_by_id(org_id)
        if not org:
            return False

        if domain not in org.domains:
            org.domains.append(domain)
            await self.update(org)

        return True
