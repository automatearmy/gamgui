const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// In-memory storage for images (replace with a database in production)
const images = [];

// Default pre-built image in Google Container Registry
const DEFAULT_IMAGE_NAME = "gcr.io/gamgui-registry/docker-gam7:latest";

/**
 * @route   POST /api/images
 * @desc    Create a reference to the pre-built image
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, data, metadata } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Check if credentials exist
    const credentialsPath = path.join(__dirname, '../gam-credentials');
    const requiredFiles = ['oauth2service.json', 'oauth2.txt', 'client_secrets.json'];
    
    // Verify all required credential files exist
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(credentialsPath, file)));
    
    if (missingFiles.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required credential files', 
        missingFiles 
      });
    }
    
    // Generate a unique ID for the image reference
    const imageId = uuidv4();
    
    // Create the new image record using the pre-built image
    const newImage = {
      id: imageId,
      name,
      imageName: DEFAULT_IMAGE_NAME,
      data: data || {},
      metadata: metadata || {},
      createdAt: new Date().toISOString()
    };
    
    // Store the image reference
    images.push(newImage);
    
    return res.status(201).json({
      message: 'Image reference created successfully',
      image: newImage
    });
  } catch (error) {
    console.error('Error creating image:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/images
 * @desc    Get all images
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json(images);
});

/**
 * @route   GET /api/images/:id
 * @desc    Get image by ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
  const image = images.find(img => img.id === req.params.id);
  
  if (!image) {
    return res.status(404).json({ message: 'Image not found' });
  }
  
  res.json(image);
});

// Export images array for use in other modules
module.exports = { router, images };
