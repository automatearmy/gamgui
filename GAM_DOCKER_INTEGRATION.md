# GAM Docker Integration

This document explains the changes made to integrate the GAM command with the pre-built Docker image.

## Overview

Previously, the application attempted to execute the GAM command directly on the server, but the GAM binary was not available at the expected path (`/gam/gam7/gam`). The implemented solution executes the GAM command in a temporary Docker container using the pre-built image `gcr.io/gamgui-registry/docker-gam7:latest`.

## Changes Made

### 1. Creation of the Docker GAM Utility

We created a new file `gamgui-server/utils/dockerGam.js` that provides a function to execute GAM commands in a Docker container:

```javascript
function executeGamCommand(command, options = {}) {
  // ...
  // Execute the GAM command in a temporary Docker container
  const dockerCommand = 'docker';
  const dockerArgs = [
    'run',
    '--rm',  // Remove container after execution
    '-v', `${credentialsPath}:/root/.gam`,  // Mount credentials
    '-v', `${uploadsDir}:/gam/uploads`,     // Mount uploads
    'gcr.io/gamgui-registry/docker-gam7:latest',  // Use the GAM image
    '-c', `cd /gam && gam ${command}`       // Execute the command
  ];
  // ...
}
```

### 2. Update of the Socket Handler

We modified the `gamgui-server/routes/socketHandler.js` file to use the new utility when processing GAM commands:

```javascript
else if (input.startsWith('gam ')) {
  // Execute GAM commands in a Docker container
  try {
    // ...
    // Get the command without the 'gam' prefix
    const gamCommand = input.substring(4).trim();
    
    // Import the Docker GAM utility
    const { executeGamCommand } = require('../utils/dockerGam');
    
    // Execute the command in a Docker container
    const gamProcess = executeGamCommand(gamCommand, {
      // Callbacks to process output, errors, etc.
    });
    // ...
  } catch (err) {
    // ...
  }
}
```

## How It Works

1. When the user types a GAM command in the virtual terminal, the system extracts the command (without the 'gam' prefix).
2. The `dockerGam.js` utility is called to execute the command in a temporary Docker container.
3. The Docker container is created using the `gcr.io/gamgui-registry/docker-gam7:latest` image.
4. The credentials and uploads directories are mounted in the container so that GAM can access them.
5. The GAM command is executed inside the container and the output is streamed back to the virtual terminal.
6. After the command completes, the container is automatically removed.

## Benefits

1. **Isolation**: Each GAM command is executed in its own isolated container.
2. **Consistency**: The same Docker image is used for all GAM commands, ensuring a consistent environment.
3. **Simplicity**: There is no need to install GAM directly on the server.
4. **Security**: Credentials are mounted only when needed and are not stored in the image.

## Next Steps

1. **Testing**: Verify that GAM commands work correctly in the virtual terminal.
2. **Optimization**: Consider optimizations to improve performance, such as reusing containers instead of creating new ones for each command.
3. **Monitoring**: Add monitoring to track usage and detect issues.
