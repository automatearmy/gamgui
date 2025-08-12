"""
Audit service for GAMGUI API.
Handles logging of terminal commands and outputs for audit purposes.
"""

from datetime import datetime
import logging
import re
from typing import Dict, List

from google.cloud import logging as cloud_logging

from config import environment

logger = logging.getLogger(__name__)


class AuditService:
    """Service for managing audit logs"""

    def __init__(self):
        self.cloud_logging_client = cloud_logging.Client()
        self.audit_logger = self.cloud_logging_client.logger("gamgui-audit")

    async def log_command(self, user_id: str, session_id: str, command: str):
        """
        Log user command to Cloud Logging

        Args:
            user_id: User ID who executed the command
            session_id: Session ID where command was executed
            command: The command that was executed
        """
        try:
            filtered_command = self._filter_sensitive_data(command)

            log_entry = {
                "type": "command",
                "user_id": user_id,
                "session_id": session_id,
                "command": filtered_command,
                "timestamp": datetime.utcnow().isoformat(),
            }

            self.audit_logger.log_struct(log_entry, severity="INFO")
            logger.debug(f"Logged command for session {session_id}: {filtered_command[:50]}...")

        except Exception as e:
            logger.error(f"Failed to log command for session {session_id}: {e}")

    async def log_output(self, user_id: str, session_id: str, output: str):
        """
        Log command output to Cloud Logging

        Args:
            user_id: User ID associated with the session
            session_id: Session ID where output was generated
            output: The output from the command
        """
        try:
            clean_output = self._clean_output(output)

            # Only log if there's meaningful output
            if not clean_output.strip():
                return

            log_entry = {
                "type": "output",
                "user_id": user_id,
                "session_id": session_id,
                "output": clean_output,
                "timestamp": datetime.utcnow().isoformat(),
            }

            self.audit_logger.log_struct(log_entry, severity="INFO")
            logger.debug(f"Logged output for session {session_id}: {len(clean_output)} characters")

        except Exception as e:
            logger.error(f"Failed to log output for session {session_id}: {e}")

    async def get_session_logs(self, session_id: str, user_id: str, limit: int = 500) -> List[Dict]:
        """
        Fetch audit logs from Cloud Logging for a specific session

        Args:
            session_id: Session ID to fetch logs for
            user_id: User ID to verify ownership
            limit: Maximum number of log entries to return

        Returns:
            List of log entries sorted chronologically
        """
        try:
            filter_str = f'''
                logName="projects/{environment.PROJECT_ID}/logs/gamgui-audit"
                AND jsonPayload.session_id="{session_id}"
                AND jsonPayload.user_id="{user_id}"
            '''.strip()

            entries = self.cloud_logging_client.list_entries(
                filter_=filter_str,
                order_by=cloud_logging.ASCENDING,  # Chronological order
                max_results=limit,
            )

            logs = []
            for entry in entries:
                logs.append(
                    {
                        "timestamp": entry.timestamp.isoformat(),
                        "type": entry.payload.get("type"),
                        "data": entry.payload.get("command") or entry.payload.get("output", ""),
                    }
                )

            logger.info(f"Retrieved {len(logs)} audit log entries for session {session_id}")
            return logs

        except Exception as e:
            logger.error(f"Failed to retrieve audit logs for session {session_id}: {e}")
            return []

    def _filter_sensitive_data(self, command: str) -> str:
        """
        Remove passwords, tokens, and other sensitive data from commands

        Args:
            command: Raw command string

        Returns:
            Filtered command with sensitive data redacted
        """
        # Patterns for common sensitive parameters
        sensitive_patterns = [
            r"(password|passwd|pwd)[\s=]+\S+",
            r"(token|key|secret)[\s=]+\S+",
            r"--password[\s=]+\S+",
            r"-p[\s=]+\S+",
            r"export\s+\w*(?:PASSWORD|TOKEN|KEY|SECRET)\w*[\s=]+\S+",
        ]

        filtered = command
        for pattern in sensitive_patterns:
            filtered = re.sub(pattern, r"\1=***REDACTED***", filtered, flags=re.IGNORECASE)

        return filtered

    def _clean_output(self, output: str) -> str:
        """
        Remove ANSI escape sequences and control characters from output

        Args:
            output: Raw output string

        Returns:
            Cleaned output string
        """
        if not output:
            return ""

        # Remove ANSI escape sequences (more comprehensive)
        ansi_escape = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
        clean = ansi_escape.sub("", output)

        # Remove other terminal control sequences
        clean = re.sub(r"\x1B\([AB]", "", clean)  # Remove (A, (B sequences
        clean = re.sub(r"\x1B\[[\d;]*[HJKmsu]", "", clean)  # Remove cursor/color codes
        clean = re.sub(r"\x0E|\x0F", "", clean)  # Remove shift in/out
        clean = re.sub(r"\x07", "", clean)  # Remove bell character

        # Remove excessive whitespace and empty lines
        lines = clean.split("\n")
        cleaned_lines = []
        for line in lines:
            # Remove carriage returns and clean whitespace
            line = line.replace("\r", "").strip()
            # Only keep non-empty lines or lines with meaningful content
            if line and not re.match(r"^[\s\x00-\x1F]*$", line):
                cleaned_lines.append(line)

        clean = "\n".join(cleaned_lines)

        # Remove any remaining control characters except newlines and tabs
        clean = "".join(char for char in clean if char.isprintable() or char in "\n\t")

        # Only log if there's meaningful content (not just whitespace)
        if not clean.strip():
            return ""

        # Limit output length to prevent excessive logging
        max_output_length = 5000  # 5KB limit per output chunk
        if len(clean) > max_output_length:
            clean = clean[:max_output_length] + "\n... [OUTPUT TRUNCATED] ..."

        return clean
