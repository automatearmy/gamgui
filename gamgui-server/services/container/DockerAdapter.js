/**
 * Docker implementation of ContainerService
 * Provides container operations using Docker
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ContainerService = require('./ContainerService');
const { ContainerError } = require('../../utils/errorHandler');

/**
 * Docker implementation of ContainerService
 * @extends ContainerService
 */
class DockerAdapter extends ContainerService {
  /**
   * Create a new DockerAdapter
   * @param {import('../../config/config')} config - Configuration
   * @param {import('../../utils/logger')} logger - Logger instance
   */
  constructor(config, logger) {
    super(logger);
    this.config = config;
    
    // Ensure directories exist
    this._ensureDirectoriesExist();
  }

  /**
   * Ensure required directories exist
   * @private
   */
  _ensureDirectoriesExist() {
    try {
      // Ensure credentials directory exists
      if (!fs.existsSync(this.config.paths.credentials)) {
        fs.mkdirSync(this.config.paths.credentials, { recursive: true });
        this.logger.info(`Created credentials directory: ${this.config.paths.credentials}`);
      }

      // Ensure uploads directory exists
      if (!fs.existsSync(this.config.paths.uploads)) {
        fs.mkdirSync(this.config.paths.uploads, { recursive: true });
        this.logger.info(`Created uploads directory: ${this.config.paths.uploads}`);
      }
    } catch (error) {
      this.logger.error('Error ensuring directories exist:', error);
      throw new ContainerError('Failed to ensure directories exist', { cause: error });
    }
  }

