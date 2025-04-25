/**
 * Helper function to execute a GAM command in a Docker container
 * This file is deprecated and should not be used directly.
 * Use the CommandService.executeGamCommand method instead.
 * 
 * @param {string} sessionId - The session ID
 * @param {string} input - The command input
 * @param {import('stream').Writable} outputStream - Stream to write output to
 */
function executeGamCommandInDocker(sessionId, input, outputStream) {
  try {
    const logger = require('../utils/logger');
    const { sessionService } = require('./sessionRoutes');
    
    // Log the command being executed for debugging
    logger.info(`Executing GAM command in Docker for session ${sessionId}: ${input}`);
    outputStream.push(`Executing GAM command: ${input}\n`);
    
    // Get the command without the 'gam' prefix
    const gamCommand = input.substring(4).trim();
    
    // Import the Docker GAM utility
    const { executeGamCommand } = require('../utils/dockerGam');
    
    // Execute the command in a Docker container
    const gamProcess = executeGamCommand(gamCommand, {
      cwd: process.cwd(),
      onStdout: (data) => {
        try {
          // Check if session still exists
          sessionService.getSession(sessionId)
            .then(() => {
              // Send output to client
              const output = data.toString();
              logger.debug(`GAM stdout: ${output}`);
              outputStream.push(output);
            })
            .catch(error => {
              logger.error(`Session ${sessionId} no longer exists during GAM execution`);
            });
        } catch (error) {
          logger.error(`Error checking session ${sessionId}:`, error);
        }
      },
      onStderr: (data) => {
        try {
          // Check if session still exists
          sessionService.getSession(sessionId)
            .then(() => {
              // Send error output to client
              const errorOutput = data.toString();
              logger.debug(`GAM stderr: ${errorOutput}`);
              outputStream.push(errorOutput);
            })
            .catch(error => {
              logger.error(`Session ${sessionId} no longer exists during GAM execution`);
            });
        } catch (error) {
          logger.error(`Error checking session ${sessionId}:`, error);
        }
      },
      onClose: (code) => {
        try {
          // Check if session still exists
          sessionService.getSession(sessionId)
            .then(() => {
              logger.info(`GAM process exited with code ${code}`);
              
              if (code !== 0) {
                outputStream.push(`\nGAM command exited with code ${code}\n`);
              } else {
                outputStream.push(`\nGAM command completed successfully\n`);
              }
              
              // Add prompt after command execution
              setTimeout(() => {
                outputStream.push('$ ');
              }, 100);
            })
            .catch(error => {
              logger.error(`Session ${sessionId} no longer exists during GAM execution`);
            });
        } catch (error) {
          logger.error(`Error checking session ${sessionId}:`, error);
        }
      },
      onError: (err) => {
        logger.error(`Error spawning GAM process: ${err.message}`);
        outputStream.push(`Error executing GAM command: ${err.message}\n`);
        
        // Add prompt after error
        setTimeout(() => {
          outputStream.push('$ ');
        }, 100);
      }
    });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error(`Exception executing GAM command: ${err.message}`);
    outputStream.push(`Error executing GAM command: ${err.message}\n`);
    
    // Add prompt after error
    setTimeout(() => {
      outputStream.push('$ ');
    }, 100);
  }
}

module.exports = executeGamCommandInDocker;
