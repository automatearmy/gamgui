"""
Persistent Session Service for GAMGUI API.
Handles true session persistence with reconnection capabilities.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import uuid

from config import environment
from errors.exceptions import APIException
from models.session_model import Session
from repositories.session_repository import SessionRepository
from repositories.command_history_repository import CommandHistoryRepository
from schemas.common import SessionStatus
from services.kubernetes_service import KubernetesService

logger = logging.getLogger(__name__)


class PersistentSessionService:
    """Service for managing persistent GAM sessions"""

    def __init__(self):
        self.kubernetes_service = KubernetesService()
        self.session_repository = SessionRepository()
        self.command_history_repository = CommandHistoryRepository()

    async def create_persistent_session(
        self, 
        user_id: str, 
        name: str, 
        description: str = "",
        tags: List[str] = None,
        timeout_hours: int = 24
    ) -> Session:
        """Create a new persistent session that survives browser disconnection"""
        try:
            # Check user session limits
            active_sessions = await self.get_user_active_sessions(user_id)
            if len(active_sessions) >= environment.MAX_SESSIONS_PER_USER:
                raise APIException(
                    message=f"User has reached maximum sessions limit ({environment.MAX_SESSIONS_PER_USER})",
                    error_code="SESSION_LIMIT_REACHED",
                )

            # Generate session ID and calculate expiry
            session_id = f"sess_{uuid.uuid4().hex[:12]}"
            expires_at = datetime.utcnow() + timedelta(hours=timeout_hours)

            # Create persistent Kubernetes Job (not ephemeral pod)
            k8s_job = await self.kubernetes_service.create_persistent_session_job(
                session_id=session_id, 
                user_id=user_id,
                timeout_hours=timeout_hours
            )

            # Create session record with persistence enabled
            session = Session(
                id=session_id,
                user_id=user_id,
                organization_id="default_org",
                name=name,
                description=description,
                status=SessionStatus.RUNNING,
                pod_info=k8s_job["pod_info"],
                expires_at=expires_at,
                last_activity_at=datetime.utcnow(),
                websocket_url=k8s_job["websocket_url"],
                is_persistent=True,
                session_tags=tags or [],
                auto_cleanup_hours=timeout_hours,
                last_command_sequence=0,
                total_commands=0
            )

            # Save to database
            await self.session_repository.create(session)

            logger.info(f"Created persistent session {session_id} for user {user_id}")
            return session

        except Exception as e:
            logger.error(f"Failed to create persistent session: {e}")
            raise APIException(
                message="Failed to create persistent session",
                error_code="PERSISTENT_SESSION_CREATION_FAILED",
                exception=str(e),
            )

    async def reconnect_to_session(self, session_id: str, user_id: str) -> Dict:
        """Reconnect to an existing persistent session"""
        try:
            # Get session from database
            session = await self.session_repository.get_by_id(session_id)
            if not session or session.user_id != user_id:
                raise APIException(
                    message="Session not found or access denied",
                    error_code="SESSION_NOT_FOUND",
                    status_code=404
                )

            # Check if session is still alive
            is_alive = await self.kubernetes_service.is_job_running(session_id)
            
            if not is_alive:
                # Update session status
                await self.session_repository.update_status(session_id, SessionStatus.TERMINATED)
                raise APIException(
                    message="Session has been terminated",
                    error_code="SESSION_TERMINATED",
                    status_code=410
                )

            # Get command history for session restoration
            command_history = await self.command_history_repository.get_session_history_ordered(
                session_id, user_id
            )

            # Get terminal buffer from persistent storage
            terminal_buffer = await self.kubernetes_service.get_session_terminal_buffer(session_id)

            # Update last activity
            await self.session_repository.update_last_activity(session_id)

            reconnection_info = {
                "session": session,
                "command_history": [
                    {
                        "command": cmd.command,
                        "output": cmd.output,
                        "status": cmd.status,
                        "started_at": cmd.started_at.isoformat() if cmd.started_at else None,
                        "completed_at": cmd.completed_at.isoformat() if cmd.completed_at else None,
                        "exit_code": cmd.exit_code,
                        "sequence_number": cmd.sequence_number
                    }
                    for cmd in command_history
                ],
                "terminal_buffer": terminal_buffer,
                "websocket_url": session.websocket_url,
                "can_reconnect": True,
                "session_alive": True
            }

            logger.info(f"User {user_id} reconnected to session {session_id}")
            return reconnection_info

        except APIException:
            raise
        except Exception as e:
            logger.error(f"Failed to reconnect to session {session_id}: {e}")
            raise APIException(
                message="Failed to reconnect to session",
                error_code="SESSION_RECONNECTION_FAILED",
                exception=str(e),
            )

    async def get_user_sessions_dashboard(self, user_id: str) -> List[Dict]:
        """Get all sessions for user dashboard"""
        try:
            # Get all user sessions
            sessions = await self.session_repository.get_by_user(user_id)
            
            dashboard_sessions = []
            for session in sessions:
                # Check if session is still alive
                is_alive = False
                if session.status in [SessionStatus.RUNNING, SessionStatus.CREATING]:
                    is_alive = await self.kubernetes_service.is_job_running(session.id)
                    
                    # Update status if needed
                    if not is_alive and session.status == SessionStatus.RUNNING:
                        await self.session_repository.update_status(session.id, SessionStatus.TERMINATED)
                        session.status = SessionStatus.TERMINATED

                # Get recent activity
                recent_commands = await self.command_history_repository.get_session_history_ordered(
                    session.id, user_id
                )
                last_command = recent_commands[-1] if recent_commands else None

                dashboard_sessions.append({
                    "id": session.id,
                    "name": session.name,
                    "description": session.description,
                    "status": session.status,
                    "tags": session.session_tags,
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    "last_activity_at": session.last_activity_at.isoformat() if session.last_activity_at else None,
                    "expires_at": session.expires_at.isoformat() if session.expires_at else None,
                    "total_commands": session.total_commands,
                    "is_alive": is_alive,
                    "can_reconnect": is_alive and session.status == SessionStatus.RUNNING,
                    "last_command": {
                        "command": last_command.command,
                        "status": last_command.status,
                        "completed_at": last_command.completed_at.isoformat() if last_command.completed_at else None
                    } if last_command else None
                })

            # Sort by last activity (most recent first)
            dashboard_sessions.sort(
                key=lambda s: s["last_activity_at"] or s["created_at"], 
                reverse=True
            )

            return dashboard_sessions

        except Exception as e:
            logger.error(f"Failed to get user sessions dashboard: {e}")
            return []

    async def get_user_active_sessions(self, user_id: str) -> List[Session]:
        """Get all active sessions for a user"""
        try:
            return await self.session_repository.get_active_sessions(user_id)
        except Exception as e:
            logger.error(f"Failed to get active sessions for user {user_id}: {e}")
            return []

    async def extend_session(self, session_id: str, user_id: str, additional_hours: int) -> bool:
        """Extend session expiration time"""
        try:
            session = await self.session_repository.get_by_id(session_id)
            if not session or session.user_id != user_id:
                return False

            # Extend expiration
            success = await self.session_repository.extend_session(session_id, additional_hours * 60)
            
            if success:
                logger.info(f"Extended session {session_id} by {additional_hours} hours")
            
            return success

        except Exception as e:
            logger.error(f"Failed to extend session {session_id}: {e}")
            return False

    async def terminate_session(self, session_id: str, user_id: str) -> bool:
        """Terminate a persistent session"""
        try:
            session = await self.session_repository.get_by_id(session_id)
            if not session or session.user_id != user_id:
                return False

            # Terminate Kubernetes job
            await self.kubernetes_service.terminate_session_job(session_id)

            # Update session status
            await self.session_repository.update_status(session_id, SessionStatus.TERMINATED)

            logger.info(f"Terminated session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to terminate session {session_id}: {e}")
            return False

    async def update_session_tags(self, session_id: str, user_id: str, tags: List[str]) -> bool:
        """Update session tags"""
        try:
            session = await self.session_repository.get_by_id(session_id)
            if not session or session.user_id != user_id:
                return False

            return await self.session_repository.update_session_tags(session_id, tags)

        except Exception as e:
            logger.error(f"Failed to update session tags {session_id}: {e}")
            return False

    async def cleanup_expired_sessions(self) -> int:
        """Background job to cleanup expired sessions"""
        try:
            expired_sessions = await self.session_repository.get_expired_sessions()
            cleaned_count = 0

            for session in expired_sessions:
                try:
                    # Terminate Kubernetes job
                    await self.kubernetes_service.terminate_session_job(session.id)
                    
                    # Update session status
                    await self.session_repository.update_status(session.id, SessionStatus.TERMINATED)
                    
                    cleaned_count += 1
                    logger.info(f"Cleaned up expired session {session.id}")
                    
                except Exception as e:
                    logger.error(f"Failed to cleanup session {session.id}: {e}")

            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired sessions")

            return cleaned_count

        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")
            return 0