  /**
   * Execute a command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The command to execute
   * @returns {Promise<object>} - The command result
   * @throws {ContainerError} - If the command execution fails
   */
  async executeCommand(sessionId, command) {
    try {
      this.logger.debug(`Executing command for session ${sessionId}: ${command}`);
      
      // Build the Docker command
      const dockerCommand = 'docker';
      const dockerArgs = [
        'run',
        '--rm',  // Remove container after execution
        '--entrypoint=',  // Override the entrypoint
        '-v', `${this.config.paths.credentials}:/root/.gam`,  // Mount credentials
        '-v', `${this.config.paths.uploads}:/gam/uploads`,     // Mount uploads
        this.config.docker.gamImage,  // Use the GAM image
        '/bin/bash', '-c', command  // Execute the command with bash
      ];
      
      // Execute the command
      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        const process = spawn(dockerCommand, dockerArgs, {
          cwd: path.dirname(this.config.paths.uploads),
          shell: true
        });
        
        // Handle stdout
        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        // Handle stderr
        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        // Handle process close
        process.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new ContainerError(`Command exited with code ${code}`, {
              command,
              code,
              stdout,
              stderr
            }));
          }
        });
        
        // Handle process error
        process.on('error', (error) => {
          reject(new ContainerError(`Error executing command: ${error.message}`, {
            cause: error,
            command
          }));
        });
      });
    } catch (error) {
      this.logger.error(`Error executing command for session ${sessionId}:`, error);
      throw new ContainerError(`Error executing command: ${error.message}`, {
        cause: error,
        sessionId,
        command
      });
    }
  }

  /**
   * Create a container for a session
   * @param {string} sessionId - The session ID
   * @param {object} options - Container options
   * @returns {Promise<object>} - The created container info
   * @throws {ContainerError} - If the container creation fails
   */
  async createContainer(sessionId, options = {}) {
    try {
      this.logger.info(`Creating Docker container for session ${sessionId}`);
      
      // For Docker, we don't actually create a persistent container
      // Instead, we just return the container info that will be used to run commands
      return {
        id: `docker-container-${sessionId}`,
        sessionId,
        docker: true,
        virtual: true,  // Docker containers are considered "virtual" since they're not persistent
        stream: null
      };
    } catch (error) {
      this.logger.error(`Error creating Docker container for session ${sessionId}:`, error);
      throw new ContainerError(`Error creating container: ${error.message}`, {
        cause: error,
        sessionId,
        options
      });
    }
  }

  /**
   * Delete a container for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the container deletion fails
   */
  async deleteContainer(sessionId) {
    // For Docker, there's no persistent container to delete
    this.logger.info(`No persistent Docker container to delete for session ${sessionId}`);
    return;
  }

  /**
   * Upload a file to a container
   * @param {string} sessionId - The session ID
   * @param {string} localFilePath - The local file path
   * @param {string} containerFilePath - The container file path
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the file upload fails
   */
  async uploadFile(sessionId, localFilePath, containerFilePath) {
    try {
      // For Docker, we just copy the file to the uploads directory
      // which will be mounted when the container runs
      const relativePath = containerFilePath.replace('/gam/uploads/', '');
      const targetPath = path.join(this.config.paths.uploads, relativePath);
      
      // Create the directory if it doesn't exist
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copy the file
      fs.copyFileSync(localFilePath, targetPath);
      
      this.logger.debug(`Uploaded file ${localFilePath} to ${targetPath} for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error uploading file for session ${sessionId}:`, error);
      throw new ContainerError(`Error uploading file: ${error.message}`, {
        cause: error,
        sessionId,
        localFilePath,
        containerFilePath
      });
    }
  }

  /**
   * Download a file from a container
   * @param {string} sessionId - The session ID
   * @param {string} containerFilePath - The container file path
   * @param {string} localFilePath - The local file path
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the file download fails
   */
  async downloadFile(sessionId, containerFilePath, localFilePath) {
    try {
      // For Docker, we just copy the file from the uploads directory
      const relativePath = containerFilePath.replace('/gam/uploads/', '');
      const sourcePath = path.join(this.config.paths.uploads, relativePath);
      
      // Check if the file exists
      if (!fs.existsSync(sourcePath)) {
        throw new ContainerError(`File not found: ${containerFilePath}`);
      }
      
      // Create the directory if it doesn't exist
      const targetDir = path.dirname(localFilePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copy the file
      fs.copyFileSync(sourcePath, localFilePath);
      
      this.logger.debug(`Downloaded file ${sourcePath} to ${localFilePath} for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error downloading file for session ${sessionId}:`, error);
      throw new ContainerError(`Error downloading file: ${error.message}`, {
        cause: error,
        sessionId,
        containerFilePath,
        localFilePath
      });
    }
  }

  /**
   * Get the status of a container
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - The container status
   * @throws {ContainerError} - If getting the status fails
   */
  async getStatus(sessionId) {
    // For Docker, there's no persistent container to get status from
    return {
      phase: 'Virtual',
      conditions: [
        {
          type: 'Ready',
          status: 'True'
        }
      ]
    };
  }

  /**
   * Get the websocket path for a session
   * @param {string} sessionId - The session ID
   * @returns {string} - The websocket path
   */
  getWebsocketPath(sessionId) {
    // Docker doesn't support websocket paths
    return null;
  }

  /**
   * Execute a GAM command in a Docker container
   * @param {string} sessionId - The session ID
   * @param {string} command - The GAM command (without 'gam' prefix)
   * @param {object} options - Command options
   * @param {function} options.onStdout - Callback for stdout data
   * @param {function} options.onStderr - Callback for stderr data
   * @param {function} options.onClose - Callback for process close
   * @param {function} options.onError - Callback for process error
   * @returns {object} - The spawned process
   */
  executeGamCommand(sessionId, command, options = {}) {
    try {
      this.logger.debug(`Executing GAM command for session ${sessionId}: ${command}`);
      
      // Extract options with defaults
      const onStdout = options.onStdout || ((data) => this.logger.debug(`GAM stdout: ${data}`));
      const onStderr = options.onStderr || ((data) => this.logger.debug(`GAM stderr: ${data}`));
      const onClose = options.onClose || ((code) => this.logger.debug(`GAM process exited with code ${code}`));
      const onError = options.onError || ((err) => this.logger.error(`GAM process error: ${err.message}`));
      
      // Build the Docker command
      const dockerCommand = 'docker';
      const dockerArgs = [
        'run',
        '--rm',  // Remove container after execution
        '--entrypoint=',  // Override the entrypoint
        '-v', `${this.config.paths.credentials}:/root/.gam`,  // Mount credentials
        '-v', `${this.config.paths.uploads}:/gam/uploads`,     // Mount uploads
        this.config.docker.gamImage,  // Use the GAM image
        '/bin/bash', '-c', `/gam/gam7/gam ${command}`  // Execute the GAM command with bash
      ];
      
      this.logger.debug(`Executing Docker command: ${dockerCommand} ${dockerArgs.join(' ')}`);
      
      // Spawn the Docker process
      const process = spawn(dockerCommand, dockerArgs, {
        cwd: path.dirname(this.config.paths.uploads),
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
    } catch (error) {
      this.logger.error(`Error executing GAM command for session ${sessionId}:`, error);
      throw new ContainerError(`Error executing GAM command: ${error.message}`, {
        cause: error,
        sessionId,
        command
      });
    }
  }

  /**
   * Execute a bash script in a Docker container
   * @param {string} sessionId - The session ID
   * @param {string} scriptPath - The script path (can be relative or absolute)
   * @param {object} options - Command options
   * @param {function} options.onStdout - Callback for stdout data
   * @param {function} options.onStderr - Callback for stderr data
   * @param {function} options.onClose - Callback for process close
   * @param {function} options.onError - Callback for process error
   * @returns {object} - The spawned process
   */
  executeBashScript(sessionId, scriptPath, options = {}) {
    try {
      this.logger.debug(`Executing bash script for session ${sessionId}: ${scriptPath}`);
      
      // Extract options with defaults
      const onStdout = options.onStdout || ((data) => this.logger.debug(`Bash stdout: ${data}`));
      const onStderr = options.onStderr || ((data) => this.logger.debug(`Bash stderr: ${data}`));
      const onClose = options.onClose || ((code) => this.logger.debug(`Bash process exited with code ${code}`));
      const onError = options.onError || ((err) => this.logger.error(`Bash process error: ${err.message}`));
      
      // Determine if the script path is absolute or relative
      const isAbsolutePath = scriptPath.startsWith('/');
      
      // If it's an absolute path, extract the directory and filename
      let scriptDir = '/gam';
      let scriptName = scriptPath;
      
      if (isAbsolutePath) {
        scriptDir = path.dirname(scriptPath);
        scriptName = path.basename(scriptPath);
      }
      
      // Escape special characters in paths
      const escapedScriptDir = scriptDir.replace(/(["'$`\\])/g, '\\$1');
      const escapedScriptName = scriptName.replace(/(["'$`\\])/g, '\\$1');
      
      this.logger.debug(`Script directory: ${scriptDir}, Script name: ${scriptName}`);
      
      // Build the Docker command
      const dockerCommand = 'docker';
      const dockerArgs = [
        'run',
        '--rm',  // Remove container after execution
        '--entrypoint=',  // Override the entrypoint
        '-v', `${this.config.paths.credentials}:/root/.gam`,  // Mount credentials
        '-v', `${this.config.paths.uploads}:/gam/uploads`,     // Mount uploads
        this.config.docker.gamImage,  // Use the GAM image
        '/bin/bash', '-c', `cd "${escapedScriptDir}" && bash "${escapedScriptName}"`  // Execute the script with bash
      ];
      
      this.logger.debug(`Executing Docker command: ${dockerCommand} ${dockerArgs.join(' ')}`);
      
      // Spawn the Docker process
      const process = spawn(dockerCommand, dockerArgs, {
        cwd: path.dirname(this.config.paths.uploads),
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
    } catch (error) {
      this.logger.error(`Error executing bash script for session ${sessionId}:`, error);
      throw new ContainerError(`Error executing bash script: ${error.message}`, {
        cause: error,
        sessionId,
        scriptPath
      });
    }
  }
}

module.exports = DockerAdapter;
