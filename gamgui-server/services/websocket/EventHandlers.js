/**
 * Event handlers for WebSocket connections
 * Provides handlers for WebSocket events
 */
const logger = require('../../utils/logger');
const { NotFoundError } = require('../../utils/errorHandler');

/**
 * Event handlers for WebSocket connections
 */
class EventHandlers {
  /**
   * Create a new EventHandlers
   * @param {import('../session/SessionService')} sessionService - Session service
   * @param {import('../terminal/TerminalService')} terminalService - Terminal service
   * @param {import('./SocketManager')} socketManager - Socket manager
   */
  constructor(sessionService, terminalService, socketManager) {
    this.sessionService = sessionService;
    this.terminalService = terminalService;
    this.socketManager = socketManager;
  }

  /**
   * Handle terminal join-session event
   * @param {SocketIO.Socket} socket - The socket
   * @param {object} data - Event data
   * @param {string} data.sessionId - Session ID
   * @returns {Promise<void>}
   */
  async handleTerminalJoinSession(socket, data) {
    try {
      const { sessionId } = data;
      
      if (!sessionId) {
        socket.emit('error', { message: 'Session ID is required' });
        return;
      }
      
      // Find the session
      const session = await this.sessionService.getSession(sessionId);
      
      // Get container info
      const containerInfo = await this.sessionService.getContainerInfo(sessionId);
      
      // Join the session room
      socket.join(sessionId);
      
      // Add socket to active sessions
      this.socketManager.addSocket(sessionId, socket);
      
      // Set container info on socket for easy access
      socket.containerInfo = containerInfo;
      
      logger.info(`Client ${socket.id} joined session: ${sessionId}`);
      
      // Check if this is a Kubernetes pod
      const isKubernetesPod = containerInfo.kubernetes;
      
      // Create a virtual terminal stream if it doesn't exist
      if (!containerInfo.stream) {
        // Create terminal streams
        containerInfo.stream = this.terminalService.createTerminalStreams(
          sessionId,
          session,
          isKubernetesPod
        );
        
        // Update container info
        await this.sessionService.updateContainerInfo(sessionId, containerInfo);
      }
      
      // Handle data from terminal to client
      containerInfo.stream.output.on('data', (data) => {
        socket.emit('terminal-output', data.toString());
      });
      
      socket.emit('session-joined', { message: 'Connected to session' });
    } catch (error) {
      logger.error('Error joining session:', error);
      socket.emit('error', { 
        message: 'Error joining session', 
        error: error.message 
      });
    }
  }

  /**
   * Handle terminal leave-session event
   * @param {SocketIO.Socket} socket - The socket
   * @param {object} data - Event data
   * @param {string} data.sessionId - Session ID
   */
  handleTerminalLeaveSession(socket, data) {
    try {
      const { sessionId } = data;
      
      if (sessionId) {
        socket.leave(sessionId);
        
        // Remove socket from active sessions
        this.socketManager.removeSocket(sessionId, socket);
        
        socket.emit('session-left', { message: 'Disconnected from session' });
      }
    } catch (error) {
      logger.error('Error leaving session:', error);
      socket.emit('error', { 
        message: 'Error leaving session', 
        error: error.message 
      });
    }
  }

  /**
   * Handle terminal input event
   * @param {SocketIO.Socket} socket - The socket
   * @param {string} data - Terminal input
   */
  handleTerminalInput(socket, data) {
    try {
      const sessionId = socket.sessionId;
      const containerInfo = socket.containerInfo;
      
      if (!sessionId || !containerInfo) {
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }
      
      if (containerInfo.stream && containerInfo.stream.input) {
        containerInfo.stream.input.write(data);
      }
    } catch (error) {
      logger.error('Error handling terminal input:', error);
      socket.emit('error', { 
        message: 'Error handling terminal input', 
        error: error.message 
      });
    }
  }

  /**
   * Handle session websocket connection
   * @param {SocketIO.Socket} socket - The socket
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async handleSessionConnection(socket, sessionId) {
    try {
      // Find the session
      const session = await this.sessionService.getSession(sessionId);
      
      // Get container info
      const containerInfo = await this.sessionService.getContainerInfo(sessionId);
      
      // Add socket to active sessions
      this.socketManager.addSocket(sessionId, socket);
      
      // Set container info on socket for easy access
      socket.containerInfo = containerInfo;
      
      logger.info(`Client ${socket.id} connected to session websocket: ${sessionId}`);
      
      // Check if this is a Kubernetes pod
      const isKubernetesPod = containerInfo.kubernetes;
      
      // Create a virtual terminal stream if it doesn't exist
      if (!containerInfo.stream) {
        // Create terminal streams
        containerInfo.stream = this.terminalService.createTerminalStreams(
          sessionId,
          session,
          isKubernetesPod
        );
        
        // Update container info
        await this.sessionService.updateContainerInfo(sessionId, containerInfo);
      }
      
      // Handle data from terminal to client
      containerInfo.stream.output.on('data', (data) => {
        socket.emit('output', data.toString());
      });
      
      socket.emit('connected', { 
        message: 'Connected to session',
        sessionId,
        kubernetes: isKubernetesPod
      });
    } catch (error) {
      logger.error('Error connecting to session websocket:', error);
      socket.emit('error', { 
        message: 'Error connecting to session', 
        error: error.message 
      });
      socket.disconnect(true);
    }
  }

  /**
   * Handle session websocket input event
   * @param {SocketIO.Socket} socket - The socket
   * @param {string} data - Input data
   */
  handleSessionInput(socket, data) {
    try {
      const sessionId = socket.sessionId;
      const containerInfo = socket.containerInfo;
      
      if (!sessionId || !containerInfo) {
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }
      
      if (containerInfo.stream && containerInfo.stream.input) {
        containerInfo.stream.input.write(data);
      }
    } catch (error) {
      logger.error('Error handling session input:', error);
      socket.emit('error', { 
        message: 'Error handling input', 
        error: error.message 
      });
    }
  }

  /**
   * Handle socket disconnect
   * @param {SocketIO.Socket} socket - The socket
   * @param {string} reason - Disconnect reason
   */
  handleDisconnect(socket, reason) {
    try {
      const sessionId = socket.sessionId;
      
      if (sessionId) {
        // Remove socket from active sessions
        const remainingCount = this.socketManager.removeSocket(sessionId, socket);
        
        logger.info(`Client ${socket.id} disconnected from session ${sessionId}. Reason: ${reason}`);
        logger.info(`Remaining connections for session ${sessionId}: ${remainingCount}`);
      }
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }
}

module.exports = EventHandlers;
