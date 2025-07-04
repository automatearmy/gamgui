"""Session repository for GAMGUI"""

from datetime import UTC, datetime, timedelta
from typing import List, Optional

from models.session_model import Session
from schemas.common import SessionStatus
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
                [("user_id", "==", user_id), ("status", "==", SessionStatus.CREATING)]
            )

            running_sessions = await self.query_multi(
                [("user_id", "==", user_id), ("status", "==", SessionStatus.RUNNING)]
            )

            return creating_sessions + running_sessions
        else:
            # For all users, we query for each status separately and combine
            creating_sessions = await self.query("status", "==", SessionStatus.CREATING)
            running_sessions = await self.query("status", "==", SessionStatus.RUNNING)

            return creating_sessions + running_sessions

    async def get_by_organization(self, organization_id: str) -> List[Session]:
        """Get all sessions for an organization"""
        return await self.query("organization_id", "==", organization_id)

    async def update_status(self, session_id: str, status: SessionStatus) -> bool:
        """Update session status"""
        update_data = {"status": status}
        if status == SessionStatus.TERMINATED:
            update_data["terminated_at"] = datetime.now(UTC)

        return await self.update(session_id, update_data)

    async def update_last_activity(self, session_id: str) -> bool:
        """Update session last activity timestamp"""
        update_data = {"last_activity_at": datetime.now(UTC)}
        return await self.update(session_id, update_data)

    async def extend_session(self, session_id: str, minutes: int) -> bool:
        """Extend session expiry time"""
        session = await self.get_by_id(session_id)
        if not session or session.status not in [SessionStatus.CREATING, SessionStatus.RUNNING]:
            return False

        # Calculate new expiry time
        new_expiry = datetime.now(UTC) + timedelta(minutes=minutes)
        update_data = {"expires_at": new_expiry}
        return await self.update(session_id, update_data)

    async def get_expired_sessions(self) -> List[Session]:
        """Get all expired sessions that are still active"""
        now = datetime.now(UTC)
        all_active = await self.get_active_sessions()
        return [s for s in all_active if s.expires_at and s.expires_at < now]

    # NEW methods for persistent session support
    
    async def increment_command_sequence(self, session_id: str) -> int:
        """Increment and return the next command sequence number for a session"""
        session = await self.get_by_id(session_id)
        if not session:
            return 1
        
        new_sequence = session.last_command_sequence + 1
        update_data = {
            "last_command_sequence": new_sequence,
            "total_commands": session.total_commands + 1,
            "last_activity_at": datetime.now(UTC)
        }
        
        await self.update(session_id, update_data)
        return new_sequence

    async def update_session_tags(self, session_id: str, tags: List[str]) -> bool:
        """Update session tags"""
        update_data = {"session_tags": tags}
        return await self.update(session_id, update_data)

    async def get_sessions_by_tag(self, user_id: str, tag: str) -> List[Session]:
        """Get sessions that contain a specific tag"""
        user_sessions = await self.get_by_user(user_id)
        return [s for s in user_sessions if tag in s.session_tags]

    async def get_persistent_sessions(self, user_id: Optional[str] = None) -> List[Session]:
        """Get all persistent sessions, optionally filtered by user"""
        if user_id:
            sessions = await self.get_by_user(user_id)
            return [s for s in sessions if s.is_persistent]
        else:
            all_sessions = await self.get_all()
            return [s for s in all_sessions if s.is_persistent]

    async def update_auto_cleanup_hours(self, session_id: str, hours: int) -> bool:
        """Update session auto-cleanup time"""
        update_data = {"auto_cleanup_hours": hours}
        return await self.update(session_id, update_data)

    async def get_sessions_for_cleanup(self) -> List[Session]:
        """Get sessions that are ready for auto-cleanup"""
        now = datetime.now(UTC)
        all_sessions = await self.get_all()
        
        cleanup_sessions = []
        for session in all_sessions:
            if session.status in [SessionStatus.STOPPED, SessionStatus.TERMINATED, SessionStatus.ERROR]:
                # Calculate cleanup time based on when session ended
                end_time = session.terminated_at or session.updated_at
                if end_time:
                    cleanup_time = end_time + timedelta(hours=session.auto_cleanup_hours)
                    if now >= cleanup_time:
                        cleanup_sessions.append(session)
        
        return cleanup_sessions
