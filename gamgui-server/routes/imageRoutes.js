const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const tar = require('tar-fs');
const router = express.Router();

// Initialize Docker client
const docker = new Docker();

// In-memory storage for images (replace with a database in production)
const images = [];

/**
 * @route   POST /api/images
 * @desc    Create a new image
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, data, metadata } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Generate a unique ID for the image
    const imageId = uuidv4();
    const imageName = `gam-${name.toLowerCase().replace(/\s+/g, '-')}-${imageId.substring(0, 8)}`;
    
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
    
    // Build Docker image using dockerode
    const buildContext = path.join(__dirname, '..');
    
    // Create a tarball of the build context
    const tarStream = tar.pack(buildContext);
    
    // Build the Docker image
    const stream = await docker.buildImage(tarStream, {
      t: imageName,
      dockerfile: 'Dockerfile'
    });
    
    // Process the build output
    let buildOutput = '';
    await new Promise((resolve, reject) => {
      docker.modem.followProgress(
        stream,
        (err, res) => err ? reject(err) : resolve(res),
        (detail) => {
          if (detail.stream) {
            buildOutput += detail.stream;
            console.log(detail.stream.trim());
          }
        }
      );
    });
    
    // Create the new image record
    const newImage = {
      id: imageId,
      name,
      imageName,
      data: data || {},
      metadata: metadata || {},
      dockerBuildOutput: buildOutput,
      createdAt: new Date().toISOString()
    };
    
    // Store the image
    images.push(newImage);
    
    return res.status(201).json({
      message: 'Image created successfully',
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