const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { images } = require('./imageRoutes');
const router = express.Router();

// Default pre-built image to use if no images are available
const DEFAULT_IMAGE = {
  id: "default-gam-image",
  name: "Default GAM Image",
  imageName: "gcr.io/gamgui-registry/docker-gam7:latest"
};

// Get GAM image from environment variable if available
const GAM_IMAGE = process.env.GAM_IMAGE || DEFAULT_IMAGE.imageName;

// In-memory storage for sessions (replace with a database in production)
const sessions = [];

// Map of active container sessions
const containerSessions = new Map();

/**
 * @route   POST /api/sessions
 * @desc    Create a new virtual session
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, imageId, config } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Session name is required' });
    }
    
    // Find the image by ID or use default image
    let image;
    
    if (imageId) {
      image = images.find(img => img.id === imageId);
    }
    
    // If no image is found or no imageId provided, use the default image
    if (!image) {
      console.log('Using default GAM image for session');
      image = DEFAULT_IMAGE;
    }
    
    // Generate session ID
    const sessionId = uuidv4();
    const containerName = `gam-session-${sessionId.substring(0, 8)}`;
    const containerId = `virtual-container-${sessionId}`;
    
    // Create a virtual session instead of a Docker container
    console.log(`Creating virtual session with image: ${image.imageName}`);
    
    // Ensure temp-uploads directory exists
    const tempUploadsDir = path.resolve(__dirname, '../temp-uploads');
    if (!fs.existsSync(tempUploadsDir)) {
      fs.mkdirSync(tempUploadsDir, { recursive: true });
    }
    
    // Store virtual container information
    const containerInfo = {
      id: containerId,
      sessionId,
      stream: null,
      virtual: true
    };
    
    containerSessions.set(sessionId, containerInfo);
    
    // Create the session record
    const newSession = {
      id: sessionId,
      name,
      containerId,
      containerName,
      imageId: imageId || DEFAULT_IMAGE.id,
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
 * @desc    Stop and remove a virtual session
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
    
    // Get container info from map and remove it
    if (containerSessions.has(sessionId)) {
      console.log(`Removing virtual session: ${sessionId}`);
      containerSessions.delete(sessionId);
    }
    
    // Clean up any uploaded files for this session
    try {
      const tempUploadsDir = path.resolve(__dirname, '../temp-uploads');
      if (fs.existsSync(tempUploadsDir)) {
        // Read all files in the temp-uploads directory
        const files = fs.readdirSync(tempUploadsDir);
        
        console.log(`Cleaning up ${files.length} uploaded files for session ${sessionId}`);
        
        // Delete each file
        for (const file of files) {
          const filePath = path.join(tempUploadsDir, file);
          
          // Check if it's a file (not a directory)
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${file}`);
          }
        }
      }
    } catch (cleanupError) {
      console.error(`Error cleaning up files: ${cleanupError.message}`);
      // Continue with session removal even if cleanup fails
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
