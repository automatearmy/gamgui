"""Session repository for GAMGUI"""

from datetime import UTC, datetime, timedelta
from typing import List, Optional

from models.session_model import Session, SessionStatus
from repositories.base_repository import BaseRepository


class SessionRepository(BaseRepository[Session]):
    """Repository for Session model"""

    def __init__(self):
        """Initialize repository with Session model and collection name"""
        super().__init__(Session, "sessions")

    async def get_by_user(self, user_id: str) -> List[Session]:
        """Get all sessions for a specific user"""
        return await self.query("user_id", "==", user_id)

    async def get_active_sessions(self, user_id: Optional[str] = None) -> List[Session]:
        """Get all active sessions, optionally filtered by user"""
        if user_id:
            # For specific user, we use query_multi to filter by user and active statuses
            creating_sessions = await self.query_multi(
                [("user_id", "==", user_id), ("status", "==", SessionStatus.CREATING.value)]
            )

            active_sessions = await self.query_multi(
                [("user_id", "==", user_id), ("status", "==", SessionStatus.ACTIVE.value)]
            )

            return creating_sessions + active_sessions
        else:
            # For all users, we query for each status separately and combine
            creating_sessions = await self.query("status", "==", SessionStatus.CREATING.value)
            active_sessions = await self.query("status", "==", SessionStatus.ACTIVE.value)

            return creating_sessions + active_sessions

    async def get_by_organization(self, organization_id: str) -> List[Session]:
        """Get all sessions for an organization"""
        return await self.query("organization_id", "==", organization_id)

    async def update_status(self, session_id: str, status: SessionStatus) -> bool:
        """Update session status"""
        session = await self.get_by_id(session_id)
        if not session:
            return False

        session.status = status
        if status == SessionStatus.TERMINATED:
            session.terminated_at = datetime.now(UTC)

        await self.update(session)
        return True

    async def update_last_activity(self, session_id: str) -> bool:
        """Update session last activity timestamp"""
        session = await self.get_by_id(session_id)
        if not session:
            return False

        session.last_activity_at = datetime.now(UTC)
        await self.update(session)
        return True

    async def extend_session(self, session_id: str, minutes: int) -> bool:
        """Extend session expiry time"""
        session = await self.get_by_id(session_id)
        if not session or session.status not in [SessionStatus.CREATING, SessionStatus.ACTIVE]:
            return False

        # Calculate new expiry time
        session.expires_at = datetime.now(UTC) + timedelta(minutes=minutes)
        await self.update(session)
        return True

    async def get_expired_sessions(self) -> List[Session]:
        """Get all expired sessions that are still active"""
        now = datetime.now(UTC)
        all_active = await self.get_active_sessions()
        return [s for s in all_active if s.expires_at and s.expires_at < now]
