"""Command history repository for GAMGUI"""

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


    async def get_session_history_ordered(self, session_id: str, user_id: str) -> List[CommandHistory]:
        """Get command history for a session ordered by creation time"""
        commands = await self.query_multi([("session_id", "==", session_id), ("user_id", "==", user_id)])
        # Sort by created_at
        commands.sort(key=lambda cmd: cmd.created_at if cmd.created_at else cmd.id)
        return commands

    async def get_by_command_id(self, command_id: str) -> CommandHistory:
        """Get command by command ID"""
        return await self.get_by_id(command_id)

    async def get_running_commands(self, session_id: str) -> List[CommandHistory]:
        """Get running commands for a session"""
        # No status field in simplified model, return empty list
        return []

    async def get_next_sequence_number(self, session_id: str) -> int:
        """Get next sequence number for a session"""
        commands = await self.query("session_id", "==", session_id)
        return len(commands) + 1

    async def create_command_start(self, command: CommandHistory) -> CommandHistory:
        """Create a command record"""
        return await self.create(command)
