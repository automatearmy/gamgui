"""Audit log repository for GAMGUI"""

from datetime import datetime
from typing import List

from models.audit_log_model import AuditLog
from repositories.base_repository import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """Repository for AuditLog model"""

    def __init__(self):
        """Initialize repository with AuditLog model and collection name"""
        super().__init__(AuditLog, "audit_logs")

    async def get_by_user(self, user_id: str, limit: int = 100) -> List[AuditLog]:
        """Get audit logs for a specific user"""
        logs = await self.query("user_id", "==", user_id)
        logs.sort(key=lambda log: log.created_at, reverse=True)
        return logs[:limit]

    async def get_by_session(self, session_id: str) -> List[AuditLog]:
        """Get audit logs for a specific session"""
        return await self.query("session_id", "==", session_id)

    async def get_by_date_range(self, start_date: datetime, end_date: datetime) -> List[AuditLog]:
        """Get audit logs within a date range"""
        logs = await self.get_all()
        return [log for log in logs if start_date <= log.created_at <= end_date]

    async def get_by_type(self, log_type: str) -> List[AuditLog]:
        """Get audit logs of a specific type"""
        return await self.query("type", "==", log_type)

    async def get_errors(self) -> List[AuditLog]:
        """Get all error logs"""
        return await self.query("status", "==", "error")

    async def get_recent_command_logs(self, limit: int = 20) -> List[AuditLog]:
        """Get recent command logs"""
        logs = await self.query("type", "==", "command")
        logs.sort(key=lambda log: log.created_at, reverse=True)
        return logs[:limit]
