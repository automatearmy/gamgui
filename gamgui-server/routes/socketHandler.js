const { containerSessions, sessions } = require('./sessionRoutes');
const { Readable, Writable } = require('stream');
const fs = require('fs');
const path = require('path');

module.exports = (io) => {
  // Namespace for container terminal sessions
  const terminalNamespace = io.of('/terminal');
  
  terminalNamespace.on('connection', (socket) => {
    console.log('New WebSocket connection');
    
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
        
        console.log(`Client joined virtual session: ${sessionId}`);
        
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
              } else if (input === 'help' || input === 'gam help') {
                outputStream.push('GAM Virtual Terminal\n');
                outputStream.push('Available commands: echo, ls, cd, pwd, whoami, date, help\n');
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
              } else {
                // Check if it might be a GAM command
                if (input.startsWith('gam ')) {
                  outputStream.push(`Simulated GAM command: ${input}\n`);
                  outputStream.push(`(Note: This is a virtual session, GAM commands are simulated)\n`);
                } else {
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
            containerInfo.stream.input.write(data);
            // Add prompt after command execution
            setTimeout(() => {
              containerInfo.stream.output.push('$ ');
            }, 100);
          }
        });
        
        // Handle client disconnection
        socket.on('disconnect', () => {
          console.log(`Client disconnected from session ${sessionId}`);
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
        socket.emit('session-left', { message: 'Disconnected from session' });
      }
    });
  });
};
