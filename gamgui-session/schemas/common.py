"""
Common schemas and enums for GAMGUI Session Manager.
"""

from enum import Enum


class SessionStatus(str, Enum):
    """Session status enumeration"""

    CREATING = "creating"
    RUNNING = "running"
    TERMINATED = "terminated"
    FAILED = "failed"


class SecretType(str, Enum):
    """Secret type enumeration"""

    CLIENT_SECRETS = "client_secrets"
    OAUTH2 = "oauth2"
    OAUTH2SERVICE = "oauth2service"
