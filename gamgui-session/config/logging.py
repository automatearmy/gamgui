"""
Logging configuration for GAMGUI Session Manager.
Configures the logging based on the environment.
"""

import logging

import google.cloud.logging

from . import environment


def configure_logging():
    """
    Configure logging based on the environment.

    In production and staging environments, this configures Google Cloud Logging.
    In development environment, this configures console logging.
    """
    # Set the root logger level based on the environment
    root_logger = logging.getLogger()
    log_level = getattr(logging, environment.LOG_LEVEL)
    root_logger.setLevel(log_level)

    # Clear any existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # In production or staging, use Google Cloud Logging
    if environment.IS_PRODUCTION or environment.IS_STAGING:
        try:
            # Initialize Google Cloud Logging client
            logging_client = google.cloud.logging.Client()
            logging_client.setup_logging()
            logging.info(f"Configured Google Cloud Logging with level {environment.LOG_LEVEL}")
        except Exception as e:
            # Fall back to console logging if Google Cloud Logging setup fails
            logging.error(f"Failed to set up Google Cloud Logging: {e}")
            _configure_console_logging()
    else:
        # In development, use console logging
        _configure_console_logging()
        logging.info("Configured console logging for development")


def _configure_console_logging():
    """
    Configure console logging for development environment.
    """
    # Create console handler
    console_handler = logging.StreamHandler()
    log_level = getattr(logging, environment.LOG_LEVEL)
    console_handler.setLevel(log_level)

    # Create formatter
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    console_handler.setFormatter(formatter)

    # Add the handler to the root logger
    root_logger = logging.getLogger()
    root_logger.addHandler(console_handler)
