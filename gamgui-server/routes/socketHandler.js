const { containerSessions, sessions } = require('./sessionRoutes');
const { Readable, Writable } = require('stream');

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
          // Create a virtual terminal using Node.js streams
          const outputStream = new Readable({
            read() {}
          });
          
          const inputStream = new Writable({
            write(chunk, encoding, callback) {
              // Process the input and generate a response
              const input = chunk.toString().trim();
              
              // Simple command processing
              if (input.startsWith('echo ')) {
                const output = input.substring(5) + '\n';
                outputStream.push(output);
              } else if (input === 'ls') {
                outputStream.push('uploads\n');
              } else if (input === 'pwd') {
                outputStream.push('/gam\n');
              } else if (input === 'whoami') {
                outputStream.push('gam-user\n');
              } else if (input === 'date') {
                outputStream.push(new Date().toString() + '\n');
              } else if (input === 'help' || input === 'gam help') {
                outputStream.push('GAM Virtual Terminal\n');
                outputStream.push('Available commands: echo, ls, pwd, whoami, date, help\n');
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
