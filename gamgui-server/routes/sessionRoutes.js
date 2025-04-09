const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');
const { images } = require('./imageRoutes');
const router = express.Router();

// Initialize Docker client
const docker = new Docker();

// In-memory storage for sessions (replace with a database in production)
const sessions = [];

// Map of active container sessions
const containerSessions = new Map();

/**
 * @route   POST /api/sessions
 * @desc    Create a new session with a Docker container
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, imageId, config } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Session name is required' });
    }
    
    if (!imageId) {
      return res.status(400).json({ message: 'Image ID is required' });
    }
    
    // Find the image by ID
    const image = images.find(img => img.id === imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Generate session ID
    const sessionId = uuidv4();
    
    // Create a Docker container from the image
    const container = await docker.createContainer({
      Image: image.imageName,
      name: `gam-session-${sessionId.substring(0, 8)}`,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      // Cmd: ['/bin/bash'], // Start with bash shell
    });
    
    // Start the container
    await container.start();
    
    // Store container information
    const containerInfo = {
      id: container.id,
      sessionId,
      stream: null
    };
    
    containerSessions.set(sessionId, containerInfo);
    
    // Create the session record
    const newSession = {
      id: sessionId,
      name,
      containerId: container.id,
      containerName: `gam-session-${sessionId.substring(0, 8)}`,
      imageId,
      imageName: image.imageName,
      config: config || {},
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      status: 'active'
    };
    
    // Store the session
    sessions.push(newSession);
    
    return res.status(201).json({
      message: 'Session created successfully',
      session: newSession
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sessions
 * @desc    Get all sessions
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json(sessions);
});

/**
 * @route   GET /api/sessions/:id
 * @desc    Get session by ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
  const session = sessions.find(s => s.id === req.params.id);
  
  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }
  
  res.json({ session });
});

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Stop and remove a session
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const session = sessions[sessionIndex];
    
    // Get container info from map
    const containerInfo = containerSessions.get(sessionId);
    if (containerInfo) {
      try {
        // Get the container
        const container = docker.getContainer(session.containerId);
        
        // Stop the container if it's running
        const containerData = await container.inspect();
        if (containerData.State.Running) {
          await container.stop();
        }
        
        // Remove the container
        await container.remove();
        
        // Remove from container sessions map
        containerSessions.delete(sessionId);
      } catch (containerError) {
        console.error(`Error stopping container: ${containerError.message}`);
      }
    }
    
    // Remove session from array
    sessions.splice(sessionIndex, 1);
    
    return res.status(200).json({
      message: 'Session stopped and removed successfully'
    });
  } catch (error) {
    console.error('Error removing session:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Export router and containerSessions for WebSocket handling
module.exports = { router, sessions, containerSessions }; 