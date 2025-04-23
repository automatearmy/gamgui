/**
 * Utility to execute GAM commands in a Docker container
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Execute a GAM command in a Docker container
 * @param {string} command - The GAM command to execute (without 'gam' prefix)
 * @param {object} options - Options for execution
 * @param {string} options.cwd - Working directory
 * @param {function} options.onStdout - Callback for stdout data
 * @param {function} options.onStderr - Callback for stderr data
 * @param {function} options.onClose - Callback for process close
 * @param {function} options.onError - Callback for process error
 * @returns {object} - The spawned process
 */
function executeGamCommand(command, options = {}) {
  // Extract options with defaults
  const cwd = options.cwd || __dirname; // Use __dirname instead of process.cwd()
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
  // This runs a temporary container with the GAM image, mounts the credentials and uploads directories,
  // and executes the GAM command
  const dockerCommand = 'docker';
  const dockerArgs = [
    'run',
    '--rm',  // Remove container after execution
    '--entrypoint=',  // Override the entrypoint
    '-v', `${credentialsPath}:/root/.gam`,  // Mount credentials
    '-v', `${uploadsDir}:/gam/uploads`,     // Mount uploads
    'gcr.io/gamgui-registry/docker-gam7:latest',  // Use the GAM image
    '/bin/bash', '-c', `/gam/gam7/gam ${command}`  // Execute the command with bash to ensure proper argument handling
  ];

  console.log(`Executing Docker command: ${dockerCommand} ${dockerArgs.join(' ')}`);

  // Spawn the Docker process
  const process = spawn(dockerCommand, dockerArgs, {
    cwd,
    shell: true
  });

  // Handle stdout
  process.stdout.on('data', onStdout);

  // Handle stderr
  process.stderr.on('data', onStderr);

  // Handle process close
  process.on('close', onClose);

  // Handle process error
  process.on('error', onError);

  return process;
}

module.exports = {
  executeGamCommand
};
