const { containerSessions, sessions } = require('./sessionRoutes');
const { Readable, Writable } = require('stream');
const fs = require('fs');
const path = require('path');

module.exports = (io) => {
  // Namespace for container terminal sessions
  const terminalNamespace = io.of('/terminal');
  
  // Track active sessions and their sockets
  const activeSessions = new Map();
  
  // Middleware to log connection events
  terminalNamespace.use((socket, next) => {
    console.log(`Socket connection attempt: ${socket.id}`);
    next();
  });
  
  terminalNamespace.on('connection', (socket) => {
    console.log(`New WebSocket connection established: ${socket.id}`);
    
    // Set a longer timeout for this socket
    socket.conn.pingTimeout = 60000;
    
    // Handle joining a session
    socket.on('join-session', async (data) => {
      try {
        const { sessionId } = data;
        
        if (!sessionId) {
          return socket.emit('error', { message: 'Session ID is required' });
        }
        
        // Find the session
        const session = sessions.find(s => s.id === sessionId);
        if (!session) {
          return socket.emit('error', { message: 'Session not found' });
        }
        
        // Get container info from map or create a new entry
        let containerInfo = containerSessions.get(sessionId);
        
        if (!containerInfo) {
          return socket.emit('error', { message: 'Virtual session not found' });
        }
        
        // Join the session room
        socket.join(sessionId);
        
        // Store socket in active sessions map
        if (!activeSessions.has(sessionId)) {
          activeSessions.set(sessionId, new Set());
        }
        activeSessions.get(sessionId).add(socket.id);
        
        // Set session data on socket for easy access
        socket.sessionId = sessionId;
        socket.containerInfo = containerInfo;
        
        console.log(`Client ${socket.id} joined virtual session: ${sessionId}`);
        console.log(`Active connections for session ${sessionId}: ${activeSessions.get(sessionId).size}`);
        
        // Create a virtual terminal stream if it doesn't exist
        if (!containerInfo.stream) {
          // Initialize virtual file system state
          if (!containerInfo.fs) {
            containerInfo.fs = {
              currentDir: '/gam',
              dirs: {
                '/gam': ['uploads'],
                '/gam/uploads': []
              },
              files: {
                '/gam/uploads': []
              }
            };
            
            // Check if uploads directory exists and create it if not
            const uploadsDir = path.join(__dirname, '../temp-uploads');
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Read any existing files in the uploads directory
            try {
              const files = fs.readdirSync(uploadsDir);
              containerInfo.fs.files['/gam/uploads'] = files;
            } catch (err) {
              console.error('Error reading uploads directory:', err);
            }
          }
          
          // Create a virtual terminal using Node.js streams
          const outputStream = new Readable({
            read() {}
          });
          
          const inputStream = new Writable({
            write(chunk, encoding, callback) {
              // Process the input and generate a response
              const input = chunk.toString().trim();
              const fs = containerInfo.fs;
              
              // Advanced command processing
              if (input.startsWith('echo ')) {
                const output = input.substring(5) + '\n';
                outputStream.push(output);
              } else if (input === 'ls' || input === 'ls -la') {
                const currentDirPath = fs.currentDir;
                const currentDirName = currentDirPath.split('/').pop();
                
                if (currentDirPath === '/gam') {
                  outputStream.push('uploads\n');
                } else if (currentDirPath === '/gam/uploads') {
                  // List actual files in the uploads directory
                  const files = fs.files[currentDirPath] || [];
                  if (files.length === 0) {
                    outputStream.push('(empty directory)\n');
                  } else {
                    outputStream.push(files.join('\n') + '\n');
                  }
                } else {
                  outputStream.push('(empty directory)\n');
                }
              } else if (input.startsWith('cd ')) {
                const targetDir = input.substring(3).trim();
                
                if (targetDir === '..') {
                  // Move up one directory
                  if (fs.currentDir !== '/gam') {
                    fs.currentDir = fs.currentDir.split('/').slice(0, -1).join('/');
                    if (fs.currentDir === '') fs.currentDir = '/';
                  }
                } else if (targetDir.startsWith('/')) {
                  // Absolute path
                  if (fs.dirs[targetDir]) {
                    fs.currentDir = targetDir;
                  } else {
                    outputStream.push(`cd: no such directory: ${targetDir}\n`);
                  }
                } else {
                  // Relative path
                  const newPath = fs.currentDir === '/' 
                    ? `/${targetDir}` 
                    : `${fs.currentDir}/${targetDir}`;
                  
                  if (fs.dirs[newPath]) {
                    fs.currentDir = newPath;
                  } else {
                    outputStream.push(`cd: no such directory: ${targetDir}\n`);
                  }
                }
              } else if (input === 'pwd') {
                outputStream.push(`${fs.currentDir}\n`);
              } else if (input === 'whoami') {
                outputStream.push('gam-user\n');
              } else if (input === 'date') {
                outputStream.push(new Date().toString() + '\n');
              } else if (input === 'help') {
                outputStream.push('GAM Virtual Terminal\n');
                outputStream.push('Available commands:\n');
                outputStream.push('  echo [text]    - Display text\n');
                outputStream.push('  ls             - List files in current directory\n');
                outputStream.push('  cd [directory] - Change directory\n');
                outputStream.push('  pwd            - Show current directory\n');
                outputStream.push('  cat [file]     - Display file contents\n');
                outputStream.push('  bash [file]    - Execute bash script\n');
                outputStream.push('  gam [command]  - Execute GAM command\n');
                outputStream.push('  whoami         - Show current user\n');
                outputStream.push('  date           - Show current date and time\n');
                outputStream.push('  help           - Show this help message\n');
              } else if (input.startsWith('cat ')) {
                const fileName = input.substring(4).trim();
                const filePath = fs.currentDir === '/gam' 
                  ? `/gam/uploads/${fileName}` 
                  : `${fs.currentDir}/${fileName}`;
                
                // Check if file exists in virtual file system
                if (fs.currentDir === '/gam/uploads' && fs.files['/gam/uploads'].includes(fileName)) {
                  try {
                    // Try to read the actual file
                    const fileContent = fs.readFileSync(path.join(__dirname, '../temp-uploads', fileName), 'utf8');
                    outputStream.push(fileContent + '\n');
                  } catch (err) {
                    outputStream.push(`Error reading file: ${err.message}\n`);
                  }
                } else {
                  outputStream.push(`cat: ${fileName}: No such file or directory\n`);
                }
              } else if (input.startsWith('bash ')) {
                // Execute bash scripts
                const fileName = input.substring(5).trim();
                const filePath = path.join(__dirname, '../temp-uploads', fileName);
                
                if (fs.existsSync(filePath)) {
                  try {
                    outputStream.push(`Executing script: ${fileName}...\n`);
                    
                    const { exec } = require('child_process');
                    exec(`bash ${filePath}`, { cwd: '/gam' }, (error, stdout, stderr) => {
                      // Check if session still exists
                      const sessionStillExists = sessions.find(s => s.id === sessionId);
                      const containerInfoStillExists = containerSessions.get(sessionId);
                      
                      if (!sessionStillExists || !containerInfoStillExists) {
                        console.error(`Session ${sessionId} no longer exists during bash execution`);
                        return;
                      }
                      
                      if (error) {
                        outputStream.push(`Error executing script: ${error.message}\n`);
                      } else {
                        if (stderr && stderr.trim() !== '') {
                          outputStream.push(`${stderr}\n`);
                        }
                        if (stdout && stdout.trim() !== '') {
                          outputStream.push(`${stdout}\n`);
                        } else {
                          outputStream.push(`Script executed successfully (no output)\n`);
                        }
                      }
                      
                      // Add prompt after command execution
                      setTimeout(() => {
                        outputStream.push('$ ');
                      }, 100);
                    });
                    
                    // Don't add prompt here - it will be added after command completes
                    return;
                  } catch (err) {
                    outputStream.push(`Error executing script: ${err.message}\n`);
                  }
                } else {
                  outputStream.push(`bash: ${fileName}: No such file or directory\n`);
                }
              } else if (input.startsWith('gam ')) {
                // Execute real GAM commands
                try {
                  outputStream.push(`Executing GAM command...\n`);
                  
                  const { exec } = require('child_process');
                  exec(input, { cwd: '/gam' }, (error, stdout, stderr) => {
                    // Check if session still exists
                    const sessionStillExists = sessions.find(s => s.id === sessionId);
                    const containerInfoStillExists = containerSessions.get(sessionId);
                    
                    if (!sessionStillExists || !containerInfoStillExists) {
                      console.error(`Session ${sessionId} no longer exists during GAM execution`);
                      return;
                    }
                    
                    if (error) {
                      outputStream.push(`Error executing GAM command: ${error.message}\n`);
                    } else {
                      if (stderr && stderr.trim() !== '') {
                        outputStream.push(`${stderr}\n`);
                      }
                      if (stdout && stdout.trim() !== '') {
                        outputStream.push(`${stdout}\n`);
                      } else {
                        outputStream.push(`Command executed successfully (no output)\n`);
                      }
                    }
                    
                    // Add prompt after command execution
                    setTimeout(() => {
                      outputStream.push('$ ');
                    }, 100);
                  });
                  
                  // Don't add prompt here - it will be added after command completes
                  return;
                } catch (err) {
                  outputStream.push(`Error executing GAM command: ${err.message}\n`);
                }
              } else {
                outputStream.push(`Command not found: ${input}\n`);
              }
              
              callback();
            }
          });
          
          // Store the streams
          containerInfo.stream = {
            input: inputStream,
            output: outputStream
          };
          containerSessions.set(sessionId, containerInfo);
          
          // Send welcome message
          outputStream.push(`Welcome to GAM Virtual Terminal\n`);
          outputStream.push(`Session: ${session.name}\n`);
          outputStream.push(`Image: ${session.imageName}\n`);
          outputStream.push(`Type 'help' for available commands\n\n`);
          outputStream.push(`$ `);
        }
        
        // Handle data from virtual terminal to client
        containerInfo.stream.output.on('data', (data) => {
          socket.emit('terminal-output', data.toString());
        });
        
        socket.emit('session-joined', { message: 'Connected to virtual session' });
        
        // Handle command input from client
        socket.on('terminal-input', (data) => {
          if (containerInfo.stream && containerInfo.stream.input) {
            const input = data.toString().trim();
            
            // For bash and gam commands, don't add prompt here
            // as it will be added after the command completes
            const isLongRunningCommand = 
              input.startsWith('bash ') || 
              input.startsWith('gam ');
            
            containerInfo.stream.input.write(data);
            
            // Add prompt after command execution only for non-long-running commands
            if (!isLongRunningCommand) {
              setTimeout(() => {
                containerInfo.stream.output.push('$ ');
              }, 100);
            }
          }
        });
        
        // Handle client disconnection
        socket.on('disconnect', (reason) => {
          const sessionId = socket.sessionId;
          if (!sessionId) return;
          
          console.log(`Client ${socket.id} disconnected from session ${sessionId}. Reason: ${reason}`);
          
          // Remove socket from active sessions
          if (activeSessions.has(sessionId)) {
            activeSessions.get(sessionId).delete(socket.id);
            console.log(`Remaining connections for session ${sessionId}: ${activeSessions.get(sessionId).size}`);
            
            // If this was the last connection for this session, clean up resources
            if (activeSessions.get(sessionId).size === 0) {
              console.log(`No more active connections for session ${sessionId}. Keeping session alive for reconnection.`);
              // We don't delete the session here to allow for reconnection
            }
          }
        });
        
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Error joining session', error: error.message });
      }
    });
    
    // Handle leaving a session
    socket.on('leave-session', (data) => {
      const { sessionId } = data;
      if (sessionId) {
        socket.leave(sessionId);
        
        // Remove socket from active sessions
        if (activeSessions.has(sessionId)) {
          activeSessions.get(sessionId).delete(socket.id);
        }
        
        socket.emit('session-left', { message: 'Disconnected from session' });
      }
    });
    
    // Handle socket errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
      
      // Try to notify the client about the error
      try {
        socket.emit('error', { 
          message: 'Socket connection error', 
          error: error.message || 'Unknown error' 
        });
      } catch (e) {
        console.error('Failed to send error to client:', e);
      }
    });
    
    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Client ${socket.id} reconnection attempt #${attemptNumber}`);
    });
    
    // Handle successful reconnection
    socket.on('reconnect', () => {
      console.log(`Client ${socket.id} successfully reconnected`);
      
      // If the socket had a session before, try to rejoin it
      if (socket.sessionId) {
        console.log(`Attempting to rejoin session ${socket.sessionId}`);
        socket.emit('rejoin-session', { sessionId: socket.sessionId });
      }
    });
  });
};
