const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const credentialsPath = path.join(__dirname, '../gam-credentials');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(credentialsPath)) {
      fs.mkdirSync(credentialsPath, { recursive: true });
    }
    
    cb(null, credentialsPath);
  },
  filename: function(req, file, cb) {
    // Map the field name to the correct filename
    let filename;
    if (file.fieldname === 'client_secrets') {
      filename = 'client_secrets.json';
    } else if (file.fieldname === 'oauth2') {
      filename = 'oauth2.txt';
    } else if (file.fieldname === 'oauth2service') {
      filename = 'oauth2service.json';
    } else {
      filename = file.originalname;
    }
    
    cb(null, filename);
  }
});

const upload = multer({ storage });

/**
 * @route   POST /api/credentials
 * @desc    Upload credential files
 * @access  Public
 */
router.post('/', upload.fields([
  { name: 'client_secrets', maxCount: 1 },
  { name: 'oauth2', maxCount: 1 },
  { name: 'oauth2service', maxCount: 1 }
]), (req, res) => {
  try {
    const files = req.files;
    
    if (!files) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    // Check if all required files are now present
    const credentialsPath = path.join(__dirname, '../gam-credentials');
    const requiredFiles = ['oauth2service.json', 'oauth2.txt', 'client_secrets.json'];
    
    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(credentialsPath, file))
    );
    
    return res.status(200).json({ 
      message: 'Credentials uploaded successfully',
      files: Object.keys(files),
      complete: missingFiles.length === 0,
      missingFiles
    });
  } catch (error) {
    console.error('Error uploading credentials:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/credentials/check
 * @desc    Check if all required credential files exist
 * @access  Public
 */
router.get('/check', (req, res) => {
  try {
    const credentialsPath = path.join(__dirname, '../gam-credentials');
    const requiredFiles = ['oauth2service.json', 'oauth2.txt', 'client_secrets.json'];
    
    // Check if directory exists
    if (!fs.existsSync(credentialsPath)) {
      return res.status(200).json({ 
        complete: false,
        missingFiles: requiredFiles
      });
    }
    
    // Check which files exist
    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(credentialsPath, file))
    );
    
    return res.status(200).json({
      complete: missingFiles.length === 0,
      missingFiles
    });
  } catch (error) {
    console.error('Error checking credentials:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/credentials
 * @desc    Delete all credential files
 * @access  Public
 */
router.delete('/', (req, res) => {
  try {
    const credentialsPath = path.join(__dirname, '../gam-credentials');
    const requiredFiles = ['oauth2service.json', 'oauth2.txt', 'client_secrets.json'];
    
    // Check if directory exists
    if (!fs.existsSync(credentialsPath)) {
      return res.status(200).json({ 
        message: 'No credentials to delete'
      });
    }
    
    // Delete each file if it exists
    const deletedFiles = [];
    requiredFiles.forEach(file => {
      const filePath = path.join(credentialsPath, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedFiles.push(file);
      }
    });
    
    return res.status(200).json({
      message: 'Credentials deleted successfully',
      deletedFiles
    });
  } catch (error) {
    console.error('Error deleting credentials:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = { router };
