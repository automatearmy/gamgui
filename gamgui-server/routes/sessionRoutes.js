const express = require('express');
const path = require('path');
const fs = require('fs');
const { images } = require('./imageRoutes');
const { SessionService, SessionRepository } = require('../services/session');
const { ContainerFactory } = require('../services/container');
const config = require('../config/config');
const logger = require('../utils/logger');
const { getFromSecretManager } = require('../utils/secretManager');
const { createUserCredentialsSecret } = require('../utils/kubernetesClient');
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
    // Use userId from IAP if available, otherwise from request body
    const userId = req.user ? req.user.id : req.body.userId;
    
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
    
    // Determine the credentials secret name based on userId
    let finalCredentialsSecret = credentialsSecret || 'gam-credentials';
    if (userId) {
      try {
        // If userId is provided, fetch user-specific credentials from Secret Manager
        logger.info(`Fetching credentials for user ${userId} from Secret Manager`);
        
        // Get credentials from Secret Manager
        const oauth2 = await getFromSecretManager('oauth2', userId);
        const oauth2service = await getFromSecretManager('oauth2service', userId);
        const clientSecrets = await getFromSecretManager('client-secrets', userId);
        
        // Create Kubernetes secret with user credentials
        finalCredentialsSecret = `user-${userId}-credentials`;
        logger.info(`Creating Kubernetes secret ${finalCredentialsSecret}`);
        
        await createUserCredentialsSecret(userId, {
          oauth2: oauth2.toString(),
          oauth2service: oauth2service.toString(),
          clientSecrets: clientSecrets.toString()
        });
        
        logger.info(`Using user-specific credentials: ${finalCredentialsSecret}`);
      } catch (credError) {
        logger.error(`Error setting up user credentials: ${credError.message}`);
        
        // Instead of falling back to default credentials, require the user to upload their own
        return res.status(400).json({
          message: 'You must upload your GAM credentials before creating a session',
          details: 'Please go to the Settings page and upload your oauth2.txt, oauth2service.json, and client_secrets.json files',
          error: credError.message
        });
      }
    }
    
    try {
      // Create the session
      const result = await sessionService.createSession({
        name,
        imageId: imageId || DEFAULT_IMAGE.id,
        imageName: image.imageName,
        config: sessionConfig || {},
        credentialsSecret: finalCredentialsSecret,
        userId,
        email: req.user ? req.user.email : null // Include user's email if available
      });
      
      return res.status(201).json({
        message: 'Session created successfully',
        session: result.session,
        websocketInfo: result.websocketInfo
      });
    } catch (sessionError) {
      logger.error('Error creating session:', sessionError);
      
      // Check if it's a connection error
      if (sessionError.message && sessionError.message.includes('ECONNREFUSED')) {
        return res.status(500).json({
          message: 'Unable to connect to the Kubernetes cluster',
          details: 'The server cannot establish a connection to the Kubernetes API. Please contact the administrator.',
          error: sessionError.message
        });
      }
      
      // Return a generic error for other issues
      return res.status(500).json({
        message: 'Failed to create session',
        details: 'An error occurred while creating the session. Please try again later or contact the administrator.',
        error: sessionError.message
      });
    }
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
 * @desc    Get all sessions, optionally filtered by userId
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Use userId from IAP if available, otherwise from query params
    const userId = req.user ? req.user.id : req.query.userId;
    const sessions = await sessionService.getSessions();
    
    // Filter sessions by userId if provided
    const filteredSessions = userId 
      ? sessions.filter(session => session.userId === userId)
      : sessions;
    
    res.json({ sessions: filteredSessions });
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
 * @desc    Get session by ID, optionally checking userId ownership
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    // Use userId from IAP if available, otherwise from query params
    const userId = req.user ? req.user.id : req.query.userId;
    const session = await sessionService.getSession(req.params.id);
    
    // If userId is provided, check if the user owns this session
    if (userId && session.userId && session.userId !== userId) {
      logger.warn(`User ${userId} attempted to access session ${req.params.id} owned by ${session.userId}`);
      return res.status(403).json({ 
        message: 'Access denied: You do not have permission to access this session' 
      });
    }
    
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
 * @desc    Get websocket information for a session, optionally checking userId ownership
 * @access  Public
 */
router.get('/:id/websocket', async (req, res) => {
  try {
    // Use userId from IAP if available, otherwise from query params
    const userId = req.user ? req.user.id : req.query.userId;
    
    // If userId is provided, check if the user owns this session
    if (userId) {
      const session = await sessionService.getSession(req.params.id);
      
      if (session.userId && session.userId !== userId) {
        logger.warn(`User ${userId} attempted to access websocket info for session ${req.params.id} owned by ${session.userId}`);
        return res.status(403).json({ 
          message: 'Access denied: You do not have permission to access this session' 
        });
      }
    }
    
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
 * @desc    Stop and remove a session (virtual or Kubernetes pod), optionally checking userId ownership
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    // Use userId from IAP if available, otherwise from query params
    const userId = req.user ? req.user.id : req.query.userId;
    const session = await sessionService.getSession(req.params.id);
    
    // If userId is provided, check if the user owns this session
    if (userId && session.userId && session.userId !== userId) {
      logger.warn(`User ${userId} attempted to delete session ${req.params.id} owned by ${session.userId}`);
      return res.status(403).json({ 
        message: 'Access denied: You do not have permission to delete this session' 
      });
    }
    
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
