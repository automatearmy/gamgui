/**
 * WebSocket service module
 * Exports WebSocket service classes
 */
const WebSocketService = require('./WebSocketService');
const SocketManager = require('./SocketManager');
const EventHandlers = require('./EventHandlers');

module.exports = {
  WebSocketService,
  SocketManager,
  EventHandlers
};
