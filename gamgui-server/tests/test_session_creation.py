"""
Test script for verifying fast session creation using the NGINX Ingress Controller.
"""

import asyncio
from datetime import datetime
import logging
import sys
import time

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("session-test")

# Import necessary modules
sys.path.append(".")  # Add the current directory to path
from schemas.session_schemas import CreateSessionRequest
from services.session_service import SessionService


async def test_create_session():
    """Test creating a session and measure the time taken"""
    logger.info("Starting session creation test")

    # Initialize the SessionService
    session_service = SessionService()

    # Create a test user ID
    test_user_id = "test.user@example.com"

    # Create a session request
    request = CreateSessionRequest(
        name="Test Session",
        description="Session created for testing ingress-based connectivity",
        timeout_minutes=60,
        domain="example.com",
    )

    # Measure the time taken to create a session
    start_time = time.time()

    try:
        # Create the session
        logger.info(f"Creating session for user {test_user_id}")
        session = await session_service.create_session(user_id=test_user_id, request=request)

        # Calculate elapsed time
        elapsed_time = time.time() - start_time

        # Log session details
        logger.info(f"Session created successfully in {elapsed_time:.2f} seconds")
        logger.info(f"Session ID: {session.id}")
        logger.info(f"Session status: {session.status}")
        logger.info(f"WebSocket URL: {session.websocket_url}")
        logger.info(f"Pod name: {session.pod_info.name}")

        # Test successful if creation time is under 60 seconds
        if elapsed_time < 60:
            logger.info("✅ Test PASSED: Session created in under 60 seconds")
        else:
            logger.warning("❌ Test FAILED: Session creation took more than 60 seconds")

        # Give the user a chance to connect to the session via the websocket URL
        logger.info(f"You can now connect to the session at: {session.websocket_url}")
        logger.info("Press Ctrl+C to terminate the test and delete the session")

        # Keep the session running for manual testing
        try:
            while True:
                await asyncio.sleep(5)
                # Check session status periodically
                updated_session = await session_service.get_session(session.id)
                if updated_session:
                    if updated_session.status != session.status:
                        logger.info(f"Session status changed to: {updated_session.status}")
                        session.status = updated_session.status
                else:
                    logger.warning("Session not found, it might have been deleted")
                    break
        except KeyboardInterrupt:
            logger.info("Test interrupted by user")

        # Clean up: Delete the session
        logger.info(f"Cleaning up: Deleting session {session.id}")
        await session_service.delete_session(session.id)
        logger.info("Session deleted successfully")

    except Exception as e:
        # Log any errors
        elapsed_time = time.time() - start_time
        logger.error(f"Failed to create session after {elapsed_time:.2f} seconds: {e}")
        logger.exception(e)
        return False

    return True


if __name__ == "__main__":
    logger.info(f"Test started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Run the test
    asyncio.run(test_create_session())

    logger.info(f"Test completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
