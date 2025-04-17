# Virtual Session Changes

This document explains the changes made to remove the Docker dependency from the server-side code and replace it with a virtual session approach.

## Overview

Previously, the application used Docker to create and manage containers for each session. This approach had several limitations:

1. It required Docker to be installed and running on the server
2. It didn't work in Cloud Run environments where Docker daemon access is restricted
3. It resulted in the error: `Failed to initialize session: Error: connect ENOENT /var/run/docker.sock`

The new approach uses virtual sessions that simulate a terminal environment without requiring Docker, making the application more compatible with Cloud Run and other restricted environments.

## Changes Made

### 1. Modified `sessionRoutes.js`

- Removed Docker dependency and initialization
- Changed the session creation process to create virtual sessions instead of Docker containers
- Updated the session deletion process to clean up virtual sessions
- Added support for using the GAM image from environment variables

### 2. Modified `socketHandler.js`

- Removed Docker dependency
- Implemented a virtual terminal using Node.js streams
- Added basic command processing to simulate a terminal environment
- Updated the WebSocket handlers to work with the virtual terminal

## How It Works

### Virtual Sessions

Instead of creating actual Docker containers, the application now creates "virtual sessions" that:

1. Have a unique ID and name
2. Reference the GAM image (but don't actually use it)
3. Provide a simulated terminal environment

### Virtual Terminal

The virtual terminal is implemented using Node.js streams:

1. An output stream (`Readable`) sends data to the client
2. An input stream (`Writable`) receives commands from the client
3. Basic command processing simulates a terminal environment

## Supported Commands

The virtual terminal supports the following commands:

- `echo [text]`: Outputs the provided text
- `ls`: Lists files (simulated)
- `pwd`: Shows the current directory (simulated)
- `whoami`: Shows the current user (simulated)
- `date`: Shows the current date and time
- `help` or `gam help`: Shows available commands

## Benefits

1. **Cloud Run Compatibility**: The application now works in environments where Docker daemon access is restricted
2. **Simplified Deployment**: No need to install and configure Docker on the server
3. **Reduced Resource Usage**: Virtual sessions use less resources than actual Docker containers
4. **Improved Security**: Reduced attack surface by eliminating Docker daemon access

## Limitations

1. **Limited Functionality**: The virtual terminal only supports basic commands
2. **No Actual GAM Execution**: Commands are simulated, not actually executed in a GAM environment
3. **No File System Access**: File operations are simulated, not actually performed

## Future Improvements

For a more robust solution, consider:

1. **Enhanced Command Simulation**: Add more sophisticated command processing
2. **File System Integration**: Implement actual file system operations for uploaded files
3. **GAM Command Simulation**: Add specific GAM command simulations
4. **User Authentication**: Add user-specific session management
5. **Session Persistence**: Store sessions in a database for persistence across restarts
