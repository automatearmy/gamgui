/**
 * Utility to intercept and modify GAM commands before execution
 * This helps ensure commands like 'gam info user' use the correct user context
 */
const logger = require('./logger');

/**
 * Process a GAM command to ensure it uses the correct user context
 * @param {string} command - The original GAM command (without 'gam' prefix)
 * @param {object} session - The session object containing user information
 * @returns {string} - The modified command
 */
function processGamCommand(command, session) {
  try {
    // If no session, return the original command
    if (!session) {
      logger.warn('No session available for GAM command processing');
      return command;
    }

    // Get the user email from the session
    // The email might be directly in the session or we might need to fetch it
    let userEmail = null;
    
    // Try to get the email from the session
    if (session.email) {
      userEmail = session.email;
    } else if (session.userId) {
      try {
        // If we have a userId but no email, try to get the user info
        // This is a fallback mechanism and might not always work
        logger.info(`Attempting to get user email for userId: ${session.userId}`);
        
        // We could potentially fetch the user info here, but for now we'll just log a warning
        logger.warn(`No email found for userId: ${session.userId}`);
      } catch (error) {
        logger.error(`Error getting user email for userId ${session.userId}:`, error);
      }
    }
    
    // If we couldn't get the user email, return the original command
    if (!userEmail) {
      logger.warn('No user email available for GAM command processing');
      return command;
    }

    // Normalize command by removing extra spaces and converting to lowercase for comparison
    const normalizedCommand = command.trim().toLowerCase();
    
    // Check if the command is 'info user' without a specified user
    if (normalizedCommand === 'info user') {
      // Add the user's email to the command
      const modifiedCommand = `info user ${userEmail}`;
      logger.info(`Modified GAM command: 'info user' -> '${modifiedCommand}'`);
      return modifiedCommand;
    }
    
    // Check if the command starts with 'info user ' but doesn't specify a user
    if (normalizedCommand.startsWith('info user ') && normalizedCommand.split(' ').length === 2) {
      // Add the user's email to the command
      const modifiedCommand = `info user ${userEmail}`;
      logger.info(`Modified GAM command: '${command}' -> '${modifiedCommand}'`);
      return modifiedCommand;
    }

    // Return the original command for all other cases
    return command;
  } catch (error) {
    logger.error('Error processing GAM command:', error);
    // Return the original command if there's an error
    return command;
  }
}

module.exports = {
  processGamCommand
};
