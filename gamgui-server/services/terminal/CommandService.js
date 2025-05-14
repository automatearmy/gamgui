/**
 * Service for executing commands in containers
 * Provides a unified interface for executing commands in containers
 */
const { CommandExecutionError } = require('../../utils/errorHandler');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { processGamCommand } = require('../../utils/gamCommandInterceptor');

/**
 * Service for executing commands in containers
 */
class CommandService {
  /**
   * Create a new CommandService
   * @param {import('../container/ContainerService')} containerService - Container service
   * @param {import('../../utils/logger')} logger - Logger instance
   */
  constructor(containerService, logger) {
    this.containerService = containerService;
    this.logger = logger;
  }

  /**
   * Add prompt to output stream
   * @private
   * @param {import('stream').Writable} outputStream - Stream to write output to
   */
  _addPrompt(outputStream) {
    setTimeout(() => {
      outputStream.push('$ ');
    }, 100);
  }

  /**
   * Execute a command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The command to execute
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @returns {Promise<void>}
   * @throws {CommandExecutionError} - If the command execution fails
   */
  async executeCommand(sessionId, command, outputStream) {
    try {
      this.logger.debug(`Executing command for session ${sessionId}: ${command}`);
      
      // Execute the command in the container
      const result = await this.containerService.executeCommand(sessionId, command);
      
      // Write the output to the stream
      if (result.stdout) {
        outputStream.push(result.stdout);
      }
      
      if (result.stderr) {
        outputStream.push(result.stderr);
      }
      
      this.logger.debug(`Command executed successfully for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error executing command for session ${sessionId}:`, error);
      throw new CommandExecutionError(`Error executing command: ${error.message}`, {
        cause: error,
        sessionId,
        command
      });
    }
  }

  /**
   * Execute a GAM command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The GAM command (without 'gam' prefix)
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @returns {Promise<void>}
   * @throws {CommandExecutionError} - If the command execution fails
   */
  async executeGamCommand(sessionId, command, outputStream) {
    try {
      this.logger.debug(`Executing GAM command for session ${sessionId}: ${command}`);
      
      // Get session information to determine user context
      let session = null;
      try {
        // Try to get the session from the sessionRepository
        const { sessionRepository } = require('../../services/session');
        session = sessionRepository.findById(sessionId);
        this.logger.debug(`Found session for ${sessionId}: ${session ? 'Yes' : 'No'}`);
      } catch (error) {
        this.logger.warn(`Could not get session info for ${sessionId}: ${error.message}`);
      }
      
      // Process the command to ensure it uses the correct user context
      const processedCommand = processGamCommand(command, session);
      if (processedCommand !== command) {
        this.logger.info(`Modified GAM command for session ${sessionId}: '${command}' -> '${processedCommand}'`);
        command = processedCommand;
      }
      
      // Check if the container service has a specific method for GAM commands
      if (typeof this.containerService.executeGamCommand === 'function') {
        // Use the container service's GAM command method
        const process = this.containerService.executeGamCommand(sessionId, command, {
          onStdout: (data) => {
            outputStream.push(data.toString());
          },
          onStderr: (data) => {
            outputStream.push(data.toString());
          },
          onClose: (code) => {
            if (code !== 0) {
              outputStream.push(`\nGAM command exited with code ${code}\n`);
            } else {
              outputStream.push(`\nGAM command completed successfully\n`);
            }
            
            // Add prompt after command execution
            this._addPrompt(outputStream);
          },
          onError: (err) => {
            outputStream.push(`Error executing GAM command: ${err.message}\n`);
            
            // Add prompt after error
            this._addPrompt(outputStream);
          }
        });
        
        return;
      }
      
      // Otherwise, use the generic command execution method
      await this.executeCommand(sessionId, `/gam/gam7/gam ${command}`, outputStream);
      
      // Add prompt after command execution
      this._addPrompt(outputStream);
    } catch (error) {
      this.logger.error(`Error executing GAM command for session ${sessionId}:`, error);
      outputStream.push(`Error executing GAM command: ${error.message}\n`);
      
      // Add prompt after error
      this._addPrompt(outputStream);
    }
  }

