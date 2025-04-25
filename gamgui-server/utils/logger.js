/**
 * Logger utility for consistent logging throughout the application
 */
class Logger {
  /**
   * Create a new Logger instance
   * @param {object} options - Logger options
   * @param {boolean} options.debug - Whether to enable debug logging
   * @param {function} options.console - Console object to use (defaults to global console)
   */
  constructor(options = {}) {
    this.debugEnabled = options.debug || process.env.DEBUG === 'true';
    this.console = options.console || console;
  }

  /**
   * Log an info message
   * @param {string} message - The message to log
   * @param {object} [data] - Additional data to log
   */
  info(message, data) {
    this._log('info', message, data);
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   * @param {object} [data] - Additional data to log
   */
  warn(message, data) {
    this._log('warn', message, data);
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   * @param {Error|object} [error] - Error object or additional data to log
   */
  error(message, error) {
    this._log('error', message, error);
  }

  /**
   * Log a debug message (only if debug is enabled)
   * @param {string} message - The message to log
   * @param {object} [data] - Additional data to log
   */
  debug(message, data) {
    if (this.debugEnabled) {
      this._log('debug', message, data);
    }
  }

  /**
   * Internal logging method
   * @private
   * @param {string} level - Log level
   * @param {string} message - The message to log
   * @param {object} [data] - Additional data to log
   */
  _log(level, message, data) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      if (data instanceof Error) {
        this.console[level](logMessage, {
          error: {
            message: data.message,
            stack: data.stack,
            name: data.name
          }
        });
      } else {
        this.console[level](logMessage, data);
      }
    } else {
      this.console[level](logMessage);
    }
  }
}

// Export a singleton instance
module.exports = new Logger();

// Also export the class for testing and custom instances
module.exports.Logger = Logger;
