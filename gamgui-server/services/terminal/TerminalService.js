/**
 * Service for terminal operations
 * Provides a unified interface for terminal operations
 */
const { Readable, Writable } = require('stream');
const { CommandExecutionError } = require('../../utils/errorHandler');

/**
 * Service for terminal operations
 */
class TerminalService {
  /**
   * Create a new TerminalService
   * @param {import('./CommandService')} commandService - Command service
   * @param {import('./VirtualFileSystem')} vfs - Virtual file system
   * @param {import('../../utils/logger')} logger - Logger instance
   */
  constructor(commandService, vfs, logger) {
    this.commandService = commandService;
    this.vfs = vfs;
    this.logger = logger;
    
    // Register command handlers
    this.commandHandlers = this._registerCommandHandlers();
  }

  /**
   * Register command handlers
   * @private
   * @returns {Map<string, Function>} - Map of command handlers
   */
  _registerCommandHandlers() {
    const handlers = new Map();
    
    // Basic commands
    handlers.set('echo', this._handleEchoCommand.bind(this));
    handlers.set('ls', this._handleLsCommand.bind(this));
    handlers.set('cd', this._handleCdCommand.bind(this));
    handlers.set('pwd', this._handlePwdCommand.bind(this));
    handlers.set('cat', this._handleCatCommand.bind(this));
    handlers.set('mkdir', this._handleMkdirCommand.bind(this));
    handlers.set('rm', this._handleRmCommand.bind(this));
    handlers.set('whoami', this._handleWhoamiCommand.bind(this));
    handlers.set('date', this._handleDateCommand.bind(this));
    handlers.set('help', this._handleHelpCommand.bind(this));
    
    // Advanced commands
    handlers.set('bash', this._handleBashCommand.bind(this));
    handlers.set('gam', this._handleGamCommand.bind(this));
    
    return handlers;
  }

  /**
   * Create terminal streams for a session
   * @param {string} sessionId - The session ID
   * @param {object} session - The session object
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {object} - Terminal streams
   */
  createTerminalStreams(sessionId, session, isKubernetesPod) {
    this.logger.debug(`Creating terminal streams for session ${sessionId}`);
    
    // Create output stream
    const outputStream = new Readable({
      read() {}
    });
    
    // Create input stream
    const inputStream = new Writable({
      write: (chunk, encoding, callback) => {
        // Process input and generate response
        this.processCommand(sessionId, chunk.toString().trim(), outputStream, isKubernetesPod)
          .then(() => callback())
          .catch((error) => {
            this.logger.error(`Error processing command for session ${sessionId}:`, error);
            outputStream.push(`Error: ${error.message}\n`);
            this._addPrompt(outputStream);
            callback();
          });
      }
    });
    
    // Send welcome message
    outputStream.push(`Welcome to GAM Terminal\n`);
    outputStream.push(`Session: ${session.name}\n`);
    outputStream.push(`Image: ${session.imageName}\n`);
    
    if (isKubernetesPod) {
      outputStream.push(`Mode: Kubernetes Pod\n`);
    } else {
      outputStream.push(`Mode: Virtual Terminal\n`);
    }
    
    outputStream.push(`Type 'help' for available commands\n\n`);
    outputStream.push(`$ `);
    
    return {
      input: inputStream,
      output: outputStream
    };
  }

  /**
   * Process a command
   * @param {string} sessionId - The session ID
   * @param {string} command - The command to process
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async processCommand(sessionId, command, outputStream, isKubernetesPod) {
    if (!command) {
      this._addPrompt(outputStream);
      return;
    }
    
    this.logger.debug(`Processing command for session ${sessionId}: ${command}`);
    
    try {
      // Parse the command
      const parts = command.split(' ');
      const commandName = parts[0];
      
      // Check if we have a handler for this command
      const handler = this.commandHandlers.get(commandName);
      
      if (handler) {
        // Use the handler
        await handler(sessionId, command, parts, outputStream, isKubernetesPod);
      } else if (isKubernetesPod) {
        // If no handler and this is a Kubernetes pod, execute the command directly
        await this.commandService.executeCommand(sessionId, command, outputStream);
        this._addPrompt(outputStream);
      } else {
        // Otherwise, show an error
        outputStream.push(`Command not found: ${commandName}\n`);
        this._addPrompt(outputStream);
      }
    } catch (error) {
      this.logger.error(`Error processing command for session ${sessionId}:`, error);
      outputStream.push(`Error: ${error.message}\n`);
      this._addPrompt(outputStream);
    }
  }

  /**
   * Add command prompt to output stream
   * @private
   * @param {import('stream').Writable} outputStream - Stream to write output to
   */
  _addPrompt(outputStream) {
    setTimeout(() => {
      outputStream.push('$ ');
    }, 100);
  }

