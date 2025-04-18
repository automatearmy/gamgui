# Docker GAM7 Integration

This document explains how we integrated the Docker GAM7 image with the GamGUI application.

## Overview

The GamGUI application needs to execute GAM commands to manage Google Workspace. We use a Docker container with GAM pre-installed to execute these commands. This approach offers several advantages:

1. Consistent GAM environment across all deployments
2. Simplified credential management
3. Improved reliability and performance

## Implementation

### 1. Docker GAM7 Image

We use the `gcr.io/gamgui-registry/docker-gam7:latest` image, which has GAM7 pre-installed. The GAM executable is located at `/gam/gam7/gam` inside the container.

### 2. Docker GAM Utility

We created a utility function in `gamgui-server/utils/dockerGam.js` that executes GAM commands in a Docker container:

```javascript
function executeGamCommand(command, options = {}) {
  // Extract options with defaults
  const cwd = options.cwd || __dirname;
  const onStdout = options.onStdout || ((data) => console.log(data.toString()));
  const onStderr = options.onStderr || ((data) => console.error(data.toString()));
  const onClose = options.onClose || ((code) => console.log(`Process exited with code ${code}`));
  const onError = options.onError || ((err) => console.error(`Process error: ${err.message}`));

  // Ensure credentials directory exists
  const credentialsPath = path.join(__dirname, '../gam-credentials');
  if (!fs.existsSync(credentialsPath)) {
    fs.mkdirSync(credentialsPath, { recursive: true });
  }

  // Ensure temp-uploads directory exists
  const uploadsDir = path.join(__dirname, '../temp-uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Build the Docker command
  const dockerCommand = 'docker';
  const dockerArgs = [
    'run',
    '--rm',  // Remove container after execution
    '--entrypoint=',  // Override the entrypoint
    '-v', `${credentialsPath}:/root/.gam`,  // Mount credentials
    '-v', `${uploadsDir}:/gam/uploads`,     // Mount uploads
    'gcr.io/gamgui-registry/docker-gam7:latest',  // Use the GAM image
    '/gam/gam7/gam', command  // Execute the command with full path
  ];

  console.log(`Executing Docker command: ${dockerCommand} ${dockerArgs.join(' ')}`);

  // Spawn the Docker process
  const process = spawn(dockerCommand, dockerArgs, {
    cwd,
    shell: true
  });

  // Handle stdout, stderr, close, and error events
  process.stdout.on('data', onStdout);
  process.stderr.on('data', onStderr);
  process.on('close', onClose);
  process.on('error', onError);

  return process;
}
```

### 3. Socket Handler Integration

We updated the socket handler to use the Docker GAM utility when executing GAM commands:

```javascript
else if (input.startsWith('gam ')) {
  // Execute GAM commands in a Docker container
  try {
    // Log the command being executed for debugging
    console.log(`Executing GAM command: ${input}`);
    outputStream.push(`Executing GAM command: ${input}\n`);
    
    // Get the command without the 'gam' prefix
    const gamCommand = input.substring(4).trim();
    
    // Import the Docker GAM utility
    const { executeGamCommand } = require('../utils/dockerGam');
    
    // Execute the command in a Docker container
    const gamProcess = executeGamCommand(gamCommand, {
      cwd: process.cwd(),
      onStdout: (data) => {
        // Send output to client
        const output = data.toString();
        console.log(`GAM stdout: ${output}`);
        outputStream.push(output);
      },
      onStderr: (data) => {
        // Send error output to client
        const errorOutput = data.toString();
        console.log(`GAM stderr: ${errorOutput}`);
        outputStream.push(errorOutput);
      },
      onClose: (code) => {
        console.log(`GAM process exited with code ${code}`);
        
        if (code !== 0) {
          outputStream.push(`\nGAM command exited with code ${code}\n`);
        } else {
          outputStream.push(`\nGAM command completed successfully\n`);
        }
        
        // Add prompt after command execution
        setTimeout(() => {
          outputStream.push('$ ');
        }, 100);
      },
      onError: (err) => {
        console.error(`Error spawning GAM process: ${err.message}`);
        outputStream.push(`Error executing GAM command: ${err.message}\n`);
        
        // Add prompt after error
        setTimeout(() => {
          outputStream.push('$ ');
        }, 100);
      }
    });
  } catch (err) {
    console.error(`Exception executing GAM command: ${err.message}`);
    outputStream.push(`Error executing GAM command: ${err.message}\n`);
  }
}
```

## Key Challenges and Solutions

### 1. Docker Entrypoint Issue

The Docker image has an entrypoint set to `/bin/bash`, which was causing issues when trying to execute commands. We solved this by using the `--entrypoint=` flag to override the entrypoint.

### 2. Path to GAM Executable

The GAM executable is located at `/gam/gam7/gam` inside the container. We needed to use the full path to the executable when running commands.

### 3. Credential Mounting

The GAM credentials need to be mounted at `/root/.gam` inside the container. We ensure the credentials directory exists and mount it when running the Docker container.

## Testing

We created a test script (`test-docker-gam.js`) to verify that the Docker GAM utility works correctly:

```javascript
const dockerGam = require('./gamgui-server/utils/dockerGam');

setTimeout(() => {
  console.log('Testing GAM command execution...');

  try {
    const gamProcess = dockerGam.executeGamCommand('version', {
      onStdout: (data) => {
        console.log('STDOUT:', data.toString());
      },
      onStderr: (data) => {
        console.error('STDERR:', data.toString());
      },
      onClose: (code) => {
        console.log(`Process exited with code ${code}`);
        process.exit(0);
      },
      onError: (err) => {
        console.error(`Process error: ${err.message}`);
        process.exit(1);
      }
    });

    console.log('GAM command process started. Waiting for output...');
  } catch (error) {
    console.error('Error executing GAM command:', error);
    process.exit(1);
  }
}, 100);
```

## Next Steps

1. **Optimize Docker Container Usage**: Consider reusing Docker containers for multiple commands to improve performance.
2. **Improve Error Handling**: Add more robust error handling for Docker-related issues.
3. **Add Caching**: Implement caching for frequently used GAM commands to reduce Docker container creation overhead.
4. **Implement Timeouts**: Add timeouts for long-running GAM commands to prevent hanging processes.
