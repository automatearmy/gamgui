const express = require('express');
const path = require('path');
const fs = require('fs');
const { images } = require('./imageRoutes');
const { SessionService, SessionRepository } = require('../services/session');
const { ContainerFactory } = require('../services/container');
const config = require('../config/config');
const logger = require('../utils/logger');
const router = express.Router();

// Create services
const sessionRepository = new SessionRepository();
const containerService = ContainerFactory.createContainerService(config, logger);
const sessionService = new SessionService(sessionRepository, containerService);

// Default pre-built image to use if no images are available
const DEFAULT_IMAGE = {
  id: "default-gam-image",
  name: "Default GAM Image",
  imageName: config.docker.gamImage
};

/**
 * @route   POST /api/sessions
 * @desc    Create a new session (virtual or Kubernetes pod)
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, imageId, config: sessionConfig, credentialsSecret } = req.body;
    
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
      logger.info('Using default GAM image for session');
      image = DEFAULT_IMAGE;
    }
    
    // Ensure temp-uploads directory exists
    const tempUploadsDir = path.resolve(__dirname, '../temp-uploads');
    if (!fs.existsSync(tempUploadsDir)) {
      fs.mkdirSync(tempUploadsDir, { recursive: true });
    }
    
    // Create the session
    const result = await sessionService.createSession({
      name,
      imageId: imageId || DEFAULT_IMAGE.id,
      imageName: image.imageName,
      config: sessionConfig || {},
      credentialsSecret: credentialsSecret || 'gam-credentials'
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

/**
 * @route   GET /api/sessions
 * @desc    Get all sessions
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const sessions = await sessionService.getSessions();
    res.json(sessions);
  } catch (error) {
    logger.error('Error getting sessions:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sessions/:id
 * @desc    Get session by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const session = await sessionService.getSession(req.params.id);
    res.json({ session });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ message: 'Session not found' });
    }
    logger.error('Error getting session:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sessions/:id/websocket
 * @desc    Get websocket information for a session
 * @access  Public
 */
router.get('/:id/websocket', async (req, res) => {
  try {
    const websocketInfo = await sessionService.getWebsocketInfo(req.params.id);
    res.json(websocketInfo);
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ message: error.message });
    }
    logger.error('Error getting websocket info:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Stop and remove a session (virtual or Kubernetes pod)
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    await sessionService.deleteSession(req.params.id);
    
    // Clean up any uploaded files for this session
    try {
      const tempUploadsDir = path.resolve(__dirname, '../temp-uploads');
      if (fs.existsSync(tempUploadsDir)) {
        // Read all files in the temp-uploads directory
        const files = fs.readdirSync(tempUploadsDir);
        
        logger.info(`Cleaning up ${files.length} uploaded files for session ${req.params.id}`);
        
        // Delete each file
        for (const file of files) {
          const filePath = path.join(tempUploadsDir, file);
          
          // Check if it's a file (not a directory)
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            logger.debug(`Deleted file: ${file}`);
          }
        }
      }
    } catch (cleanupError) {
      logger.error(`Error cleaning up files: ${cleanupError.message}`);
      // Continue with session removal even if cleanup fails
    }
    
    return res.status(200).json({
      message: 'Session stopped and removed successfully'
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ message: 'Session not found' });
    }
    logger.error('Error removing session:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Export router and services for use in other modules
module.exports = { 
  router,
  sessionService,
  sessionRepository
};