  /**
   * Execute a shell command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The shell command to execute
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {object} [options] - Additional options
   * @param {boolean} [options.silent] - Whether to suppress output
   * @param {number} [options.timeout] - Timeout in milliseconds
   * @param {boolean} [options.sanitize] - Whether to sanitize the command
   * @returns {Promise<void>}
   * @throws {CommandExecutionError} - If the command execution fails
   */
  async executeShellCommand(sessionId, command, outputStream, options = {}) {
    const silent = options.silent === true;
    const timeout = options.timeout || 60000; // Default: 60 seconds
    const sanitize = options.sanitize !== false; // Default: true

    try {
      this.logger.debug(`Executing shell command for session ${sessionId}: ${command}`);
      
      // Check if the container service has a specific method for shell commands
      if (typeof this.containerService.executeShellCommand === 'function') {
        // Use the container service's shell command method
        this.containerService.executeShellCommand(sessionId, command, {
          onStdout: (data) => {
            if (!silent) outputStream.push(data.toString());
          },
          onStderr: (data) => {
            if (!silent) outputStream.push(data.toString());
          },
          onClose: (code) => {
            if (!silent) {
              if (code !== 0) {
                outputStream.push(`\nCommand exited with code ${code}\n`);
              }
            }
            
            // Add prompt after command execution if not silent
            if (!silent) this._addPrompt(outputStream);
          },
          onError: (err) => {
            if (!silent) {
              outputStream.push(`Error executing command: ${err.message}\n`);
              // Add prompt after error
              this._addPrompt(outputStream);
            }
          },
          timeout,
          sanitize
        });
        
        return;
      }
      
      // Otherwise, use the generic command execution method
      await this.executeCommand(sessionId, command, outputStream);
      
      // Add prompt after command execution if not silent
      if (!silent) this._addPrompt(outputStream);
    } catch (error) {
      this.logger.error(`Error executing shell command for session ${sessionId}:`, error);
      
      if (!silent) {
        outputStream.push(`Error executing command: ${error.message}\n`);
        // Add prompt after error
        this._addPrompt(outputStream);
      }
    }
  }

