/**
 * Socket connection manager
 * Manages socket connections for sessions
 */
const logger = require('../../utils/logger');
const { handleSocketError } = require('../../utils/errorHandler');

/**
 * Socket connection manager
 */
class SocketManager {
  /**
   * Create a new SocketManager
   */
  constructor() {
    /**
     * Map of active sessions to sets of socket IDs
     * @type {Map<string, Set<string>>}
     * @private
     */
    this._activeSessions = new Map();
  }

  /**
   * Add a socket to a session
   * @param {string} sessionId - The session ID
   * @param {SocketIO.Socket} socket - The socket to add
   */
  addSocket(sessionId, socket) {
    // Store socket in active sessions
    if (!this._activeSessions.has(sessionId)) {
      this._activeSessions.set(sessionId, new Set());
    }
    
    this._activeSessions.get(sessionId).add(socket.id);
    
    // Set session data on socket
    socket.sessionId = sessionId;
    
    logger.debug(`Added socket ${socket.id} to session ${sessionId}`);
    logger.debug(`Active connections for session ${sessionId}: ${this._activeSessions.get(sessionId).size}`);
  }

  /**
   * Remove a socket from a session
   * @param {string} sessionId - The session ID
   * @param {SocketIO.Socket} socket - The socket to remove
   * @returns {number} - Number of remaining sockets in the session
   */
  removeSocket(sessionId, socket) {
    if (!this._activeSessions.has(sessionId)) {
      return 0;
    }
    
    this._activeSessions.get(sessionId).delete(socket.id);
    
    const remainingCount = this._activeSessions.get(sessionId).size;
    
    logger.debug(`Removed socket ${socket.id} from session ${sessionId}`);
    logger.debug(`Remaining connections for session ${sessionId}: ${remainingCount}`);
    
    return remainingCount;
  }

  /**
   * Get all sockets for a session
   * @param {string} sessionId - The session ID
   * @returns {Set<string>} - Set of socket IDs
   */
  getSessionSockets(sessionId) {
    return this._activeSessions.get(sessionId) || new Set();
  }

  /**
   * Check if a session has any active sockets
   * @param {string} sessionId - The session ID
   * @returns {boolean} - Whether the session has any active sockets
   */
  hasActiveSockets(sessionId) {
    return this._activeSessions.has(sessionId) && this._activeSessions.get(sessionId).size > 0;
  }

  /**
   * Get the number of active sockets for a session
   * @param {string} sessionId - The session ID
   * @returns {number} - Number of active sockets
   */
  getActiveSocketCount(sessionId) {
    return this._activeSessions.has(sessionId) ? this._activeSessions.get(sessionId).size : 0;
  }

  /**
   * Broadcast a message to all sockets in a session
   * @param {string} sessionId - The session ID
   * @param {string} event - The event name
   * @param {*} data - The data to send
   * @param {SocketIO.Socket} [excludeSocket] - Socket to exclude from broadcast
   */
  broadcastToSession(sessionId, event, data, excludeSocket = null) {
    if (!this._activeSessions.has(sessionId)) {
      return;
    }
    
    const sockets = this._activeSessions.get(sessionId);
    
    // Get the namespace from any socket in the session
    const namespace = excludeSocket ? excludeSocket.nsp : null;
    
    if (!namespace) {
      logger.warn(`Cannot broadcast to session ${sessionId}: no namespace found`);
      return;
    }
    
    // Broadcast to all sockets in the session
    sockets.forEach(socketId => {
      if (!excludeSocket || socketId !== excludeSocket.id) {
        try {
          namespace.to(socketId).emit(event, data);
        } catch (error) {
          logger.error(`Error broadcasting to socket ${socketId}:`, error);
        }
      }
    });
    
    logger.debug(`Broadcast ${event} to ${sockets.size - (excludeSocket ? 1 : 0)} sockets in session ${sessionId}`);
  }

  /**
   * Disconnect all sockets in a session
   * @param {string} sessionId - The session ID
   * @param {string} reason - The reason for disconnection
   */
  disconnectSession(sessionId, reason = 'Session closed') {
    if (!this._activeSessions.has(sessionId)) {
      return;
    }
    
    const sockets = this._activeSessions.get(sessionId);
    
    // Get the namespace from any socket in the session
    let namespace = null;
    
    // Disconnect all sockets in the session
    sockets.forEach(socketId => {
      try {
        const socket = namespace ? namespace.sockets.get(socketId) : null;
        
        if (socket) {
          // Store the namespace if we don't have it yet
          if (!namespace) {
            namespace = socket.nsp;
          }
          
          // Disconnect the socket
          socket.emit('session-closed', { message: reason });
          socket.disconnect(true);
        }
      } catch (error) {
        logger.error(`Error disconnecting socket ${socketId}:`, error);
      }
    });
    
    // Clear the session
    this._activeSessions.delete(sessionId);
    
    logger.debug(`Disconnected all sockets in session ${sessionId}`);
  }

  /**
   * Set up socket event handlers
   * @param {SocketIO.Socket} socket - The socket to set up
   * @param {object} options - Options for event handlers
   * @param {Function} options.onDisconnect - Disconnect handler
   * @param {Function} options.onError - Error handler
   */
  setupSocketEventHandlers(socket, options = {}) {
    const { onDisconnect, onError } = options;
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.debug(`Socket ${socket.id} disconnected. Reason: ${reason}`);
      
      if (onDisconnect) {
        onDisconnect(socket, reason);
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
      
      if (onError) {
        onError(socket, error);
      } else {
        handleSocketError(error, socket);
      }
    });
  }
}

module.exports = SocketManager;
