const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { sessions } = require('./sessionRoutes');
const Docker = require('dockerode');
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
    
    // Create the upload directory in the container if it doesn't exist
    await container.exec({
      Cmd: ['mkdir', '-p', '/uploaded-files'],
      AttachStdout: true,
      AttachStderr: true
    }).then(exec => exec.start());
    
    // Copy each file to the container
    const uploadedFiles = [];
    
    for (const file of files) {
      const filePath = file.path;
      const fileName = file.originalname;
      
      // Read the file content
      const fileContent = fs.readFileSync(filePath);
      
      // Create a tar archive containing the file
      const tarStream = require('tar-stream').pack();
      tarStream.entry({ name: fileName }, fileContent);
      tarStream.finalize();
      
      // Upload the file to the container
      await container.putArchive(tarStream, { path: '/uploaded-files' });
      
      // Add to uploaded files list
      uploadedFiles.push({
        name: fileName,
        size: file.size,
        path: `/uploaded-files/${fileName}`
      });
      
      // Remove the temporary file
      fs.unlinkSync(filePath);
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
