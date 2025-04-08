const Docker = require('dockerode');
const { containerSessions, sessions } = require('./sessionRoutes');

// Initialize Docker client
const docker = new Docker();

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
          return socket.emit('error', { message: 'Container not found for this session' });
        }
        
        // Join the session room
        socket.join(sessionId);
        
        // Get the container
        const container = docker.getContainer(session.containerId);
        
        // Check if container is running
        const containerData = await container.inspect();
        if (!containerData.State.Running) {
          return socket.emit('error', { message: 'Container is not running' });
        }
        
        // Establish a connection with the container's exec instance
        const exec = await container.exec({
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          Cmd: ['/bin/bash']
        });
        
        // Start the exec instance
        const stream = await exec.start({
          hijack: true,
          stdin: true,
          stdout: true,
          stderr: true
        });
        
        // Store the stream
        containerInfo.stream = stream;
        containerSessions.set(sessionId, containerInfo);
        
        // Handle data from container to client
        stream.on('data', (data) => {
          socket.emit('terminal-output', data.toString());
        });
        
        // Handle stream closed event
        stream.on('end', () => {
          socket.emit('terminal-closed', { message: 'Terminal session ended' });
        });
        
        socket.emit('session-joined', { message: 'Connected to session' });
        
        // Handle command input from client
        socket.on('terminal-input', (data) => {
          if (containerInfo.stream) {
            containerInfo.stream.write(data);
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