  /**
   * Execute a bash script in a container
   * @param {string} sessionId - The session ID
   * @param {string} scriptPath - The path to the script inside the container (can be relative or absolute)
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {object} [options] - Additional options
   * @param {boolean} [options.silent] - Whether to suppress output
   * @returns {Promise<void>}
   * @throws {CommandExecutionError} - If the script execution fails
   */
  async executeBashScript(sessionId, scriptPath, outputStream, options = {}) {
    // Escape potential problematic characters in the path for shell commands
    const escapedScriptPath = scriptPath.replace(/(["'$`\\])/g,'\\$1');
    const silent = options.silent === true;

    try {
      this.logger.debug(`Executing bash script for session ${sessionId}: ${scriptPath}`);
      
      // Check if the container service has a specific method for bash scripts
      if (typeof this.containerService.executeBashScript === 'function') {
        // Use the container service's bash script method
        this.containerService.executeBashScript(sessionId, scriptPath, {
          onStdout: (data) => {
            if (!silent) outputStream.push(data.toString());
          },
          onStderr: (data) => {
            if (!silent) outputStream.push(data.toString());
          },
          onClose: (code) => {
            if (!silent) {
              if (code !== 0) {
                outputStream.push(`\nScript exited with code ${code}\n`);
              } else {
                outputStream.push(`\nScript executed successfully\n`);
              }
            }
            
            // Add prompt after command execution if not silent
            if (!silent) this._addPrompt(outputStream);
          },
          onError: (err) => {
            if (!silent) {
              outputStream.push(`Error executing script: ${err.message}\n`);
              // Add prompt after error
              this._addPrompt(outputStream);
            }
          }
        });
        
        return;
      }
      
      // Otherwise, use the generic command execution method
      // First make the script executable
      try {
        // Use the escaped path for the command
        await this.executeCommand(sessionId, `chmod +x "${escapedScriptPath}"`, { silent: true }); 
      } catch (chmodError) {
        this.logger.warn(`Failed to make script executable ${scriptPath}: ${chmodError.message}. Continuing anyway.`);
      }
      
      // Then execute it
      // Use the escaped path for the command
      await this.executeCommand(sessionId, `bash "${escapedScriptPath}"`, outputStream); 
      
      // Add prompt after command execution if not silent
      if (!silent) this._addPrompt(outputStream); // executeCommand doesn't add prompt, so we add it here
    } catch (error) {
      this.logger.error(`Error executing bash script ${scriptPath} for session ${sessionId}:`, error);
      
      if (!silent) {
        outputStream.push(`Error executing script: ${error.message}\n`);
        // Add prompt after error
        this._addPrompt(outputStream);
      }
    }
  }
  
  /**
   * Upload and execute a script in a container
   * @param {string} sessionId - The session ID
   * @param {string} scriptContent - The content of the script
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {object} [options] - Additional options
   * @param {boolean} [options.silent] - Whether to suppress output
   * @param {boolean} [options.cleanup] - Whether to clean up the script after execution
   * @returns {Promise<void>}
   * @throws {CommandExecutionError} - If the script execution fails
   */
  async uploadAndExecuteScript(sessionId, scriptContent, outputStream, options = {}) {
    const silent = options.silent === true;
    const cleanup = options.cleanup !== false; // Default: true
    
    try {
      this.logger.debug(`Uploading and executing script for session ${sessionId}`);
      
      // Check if the container service has a specific method for uploading and executing scripts
      if (typeof this.containerService.uploadAndExecuteScript === 'function') {
        // Use the container service's method
        const result = await this.containerService.uploadAndExecuteScript(sessionId, scriptContent, {
          onStdout: (data) => {
            if (!silent) outputStream.push(data.toString());
          },
          onStderr: (data) => {
            if (!silent) outputStream.push(data.toString());
          },
          onClose: () => {
            if (!silent) {
              outputStream.push(`\nScript executed successfully\n`);
              this._addPrompt(outputStream);
            }
          },
          onError: (err) => {
            if (!silent) {
              outputStream.push(`Error executing script: ${err.message}\n`);
              this._addPrompt(outputStream);
            }
          },
          cleanup
        });
        
        return result;
      }
      
      // Otherwise, implement the functionality manually
      // Create a temporary file locally
      const tempFile = path.join(os.tmpdir(), `script-${sessionId}-${crypto.randomBytes(8).toString('hex')}.sh`);
      const containerPath = `/tmp/script-${sessionId}-${Date.now()}.sh`;
      
      try {
        // Write the script content to the temporary file
        fs.writeFileSync(tempFile, scriptContent);
        
        // Upload the file to the container
        await this.uploadFile(sessionId, tempFile, containerPath);
        
        // Make the script executable
        await this.executeCommand(sessionId, `chmod +x ${containerPath}`, { silent: true });
        
        // Execute the script
        if (!silent) outputStream.push(`Executing script...\n`);
        await this.executeCommand(sessionId, `bash ${containerPath}`, outputStream);
        
        // Clean up if requested
        if (cleanup) {
          await this.executeCommand(sessionId, `rm ${containerPath}`, { silent: true });
        }
        
        // Add prompt after command execution if not silent
        if (!silent) this._addPrompt(outputStream);
      } finally {
        // Clean up the local temporary file
        try {
          fs.unlinkSync(tempFile);
        } catch (error) {
          // Ignore errors when cleaning up
        }
      }
    } catch (error) {
      this.logger.error(`Error uploading and executing script for session ${sessionId}:`, error);
      
      if (!silent) {
        outputStream.push(`Error executing script: ${error.message}\n`);
        this._addPrompt(outputStream);
      }
      
      throw error;
    }
  }
  
  /**
   * Verify the deployed version of the container
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - Version information
   */
  async verifyDeployedVersion(sessionId) {
    try {
      this.logger.debug(`Verifying deployed version for session ${sessionId}`);
      
      // Check if the container service has a specific method for verifying the deployed version
      if (typeof this.containerService.verifyDeployedVersion === 'function') {
        // Use the container service's method
        return await this.containerService.verifyDeployedVersion(sessionId);
      }
      
      // Otherwise, implement the functionality manually
      const versionCommand = 'cat /app/VERSION 2>/dev/null || echo $APP_VERSION 2>/dev/null || cat /etc/os-release 2>/dev/null || echo "unknown"';
      const result = await this.containerService.executeCommand(sessionId, versionCommand);
      
      return {
        version: result.stdout.trim(),
        timestamp: new Date().toISOString(),
        verified: true
      };
    } catch (error) {
      this.logger.error(`Error verifying deployed version for session ${sessionId}:`, error);
      
      return {
        version: "unknown",
        timestamp: new Date().toISOString(),
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Upload a file to a container
   * @param {string} sessionId - The session ID
   * @param {string} localFilePath - The local file path
   * @param {string} containerFilePath - The container file path
   * @returns {Promise<void>}
   * @throws {CommandExecutionError} - If the file upload fails
   */
  async uploadFile(sessionId, localFilePath, containerFilePath) {
    try {
      this.logger.debug(`Uploading file for session ${sessionId}: ${localFilePath} -> ${containerFilePath}`);
      
      // Upload the file to the container
      await this.containerService.uploadFile(sessionId, localFilePath, containerFilePath);
      
      this.logger.debug(`File uploaded successfully for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error uploading file for session ${sessionId}:`, error);
      throw new CommandExecutionError(`Error uploading file: ${error.message}`, {
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
   * @throws {CommandExecutionError} - If the file download fails
   */
  async downloadFile(sessionId, containerFilePath, localFilePath) {
    try {
      this.logger.debug(`Downloading file for session ${sessionId}: ${containerFilePath} -> ${localFilePath}`);
      
      // Download the file from the container
      await this.containerService.downloadFile(sessionId, containerFilePath, localFilePath);
      
      this.logger.debug(`File downloaded successfully for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error downloading file for session ${sessionId}:`, error);
      throw new CommandExecutionError(`Error downloading file: ${error.message}`, {
        cause: error,
        sessionId,
        containerFilePath,
        localFilePath
      });
    }
  }
}

module.exports = CommandService;
