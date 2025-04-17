const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { sessions, containerSessions } = require('./sessionRoutes');
const { promisify } = require('util');
const chmodAsync = promisify(fs.chmod);
const router = express.Router();

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
 * @desc    Upload files to a virtual session
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
    
    // Get container info from map
    const containerInfo = containerSessions.get(sessionId);
    if (!containerInfo) {
      return res.status(404).json({ message: 'Virtual session not found' });
    }
    
    // Ensure the uploads directory exists
    const tempDir = path.join(__dirname, '../temp-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Set proper permissions on the uploads directory
    await chmodAsync(tempDir, 0o755);
    
    // Process the uploaded files
    const uploadedFiles = [];
    
    for (const file of files) {
      const filePath = file.path;
      const fileName = file.originalname;
      
      // Set appropriate permissions on the uploaded file
      await chmodAsync(filePath, 0o644);
      
      // Add to uploaded files list
      uploadedFiles.push({
        name: fileName,
        size: file.size,
        path: `/gam/uploads/${fileName}`
      });
      
      // Update the virtual file system if it exists
      if (containerInfo.fs && containerInfo.fs.files['/gam/uploads']) {
        if (!containerInfo.fs.files['/gam/uploads'].includes(fileName)) {
          containerInfo.fs.files['/gam/uploads'].push(fileName);
        }
      }
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
