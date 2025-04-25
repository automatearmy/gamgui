/**
 * Terminal service module
 * Exports terminal service classes
 */
const TerminalService = require('./TerminalService');
const CommandService = require('./CommandService');
const VirtualFileSystem = require('./VirtualFileSystem');

module.exports = {
  TerminalService,
  CommandService,
  VirtualFileSystem
};
