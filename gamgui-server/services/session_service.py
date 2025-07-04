"""
Session management service for GAMGUI API.
"""

from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional
import uuid

from config import environment
from errors.exceptions import APIException
from models.session_model import PodInfo, Session
from repositories.command_history_repository import CommandHistoryRepository
from repositories.session_repository import SessionRepository
from schemas.common import SessionStatus
from schemas.session_schemas import CreateSessionRequest, SessionListItem
from services.kubernetes_service import KubernetesService

logger = logging.getLogger(__name__)


class SessionService:
    """Service for managing user sessions"""

    def __init__(self):
        self.kubernetes_service = KubernetesService()
        self.session_repository = SessionRepository()
        self.command_history_repository = CommandHistoryRepository()

    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return f"sess_{uuid.uuid4().hex[:12]}"

    def _calculate_expiry(self, timeout_minutes: int) -> datetime:
        """Calculate session expiry time"""
        return datetime.utcnow() + timedelta(minutes=timeout_minutes)


    async def create_session(self, user_id: str, request: CreateSessionRequest) -> Session:
        """Create a new session"""
        try:
            # Check user session limits
            db_sessions = await self.session_repository.get_by_user(user_id)
            active_sessions = [s for s in db_sessions if s.status in [SessionStatus.CREATING, SessionStatus.RUNNING]]

            if len(active_sessions) >= environment.MAX_SESSIONS_PER_USER:
                raise APIException(
                    message=f"User has reached maximum sessions limit ({environment.MAX_SESSIONS_PER_USER})",
                    error_code="SESSION_LIMIT_REACHED",
                )

            # Generate session ID and calculate expiry
            session_id = self._generate_session_id()
            timeout_minutes = request.timeout_minutes or environment.SESSION_TIMEOUT_MINUTES
            expires_at = self._calculate_expiry(timeout_minutes)

            # First, create the Kubernetes pod and service
            # This will create the actual container and networking in Kubernetes
            try:
                # Create the pod and wait for it to be ready
                k8s_pod = await self.kubernetes_service.create_session_pod(session_id=session_id, user_id=user_id)

                # Get pod details from the Kubernetes service response
                pod_name = k8s_pod["pod_name"]
                pod_namespace = k8s_pod["namespace"]
                # The websocket_url is now constructed by the kubernetes service using the ingress path
                websocket_url = k8s_pod["websocket_url"]

                # Now create the pod info for the database
                pod_info = PodInfo(
                    id=f"pod_{uuid.uuid4().hex[:8]}",
                    name=pod_name,
                    namespace=pod_namespace,
                    port=k8s_pod["external_port"],
                )

                # Create the session record in the database
                db_session = Session(
                    id=session_id,
                    user_id=user_id,
                    organization_id="default_org",  # Using default organization ID
                    name=request.name,
                    description=request.description,
                    status=SessionStatus.RUNNING,  # Already running since K8s pod is ready
                    pod_info=pod_info,
                    expires_at=expires_at,
                    last_activity_at=datetime.utcnow(),
                    websocket_url=websocket_url,
                )

                # Save to database
                await self.session_repository.create(db_session)

                logger.info(f"Created session {session_id} for user {user_id}")
                return db_session

            except Exception as e:
                logger.error(f"Failed to create Kubernetes resources for session {session_id}: {e}")
                # Clean up any Kubernetes resources that may have been created
                try:
                    await self.kubernetes_service.delete_session_pod(session_id)
                    await self.kubernetes_service.delete_session_service(session_id)
                    await self.kubernetes_service.delete_session_ingress(session_id)
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up Kubernetes resources: {cleanup_error}")

                if isinstance(e, APIException):
                    raise  # Re-raise API exceptions
                else:
                    raise APIException(
                        message="Failed to create Kubernetes resources for session",
                        error_code="SESSION_CREATION_FAILED",
                        exception=str(e),
                    )

        except APIException:
            # Re-raise APIExceptions without modification
            raise
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise APIException(
                message="Failed to create session",
                error_code="SESSION_CREATION_FAILED",
                exception=str(e),
            )

    async def get_session(self, session_id: str, user_id: Optional[str] = None) -> Optional[Session]:
        """Get session by ID"""
        try:
            # Get session from Firestore
            db_session = await self.session_repository.get_by_id(session_id)

            if not db_session:
                return None

            # Check if user has access to this session
            if user_id and db_session.user_id != user_id:
                return None

            # Update last activity timestamp
            await self.session_repository.update_last_activity(session_id)

            # Check actual pod status from Kubernetes
            try:
                pod_status = await self.kubernetes_service.get_pod_status(session_id)
                # Update session status if changed
                if db_session.status != pod_status["status"]:
                    db_session.status = pod_status["status"]
                    await self.session_repository.update_status(session_id, pod_status["status"])
            except Exception as e:
                logger.warning(f"Failed to get pod status for session {session_id}: {e}")
                # We continue anyway, using the stored status

            # Return the updated session directly
            return db_session

        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}")
            return None

    async def list_user_sessions(self, user_id: str) -> List[SessionListItem]:
        """List all sessions for a user"""
        try:
            # Get all sessions for user from Firestore
            db_sessions = await self.session_repository.get_by_user(user_id)

            session_items = []
            for db_session in db_sessions:
                session_item = SessionListItem(
                    id=db_session.id,
                    name=db_session.name,
                    status=db_session.status,
                    created_at=db_session.created_at,
                    expires_at=db_session.expires_at,
                )
                session_items.append(session_item)

            # Sort by creation time (newest first)
            session_items.sort(key=lambda s: s.created_at, reverse=True)

            return session_items

        except Exception as e:
            logger.error(f"Error listing sessions for user {user_id}: {e}")
            # Return empty list on error to avoid breaking the UI
            return []

    async def delete_session(self, session_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a session"""
        try:
            # Get session from Firestore
            db_session = await self.session_repository.get_by_id(session_id)

            if not db_session:
                return False

            # Check if user has access to this session
            if user_id and db_session.user_id != user_id:
                return False

            # Update status to stopping
            await self.session_repository.update_status(session_id, SessionStatus.STOPPING)

            try:
                # Delete Kubernetes resources
                await self.kubernetes_service.delete_session_pod(session_id)
                await self.kubernetes_service.delete_session_service(session_id)
                await self.kubernetes_service.delete_session_ingress(session_id)

                # Delete session from Firestore after successful Kubernetes cleanup
                await self.session_repository.delete(session_id)

                logger.info(f"Deleted session {session_id}")
                return True

            except APIException:
                # Re-raise APIExceptions without modification
                raise
            except Exception as e:
                logger.error(f"Failed to delete Kubernetes resources for session {session_id}: {e}")

                # Mark as error but don't delete from Firestore for debugging
                await self.session_repository.update_status(session_id, SessionStatus.ERROR)

                raise APIException(
                    message="Failed to delete Kubernetes resources for session",
                    error_code="SESSION_DELETION_FAILED",
                    exception=str(e),
                )

        except APIException:
            # Re-raise APIExceptions without modification
            raise
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")
            raise APIException(
                message="Failed to delete session",
                error_code="SESSION_DELETION_FAILED",
                exception=str(e),
            )

    # NEW: Command history methods for persistent sessions
    
    async def get_session_history(self, session_id: str, user_id: str) -> List[dict]:
        """Get complete command history for a session"""
        try:
            # First verify user has access to this session
            session = await self.get_session(session_id, user_id)
            if not session:
                return []

            # Get command history ordered by sequence
            commands = await self.command_history_repository.get_session_history_ordered(session_id, user_id)
            
            # Convert to dict format for API response
            history = []
            for cmd in commands:
                history.append({
                    "command_id": cmd.id,
                    "command": cmd.command,
                    "status": "completed" if cmd.exit_code == 0 else "failed",
                    "exit_code": cmd.exit_code,
                    "duration": cmd.duration,
                    "output": cmd.output,
                    "output_preview": cmd.output[:200] + "..." if len(cmd.output) > 200 else cmd.output
                })
            
            
            logger.info(f"Retrieved {len(history)} commands for session {session_id}")
            return history

        except Exception as e:
            logger.error(f"Failed to get session history for {session_id}: {e}")
            return []

    async def get_command_details(self, session_id: str, command_id: str, user_id: str) -> Optional[dict]:
        """Get detailed information about a specific command"""
        try:
            # First verify user has access to this session
            session = await self.get_session(session_id, user_id)
            if not session:
                return None

            # Get command details
            command = await self.command_history_repository.get_by_command_id(command_id)
            
            if not command or command.session_id != session_id or command.user_id != user_id:
                return None

            # Return full command details
            return {
                "command_id": command.command_id,
                "session_id": command.session_id,
                "command": command.command,
                "status": command.status,
                "sequence_number": command.sequence_number,
                "started_at": command.started_at.isoformat() if command.started_at else None,
                "completed_at": command.completed_at.isoformat() if command.completed_at else None,
                "last_output_at": command.last_output_at.isoformat() if command.last_output_at else None,
                "exit_code": command.exit_code,
                "duration": command.duration,
                "output_lines": command.output_lines,
                "output": command.output,  # Full output for detailed view
                "created_at": command.created_at.isoformat() if command.created_at else None,
                "updated_at": command.updated_at.isoformat() if command.updated_at else None
            }

        except Exception as e:
            logger.error(f"Failed to get command details {command_id}: {e}")
            return None

    async def resume_session(self, session_id: str, user_id: str) -> Optional[dict]:
        """Resume a session and get current status"""
        try:
            # Get session details
            session = await self.get_session(session_id, user_id)
            if not session:
                return None

            # Get recent command history (last 10 commands)
            all_history = await self.get_session_history(session_id, user_id)
            recent_history = all_history[-10:] if len(all_history) > 10 else all_history

            # Get running commands
            running_commands = await self.command_history_repository.get_running_commands(session_id)
            
            # Check if session pod is still alive
            pod_alive = False
            try:
                pod_status = await self.kubernetes_service.get_pod_status(session_id)
                pod_alive = pod_status.get("status") == SessionStatus.RUNNING
            except Exception as e:
                logger.warning(f"Could not check pod status for session {session_id}: {e}")

            resume_info = {
                "session_id": session_id,
                "session_name": session.name,
                "session_status": session.status,
                "websocket_url": session.websocket_url,
                "pod_alive": pod_alive,
                "total_commands": len(all_history),
                "running_commands": len(running_commands),
                "recent_history": recent_history,
                "last_activity": session.last_activity_at.isoformat() if session.last_activity_at else None,
                "expires_at": session.expires_at.isoformat() if session.expires_at else None,
                "can_reconnect": pod_alive and session.status == SessionStatus.RUNNING
            }

            logger.info(f"Session {session_id} resume info prepared for user {user_id}")
            return resume_info

        except Exception as e:
            logger.error(f"Failed to resume session {session_id}: {e}")
            return None

    async def log_command(self, session_id: str, user_id: str, command_data: Dict) -> Optional[dict]:
        """Log a command that was executed in the session"""
        try:
            # First verify user has access to this session
            session = await self.get_session(session_id, user_id)
            if not session:
                return None

            # Extract command info from dict
            command = command_data.get("command", "").strip()
            if not command:
                return None

            # Generate command ID and get sequence number
            command_id = f"cmd_{uuid.uuid4().hex[:12]}"
            sequence_number = await self.command_history_repository.get_next_sequence_number(session_id)

            # Create command record
            from models.command_history_model import CommandHistory
            
            # Extract output from dict
            output = command_data.get("output", "")
            exit_code = command_data.get("exit_code", 0)
            duration = command_data.get("duration", 0)
            
            command_record = CommandHistory(
                id=command_id,  # BaseModel requires 'id' field
                session_id=session_id,
                user_id=user_id,
                command=command,
                output=output,
                exit_code=exit_code,
                duration=duration
            )

            # Save to Firestore
            saved_record = await self.command_history_repository.create_command_start(command_record)
            
            logger.info(f"Logged command {command_id} for session {session_id}: {command}")
            
            return {
                "command_id": command_id,
                "session_id": session_id,
                "command": command,
                "status": "completed" if exit_code == 0 else "failed",
                "sequence_number": sequence_number
            }

        except Exception as e:
            logger.error(f"Failed to log command for session {session_id}: {e}")
            return None
