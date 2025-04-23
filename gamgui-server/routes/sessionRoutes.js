const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { images } = require('./imageRoutes');
const k8s = require('../utils/kubernetesClient');
const router = express.Router();

// Check if Kubernetes is enabled
const KUBERNETES_ENABLED = process.env.GKE_CLUSTER_NAME && process.env.GKE_CLUSTER_LOCATION;

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
 * @desc    Create a new session (virtual or Kubernetes pod)
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, imageId, config, credentialsSecret } = req.body;
    
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
    
    // Ensure temp-uploads directory exists
    const tempUploadsDir = path.resolve(__dirname, '../temp-uploads');
    if (!fs.existsSync(tempUploadsDir)) {
      fs.mkdirSync(tempUploadsDir, { recursive: true });
    }
    
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
    
    // Container information
    let containerInfo;
    
    // Check if Kubernetes is enabled
    if (KUBERNETES_ENABLED) {
      try {
        console.log(`Creating Kubernetes pod for session: ${sessionId}`);
        
        // Create a pod for the session
        const pod = await k8s.createSessionPod(sessionId, {
          cpu: config?.resources?.cpu || '500m',
          memory: config?.resources?.memory || '512Mi',
          credentialsSecret: credentialsSecret || 'gam-credentials'
        });
        
        // Store Kubernetes pod information
        containerInfo = {
          id: containerId,
          sessionId,
          podName: pod.metadata.name,
          kubernetes: true,
          stream: null
        };
        
        console.log(`Created Kubernetes pod: ${pod.metadata.name} for session: ${sessionId}`);
      } catch (k8sError) {
        console.error(`Error creating Kubernetes pod for session ${sessionId}:`, k8sError);
        
        // Fall back to virtual session if Kubernetes pod creation fails
        console.log(`Falling back to virtual session for: ${sessionId}`);
        
        containerInfo = {
          id: containerId,
          sessionId,
          stream: null,
          virtual: true
        };
      }
    } else {
      // Create a virtual session
      console.log(`Creating virtual session with image: ${image.imageName}`);
      
      containerInfo = {
        id: containerId,
        sessionId,
        stream: null,
        virtual: true
      };
    }
    
    // Store container information
    containerSessions.set(sessionId, containerInfo);
    
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
 * @desc    Stop and remove a session (virtual or Kubernetes pod)
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
      // Check if this is a Kubernetes pod
      if (containerInfo.kubernetes) {
        try {
          console.log(`Deleting Kubernetes pod for session: ${sessionId}`);
          await k8s.deleteSessionPod(sessionId);
          console.log(`Deleted Kubernetes pod for session: ${sessionId}`);
        } catch (k8sError) {
          console.error(`Error deleting Kubernetes pod for session ${sessionId}:`, k8sError);
          // Continue with session removal even if pod deletion fails
        }
      } else {
        console.log(`Removing virtual session: ${sessionId}`);
      }
      
      // Remove from container sessions map
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
