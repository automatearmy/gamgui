const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { sessions } = require('./sessionRoutes');
const Docker = require('dockerode');
const { promisify } = require('util');
const chmodAsync = promisify(fs.chmod);
const router = express.Router();

// Initialize Docker client
const docker = new Docker();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const tempDir = path.join(__dirname, '../temp-uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    // Use original filename
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

/**
 * @route   POST /api/sessions/:id/files
 * @desc    Upload files to a session container
 * @access  Public
 */
router.post('/:id/files', upload.array('files'), async (req, res) => {
  try {
    const sessionId = req.params.id;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    // Find the session
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Get the container
    const container = docker.getContainer(session.containerId);
    
    // Check if container is running
    const containerData = await container.inspect();
    if (!containerData.State.Running) {
      return res.status(400).json({ message: 'Container is not running' });
    }
    
    // Ensure the uploads directory in the container has the right permissions
    await container.exec({
      Cmd: ['mkdir', '-p', '/gam/uploads'],
      AttachStdout: true,
      AttachStderr: true
    }).then(exec => exec.start());
    
    // Set proper permissions on the uploads directory
    await container.exec({
      Cmd: ['chmod', '755', '/gam/uploads'],
      AttachStdout: true,
      AttachStderr: true
    }).then(exec => exec.start());
    
    // Use the mounted volume instead of copying files to the container
    const uploadedFiles = [];
    
    for (const file of files) {
      const filePath = file.path;
      const fileName = file.originalname;
      
      // Set appropriate permissions on the uploaded file
      // This ensures the container can read and write to the file
      await chmodAsync(filePath, 0o644);
      
      // Add to uploaded files list
      // The path is now relative to the mounted volume in the container
      uploadedFiles.push({
        name: fileName,
        size: file.size,
        path: `/gam/uploads/${fileName}`
      });
      
      // Note: We're not removing the file since it needs to be accessible
      // via the mounted volume. Files should be cleaned up by a separate process
      // or when the session ends.
    }
    
    return res.status(200).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = { router };
