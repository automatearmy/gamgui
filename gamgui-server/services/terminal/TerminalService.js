/**
 * Service for terminal operations
 * Provides a unified interface for terminal operations
 */
const { Readable, Writable, PassThrough } = require('stream'); // Add PassThrough
const path = require('path'); // Import path module
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
    this.sessionPwds = new Map(); // Store PWD per session { sessionId: currentPath }
    
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
    handlers.set('sh', this._handleShellCommand.bind(this));
    handlers.set('shell', this._handleShellCommand.bind(this));
    handlers.set('run-script', this._handleRunScriptCommand.bind(this));
    handlers.set('version', this._handleVersionCommand.bind(this));
    
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
    
    // Initialize PWD for this session (default to /gam, adjust if needed)
    this.sessionPwds.set(sessionId, '/gam'); 
    
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
    outputStream.push(`\n=== Welcome to GAM Terminal ===\n\n`);
    
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
      
      const currentPwd = this.sessionPwds.get(sessionId) || '/gam'; // Get current PWD for prefixing

      if (handler) {
        // Use the specific handler (handlers will now need to consider the PWD if executing in K8s)
        await handler(sessionId, command, parts, outputStream, isKubernetesPod);
      } else if (isKubernetesPod) {
        // If no specific handler and this is a Kubernetes pod, execute the command prefixed with cd
        const prefixedCommand = `cd "${currentPwd.replace(/"/g, '\\"')}" && ${command}`;
        this.logger.debug(`Executing prefixed K8s command for session ${sessionId}: ${prefixedCommand}`);
        try {
          await this.commandService.executeCommand(sessionId, prefixedCommand, outputStream);
        } catch (execError) {
          this.logger.error(`[TerminalService] Error from commandService.executeCommand for session ${sessionId}:`, execError);
          // We will let the main catch block in processCommand handle pushing to outputStream
          throw execError; // Re-throw to be caught by the main try-catch
        }
        this._addPrompt(outputStream);
      } else {
        // Otherwise (not K8s, no handler), show an error
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
      // Execute prefixed echo command in Kubernetes pod
      const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
      const prefixedCommand = `cd "${currentPwd.replace(/"/g, '\\"')}" && ${command}`;
      this.logger.debug(`Executing prefixed K8s command for session ${sessionId}: ${prefixedCommand}`);
      await this.commandService.executeCommand(sessionId, prefixedCommand, outputStream);
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
      // Execute prefixed ls command in Kubernetes pod
      const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
      const prefixedCommand = `cd "${currentPwd.replace(/"/g, '\\"')}" && ${command}`;
      this.logger.debug(`Executing prefixed K8s command for session ${sessionId}: ${prefixedCommand}`);
      await this.commandService.executeCommand(sessionId, prefixedCommand, outputStream);
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
    const targetDirArg = parts[1] || '';
    const currentPwd = this.sessionPwds.get(sessionId) || '/gam'; // Get current PWD

    if (!targetDirArg) {
      // No argument, typically goes to home, let's just stay put or go to /gam
      this.sessionPwds.set(sessionId, '/gam');
      this._addPrompt(outputStream);
      return;
    }

    // Resolve the target path
    const targetPath = path.resolve(currentPwd, targetDirArg);

    if (isKubernetesPod) {
      // Kubernetes mode: Execute 'cd <target> && pwd' to verify and get the new path
      const cdCommand = `cd "${targetPath.replace(/"/g, '\\"')}" && pwd`; // Escape quotes in path
      const tempStream = new PassThrough();
      let newPwdOutput = '';
      tempStream.on('data', (chunk) => {
        newPwdOutput += chunk.toString();
      });

      try {
        await this.commandService.executeCommand(sessionId, cdCommand, tempStream);
        const finalPwd = newPwdOutput.trim().split('\n').pop(); // Get the last line of output
        if (finalPwd && finalPwd.startsWith('/')) { // Basic validation
           this.sessionPwds.set(sessionId, finalPwd);
           this.logger.debug(`Session ${sessionId} PWD updated to: ${finalPwd}`);
        } else {
           // Attempt to parse stderr if available (might require changes in executeCommand)
           // For now, assume failure if pwd output is not as expected
           outputStream.push(`cd: error changing directory to ${targetDirArg}\n`);
           this.logger.warn(`Session ${sessionId} cd failed. Command output: ${newPwdOutput}`);
        }
      } catch (error) {
        this.logger.error(`Error executing cd command for session ${sessionId}:`, error);
        outputStream.push(`cd: ${targetDirArg}: ${error.message.includes('No such file or directory') ? 'No such file or directory' : 'Error changing directory'}\n`);
      }
    } else {
      // Virtual terminal mode: Use VFS
      if (this.vfs.setCurrentDir(targetPath)) {
        this.sessionPwds.set(sessionId, this.vfs.getCurrentDir()); // Update session PWD from VFS
        this.logger.debug(`Session ${sessionId} VFS PWD updated to: ${this.vfs.getCurrentDir()}`);
      } else {
        outputStream.push(`cd: no such directory: ${targetDirArg}\n`);
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
    const currentPwd = this.sessionPwds.get(sessionId) || '/gam'; // Get stored PWD
    outputStream.push(`${currentPwd}\n`); // Push stored PWD regardless of mode
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
      // Execute prefixed cat command in Kubernetes pod
      const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
      const prefixedCommand = `cd "${currentPwd.replace(/"/g, '\\"')}" && ${command}`;
      this.logger.debug(`Executing prefixed K8s command for session ${sessionId}: ${prefixedCommand}`);
      await this.commandService.executeCommand(sessionId, prefixedCommand, outputStream);
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
      // Execute prefixed mkdir command in Kubernetes pod
      const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
      const prefixedCommand = `cd "${currentPwd.replace(/"/g, '\\"')}" && ${command}`;
      this.logger.debug(`Executing prefixed K8s command for session ${sessionId}: ${prefixedCommand}`);
      await this.commandService.executeCommand(sessionId, prefixedCommand, outputStream);
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
      // Execute prefixed rm command in Kubernetes pod
      const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
      const prefixedCommand = `cd "${currentPwd.replace(/"/g, '\\"')}" && ${command}`;
      this.logger.debug(`Executing prefixed K8s command for session ${sessionId}: ${prefixedCommand}`);
      await this.commandService.executeCommand(sessionId, prefixedCommand, outputStream);
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
      // Execute prefixed whoami command in Kubernetes pod (though PWD doesn't affect whoami)
      const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
      const prefixedCommand = `cd "${currentPwd.replace(/"/g, '\\"')}" && ${command}`;
      this.logger.debug(`Executing prefixed K8s command for session ${sessionId}: ${prefixedCommand}`);
      await this.commandService.executeCommand(sessionId, prefixedCommand, outputStream);
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
      // Execute prefixed date command in Kubernetes pod (though PWD doesn't affect date)
      const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
      const prefixedCommand = `cd "${currentPwd.replace(/"/g, '\\"')}" && ${command}`;
      this.logger.debug(`Executing prefixed K8s command for session ${sessionId}: ${prefixedCommand}`);
      await this.commandService.executeCommand(sessionId, prefixedCommand, outputStream);
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
    outputStream.push('  sh [command]   - Execute shell command\n');
    outputStream.push('  shell [command]- Execute shell command (alias for sh)\n');
    outputStream.push('  run-script     - Upload and execute a script\n');
    outputStream.push('  version        - Show container version information\n');
    outputStream.push('  whoami         - Show current user\n');
    outputStream.push('  date           - Show current date and time\n');
    outputStream.push('  help           - Show this help message\n');
    
    this._addPrompt(outputStream);
  }
  
  /**
   * Handle shell command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleShellCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    // Extract the shell command (everything after 'sh' or 'shell')
    const commandName = parts[0]; // 'sh' or 'shell'
    const shellCommand = command.substring(commandName.length).trim();
    
    if (!shellCommand) {
      outputStream.push(`${commandName}: missing command operand\n`);
      this._addPrompt(outputStream);
      return;
    }
    
    try {
      this.logger.info(`Handling shell command: ${shellCommand} for session ${sessionId}`);
      
      if (isKubernetesPod) {
        // Get current working directory
        const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
        
        // Execute the shell command with the current working directory
        await this.commandService.executeShellCommand(
          sessionId, 
          shellCommand, 
          outputStream, 
          {
            timeout: 60000, // 60 seconds timeout
            sanitize: true  // Sanitize the command
          }
        );
      } else {
        // For virtual terminal, just show a message
        outputStream.push(`Shell command execution is only available in Kubernetes mode\n`);
        this._addPrompt(outputStream);
      }
    } catch (error) {
      this.logger.error(`Error executing shell command for session ${sessionId}:`, error);
      outputStream.push(`Error: ${error.message}\n`);
      this._addPrompt(outputStream);
    }
  }
  
  /**
   * Handle run-script command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleRunScriptCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    if (!isKubernetesPod) {
      outputStream.push(`Script upload and execution is only available in Kubernetes mode\n`);
      this._addPrompt(outputStream);
      return;
    }
    
    outputStream.push(`Enter script content (type 'EOF' on a line by itself to finish):\n`);
    
    // Create a script content collector
    let scriptContent = '';
    let scriptInputMode = true;
    
    // Store the original write function
    const originalWrite = outputStream._write;
    
    // Override the write function to collect script content
    outputStream._write = function(chunk, encoding, callback) {
      if (scriptInputMode) {
        const line = chunk.toString().trim();
        
        if (line === 'EOF') {
          // End of script input
          scriptInputMode = false;
          
          // Restore the original write function
          outputStream._write = originalWrite;
          
          // Execute the script
          this.commandService.uploadAndExecuteScript(
            sessionId, 
            scriptContent, 
            outputStream, 
            {
              cleanup: true // Clean up the script after execution
            }
          ).catch(error => {
            this.logger.error(`Error executing uploaded script for session ${sessionId}:`, error);
            outputStream.push(`Error: ${error.message}\n`);
            this._addPrompt(outputStream);
          });
        } else {
          // Add the line to the script content
          scriptContent += line + '\n';
          outputStream.push('> '); // Show a prompt for the next line
        }
      } else {
        // Normal output mode
        originalWrite.call(outputStream, chunk, encoding, callback);
      }
    }.bind(this);
    
    // Show a prompt for the first line
    outputStream.push('> ');
  }
  
  /**
   * Handle version command
   * @private
   * @param {string} sessionId - The session ID
   * @param {string} command - The full command
   * @param {string[]} parts - The command parts
   * @param {import('stream').Writable} outputStream - Stream to write output to
   * @param {boolean} isKubernetesPod - Whether this is a Kubernetes pod
   * @returns {Promise<void>}
   */
  async _handleVersionCommand(sessionId, command, parts, outputStream, isKubernetesPod) {
    try {
      if (isKubernetesPod) {
        // Get version information from the container
        const versionInfo = await this.commandService.verifyDeployedVersion(sessionId);
        
        outputStream.push(`Container Version Information:\n`);
        outputStream.push(`Version: ${versionInfo.version}\n`);
        
        if (versionInfo.imageId) {
          outputStream.push(`Image ID: ${versionInfo.imageId}\n`);
        }
        
        outputStream.push(`Timestamp: ${versionInfo.timestamp}\n`);
        outputStream.push(`Verified: ${versionInfo.verified}\n`);
        
        if (versionInfo.podName) {
          outputStream.push(`Pod Name: ${versionInfo.podName}\n`);
        }
        
        if (versionInfo.error) {
          outputStream.push(`Error: ${versionInfo.error}\n`);
        }
      } else {
        // For virtual terminal, just show a message
        outputStream.push(`Version information is only available in Kubernetes mode\n`);
      }
    } catch (error) {
      this.logger.error(`Error getting version information for session ${sessionId}:`, error);
      outputStream.push(`Error: ${error.message}\n`);
    }
    
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
    const scriptPathArg = parts[1] || '';
    
    if (!scriptPathArg) {
      outputStream.push('bash: missing script operand\n');
      this._addPrompt(outputStream);
      return;
    }

    const currentPwd = this.sessionPwds.get(sessionId) || '/gam';
    let absoluteScriptPath;
    let scriptDir;

    if (isKubernetesPod) {
      // Resolve path relative to current K8s PWD
      absoluteScriptPath = path.resolve(currentPwd, scriptPathArg);
      scriptDir = path.dirname(absoluteScriptPath);
      
      // Log the resolved paths for debugging
      this.logger.debug(`Resolved bash script path for session ${sessionId}: ${absoluteScriptPath}`);
      this.logger.debug(`Script directory: ${scriptDir}`);
      
      try {
        // First change to the directory containing the script
        const cdCommand = `cd "${scriptDir.replace(/"/g, '\\"')}"`;
        await this.commandService.executeCommand(sessionId, cdCommand, { silent: true });
        
        // Update the current working directory
        this.sessionPwds.set(sessionId, scriptDir);
        
        // Execute the script with bash using the filename only
        const scriptName = path.basename(absoluteScriptPath);
        outputStream.push(`Executing script: ${scriptName} in directory: ${scriptDir}\n`);
        
        // Execute the script with bash
        await this.commandService.executeBashScript(sessionId, scriptName, outputStream);
      } catch (error) {
        this.logger.error(`Error executing bash script ${absoluteScriptPath} for session ${sessionId}:`, error);
        outputStream.push(`Error executing script: ${error.message}\n`);
        this._addPrompt(outputStream);
      }
    } else {
      // Resolve path relative to VFS current directory
      absoluteScriptPath = this.vfs.getAbsolutePath(scriptPathArg);
      scriptDir = path.dirname(absoluteScriptPath);
      
      // Log the resolved paths for debugging
      this.logger.debug(`Resolved bash script path for session ${sessionId}: ${absoluteScriptPath}`);
      this.logger.debug(`Script directory: ${scriptDir}`);
      
      try {
        // Set the current directory in VFS
        if (this.vfs.setCurrentDir(scriptDir)) {
          // Update the current working directory
          this.sessionPwds.set(sessionId, scriptDir);
          
          // Execute the script with bash using the filename only
          const scriptName = path.basename(absoluteScriptPath);
          outputStream.push(`Executing script: ${scriptName} in directory: ${scriptDir}\n`);
          
          // Execute the script with bash
          await this.commandService.executeBashScript(sessionId, absoluteScriptPath, outputStream);
        } else {
          outputStream.push(`Error: Cannot change to directory: ${scriptDir}\n`);
          this._addPrompt(outputStream);
        }
      } catch (error) {
        this.logger.error(`Error executing bash script ${absoluteScriptPath} for session ${sessionId}:`, error);
        outputStream.push(`Error executing script: ${error.message}\n`);
        this._addPrompt(outputStream);
      }
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
    const gamArgs = parts.slice(1).join(' '); // Get arguments after 'gam'
    
    try {
      this.logger.info(`Handling GAM command: ${gamArgs} for session ${sessionId}`);
      // Explicitly call the correct service method
      await this.commandService.executeGamCommand(sessionId, gamArgs, outputStream);
      // Note: executeGamCommand in CommandService already adds the prompt on completion/error
    } catch (error) {
      this.logger.error(`Error executing GAM command in _handleGamCommand for session ${sessionId}:`, error);
      // Ensure error message is pushed to the output stream
      outputStream.push(`Error: ${error.message}\n`);
      // Add prompt after error
      this._addPrompt(outputStream); 
    }
    // We don't add the prompt here because executeGamCommand handles it
  }
}

module.exports = TerminalService;
