"""
Socket.IO controller for GAMGUI API.
Handles real-time terminal connections via Socket.IO.
"""

import asyncio
import logging
from typing import Any, Dict

import jwt
from kubernetes.client.exceptions import ApiException
import socketio

from config import environment
from errors.exceptions import APIException
from repositories.user_repository import UserRepository
from services.audit_service import AuditService
from services.kubernetes_service import KubernetesService
from services.session_service import SessionService

logger = logging.getLogger(__name__)


class SocketIOController:
    """Controller for handling Socket.IO terminal connections"""

    def __init__(self):
        self.session_service = SessionService()
        self.kubernetes_service = KubernetesService()
        self.audit_service = AuditService()
        self.user_repository = UserRepository()
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        self.command_buffers: Dict[str, str] = {}  # sid -> command buffer

    async def authenticate_socket(self, sid: str, auth: Dict[str, Any]) -> Dict[str, Any]:
        """
        Authenticate a Socket.IO client using JWT token

        Args:
            sid: Socket ID
            auth: Authentication data containing token

        Returns:
            User payload from JWT token

        Raises:
            ConnectionRefusedError: If authentication fails
        """
        try:
            token = auth.get("token")
            if not token:
                logger.warning(f"Missing token for socket {sid}")
                raise ConnectionRefusedError("Authentication required: token missing")

            # Verify the token
            payload = jwt.decode(token, environment.JWT_SECRET, algorithms=["HS256"])

            # Validate email exists in token
            email = payload.get("email")
            if not email:
                logger.warning(f"Email not found in token payload for socket {sid}")
                raise ConnectionRefusedError("Invalid token: email not found")

            logger.info(f"Socket {sid} authenticated for user {email}")
            return payload

        except jwt.ExpiredSignatureError:
            logger.warning(f"Expired JWT token for socket {sid}")
            raise ConnectionRefusedError("Token expired")

        except jwt.InvalidTokenError:
            logger.warning(f"Invalid JWT token for socket {sid}")
            raise ConnectionRefusedError("Invalid token")

    async def connect_to_session(self, sio: socketio.AsyncServer, sid: str, session_id: str, user: Dict[str, Any]):
        """
        Connect a socket to a terminal session

        Args:
            sio: Socket.IO server instance
            sid: Socket ID
            session_id: Session ID to connect to
            user: Authenticated user data
        """
        try:
            # Get user from database to check role
            user_obj = await self.user_repository.get_by_id(user["sub"])
            user_role = user_obj.role_id if user_obj else "User"

            # Get session details with role information
            session = await self.session_service.get_session(session_id, user["sub"], user_role)
            if not session:
                await sio.emit("error", {"message": "Session not found"}, room=sid)
                return

            # Check if session is running
            if session.status != "Running":
                await sio.emit("error", {"message": f"Session is not running (status: {session.status})"}, room=sid)
                return

            logger.info(f"Connecting socket {sid} to session {session_id}")

            # Create Kubernetes exec connection
            try:
                exec_stream = self.kubernetes_service.create_exec_stream(session.pod_name, session.pod_namespace)

                # Store connection info
                self.active_connections[sid] = {
                    "session_id": session_id,
                    "user_id": user["sub"],
                    "exec_stream": exec_stream,
                    "pod_name": session.pod_name,
                    "pod_namespace": session.pod_namespace,
                }

                # Start reading from exec stream
                asyncio.create_task(self._read_from_exec_stream(sio, sid, exec_stream))

                # Emit connection success
                await sio.emit("connected", {"session_id": session_id}, room=sid)
                logger.info(f"Socket {sid} successfully connected to session {session_id}")

            except ApiException as e:
                logger.error(f"Kubernetes API error connecting to session {session_id}: {e}")
                await sio.emit("error", {"message": f"Failed to connect to pod: {str(e)}"}, room=sid)

        except APIException as e:
            logger.error(f"Error connecting socket {sid} to session {session_id}: {e}")
            await sio.emit("error", {"message": str(e)}, room=sid)
        except Exception as e:
            logger.error(f"Unexpected error connecting socket {sid} to session {session_id}: {e}")
            await sio.emit("error", {"message": "Internal server error"}, room=sid)

    async def handle_input(self, sio: socketio.AsyncServer, sid: str, data: Dict[str, Any]):
        """
        Handle input from client terminal

        Args:
            sio: Socket.IO server instance
            sid: Socket ID
            data: Input data containing terminal input
        """
        if sid not in self.active_connections:
            await sio.emit("error", {"message": "Not connected to a session"}, room=sid)
            return

        connection = self.active_connections[sid]
        exec_stream = connection["exec_stream"]

        try:
            input_data = data.get("data", "")
            if input_data:
                # Buffer commands until Enter is pressed for audit logging
                if sid not in self.command_buffers:
                    self.command_buffers[sid] = ""

                if input_data in ["\r", "\n"]:
                    # Command completed - log it
                    command = self.command_buffers[sid].strip()
                    if command:  # Don't log empty commands
                        logger.debug(f"Logging command for session {connection['session_id']}: {command}")
                        await self.audit_service.log_command(
                            user_id=connection["user_id"], session_id=connection["session_id"], command=command
                        )
                    self.command_buffers[sid] = ""
                elif input_data == "\x7f":  # Backspace
                    if self.command_buffers[sid]:
                        self.command_buffers[sid] = self.command_buffers[sid][:-1]
                elif input_data == "\x08":  # Another backspace variant
                    if self.command_buffers[sid]:
                        self.command_buffers[sid] = self.command_buffers[sid][:-1]
                elif input_data.isprintable():
                    self.command_buffers[sid] += input_data
                    logger.debug(f"Command buffer for {sid}: '{self.command_buffers[sid]}'")

                # Send input to the pod (WSClient write_stdin is not async)
                exec_stream.write_stdin(input_data)

        except Exception as e:
            logger.error(f"Error sending input for socket {sid}: {e}")
            await sio.emit("error", {"message": "Failed to send input"}, room=sid)

    async def handle_resize(self, sio: socketio.AsyncServer, sid: str, data: Dict[str, Any]):
        """
        Handle terminal resize from client

        Args:
            sio: Socket.IO server instance
            sid: Socket ID
            data: Resize data containing cols and rows
        """
        if sid not in self.active_connections:
            await sio.emit("error", {"message": "Not connected to a session"}, room=sid)
            return

        connection = self.active_connections[sid]
        exec_stream = connection["exec_stream"]

        try:
            cols = data.get("cols")
            rows = data.get("rows")

            if not cols or not rows:
                logger.warning(f"Invalid resize data for socket {sid}: cols={cols}, rows={rows}")
                return

            logger.info(f"Resizing terminal for socket {sid} to {cols}x{rows}")

            # Use the proper Kubernetes resize protocol
            # Channel 4 is for resize events, but we need to try different message formats
            try:
                # Try JSON format (some implementations expect this)
                import json

                resize_data = json.dumps({"Width": cols, "Height": rows})
                exec_stream.write_channel(4, resize_data)
                logger.debug(f"Sent JSON resize data: {resize_data}")

            except Exception as e1:
                logger.warning(f"JSON resize format failed: {e1}")
                try:
                    # Try binary format (width and height as 2-byte integers)
                    import struct

                    resize_bytes = struct.pack(">HH", cols, rows)  # Big-endian, unsigned short
                    exec_stream.write_channel(4, resize_bytes)
                    logger.debug(f"Sent binary resize data: cols={cols}, rows={rows}")

                except Exception as e2:
                    logger.warning(f"Binary resize format failed: {e2}")
                    try:
                        # Try simple string format: "cols rows" (width first)
                        resize_msg = f"{cols} {rows}"
                        exec_stream.write_channel(4, resize_msg)
                        logger.debug(f"Sent string resize data: {resize_msg}")

                    except Exception as e3:
                        logger.error(f"All resize methods failed: {e1}, {e2}, {e3}")
                        # As a last resort, log the error but don't fail completely
                        await sio.emit("error", {"message": "Terminal resize not supported"}, room=sid)

            logger.debug(f"Successfully attempted resize for socket {sid}")

        except Exception as e:
            logger.error(f"Error resizing terminal for socket {sid}: {e}")
            await sio.emit("error", {"message": "Failed to resize terminal"}, room=sid)

    async def disconnect_session(self, sid: str):
        """
        Clean up when a socket disconnects

        Args:
            sid: Socket ID
        """
        if sid in self.active_connections:
            connection = self.active_connections[sid]

            try:
                # Close exec stream (WSClient close is not async)
                exec_stream = connection["exec_stream"]
                if exec_stream:
                    exec_stream.close()

                logger.info(f"Cleaned up connection for socket {sid}")

            except Exception as e:
                logger.error(f"Error cleaning up socket {sid}: {e}")
            finally:
                # Remove from active connections
                del self.active_connections[sid]

        # Clean up command buffer
        if sid in self.command_buffers:
            del self.command_buffers[sid]

    async def _read_from_exec_stream(self, sio: socketio.AsyncServer, sid: str, exec_stream):
        """
        Read output from Kubernetes exec stream and emit to client

        Args:
            sio: Socket.IO server instance
            sid: Socket ID
            exec_stream: Kubernetes exec stream
        """
        try:
            output_buffer = ""
            last_output_time = asyncio.get_event_loop().time()
            CHUNK_TIMEOUT = 0.5  # 500ms timeout for output chunking

            while sid in self.active_connections:
                try:
                    current_time = asyncio.get_event_loop().time()

                    # Read from stdout with minimal timeout for real-time response
                    if exec_stream.is_open():
                        output = exec_stream.read_stdout(timeout=0.01)
                        if output:
                            output_buffer += output
                            last_output_time = current_time
                            await sio.emit("output", {"data": output}, room=sid)

                        # Read from stderr
                        error_output = exec_stream.read_stderr(timeout=0.01)
                        if error_output:
                            output_buffer += error_output
                            last_output_time = current_time
                            await sio.emit("output", {"data": error_output}, room=sid)

                        # Check if we should flush the output buffer for audit logging
                        if output_buffer and (current_time - last_output_time) > CHUNK_TIMEOUT:
                            await self._flush_output_buffer(sid, output_buffer)
                            output_buffer = ""
                    else:
                        # Stream is closed, exit loop
                        break

                except Exception:
                    # Timeout or other read error, continue silently for performance
                    pass

                # Minimal delay to prevent CPU spinning while maintaining responsiveness
                await asyncio.sleep(0.001)

            # Flush any remaining output buffer before closing
            if output_buffer:
                await self._flush_output_buffer(sid, output_buffer)

        except Exception as e:
            logger.error(f"Error reading from exec stream for socket {sid}: {e}")
            await sio.emit("error", {"message": "Connection to pod lost"}, room=sid)
        finally:
            # Clean up the connection
            await self.disconnect_session(sid)

    async def _flush_output_buffer(self, sid: str, output: str):
        """
        Flush output buffer to audit logs

        Args:
            sid: Socket ID
            output: Output data to log
        """
        if sid in self.active_connections:
            connection = self.active_connections[sid]
            await self.audit_service.log_output(
                user_id=connection["user_id"], session_id=connection["session_id"], output=output
            )
