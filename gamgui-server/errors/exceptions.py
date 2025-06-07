"""
Custom exceptions for GAMGUI API.
"""

from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse


class APIException(HTTPException):
    """
    Custom API exception with standardized error details.
    Extends FastAPI's HTTPException with additional fields for our response format.
    """

    def __init__(
        self,
        status_code: int = 400,
        message: str = "An error occurred",
        error_code: str = "UNKNOWN_ERROR",
        exception: Optional[str] = None,
    ):
        """
        Initialize API exception with standardized error format.

        Args:
            status_code: HTTP status code
            message: Human-readable error message
            error_code: Error code string for client identification
            exception: Technical exception message (not human-readable)
        """
        self.message = message
        self.error_code = error_code
        self.exception_message = exception or message

        # Use the detail field to store our error info
        super().__init__(status_code=status_code, detail=message)


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register custom exception handlers with the FastAPI application.

    Args:
        app: FastAPI application instance
    """

    @app.exception_handler(APIException)
    async def api_exception_handler(request: Request, exc: APIException):
        """
        Handle custom API exceptions with standardized response format.
        """
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "data": None,
                "error": {"code": exc.error_code, "exception": exc.exception_message},
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """
        Handle standard HTTPExceptions with our response format.
        """
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": str(exc.detail),
                "data": None,
                "error": {"code": f"HTTP_{exc.status_code}", "exception": str(exc.detail)},
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """
        Handle any unhandled exceptions with standardized response format.
        """
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
                "data": None,
                "error": {"code": "INTERNAL_ERROR", "exception": str(exc)},
            },
        )
