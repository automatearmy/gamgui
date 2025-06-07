"""
Health controller for GAMGUI API.
Provides health check and environment information endpoints.
"""

from datetime import datetime
import logging
import platform

from fastapi import Request

from config import environment
from schemas.health_schemas import EnvironmentInfoResponse, HealthResponse
from schemas.responses import SuccessResponse

logger = logging.getLogger(__name__)


class HealthController:
    """Controller for health-related endpoints"""

    async def health_check(self, request: Request) -> SuccessResponse[HealthResponse]:
        """
        Basic health check endpoint.
        Returns OK if the API is running.
        """
        health_data = HealthResponse(
            status="ok",
            timestamp=datetime.now(),
            environment=environment.ENVIRONMENT,
            project_id=environment.PROJECT_ID,
        )

        return SuccessResponse(success=True, message="API is running normally", data=health_data)

    async def get_environment_info(self, request: Request) -> SuccessResponse[EnvironmentInfoResponse]:
        """
        Get detailed environment information.
        Returns system and API environment details.
        """
        # Collect system information
        system_info = {
            "python_version": platform.python_version(),
            "platform": platform.platform(),
            "processor": platform.processor(),
            "hostname": platform.node(),
        }

        # Collect API information (non-sensitive environment variables)
        api_info = {
            "port": environment.PORT,
            "log_level": environment.LOG_LEVEL,
            "kubernetes_namespace": environment.KUBERNETES_NAMESPACE,
            "session_timeout_minutes": environment.SESSION_TIMEOUT_MINUTES,
        }

        env_info = EnvironmentInfoResponse(
            environment=environment.ENVIRONMENT,
            project_id=environment.PROJECT_ID,
            system_info=system_info,
            api_info=api_info,
        )

        return SuccessResponse(success=True, message="Environment information retrieved successfully", data=env_info)
