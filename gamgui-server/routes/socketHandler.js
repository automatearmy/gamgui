/**
 * Socket.IO handler for WebSocket connections
 * This is the main entry point for WebSocket connections
 */
const { WebSocketService } = require('../services/websocket');
const { SessionService, SessionRepository } = require('../services/session');
const { TerminalService, CommandService, VirtualFileSystem } = require('../services/terminal');
const { ContainerFactory } = require('../services/container');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Initialize Socket.IO handlers
 * @param {SocketIO.Server} io - Socket.IO server
 */
module.exports = (io) => {
  logger.info('Initializing Socket.IO handlers');
  
  // Create services
  const sessionRepository = new SessionRepository();
  const containerService = ContainerFactory.createContainerService(config, logger);
  const sessionService = new SessionService(sessionRepository, containerService);
  const vfs = new VirtualFileSystem(config.paths.uploads);
  const commandService = new CommandService(containerService, logger);
  const terminalService = new TerminalService(commandService, vfs, logger);
  
  // Create and initialize WebSocket service
  const webSocketService = new WebSocketService(
    sessionService,
    terminalService,
    config
  );
  
  // Initialize WebSocket service
  webSocketService.initialize(io);
  
  logger.info('Socket.IO handlers initialized');
  
  // Export services for use in other modules
  return {
    sessionRepository,
    sessionService,
    containerService,
    terminalService,
    webSocketService
  };
};
