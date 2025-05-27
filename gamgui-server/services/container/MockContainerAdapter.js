/**
 * Mock implementation of ContainerService for testing or when Kubernetes is not available
 * Simulates container operations without actually creating containers
 */
const ContainerService = require('./ContainerService');
const { v4: uuidv4 } = require('uuid');

/**
 * Mock implementation of ContainerService
 * @extends ContainerService
 */
class MockContainerAdapter extends ContainerService {
  /**
   * Create a new MockContainerAdapter
   * @param {import('../../config/config')} config - Configuration
   * @param {import('../../utils/logger')} logger - Logger instance
   */
  constructor(config, logger) {
    super(logger);
    this.config = config;
    this.containers = new Map(); // Store container info by session ID
    this.logger.info('Mock container adapter initialized');
  }

  /**
   * Create a container for a session
   * @param {string} sessionId - The session ID
   * @param {object} options - Container options
   * @returns {Promise<object>} - The created container info
   */
  async createContainer(sessionId, options = {}) {
    this.logger.info(`Creating mock container for session ${sessionId}`);
    
    // Simulate a delay to make it feel more realistic
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create mock container info
    const containerId = `mock-container-${uuidv4()}`;
    const containerInfo = {
      id: containerId,
      sessionId,
      podName: `mock-pod-${sessionId}`,
      serviceName: `mock-service-${sessionId}`,
      websocketPath: this.getWebsocketPath(sessionId),
      mock: true, // Indicate it's a mock container
      options, // Store the options for reference
      createdAt: new Date().toISOString()
    };
    
    // Store container info
    this.containers.set(sessionId, containerInfo);
    
    this.logger.info(`Created mock container ${containerId} for session ${sessionId}`);
    
    return containerInfo;
  }

  /**
   * Delete a container for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<void>}
   */
  async deleteContainer(sessionId) {
    this.logger.info(`Deleting mock container for session ${sessionId}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if container exists
    if (!this.containers.has(sessionId)) {
      this.logger.warn(`No mock container found for session ${sessionId}`);
      return;
    }
    
    // Delete container info
    this.containers.delete(sessionId);
    
    this.logger.info(`Deleted mock container for session ${sessionId}`);
  }

  /**
   * Execute a command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The command to execute
   * @returns {Promise<object>} - The command result
   */
  async executeCommand(sessionId, command) {
    this.logger.info(`Executing command in mock container for session ${sessionId}: ${command}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if container exists
    if (!this.containers.has(sessionId)) {
      throw new Error(`No mock container found for session ${sessionId}`);
    }
    
    // Generate mock output based on the command
    let stdout = '';
    let stderr = '';
    
    if (command.includes('ls')) {
      stdout = 'file1.txt\nfile2.txt\nfile3.txt\n';
    } else if (command.includes('echo')) {
      const match = command.match(/echo\s+"?([^"]*)"?/);
      stdout = match ? `${match[1]}\n` : 'echo output\n';
    } else if (command.includes('gam')) {
      if (command.includes('info domain')) {
        stdout = 'Domain: automatearmy.com\nCreation time: 2023-01-01T00:00:00.000Z\nPrimary domain: true\n';
      } else if (command.includes('info user')) {
        // Extract email from command or use default
        const emailMatch = command.match(/info user\s+([^\s]+)/);
        const email = emailMatch ? emailMatch[1] : 'user@example.com';
        stdout = `User: ${email}\nIs admin: false\nCreation time: 2023-01-01T00:00:00.000Z\n`;
      } else {
        stdout = 'GAM command executed successfully\n';
      }
    } else {
      stdout = `Executed: ${command}\n`;
    }
    
    this.logger.info(`Mock command execution completed for session ${sessionId}`);
    
    return { stdout, stderr };
  }

  /**
   * Execute a GAM command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The GAM command to execute
   * @param {object} options - Options for execution
   * @returns {Promise<object>} - The command result
   */
  executeGamCommand(sessionId, command, options = {}) {
    this.logger.info(`Executing GAM command in mock container for session ${sessionId}: ${command}`);
    
    // Extract options with defaults
    const onStdout = options.onStdout || ((data) => this.logger.debug(`Mock GAM stdout: ${data}`));
    const onStderr = options.onStderr || ((data) => this.logger.error(`Mock GAM stderr: ${data}`));
    const onClose = options.onClose || ((code) => this.logger.info(`Mock GAM process exited with code ${code}`));
    
    // Generate mock output based on the command
    let output = '';
    
    if (command.includes('info domain')) {
      output = 'Domain: automatearmy.com\nCreation time: 2023-01-01T00:00:00.000Z\nPrimary domain: true\n';
    } else if (command.includes('info user')) {
      // Extract email from command or use default
      const emailMatch = command.match(/info user\s+([^\s]+)/);
      const email = emailMatch ? emailMatch[1] : 'user@example.com';
      output = `User: ${email}\nIs admin: false\nCreation time: 2023-01-01T00:00:00.000Z\n`;
    } else {
      output = `Executed GAM command: ${command}\n`;
    }
    
    // Simulate async output
    setTimeout(() => {
      onStdout(Buffer.from(output));
      onClose(0);
    }, 100);
    
    return { mock: true };
  }

  /**
   * Upload a file to a container
   * @param {string} sessionId - The session ID
   * @param {string} localFilePath - The local file path
   * @param {string} containerFilePath - The container file path
   * @returns {Promise<void>}
   */
  async uploadFile(sessionId, localFilePath, containerFilePath) {
    this.logger.info(`Uploading file to mock container for session ${sessionId}: ${localFilePath} -> ${containerFilePath}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if container exists
    if (!this.containers.has(sessionId)) {
      throw new Error(`No mock container found for session ${sessionId}`);
    }
    
    this.logger.info(`Mock file upload completed for session ${sessionId}`);
  }

  /**
   * Download a file from a container
   * @param {string} sessionId - The session ID
   * @param {string} containerFilePath - The container file path
   * @param {string} localFilePath - The local file path
   * @returns {Promise<void>}
   */
  async downloadFile(sessionId, containerFilePath, localFilePath) {
    this.logger.info(`Downloading file from mock container for session ${sessionId}: ${containerFilePath} -> ${localFilePath}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if container exists
    if (!this.containers.has(sessionId)) {
      throw new Error(`No mock container found for session ${sessionId}`);
    }
    
    this.logger.info(`Mock file download completed for session ${sessionId}`);
  }

  /**
   * Get the status of a container
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - The container status
   */
  async getStatus(sessionId) {
    this.logger.debug(`Getting status for mock container for session ${sessionId}`);
    
    // Check if container exists
    if (!this.containers.has(sessionId)) {
      return { phase: 'NotFound' };
    }
    
    return { phase: 'Running' };
  }

  /**
   * Get the websocket path for a session
   * @param {string} sessionId - The session ID
   * @returns {string} - The websocket path
   */
  getWebsocketPath(sessionId) {
    return this.config.getTemplatePath('websocketPath', sessionId);
  }
}

module.exports = MockContainerAdapter;
