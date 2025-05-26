# GAMGUI Server Scripts

This directory contains scripts for testing, diagnostics, and maintenance of the GAMGUI server.

## Directory Structure

### diagnostics/
Scripts for testing and diagnosing application functionality:
- `check-application-status.js`: Check overall application health and status
- `test-application.js`: Comprehensive application functionality tests

### maintenance/
Scripts for system maintenance and cleanup:
- `cleanup-old-sessions.js`: Clean up expired sessions and resources
- `schedule-cleanup.sh`: Schedule automated cleanup tasks

### WebSocket Testing
- `test-websocket-client.html`: HTML-based WebSocket client for testing
- `test-websocket-client.js`: JavaScript WebSocket client implementation
- `test-websocket-client.sh`: Shell script for WebSocket testing

## Usage

### Running Diagnostic Scripts
```bash
# Check application status
node scripts/diagnostics/check-application-status.js

# Run comprehensive tests
node scripts/diagnostics/test-application.js
```

### Running Maintenance Scripts
```bash
# Clean up old sessions
node scripts/maintenance/cleanup-old-sessions.js

# Schedule cleanup (requires cron)
./scripts/maintenance/schedule-cleanup.sh
```

### WebSocket Testing
```bash
# Test WebSocket connection
./scripts/test-websocket-client.sh

# Or open test-websocket-client.html in a browser for interactive testing
```

## Environment Requirements

Most scripts require the following environment variables:
- `PROJECT_ID`: Google Cloud project ID
- `GKE_CLUSTER_NAME`: Kubernetes cluster name
- `GKE_CLUSTER_LOCATION`: Kubernetes cluster location

Check individual script files for specific requirements.
