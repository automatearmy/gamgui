"""
Socket.IO service for GAMGUI API.
Sets up and configures the Socket.IO server.
"""

import logging
from typing import Any, Dict

import socketio

from controllers.socketio_controller import SocketIOController

logger = logging.getLogger(__name__)


class SocketIOService:
    """Service for managing Socket.IO server and connections"""

    def __init__(self):
        # Create Socket.IO server with CORS support
        self.sio = socketio.AsyncServer(
            cors_allowed_origins="*",
            async_mode="asgi",
            logger=False,  # Disable socketio logging to avoid conflicts
            engineio_logger=False,
        )

        # Create controller instance
        self.controller = SocketIOController()

        # Set up event handlers
        self._setup_event_handlers()

    def _setup_event_handlers(self):
        """Set up Socket.IO event handlers"""

        @self.sio.event
        async def connect(sid: str, environ: Dict[str, Any], auth: Dict[str, Any] = None):
            """Handle client connection with authentication"""
            try:
                logger.info(f"New client attempting to connect: {sid}")

                # Authenticate the client
                if not auth:
                    logger.warning(f"No auth data provided for socket {sid}")
                    raise ConnectionRefusedError("Authentication required")

                user = await self.controller.authenticate_socket(sid, auth)

                # Store user data in session for later use
                await self.sio.save_session(sid, {"user": user})

                logger.info(f"Client {sid} connected and authenticated for user {user.get('email')}")

            except ConnectionRefusedError as e:
                logger.warning(f"Connection refused for socket {sid}: {e}")
                raise e
            except Exception as e:
                logger.error(f"Error during connection for socket {sid}: {e}")
                raise ConnectionRefusedError("Authentication failed")

        @self.sio.event
        async def disconnect(sid: str):
            """Handle client disconnection"""
            try:
                logger.info(f"Client disconnected: {sid}")
                await self.controller.disconnect_session(sid)
            except Exception as e:
                logger.error(f"Error during disconnection for socket {sid}: {e}")

        @self.sio.event
        async def join_session(sid: str, data: Dict[str, Any]):
            """Handle joining a terminal session"""
            try:
                session_id = data.get("session_id")
                if not session_id:
                    await self.sio.emit("error", {"message": "session_id is required"}, room=sid)
                    return

                # Get user from session
                session = await self.sio.get_session(sid)
                user = session.get("user")

                if not user:
                    await self.sio.emit("error", {"message": "Not authenticated"}, room=sid)
                    return

                logger.info(f"Socket {sid} joining session {session_id}")
                await self.controller.connect_to_session(self.sio, sid, session_id, user)

            except Exception as e:
                logger.error(f"Error joining session for socket {sid}: {e}")
                await self.sio.emit("error", {"message": "Failed to join session"}, room=sid)

        @self.sio.event
        async def terminal_input(sid: str, data: Dict[str, Any]):
            """Handle terminal input from client"""
            try:
                await self.controller.handle_input(self.sio, sid, data)
            except Exception as e:
                logger.error(f"Error handling input for socket {sid}: {e}")
                await self.sio.emit("error", {"message": "Failed to process input"}, room=sid)

        @self.sio.event
        async def terminal_resize(sid: str, data: Dict[str, Any]):
            """Handle terminal resize from client"""
            try:
                await self.controller.handle_resize(self.sio, sid, data)
            except Exception as e:
                logger.error(f"Error handling resize for socket {sid}: {e}")
                await self.sio.emit("error", {"message": "Failed to resize terminal"}, room=sid)

        @self.sio.event
        async def ping(sid: str):
            """Handle ping from client"""
            await self.sio.emit("pong", room=sid)

    def get_asgi_app(self):
        """Get the ASGI app for mounting to FastAPI"""
        return socketio.ASGIApp(self.sio)

    def get_socketio_server(self):
        """Get the Socket.IO server instance"""
        return self.sio


# Global Socket.IO service instance
socketio_service = SocketIOService()
