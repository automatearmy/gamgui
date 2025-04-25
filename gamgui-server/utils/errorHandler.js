/**
 * Error handling utilities for consistent error handling throughout the application
 */

/**
 * Base application error class
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {object} [details={}] - Additional error details
   */
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON
   * @returns {object} - JSON representation of the error
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details
      }
    };
  }
}

/**
 * Error for when a resource is not found
 * @extends AppError
 */
class NotFoundError extends AppError {
  /**
   * Create a new NotFoundError
   * @param {string} message - Error message
   * @param {object} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 404, details);
  }
}

/**
 * Error for when a request is invalid
 * @extends AppError
 */
class BadRequestError extends AppError {
  /**
   * Create a new BadRequestError
   * @param {string} message - Error message
   * @param {object} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 400, details);
  }
}

/**
 * Error for when a service is unavailable
 * @extends AppError
 */
class ServiceUnavailableError extends AppError {
  /**
   * Create a new ServiceUnavailableError
   * @param {string} message - Error message
   * @param {object} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 503, details);
  }
}

/**
 * Error for when a container operation fails
 * @extends AppError
 */
class ContainerError extends AppError {
  /**
   * Create a new ContainerError
   * @param {string} message - Error message
   * @param {object} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 500, details);
  }
}

/**
 * Error for when a command execution fails
 * @extends AppError
 */
class CommandExecutionError extends AppError {
  /**
   * Create a new CommandExecutionError
   * @param {string} message - Error message
   * @param {object} [details={}] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 500, details);
  }
}

/**
 * Handle an error by formatting it for response
 * @param {Error} error - The error to handle
 * @returns {object} - Formatted error response
 */
function handleError(error) {
  if (error instanceof AppError) {
    return error.toJSON();
  }

  // Convert standard Error to AppError
  const appError = new AppError(
    error.message || 'An unexpected error occurred',
    500,
    { originalError: error.name }
  );
  
  return appError.toJSON();
}

/**
 * Handle a socket error by emitting it to the client
 * @param {Error} error - The error to handle
 * @param {SocketIO.Socket} socket - The socket to emit the error to
 */
function handleSocketError(error, socket) {
  const formattedError = handleError(error);
  
  try {
    socket.emit('error', {
      message: formattedError.error.message,
      error: formattedError.error.name
    });
  } catch (emitError) {
    console.error('Failed to send error to client:', emitError);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  BadRequestError,
  ServiceUnavailableError,
  ContainerError,
  CommandExecutionError,
  handleError,
  handleSocketError
};
