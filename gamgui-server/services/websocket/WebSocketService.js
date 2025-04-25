/**
 * Service for WebSocket operations
 * Provides a unified interface for WebSocket operations
 */
const EventHandlers = require('./EventHandlers');
const SocketManager = require('./SocketManager');
const logger = require('../../utils/logger');

/**
 * Service for WebSocket operations
 */
class WebSocketService {
  /**
   * Create a new WebSocketService
   * @param {import('../session/SessionService')} sessionService - Session service
   * @param {import('../terminal/TerminalService')} terminalService - Terminal service
   * @param {import('../../config/config')} config - Configuration
   */
  constructor(sessionService, terminalService, config) {
    this.sessionService = sessionService;
    this.terminalService = terminalService;
    this.config = config;
    
    // Create socket manager
    this.socketManager = new SocketManager();
    
    // Create event handlers
    this.eventHandlers = new EventHandlers(
      sessionService,
      terminalService,
      this.socketManager
    );
  }

  /**
   * Initialize WebSocket server
   * @param {SocketIO.Server} io - Socket.IO server
   */
  initialize(io) {
    logger.info('Initializing WebSocket server');
    
    // Configure Socket.IO
    this._configureSocketIO(io);
    
    // Set up namespaces
    this._setupTerminalNamespace(io.of('/terminal'));
    this._setupSessionNamespace(io.of(/^\/ws\/session\/[\w-]+\//));
    
    logger.info('WebSocket server initialized');
  }

  /**
   * Configure Socket.IO
   * @private
   * @param {SocketIO.Server} io - Socket.IO server
   */
  _configureSocketIO(io) {
    // Set Socket.IO options
    io.eio.pingTimeout = this.config.socket.pingTimeout;
    io.eio.pingInterval = this.config.socket.pingInterval;
    
    // Log Socket.IO events
    io.on('connection', (socket) => {
      logger.debug(`New Socket.IO connection: ${socket.id}`);
    });
    
    io.on('disconnect', (socket) => {
      logger.debug(`Socket.IO disconnection: ${socket.id}`);
    });
    
    io.on('error', (error) => {
      logger.error('Socket.IO error:', error);
    });
  }

  /**
   * Set up terminal namespace
   * @private
   * @param {SocketIO.Namespace} namespace - Socket.IO namespace
   */
  _setupTerminalNamespace(namespace) {
    // Middleware to log connection events
    namespace.use((socket, next) => {
      logger.debug(`Terminal socket connection attempt: ${socket.id}`);
      next();
    });
    
    // Handle connections
    namespace.on('connection', (socket) => {
      logger.info(`New terminal WebSocket connection established: ${socket.id}`);
      
      // Set a longer timeout for this socket
      socket.conn.pingTimeout = this.config.socket.pingTimeout;
      
      // Set up event handlers
      this._setupTerminalEventHandlers(socket);
    });
  }

  /**
   * Set up session namespace
   * @private
   * @param {SocketIO.Namespace} namespace - Socket.IO namespace
   */
  _setupSessionNamespace(namespace) {
    // Middleware to log connection events
    namespace.use((socket, next) => {
      logger.debug(`Session websocket connection attempt: ${socket.id}`);
      next();
    });
    
    // Handle connections
    namespace.on('connection', (socket) => {
      // Extract session ID from namespace name
      // Format: /ws/session/{sessionId}/
      const sessionId = socket.nsp.name.split('/')[3];
      
      logger.info(`New session websocket connection: ${socket.id} for session ${sessionId}`);
      
      // Set a longer timeout for this socket
      socket.conn.pingTimeout = this.config.socket.pingTimeout;
      
      // Set session ID on socket
      socket.sessionId = sessionId;
      
      // Set up event handlers
      this._setupSessionEventHandlers(socket, sessionId);
    });
  }

  /**
   * Set up terminal event handlers
   * @private
   * @param {SocketIO.Socket} socket - Socket.IO socket
   */
  _setupTerminalEventHandlers(socket) {
    // Handle joining a session
    socket.on('join-session', (data) => {
      this.eventHandlers.handleTerminalJoinSession(socket, data);
    });
    
    // Handle leaving a session
    socket.on('leave-session', (data) => {
      this.eventHandlers.handleTerminalLeaveSession(socket, data);
    });
    
    // Handle command input from client
    socket.on('terminal-input', (data) => {
      this.eventHandlers.handleTerminalInput(socket, data);
    });
    
    // Set up socket event handlers
    this.socketManager.setupSocketEventHandlers(socket, {
      onDisconnect: this.eventHandlers.handleDisconnect.bind(this.eventHandlers)
    });
    
    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
      logger.debug(`Client ${socket.id} reconnection attempt #${attemptNumber}`);
    });
    
    // Handle successful reconnection
    socket.on('reconnect', () => {
      logger.debug(`Client ${socket.id} successfully reconnected`);
      
      // If the socket had a session before, try to rejoin it
      if (socket.sessionId) {
        logger.debug(`Attempting to rejoin session ${socket.sessionId}`);
        socket.emit('rejoin-session', { sessionId: socket.sessionId });
      }
    });
  }

  /**
   * Set up session event handlers
   * @private
   * @param {SocketIO.Socket} socket - Socket.IO socket
   * @param {string} sessionId - Session ID
   */
  _setupSessionEventHandlers(socket, sessionId) {
    // Handle session connection
    this.eventHandlers.handleSessionConnection(socket, sessionId);
    
    // Handle command input from client
    socket.on('input', (data) => {
      this.eventHandlers.handleSessionInput(socket, data);
    });
    
    // Set up socket event handlers
    this.socketManager.setupSocketEventHandlers(socket, {
      onDisconnect: this.eventHandlers.handleDisconnect.bind(this.eventHandlers)
    });
  }

  /**
   * Disconnect all sockets for a session
   * @param {string} sessionId - Session ID
   * @param {string} reason - Reason for disconnection
   */
  disconnectSession(sessionId, reason = 'Session closed') {
    this.socketManager.disconnectSession(sessionId, reason);
  }

  /**
   * Check if a session has any active sockets
   * @param {string} sessionId - Session ID
   * @returns {boolean} - Whether the session has any active sockets
   */
  hasActiveSockets(sessionId) {
    return this.socketManager.hasActiveSockets(sessionId);
  }

  /**
   * Get the number of active sockets for a session
   * @param {string} sessionId - Session ID
   * @returns {number} - Number of active sockets
   */
  getActiveSocketCount(sessionId) {
    return this.socketManager.getActiveSocketCount(sessionId);
  }

  /**
   * Broadcast a message to all sockets in a session
   * @param {string} sessionId - Session ID
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  broadcastToSession(sessionId, event, data) {
    this.socketManager.broadcastToSession(sessionId, event, data);
  }
}

module.exports = WebSocketService;
