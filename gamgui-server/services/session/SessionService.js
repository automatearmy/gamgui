/**
 * Service for managing sessions
 */
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, BadRequestError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

/**
 * Service for managing sessions
 */
class SessionService {
  /**
   * Create a new SessionService
   * @param {import('./SessionRepository')} sessionRepository - Repository for session data
   * @param {import('../container/ContainerService')} containerService - Service for container operations
   */
  constructor(sessionRepository, containerService) {
    this.sessionRepository = sessionRepository;
    this.containerService = containerService;
  }

  /**
   * Get a session by ID
   * @param {string} sessionId - The session ID
   * @returns {Promise<import('./SessionRepository').Session>} - The session
   * @throws {NotFoundError} - If the session is not found
   */
  async getSession(sessionId) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Get all sessions
   * @returns {Promise<import('./SessionRepository').Session[]>} - All sessions
   */
  async getSessions() {
    return this.sessionRepository.findAll();
  }

  /**
   * Create a new session
   * @param {object} sessionData - The session data
   * @param {string} sessionData.name - Session name
   * @param {string} sessionData.imageId - Image ID
   * @param {object} [sessionData.config={}] - Session configuration
   * @param {string} [sessionData.credentialsSecret] - Credentials secret name
   * @returns {Promise<object>} - The created session and websocket info
   * @throws {BadRequestError} - If the session data is invalid
   */
  async createSession(sessionData) {
    if (!sessionData.name) {
      throw new BadRequestError('Session name is required');
    }

    // Generate session ID
    const sessionId = uuidv4();
    const containerName = `gam-session-${sessionId.substring(0, 8)}`;
    const containerId = `container-${sessionId}`;

    // Create the session record
    const newSession = {
      id: sessionId,
      name: sessionData.name,
      containerId,
      containerName,
      imageId: sessionData.imageId || 'default-gam-image',
      imageName: sessionData.imageName || 'Default GAM Image',
      config: sessionData.config || {},
      status: 'active'
    };

    // Save the session
    this.sessionRepository.save(newSession);
    logger.info(`Created session: ${sessionId}`);

    // Create container for the session
    let containerInfo;
    try {
      containerInfo = await this.containerService.createContainer(sessionId, {
        cpu: sessionData.config?.resources?.cpu || '500m',
        memory: sessionData.config?.resources?.memory || '512Mi',
        credentialsSecret: sessionData.credentialsSecret || 'gam-credentials'
      });

      // Save container info
      this.sessionRepository.saveContainerInfo(sessionId, containerInfo);
      logger.info(`Created container for session: ${sessionId}`);
    } catch (error) {
      logger.error(`Error creating container for session ${sessionId}:`, error);
      
      // Fall back to virtual session if container creation fails
      containerInfo = {
        id: containerId,
        sessionId,
        virtual: true,
        stream: null
      };
      
      this.sessionRepository.saveContainerInfo(sessionId, containerInfo);
      logger.info(`Created virtual session: ${sessionId}`);
    }

    // Return session and websocket info
    return {
      session: newSession,
      websocketInfo: containerInfo.websocketPath ? {
        path: containerInfo.websocketPath,
        serviceName: containerInfo.serviceName
      } : null
    };
  }

  /**
   * Delete a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<void>}
   * @throws {NotFoundError} - If the session is not found
   */
  async deleteSession(sessionId) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    // Get container info
    const containerInfo = this.sessionRepository.getContainerInfo(sessionId);

    if (containerInfo) {
      try {
        // Delete container
        await this.containerService.deleteContainer(sessionId);
        logger.info(`Deleted container for session: ${sessionId}`);
      } catch (error) {
        logger.error(`Error deleting container for session ${sessionId}:`, error);
        // Continue with session removal even if container deletion fails
      }

      // Delete container info
      this.sessionRepository.deleteContainerInfo(sessionId);
    }

    // Delete session
    this.sessionRepository.delete(sessionId);
    logger.info(`Deleted session: ${sessionId}`);
  }

  /**
   * Get websocket information for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - Websocket information
   * @throws {NotFoundError} - If the session is not found
   */
  async getWebsocketInfo(sessionId) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    const containerInfo = this.sessionRepository.getContainerInfo(sessionId);
    if (!containerInfo) {
      throw new NotFoundError(`Session container ${sessionId} not found`);
    }

    // Generate websocket path if not already set
    if (!containerInfo.websocketPath && containerInfo.kubernetes) {
      containerInfo.websocketPath = this.containerService.getWebsocketPath(sessionId);
      this.sessionRepository.saveContainerInfo(sessionId, containerInfo);
    }

    return {
      sessionId,
      websocketPath: containerInfo.websocketPath || null,
      serviceName: containerInfo.serviceName || null,
      kubernetes: containerInfo.kubernetes || false
    };
  }

  /**
   * Get container info for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<import('./SessionRepository').ContainerInfo>} - Container info
   * @throws {NotFoundError} - If the session or container is not found
   */
  async getContainerInfo(sessionId) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    const containerInfo = this.sessionRepository.getContainerInfo(sessionId);
    if (!containerInfo) {
      throw new NotFoundError(`Session container ${sessionId} not found`);
    }

    return containerInfo;
  }

  /**
   * Update container info for a session
   * @param {string} sessionId - The session ID
   * @param {object} updates - Updates to apply
   * @returns {Promise<import('./SessionRepository').ContainerInfo>} - Updated container info
   * @throws {NotFoundError} - If the session or container is not found
   */
  async updateContainerInfo(sessionId, updates) {
    const containerInfo = await this.getContainerInfo(sessionId);
    
    // Apply updates
    Object.assign(containerInfo, updates);
    
    // Save updated container info
    this.sessionRepository.saveContainerInfo(sessionId, containerInfo);
    
    return containerInfo;
  }
}

module.exports = SessionService;
