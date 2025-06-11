"""
Common schema definitions for GAMGUI API.
Contains shared enums and constants used across multiple schemas.
"""

from enum import Enum


class SessionStatus(str, Enum):
    """Session status enumeration"""

    CREATING = "creating"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    TERMINATED = "terminated"
    ERROR = "error"
