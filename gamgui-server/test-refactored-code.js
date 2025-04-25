/**
 * Test script for the refactored WebSocket terminal management code
 * This script creates a simple server that uses the refactored code
 * and provides a way to test the WebSocket connections
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Import the refactored code
const config = require('./config/config');
const logger = require('./utils/logger');
const { SessionService, SessionRepository } = require('./services/session');
const { ContainerFactory } = require('./services/container');
const { TerminalService, CommandService, VirtualFileSystem } = require('./services/terminal');
const { WebSocketService } = require('./services/websocket');

// Create a simple HTML page for testing
const HTML_PAGE = `
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Terminal Test</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    #terminal { 
      width: 100%; 
      height: 400px; 
      background-color: black; 
      color: white; 
      font-family: monospace; 
      padding: 10px; 
      overflow: auto;
      white-space: pre-wrap;
    }
    #input { width: 100%; padding: 5px; margin-top: 10px; }
    button { padding: 5px 10px; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>WebSocket Terminal Test</h1>
  
  <div>
    <button id="createSession">Create Session</button>
    <button id="joinSession" disabled>Join Session</button>
    <button id="leaveSession" disabled>Leave Session</button>
  </div>
  
  <div id="terminal"></div>
  <input id="input" type="text" placeholder="Enter command..." disabled />
  
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const terminal = document.getElementById('terminal');
    const input = document.getElementById('input');
    const createSessionBtn = document.getElementById('createSession');
    const joinSessionBtn = document.getElementById('joinSession');
    const leaveSessionBtn = document.getElementById('leaveSession');
    
    let socket;
    let sessionId;
    
    // Add text to the terminal
    function addToTerminal(text) {
      terminal.innerHTML += text;
      terminal.scrollTop = terminal.scrollHeight;
    }
    
    // Create a session
    createSessionBtn.addEventListener('click', async () => {
      try {
        addToTerminal('Creating session...\n');
        
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test Session' })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          sessionId = data.session.id;
          addToTerminal(\`Session created: \${sessionId}\n\`);
          joinSessionBtn.disabled = false;
        } else {
          addToTerminal(\`Error creating session: \${data.message}\n\`);
        }
      } catch (error) {
        addToTerminal(\`Error creating session: \${error.message}\n\`);
      }
    });
    
    // Join a session
    joinSessionBtn.addEventListener('click', () => {
      if (!sessionId) {
        addToTerminal('No session to join\n');
        return;
      }
      
      // Connect to the terminal namespace
      socket = io('/terminal');
      
      // Handle connection
      socket.on('connect', () => {
        addToTerminal(\`Connected to socket.io. Socket ID: \${socket.id}\n\`);
        
        // Join the session
        socket.emit('join-session', { sessionId });
      });
      
      // Handle session joined
      socket.on('session-joined', (data) => {
        addToTerminal(\`\${data.message}\n\`);
        input.disabled = false;
        leaveSessionBtn.disabled = false;
        joinSessionBtn.disabled = true;
      });
      
      // Handle terminal output
      socket.on('terminal-output', (data) => {
        addToTerminal(data);
      });
      
      // Handle errors
      socket.on('error', (data) => {
        addToTerminal(\`Error: \${data.message}\n\`);
      });
      
      // Handle disconnection
      socket.on('disconnect', (reason) => {
        addToTerminal(\`Disconnected: \${reason}\n\`);
        input.disabled = true;
        leaveSessionBtn.disabled = true;
        joinSessionBtn.disabled = false;
      });
    });
    
    // Leave a session
    leaveSessionBtn.addEventListener('click', () => {
      if (!socket) {
        addToTerminal('Not connected\n');
        return;
      }
      
      socket.emit('leave-session', { sessionId });
      socket.disconnect();
      
      addToTerminal('Left session\n');
      input.disabled = true;
      leaveSessionBtn.disabled = true;
      joinSessionBtn.disabled = false;
    });
    
    // Handle input
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const command = input.value;
        
        if (command) {
          socket.emit('terminal-input', command + '\n');
          input.value = '';
        }
      }
    });
  </script>
</body>
</html>
`;

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Create services
const sessionRepository = new SessionRepository();
const containerService = ContainerFactory.createContainerService(config, logger);
const sessionService = new SessionService(sessionRepository, containerService);
const vfs = new VirtualFileSystem(config.paths.uploads);
const commandService = new CommandService(containerService, logger);
const terminalService = new TerminalService(commandService, vfs, logger);
const webSocketService = new WebSocketService(sessionService, terminalService, config);

// Initialize WebSocket service
webSocketService.initialize(io);

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send(HTML_PAGE);
});

// Session routes
app.post('/api/sessions', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Session name is required' });
    }
    
    // Create the session
    const result = await sessionService.createSession({
      name,
      imageId: 'default-gam-image',
      imageName: config.docker.gamImage,
      config: {}
    });
    
    return res.status(201).json({
      message: 'Session created successfully',
      session: result.session,
      websocketInfo: result.websocketInfo
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Test server running on http://localhost:${PORT}`);
  logger.info('Open this URL in your browser to test the WebSocket terminal');
});
