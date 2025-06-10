"""WebSocket controller for GAM Session Worker"""

from datetime import datetime
import json
import logging
from typing import Any, Dict

from fastapi import WebSocket, WebSocketDisconnect

from services.gam_service import GamService

logger = logging.getLogger(__name__)


class WebSocketController:
    """Controller for handling WebSocket connections and messages"""

    def __init__(self, gam_service: GamService):
        self.gam_service = gam_service
        self.active_connections: Dict[str, WebSocket] = {}

    async def handle_connection(self, websocket: WebSocket) -> None:
        """Handle new WebSocket connection (authentication already verified by auth_controller)"""

        # Get authenticated user info from state
        user_info = websocket.state.user

        # Generate connection ID with user info
        connection_id = f"{user_info['email']}_{datetime.utcnow().timestamp()}"

        # Store connection
        self.active_connections[connection_id] = websocket

        logger.info(f"WebSocket connected: {connection_id}")

        # Send welcome message
        await self.send_message(
            websocket,
            {
                "type": "welcome",
                "connection_id": connection_id,
                "user": user_info,
                "authenticated": True,
                "message": f"Connected to GAM session worker as {user_info['email']}",
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        try:
            # Handle messages
            await self._message_loop(websocket, connection_id)
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: {connection_id}")
        except Exception as e:
            logger.error(f"WebSocket error for {connection_id}: {e}")
        finally:
            await self._cleanup_connection(connection_id)

    async def _message_loop(self, websocket: WebSocket, connection_id: str) -> None:
        """Main message handling loop"""
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                # Try to parse as JSON first
                message = json.loads(data)
                await self._handle_message(websocket, connection_id, message)
            except json.JSONDecodeError:
                # If not JSON, treat as plain text command
                command = data.strip()
                if command:
                    await self._execute_terminal_command(websocket, connection_id, command)
            except Exception as e:
                logger.error(f"Error handling message from {connection_id}: {e}")
                await self.send_error(websocket, "Internal server error")

    async def _handle_message(self, websocket: WebSocket, connection_id: str, message: Dict[str, Any]) -> None:
        """Handle incoming WebSocket message"""
        message_type = message.get("type")

        if message_type == "command":
            await self._handle_command(websocket, connection_id, message)

        elif message_type == "ping":
            await self.send_message(websocket, {"type": "pong", "timestamp": datetime.utcnow().isoformat()})

        elif message_type == "cancel":
            await self._handle_cancel(websocket, message)

        elif message_type == "status":
            await self._handle_status(websocket)

        else:
            await self.send_error(websocket, f"Unknown message type: {message_type}")

    async def _handle_command(self, websocket: WebSocket, connection_id: str, message: Dict[str, Any]) -> None:
        """Handle GAM command execution"""
        command = message.get("command", "").strip()
        command_id = message.get("command_id")

        if not command:
            await self.send_error(websocket, "Empty command received")
            return

        logger.info(f"Executing GAM command for connection {connection_id}: {command}")

        # Execute command and stream output
        async for output_message in self.gam_service.execute_command(command, command_id):
            await self.send_message(websocket, output_message)

    async def _handle_cancel(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        """Handle command cancellation"""
        command_id = message.get("command_id")

        if command_id:
            # Cancel specific command
            cancelled = self.gam_service.cancel_command(command_id)
            await self.send_message(
                websocket,
                {
                    "type": "cancelled",
                    "command_id": command_id,
                    "success": cancelled,
                    "message": f"Command {command_id} cancelled" if cancelled else f"Command {command_id} not found",
                },
            )
        else:
            # Cancel all commands
            cancelled_count = self.gam_service.cancel_all_commands()
            await self.send_message(
                websocket, {"type": "cancelled", "message": f"Cancelled {cancelled_count} running commands"}
            )

    async def _execute_terminal_command(self, websocket: WebSocket, connection_id: str, command: str) -> None:
        """Execute any terminal command (GAM or system commands)"""
        logger.info(f"Executing terminal command for {connection_id}: {command}")

        # Send command start notification
        await websocket.send_text(f"$ {command}")

        try:
            import asyncio
            import subprocess

            # Execute command
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
            )

            # Stream output line by line
            while True:
                output = process.stdout.readline()
                if output == "" and process.poll() is not None:
                    break
                if output:
                    await websocket.send_text(output.rstrip())

            # Get return code
            return_code = process.poll()

            # Send completion status
            if return_code == 0:
                await websocket.send_text(f"✅ Command completed successfully")
            else:
                await websocket.send_text(f"❌ Command failed with exit code {return_code}")

        except Exception as e:
            await websocket.send_text(f"❌ Error: {str(e)}")
            logger.error(f"Error executing command '{command}': {e}")

    async def _handle_status(self, websocket: WebSocket) -> None:
        """Handle status request"""
        running_commands = self.gam_service.get_running_commands()
        gam_available = self.gam_service.is_gam_available()

        await self.send_message(
            websocket,
            {
                "type": "status",
                "gam_available": gam_available,
                "active_connections": len(self.active_connections),
                "running_commands": running_commands,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    async def _cleanup_connection(self, connection_id: str) -> None:
        """Clean up connection and resources"""
        # Remove connection
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        # Cancel any running commands for this connection
        cancelled_count = self.gam_service.cancel_all_commands()
        if cancelled_count > 0:
            logger.info(f"Cancelled {cancelled_count} commands for disconnected connection {connection_id}")

    async def send_message(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        """Send message to WebSocket client"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")

    async def send_error(self, websocket: WebSocket, error_message: str) -> None:
        """Send error message to WebSocket client"""
        await self.send_message(
            websocket, {"type": "error", "message": error_message, "timestamp": datetime.utcnow().isoformat()}
        )

    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)

    def get_connected_users(self) -> list[str]:
        """Get list of connected user IDs"""
        return list(self.active_connections.keys())
