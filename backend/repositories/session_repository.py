"""Session repository for GAMGUI"""

from typing import List, Optional

from models.session_model import Session
from repositories.base_repository import BaseRepository
from schemas.common import SessionStatus


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
            pending_sessions = await self.query_multi(
                [("user_id", "==", user_id), ("status", "==", SessionStatus.PENDING.value)]
            )

            running_sessions = await self.query_multi(
                [("user_id", "==", user_id), ("status", "==", SessionStatus.RUNNING.value)]
            )

            return pending_sessions + running_sessions
        else:
            # For all users, we query for each status separately and combine
            pending_sessions = await self.query("status", "==", SessionStatus.PENDING.value)
            running_sessions = await self.query("status", "==", SessionStatus.RUNNING.value)

            return pending_sessions + running_sessions

    async def update_status(self, session_id: str, status: SessionStatus) -> bool:
        """Update session status"""
        session = await self.get_by_id(session_id)
        if not session:
            return False

        session.status = status
        await self.update(session)
        return True
