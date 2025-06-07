"""Command history repository for GAMGUI"""

import re
from typing import List

from models.command_history_model import CommandHistory
from repositories.base_repository import BaseRepository


class CommandHistoryRepository(BaseRepository[CommandHistory]):
    """Repository for CommandHistory model"""

    def __init__(self):
        """Initialize repository with CommandHistory model and collection name"""
        super().__init__(CommandHistory, "command_history")

    async def get_by_session(self, session_id: str) -> List[CommandHistory]:
        """Get command history for a specific session"""
        return await self.query("session_id", "==", session_id)

    async def get_by_user(self, user_id: str, limit: int = 100) -> List[CommandHistory]:
        """Get command history for a specific user"""
        history = await self.query("user_id", "==", user_id)
        history.sort(key=lambda cmd: cmd.created_at, reverse=True)
        return history[:limit]

    async def get_by_command_pattern(self, pattern: str) -> List[CommandHistory]:
        """Get command history matching a pattern"""
        all_commands = await self.get_all()
        regex = re.compile(pattern)
        return [cmd for cmd in all_commands if regex.search(cmd.command)]

    async def get_failed_commands(self) -> List[CommandHistory]:
        """Get all failed commands (non-zero exit code)"""
        all_commands = await self.get_all()
        return [cmd for cmd in all_commands if cmd.exit_code != 0]

    async def get_user_session_history(self, user_id: str, session_id: str) -> List[CommandHistory]:
        """Get command history for a specific user and session"""
        return await self.query_multi([("user_id", "==", user_id), ("session_id", "==", session_id)])
