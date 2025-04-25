/**
 * Abstract service for container operations
 * This is an abstract class that defines the interface for container services
 * Concrete implementations will be provided for Kubernetes and Docker
 */
const { ContainerError } = require('../../utils/errorHandler');

/**
 * Abstract service for container operations
 * @abstract
 */
class ContainerService {
  /**
   * Create a new ContainerService
   * @param {import('../../utils/logger')} logger - Logger instance
   */
  constructor(logger) {
    if (new.target === ContainerService) {
      throw new TypeError('Cannot instantiate abstract ContainerService directly');
    }
    this.logger = logger;
  }

  /**
   * Execute a command in a container
   * @abstract
   * @param {string} sessionId - The session ID
   * @param {string} command - The command to execute
   * @returns {Promise<object>} - The command result
   * @throws {ContainerError} - If the command execution fails
   */
  async executeCommand(sessionId, command) {
    throw new Error('Method not implemented');
  }

  /**
   * Create a container for a session
   * @abstract
   * @param {string} sessionId - The session ID
   * @param {object} options - Container options
   * @returns {Promise<object>} - The created container
   * @throws {ContainerError} - If the container creation fails
   */
  async createContainer(sessionId, options) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete a container for a session
   * @abstract
   * @param {string} sessionId - The session ID
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the container deletion fails
   */
  async deleteContainer(sessionId) {
    throw new Error('Method not implemented');
  }

  /**
   * Upload a file to a container
   * @abstract
   * @param {string} sessionId - The session ID
   * @param {string} localFilePath - The local file path
   * @param {string} containerFilePath - The container file path
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the file upload fails
   */
  async uploadFile(sessionId, localFilePath, containerFilePath) {
    throw new Error('Method not implemented');
  }

  /**
   * Download a file from a container
   * @abstract
   * @param {string} sessionId - The session ID
   * @param {string} containerFilePath - The container file path
   * @param {string} localFilePath - The local file path
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the file download fails
   */
  async downloadFile(sessionId, containerFilePath, localFilePath) {
    throw new Error('Method not implemented');
  }

  /**
   * Get the status of a container
   * @abstract
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - The container status
   * @throws {ContainerError} - If getting the status fails
   */
  async getStatus(sessionId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get the websocket path for a session
   * @abstract
   * @param {string} sessionId - The session ID
   * @returns {string} - The websocket path
   */
  getWebsocketPath(sessionId) {
    throw new Error('Method not implemented');
  }
}

module.exports = ContainerService;
