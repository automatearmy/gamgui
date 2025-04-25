/**
 * Service for executing commands in containers
 * Provides a unified interface for executing commands in containers
 */
const { CommandExecutionError } = require('../../utils/errorHandler');

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
            setTimeout(() => {
              outputStream.push('$ ');
            }, 100);
          },
          onError: (err) => {
            outputStream.push(`Error executing GAM command: ${err.message}\n`);
            
            // Add prompt after error
            setTimeout(() => {
              outputStream.push('$ ');
            }, 100);
          }
        });
        
        return;
      }
      
      // Otherwise, use the generic command execution method
      await this.executeCommand(sessionId, `/gam/gam7/gam ${command}`, outputStream);
      
      // Add prompt after command execution
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    } catch (error) {
      this.logger.error(`Error executing GAM command for session ${sessionId}:`, error);
      outputStream.push(`Error executing GAM command: ${error.message}\n`);
      
      // Add prompt after error
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    }
  }

  /**
   * Execute a bash script in a container
   * @param {string} sessionId - The session ID
   * @param {string} scriptPath - The script path (relative to uploads directory)
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @returns {Promise<void>}
   * @throws {CommandExecutionError} - If the script execution fails
   */
  async executeBashScript(sessionId, scriptPath, outputStream) {
    try {
      this.logger.debug(`Executing bash script for session ${sessionId}: ${scriptPath}`);
      
      // Check if the container service has a specific method for bash scripts
      if (typeof this.containerService.executeBashScript === 'function') {
        // Use the container service's bash script method
        const process = this.containerService.executeBashScript(sessionId, scriptPath, {
          onStdout: (data) => {
            outputStream.push(data.toString());
          },
          onStderr: (data) => {
            outputStream.push(data.toString());
          },
          onClose: (code) => {
            if (code !== 0) {
              outputStream.push(`\nScript exited with code ${code}\n`);
            } else {
              outputStream.push(`\nScript executed successfully\n`);
            }
            
            // Add prompt after command execution
            setTimeout(() => {
              outputStream.push('$ ');
            }, 100);
          },
          onError: (err) => {
            outputStream.push(`Error executing script: ${err.message}\n`);
            
            // Add prompt after error
            setTimeout(() => {
              outputStream.push('$ ');
            }, 100);
          }
        });
        
        return;
      }
      
      // Otherwise, use the generic command execution method
      await this.executeCommand(sessionId, `cd /gam/uploads && bash ${scriptPath}`, outputStream);
      
      // Add prompt after command execution
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    } catch (error) {
      this.logger.error(`Error executing bash script for session ${sessionId}:`, error);
      outputStream.push(`Error executing script: ${error.message}\n`);
      
      // Add prompt after error
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
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
