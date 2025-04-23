const { containerSessions, sessions } = require('./sessionRoutes');
const { Readable, Writable } = require('stream');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const k8s = require('../utils/kubernetesClient');

// Check if Kubernetes is enabled
const KUBERNETES_ENABLED = process.env.GKE_CLUSTER_NAME && process.env.GKE_CLUSTER_LOCATION;

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
          return socket.emit('error', { message: 'Session not found' });
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
        
        console.log(`Client ${socket.id} joined session: ${sessionId}`);
        console.log(`Active connections for session ${sessionId}: ${activeSessions.get(sessionId).size}`);
        
        // Check if this is a Kubernetes pod
        const isKubernetesPod = KUBERNETES_ENABLED && containerInfo.kubernetes;
        
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
              const vfs = containerInfo.fs;
              
              // Advanced command processing
              if (input.startsWith('echo ')) {
                if (isKubernetesPod) {
                  // Execute echo command in Kubernetes pod
                  executeCommandInPod(sessionId, input, outputStream);
                } else {
                  // Execute echo command in virtual terminal
                  const output = input.substring(5) + '\n';
                  outputStream.push(output);
                }
              } else if (input === 'ls' || input === 'ls -la') {
                if (isKubernetesPod) {
                  // Execute ls command in Kubernetes pod
                  executeCommandInPod(sessionId, input, outputStream);
                } else {
                  // Execute ls command in virtual terminal
                  const currentDirPath = vfs.currentDir;
                  const currentDirName = currentDirPath.split('/').pop();
                  
                  if (currentDirPath === '/gam') {
                    outputStream.push('uploads\n');
                  } else if (currentDirPath === '/gam/uploads') {
                    // Refresh the file list from the actual directory
                    try {
                      const uploadsDir = path.join(__dirname, '../temp-uploads');
                      if (fs.existsSync(uploadsDir)) {
                        const actualFiles = fs.readdirSync(uploadsDir);
                        vfs.files[currentDirPath] = actualFiles;
                        console.log(`Refreshed uploads directory: ${actualFiles.length} files found`);
                      }
                    } catch (err) {
                      console.error('Error refreshing uploads directory:', err);
                    }
                    
                    // List actual files in the uploads directory
                    const files = vfs.files[currentDirPath] || [];
                    if (files.length === 0) {
                      outputStream.push('(empty directory)\n');
                    } else {
                      outputStream.push(files.join('\n') + '\n');
                    }
                  } else {
                    outputStream.push('(empty directory)\n');
                  }
                }
              } else if (input.startsWith('cd ')) {
                if (isKubernetesPod) {
                  // Execute cd command in Kubernetes pod
                  executeCommandInPod(sessionId, input, outputStream);
                } else {
                  // Execute cd command in virtual terminal
                  const targetDir = input.substring(3).trim();
                  
                  if (targetDir === '..') {
                    // Move up one directory
                    if (vfs.currentDir !== '/gam') {
                      vfs.currentDir = vfs.currentDir.split('/').slice(0, -1).join('/');
                      if (vfs.currentDir === '') vfs.currentDir = '/';
                    }
                  } else if (targetDir.startsWith('/')) {
                    // Absolute path
                    if (vfs.dirs[targetDir]) {
                      vfs.currentDir = targetDir;
                    } else {
                      outputStream.push(`cd: no such directory: ${targetDir}\n`);
                    }
                  } else {
                    // Relative path
                    const newPath = vfs.currentDir === '/' 
                      ? `/${targetDir}` 
                      : `${vfs.currentDir}/${targetDir}`;
                    
                    if (vfs.dirs[newPath]) {
                      vfs.currentDir = newPath;
                    } else {
                      outputStream.push(`cd: no such directory: ${targetDir}\n`);
                    }
                  }
                }
              } else if (input === 'pwd') {
                if (isKubernetesPod) {
                  // Execute pwd command in Kubernetes pod
                  executeCommandInPod(sessionId, input, outputStream);
                } else {
                  // Execute pwd command in virtual terminal
                  outputStream.push(`${vfs.currentDir}\n`);
                }
              } else if (input === 'whoami') {
                if (isKubernetesPod) {
                  // Execute whoami command in Kubernetes pod
                  executeCommandInPod(sessionId, input, outputStream);
                } else {
                  // Execute whoami command in virtual terminal
                  outputStream.push('gam-user\n');
                }
              } else if (input === 'date') {
                if (isKubernetesPod) {
                  // Execute date command in Kubernetes pod
                  executeCommandInPod(sessionId, input, outputStream);
                } else {
                  // Execute date command in virtual terminal
                  outputStream.push(new Date().toString() + '\n');
                }
              } else if (input === 'help') {
                outputStream.push('GAM Terminal\n');
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
                if (isKubernetesPod) {
                  // Execute cat command in Kubernetes pod
                  executeCommandInPod(sessionId, input, outputStream);
                } else {
                  // Execute cat command in virtual terminal
                  const fileName = input.substring(4).trim();
                  const filePath = vfs.currentDir === '/gam' 
                    ? `/gam/uploads/${fileName}` 
                    : `${vfs.currentDir}/${fileName}`;
                  
                  // Check if file exists in the actual filesystem
                  const actualFilePath = path.join(__dirname, '../temp-uploads', fileName);
                  if (fs.existsSync(actualFilePath)) {
                    try {
                      // Update virtual filesystem if needed
                      if (vfs.currentDir === '/gam/uploads' && !vfs.files['/gam/uploads'].includes(fileName)) {
                        vfs.files['/gam/uploads'].push(fileName);
                        console.log(`Added ${fileName} to virtual filesystem`);
                      }
                      
                      // Try to read the actual file
                      const fileContent = fs.readFileSync(actualFilePath, 'utf8');
                      outputStream.push(fileContent + '\n');
                    } catch (err) {
                      outputStream.push(`Error reading file: ${err.message}\n`);
                    }
                  } else {
                    outputStream.push(`cat: ${fileName}: No such file or directory\n`);
                  }
                }
              } else if (input.startsWith('bash ')) {
                if (isKubernetesPod) {
                  // Execute bash script in Kubernetes pod
                  executeBashScriptInPod(sessionId, input, outputStream);
                  return; // Don't add prompt here - it will be added after command completes
                } else {
                  // Execute bash script in Docker container
                  executeBashScriptInDocker(sessionId, input, outputStream);
                  return; // Don't add prompt here - it will be added after command completes
                }
              } else if (input.startsWith('gam ')) {
                if (isKubernetesPod) {
                  // Execute GAM command in Kubernetes pod
                  executeGamCommandInPod(sessionId, input, outputStream);
                  return; // Don't add prompt here - it will be added after command completes
                } else {
                  // Execute GAM command in Docker container
                  executeGamCommandInDocker(sessionId, input, outputStream);
                  return; // Don't add prompt here - it will be added after command completes
                }
              } else {
                if (isKubernetesPod) {
                  // Execute command in Kubernetes pod
                  executeCommandInPod(sessionId, input, outputStream);
                } else {
                  // Unknown command in virtual terminal
                  outputStream.push(`Command not found: ${input}\n`);
                }
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
        }
        
        // Handle data from virtual terminal to client
        containerInfo.stream.output.on('data', (data) => {
          socket.emit('terminal-output', data.toString());
        });
        
        socket.emit('session-joined', { message: 'Connected to session' });
        
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
  
  // Helper function to execute a command in a Kubernetes pod
  async function executeCommandInPod(sessionId, command, outputStream) {
    try {
      console.log(`Executing command in pod for session ${sessionId}: ${command}`);
      outputStream.push(`Executing command: ${command}\n`);
      
      // Execute the command in the pod
      const result = await k8s.executeCommandInPod(sessionId, command);
      
      // Send the output to the client
      if (result.stdout) {
        outputStream.push(result.stdout);
      }
      
      if (result.stderr) {
        outputStream.push(result.stderr);
      }
      
      // Add prompt after command execution
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    } catch (error) {
      console.error(`Error executing command in pod for session ${sessionId}:`, error);
      outputStream.push(`Error executing command: ${error.message}\n`);
      
      // Add prompt after error
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    }
  }
  
  // Helper function to execute a bash script in a Kubernetes pod
  async function executeBashScriptInPod(sessionId, input, outputStream) {
    try {
      const fileName = input.substring(5).trim();
      console.log(`Executing bash script in pod for session ${sessionId}: ${fileName}`);
      outputStream.push(`Executing script: ${fileName}...\n`);
      
      // Upload the script to the pod
      const localFilePath = path.join(__dirname, '../temp-uploads', fileName);
      const podFilePath = `/gam/uploads/${fileName}`;
      
      // Check if file exists in the actual filesystem
      if (!fs.existsSync(localFilePath)) {
        outputStream.push(`bash: ${fileName}: No such file or directory\n`);
        
        // Add prompt after error
        setTimeout(() => {
          outputStream.push('$ ');
        }, 100);
        return;
      }
      
      // Upload the file to the pod
      await k8s.uploadFileToPod(sessionId, localFilePath, podFilePath);
      
      // Execute the script in the pod
      const command = `cd /gam/uploads && bash ${fileName}`;
      const result = await k8s.executeCommandInPod(sessionId, command);
      
      // Send the output to the client
      if (result.stdout) {
        outputStream.push(result.stdout);
      }
      
      if (result.stderr) {
        outputStream.push(result.stderr);
      }
      
      outputStream.push(`\nScript executed successfully\n`);
      
      // Add prompt after command execution
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    } catch (error) {
      console.error(`Error executing bash script in pod for session ${sessionId}:`, error);
      outputStream.push(`Error executing script: ${error.message}\n`);
      
      // Add prompt after error
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    }
  }
  
  // Helper function to execute a GAM command in a Kubernetes pod
  async function executeGamCommandInPod(sessionId, input, outputStream) {
    try {
      const gamCommand = input.substring(4).trim();
      console.log(`Executing GAM command in pod for session ${sessionId}: ${gamCommand}`);
      outputStream.push(`Executing GAM command: ${gamCommand}\n`);
      
      // Execute the GAM command in the pod
      const command = `/gam/gam7/gam ${gamCommand}`;
      const result = await k8s.executeCommandInPod(sessionId, command);
      
      // Send the output to the client
      if (result.stdout) {
        outputStream.push(result.stdout);
      }
      
      if (result.stderr) {
        outputStream.push(result.stderr);
      }
      
      outputStream.push(`\nGAM command completed successfully\n`);
      
      // Add prompt after command execution
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    } catch (error) {
      console.error(`Error executing GAM command in pod for session ${sessionId}:`, error);
      outputStream.push(`Error executing GAM command: ${error.message}\n`);
      
      // Add prompt after error
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    }
  }
  
  // Helper function to execute a bash script in a Docker container
  function executeBashScriptInDocker(sessionId, input, outputStream) {
    const fileName = input.substring(5).trim();
    const filePath = path.join(__dirname, '../temp-uploads', fileName);
    
    // Check if file exists in the actual filesystem
    if (fs.existsSync(filePath)) {
      try {
        // Log the script being executed for debugging
        console.log(`Executing bash script in Docker for session ${sessionId}: ${fileName}`);
        outputStream.push(`Executing script: ${fileName}...\n`);
        
        // Build the Docker command manually to avoid using GAM
        const dockerCommand = 'docker';
        const dockerArgs = [
          'run',
          '--rm',  // Remove container after execution
          '--entrypoint=',  // Override the entrypoint
          '-v', path.join(__dirname, '../gam-credentials') + ':/root/.gam',  // Mount credentials
          '-v', path.join(__dirname, '../temp-uploads') + ':/gam/uploads',     // Mount uploads
          'gcr.io/gamgui-registry/docker-gam7:latest',  // Use the GAM image
          '/bin/bash', '-c', `cd /gam/uploads && bash ${fileName}`  // Execute bash directly
        ];
        
        console.log(`Executing Docker command: ${dockerCommand} ${dockerArgs.join(' ')}`);
        
        // Spawn the Docker process
        const bashProcess = spawn(dockerCommand, dockerArgs, {
          cwd: process.cwd(),
          shell: true
        });
        
        // Handle stdout data
        bashProcess.stdout.on('data', (data) => {
          // Check if session still exists
          const sessionStillExists = sessions.find(s => s.id === sessionId);
          const containerInfoStillExists = containerSessions.get(sessionId);
          
          if (!sessionStillExists || !containerInfoStillExists) {
            console.error(`Session ${sessionId} no longer exists during bash execution`);
            return;
          }
          
          // Send output to client
          const output = data.toString();
          console.log(`Bash stdout: ${output}`);
          outputStream.push(output);
        });
        
        // Handle stderr data
        bashProcess.stderr.on('data', (data) => {
          // Check if session still exists
          const sessionStillExists = sessions.find(s => s.id === sessionId);
          const containerInfoStillExists = containerSessions.get(sessionId);
          
          if (!sessionStillExists || !containerInfoStillExists) {
            console.error(`Session ${sessionId} no longer exists during bash execution`);
            return;
          }
          
          // Send error output to client
          const errorOutput = data.toString();
          console.log(`Bash stderr: ${errorOutput}`);
          outputStream.push(errorOutput);
        });
        
        // Handle process completion
        bashProcess.on('close', (code) => {
          // Check if session still exists
          const sessionStillExists = sessions.find(s => s.id === sessionId);
          const containerInfoStillExists = containerSessions.get(sessionId);
          
          if (!sessionStillExists || !containerInfoStillExists) {
            console.error(`Session ${sessionId} no longer exists during bash execution`);
            return;
          }
          
          console.log(`Bash process exited with code ${code}`);
          
          if (code !== 0) {
            outputStream.push(`\nScript exited with code ${code}\n`);
          } else {
            outputStream.push(`\nScript executed successfully\n`);
          }
          
          // Add prompt after command execution
          setTimeout(() => {
            outputStream.push('$ ');
          }, 100);
        });
        
        // Handle process errors
        bashProcess.on('error', (err) => {
          console.error(`Error spawning bash process: ${err.message}`);
          outputStream.push(`Error executing script: ${err.message}\n`);
          
          // Add prompt after error
          setTimeout(() => {
            outputStream.push('$ ');
          }, 100);
        });
      } catch (err) {
        console.error(`Exception executing bash script: ${err.message}`);
        outputStream.push(`Error executing script: ${err.message}\n`);
        
        // Add prompt after error
        setTimeout(() => {
          outputStream.push('$ ');
        }, 100);
      }
    } else {
      outputStream.push(`bash: ${fileName}: No such file or directory\n`);
      
      // Add prompt after error
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    }
  }
  
  // Helper function to execute a GAM command in a Docker container
  function executeGamCommandInDocker(sessionId, input, outputStream) {
    try {
      // Log the command being executed for debugging
      console.log(`Executing GAM command in Docker for session ${sessionId}: ${input}`);
      outputStream.push(`Executing GAM command: ${input}\n`);
      
      // Get the command without the 'gam' prefix
      const gamCommand = input.substring(4).trim();
      
      // Import the Docker GAM utility
      const { executeGamCommand } = require('../utils/dockerGam');
      
      // Execute the command in a Docker container
      const gamProcess = executeGamCommand(gamCommand, {
        cwd: process.cwd(),
        onStdout: (data) => {
          // Check if session still exists
          const sessionStillExists = sessions.find(s => s.id === sessionId);
          const containerInfoStillExists = containerSessions.get(sessionId);
          
          if (!sessionStillExists || !containerInfoStillExists) {
            console.error(`Session ${sessionId} no longer exists during GAM execution`);
            return;
          }
          
          // Send output to client
          const output = data.toString();
          console.log(`GAM stdout: ${output}`);
          outputStream.push(output);
        },
        onStderr: (data) => {
          // Check if session still exists
          const sessionStillExists = sessions.find(s => s.id === sessionId);
          const containerInfoStillExists = containerSessions.get(sessionId);
          
          if (!sessionStillExists || !containerInfoStillExists) {
            console.error(`Session ${sessionId} no longer exists during GAM execution`);
            return;
          }
          
          // Send error output to client
          const errorOutput = data.toString();
          console.log(`GAM stderr: ${errorOutput}`);
          outputStream.push(errorOutput);
        },
        onClose: (code) => {
          // Check if session still exists
          const sessionStillExists = sessions.find(s => s.id === sessionId);
          const containerInfoStillExists = containerSessions.get(sessionId);
          
          if (!sessionStillExists || !containerInfoStillExists) {
            console.error(`Session ${sessionId} no longer exists during GAM execution`);
            return;
          }
          
          console.log(`GAM process exited with code ${code}`);
          
          if (code !== 0) {
            outputStream.push(`\nGAM command exited with code ${code}\n`);
          } else {
            outputStream.push(`\nGAM command completed successfully\n`);
          }
          
          // Add prompt after command execution
          setTimeout(() => {
            outputStream.push('$ ');
          }, 100);
        },
        onError: (err) => {
          console.error(`Error spawning GAM process: ${err.message}`);
          outputStream.push(`Error executing GAM command: ${err.message}\n`);
          
          // Add prompt after error
          setTimeout(() => {
            outputStream.push('$ ');
          }, 100);
        }
      });
    } catch (err) {
      console.error(`Exception executing GAM command: ${err.message}`);
      outputStream.push(`Error executing GAM command: ${err.message}\n`);
      
      // Add prompt after error
      setTimeout(() => {
        outputStream.push('$ ');
      }, 100);
    }
  }
};
