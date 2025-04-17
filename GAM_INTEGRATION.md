# GAM Integration

This document explains how the application integrates with the Google Admin Manager (GAM) tool.

## Overview

The application now includes direct integration with GAM, allowing users to execute real GAM commands within the virtual terminal environment. This provides a more powerful and authentic experience compared to the previous simulated approach.

## Implementation Details

### 1. GAM Installation

The GAM tool is automatically installed during the Docker image build process:

- The latest release is downloaded from the official GAM GitHub repository
- The tool is extracted and made available in the container
- The GAM executable is added to the system PATH

### 2. Command Execution

When a user enters a GAM command in the terminal:

1. The command is passed to the system's command executor
2. The command runs in the `/gam` directory
3. Output (both stdout and stderr) is captured and sent back to the user's terminal
4. Any errors are properly handled and displayed

### 3. File Integration

Files uploaded by users are made available to GAM commands:

1. Files are stored in the `temp-uploads` directory
2. The virtual file system tracks these files
3. Users can navigate to the uploads directory using `cd uploads`
4. Files can be executed using `bash [filename]` or used as input for GAM commands

## Supported GAM Features

With this integration, users can:

1. Execute any GAM command supported by the installed version
2. Use uploaded credential files with GAM
3. Execute bash scripts that contain GAM commands
4. View command output in real-time

## Security Considerations

1. **Isolation**: Each user session is isolated from others
2. **Permissions**: The GAM tool runs with limited permissions
3. **Temporary Storage**: Uploaded files are stored temporarily and not persisted
4. **Cloud Run Security**: The application benefits from Cloud Run's security model

## Usage Examples

```
# Basic GAM commands
gam version
gam help

# Using credential files
gam oauth create
gam user user@domain.com show

# Running scripts with GAM commands
bash my-gam-script.sh
```

## Limitations

1. **Credential Management**: Users need to upload their credential files for each session
2. **Persistence**: Session data is not persisted between restarts
3. **Concurrent Sessions**: Each session operates independently

## Future Improvements

1. **Credential Storage**: Integration with Secret Manager for secure credential storage
2. **Session Persistence**: Save session state between connections
3. **Enhanced File Management**: Better handling of uploaded files and directories
4. **Command History**: Persistent command history across sessions
