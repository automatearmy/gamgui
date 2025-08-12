"""
Common schema definitions for GAMGUI API.
Contains shared enums and constants used across multiple schemas.
"""

from enum import Enum


class SessionStatus(str, Enum):
    """Session status enumeration - matches Kubernetes pod phases"""

    PENDING = "Pending"  # Pod is being created
    RUNNING = "Running"  # Pod is running
    SUCCEEDED = "Succeeded"  # Pod completed successfully
    FAILED = "Failed"  # Pod failed
    UNKNOWN = "Unknown"  # Pod status cannot be determined
