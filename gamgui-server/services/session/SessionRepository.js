/**
 * Repository for session data
 * Abstracts the data storage for sessions
 */
const { NotFoundError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

/**
 * Session data model
 * @typedef {Object} Session
 * @property {string} id - Session ID
 * @property {string} name - Session name
 * @property {string} containerId - Container ID
 * @property {string} containerName - Container name
 * @property {string} imageId - Image ID
 * @property {string} imageName - Image name
 * @property {Object} config - Session configuration
 * @property {string} createdAt - Creation timestamp
 * @property {string} lastModified - Last modified timestamp
 * @property {string} status - Session status
 */

/**
 * Container information
 * @typedef {Object} ContainerInfo
 * @property {string} id - Container ID
 * @property {string} sessionId - Session ID
 * @property {string} [podName] - Pod name (for Kubernetes)
 * @property {string} [serviceName] - Service name (for Kubernetes)
 * @property {string} [websocketPath] - WebSocket path (for Kubernetes)
 * @property {boolean} [kubernetes] - Whether this is a Kubernetes container
 * @property {boolean} [virtual] - Whether this is a virtual container
 * @property {Object} [stream] - Stream information
 * @property {Object} [fs] - Virtual file system information
 */

/**
 * Repository for session data
 */
class SessionRepository {
  /**
   * Create a new SessionRepository
   */
  constructor() {
    /**
     * In-memory storage for sessions
     * @type {Session[]}
     * @private
     */
    this._sessions = [];

    /**
     * Map of active container sessions
     * @type {Map<string, ContainerInfo>}
     * @private
     */
    this._containerSessions = new Map();
  }

  /**
   * Find a session by ID
   * @param {string} sessionId - The session ID
   * @returns {Session|null} - The session or null if not found
   */
  findById(sessionId) {
    return this._sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Get all sessions
   * @returns {Session[]} - All sessions
   */
  findAll() {
    return [...this._sessions];
  }

  /**
   * Save a session
   * @param {Session} session - The session to save
   * @returns {Session} - The saved session
   */
  save(session) {
    const existingIndex = this._sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      // Update existing session
      session.lastModified = new Date().toISOString();
      this._sessions[existingIndex] = session;
      logger.debug(`Updated session: ${session.id}`);
    } else {
      // Add new session
      session.createdAt = session.createdAt || new Date().toISOString();
      session.lastModified = session.createdAt;
      this._sessions.push(session);
      logger.debug(`Created session: ${session.id}`);
    }
    
    return session;
  }

  /**
   * Delete a session
   * @param {string} sessionId - The session ID
   * @returns {boolean} - Whether the session was deleted
   */
  delete(sessionId) {
    const initialLength = this._sessions.length;
    this._sessions = this._sessions.filter(s => s.id !== sessionId);
    
    const deleted = initialLength > this._sessions.length;
    
    if (deleted) {
      logger.debug(`Deleted session: ${sessionId}`);
    } else {
      logger.debug(`Session not found for deletion: ${sessionId}`);
    }
    
    return deleted;
  }

  /**
   * Get container info for a session
   * @param {string} sessionId - The session ID
   * @returns {ContainerInfo|null} - The container info or null if not found
   */
  getContainerInfo(sessionId) {
    return this._containerSessions.get(sessionId) || null;
  }

  /**
   * Save container info for a session
   * @param {string} sessionId - The session ID
   * @param {ContainerInfo} containerInfo - The container info
   * @returns {ContainerInfo} - The saved container info
   */
  saveContainerInfo(sessionId, containerInfo) {
    this._containerSessions.set(sessionId, containerInfo);
    logger.debug(`Saved container info for session: ${sessionId}`);
    return containerInfo;
  }

  /**
   * Delete container info for a session
   * @param {string} sessionId - The session ID
   * @returns {boolean} - Whether the container info was deleted
   */
  deleteContainerInfo(sessionId) {
    const deleted = this._containerSessions.delete(sessionId);
    
    if (deleted) {
      logger.debug(`Deleted container info for session: ${sessionId}`);
    } else {
      logger.debug(`Container info not found for deletion: ${sessionId}`);
    }
    
    return deleted;
  }

  /**
   * Get all active sessions
   * @returns {Map<string, Set<string>>} - Map of session IDs to sets of socket IDs
   */
  getActiveSessions() {
    return this._activeSessions;
  }
}

module.exports = SessionRepository;