  /**
   * Handle echo command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleEchoCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute echo command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute echo command in virtual terminal
      const output = command.substring(5) + '\n';
      outputStream.push(output);
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle ls command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleLsCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute ls command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute ls command in virtual terminal
      const currentDir = this.vfs.getCurrentDir();
      const files = this.vfs.listFiles();
      
      if (files.length === 0) {
        outputStream.push('(empty directory)\n');
      } else {
        outputStream.push(files.join('\n') + '\n');
      }
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle cd command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleCdCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute cd command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute cd command in virtual terminal
      const targetDir = parts[1] || '';
      
      if (targetDir === '..') {
        // Move up one directory
        const currentDir = this.vfs.getCurrentDir();
        if (currentDir !== '/gam') {
          const parentDir = currentDir.split('/').slice(0, -1).join('/') || '/';
          this.vfs.setCurrentDir(parentDir);
        }
      } else if (targetDir.startsWith('/')) {
        // Absolute path
        if (!this.vfs.setCurrentDir(targetDir)) {
          outputStream.push(`cd: no such directory: ${targetDir}\n`);
        }
      } else if (targetDir) {
        // Relative path
        const currentDir = this.vfs.getCurrentDir();
        const newPath = currentDir === '/' ? `/${targetDir}` : `${currentDir}/${targetDir}`;
        
        if (!this.vfs.setCurrentDir(newPath)) {
          outputStream.push(`cd: no such directory: ${targetDir}\n`);
        }
      }
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle pwd command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handlePwdCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute pwd command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute pwd command in virtual terminal
      outputStream.push(`${this.vfs.getCurrentDir()}\n`);
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle cat command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleCatCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute cat command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute cat command in virtual terminal
      const fileName = parts[1] || '';
      
      if (!fileName) {
        outputStream.push('cat: missing file operand\n');
      } else {
        try {
          const filePath = this.vfs.getAbsolutePath(fileName);
          const content = this.vfs.readFile(filePath);
          outputStream.push(content + '\n');
        } catch (error) {
          outputStream.push(`cat: ${fileName}: ${error.message}\n`);
        }
      }
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle mkdir command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleMkdirCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute mkdir command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute mkdir command in virtual terminal
      const dirName = parts[1] || '';
      
      if (!dirName) {
        outputStream.push('mkdir: missing operand\n');
      } else {
        const dirPath = this.vfs.getAbsolutePath(dirName);
        
        if (!this.vfs.createDir(dirPath)) {
          outputStream.push(`mkdir: cannot create directory '${dirName}': Permission denied\n`);
        }
      }
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle rm command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleRmCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute rm command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute rm command in virtual terminal
      const fileName = parts[1] || '';
      
      if (!fileName) {
        outputStream.push('rm: missing operand\n');
      } else {
        const filePath = this.vfs.getAbsolutePath(fileName);
        
        if (!this.vfs.delete(filePath)) {
          outputStream.push(`rm: cannot remove '${fileName}': No such file or directory\n`);
        }
      }
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle whoami command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleWhoamiCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute whoami command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute whoami command in virtual terminal
      outputStream.push('gam-user\n');
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle date command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleDateCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (isKubernetesPod) {
      // Execute date command in Kubernetes pod
      await this.commandService.executeCommand(sessionId, command, outputStream);
    } else {
      // Execute date command in virtual terminal
      outputStream.push(new Date().toString() + '\n');
    }
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle help command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleHelpCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    outputStream.push('GAM Terminal\n');
    outputStream.push('Available commands:\n');
    outputStream.push('  echo [text]    - Display text\n');
    outputStream.push('  ls             - List files in current directory\n');
    outputStream.push('  cd [directory] - Change directory\n');
    outputStream.push('  pwd            - Show current directory\n');
    outputStream.push('  cat [file]     - Display file contents\n');
    outputStream.push('  mkdir [dir]    - Create a directory\n');
    outputStream.push('  rm [file]      - Remove a file\n');
    outputStream.push('  bash [file]    - Execute bash script\n');
    outputStream.push('  gam [command]  - Execute GAM command\n');
    outputStream.push('  whoami         - Show current user\n');
    outputStream.push('  date           - Show current date and time\n');
    outputStream.push('  help           - Show this help message\n');
    
    this._addPrompt(outputStream);
  }

  /**
   * Handle bash command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleBashCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    const scriptPath = parts[1] || '';
    
    if (!scriptPath) {
      outputStream.push('bash: missing script operand\n');
      this._addPrompt(outputStream);
      return;
    }
    
    try {
      // Execute bash script
      await this.commandService.executeBashScript(sessionId, scriptPath, outputStream);
    } catch (error) {
      this.logger.error(`Error executing bash script for session ${sessionId}:`, error);
      outputStream.push(`Error executing script: ${error.message}\n`);
      this._addPrompt(outputStream);
    }
  }

  /**
   * Handle gam command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleGamCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    const gamCommand = parts.slice(1).join(' ');
    
    try {
      // Execute GAM command
      await this.commandService.executeGamCommand(sessionId, gamCommand, outputStream);
    } catch (error) {
      this.logger.error(`Error executing GAM command for session ${sessionId}:`, error);
      outputStream.push(`Error executing GAM command: ${error.message}\n`);
      this._addPrompt(outputStream);
    }
  }
}

module.exports = TerminalService;
