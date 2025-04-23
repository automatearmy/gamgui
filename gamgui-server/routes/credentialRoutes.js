const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { saveToSecretManager, getFromSecretManager, listSecrets } = require('../utils/secretManager');

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
 * @desc    Upload credential files and save to Secret Manager
 * @access  Public
 */
router.post('/', upload.fields([
  { name: 'client_secrets', maxCount: 1 },
  { name: 'oauth2', maxCount: 1 },
  { name: 'oauth2service', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    // Save to Secret Manager
    const secretManagerPromises = [];
    const secretManagerUploaded = [];
    
    if (files.client_secrets) {
      const content = fs.readFileSync(files.client_secrets[0].path, 'utf8');
      secretManagerPromises.push(saveToSecretManager('client-secrets', content));
      secretManagerUploaded.push('client-secrets');
    }
    
    if (files.oauth2) {
      const content = fs.readFileSync(files.oauth2[0].path, 'utf8');
      secretManagerPromises.push(saveToSecretManager('oauth2', content));
      secretManagerUploaded.push('oauth2');
    }
    
    if (files.oauth2service) {
      const content = fs.readFileSync(files.oauth2service[0].path, 'utf8');
      secretManagerPromises.push(saveToSecretManager('oauth2service', content));
      secretManagerUploaded.push('oauth2service');
    }
    
    // Wait for all Secret Manager operations to complete
    await Promise.all(secretManagerPromises);
    
    // Check if all required files are now present locally
    const credentialsPath = path.join(__dirname, '../gam-credentials');
    const requiredFiles = ['oauth2service.json', 'oauth2.txt', 'client_secrets.json'];
    
    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(credentialsPath, file))
    );
    
    return res.status(200).json({ 
      message: 'Credentials uploaded successfully',
      files: Object.keys(files),
      complete: missingFiles.length === 0,
      missingFiles,
      secretManagerUploaded: secretManagerUploaded.length > 0,
      secretManagerFiles: secretManagerUploaded
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
 * @desc    Check if all required credential files exist (locally and in Secret Manager)
 * @access  Public
 */
router.get('/check', async (req, res) => {
  try {
    const credentialsPath = path.join(__dirname, '../gam-credentials');
    const requiredFiles = ['oauth2service.json', 'oauth2.txt', 'client_secrets.json'];
    const secretIds = ['oauth2service', 'oauth2', 'client-secrets'];
    
    // Check local files
    const localMissingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(credentialsPath, file))
    );
    
    // Check Secret Manager
    const secretManagerStatus = {
      available: false,
      missingSecrets: []
    };
    
    try {
      const checkPromises = secretIds.map(async (secretId) => {
        try {
          await getFromSecretManager(secretId);
          return { secretId, exists: true };
        } catch (error) {
          return { secretId, exists: false };
        }
      });
      
      const results = await Promise.all(checkPromises);
      const missingSecrets = results
        .filter(result => !result.exists)
        .map(result => result.secretId);
      
      secretManagerStatus.available = missingSecrets.length === 0;
      secretManagerStatus.missingSecrets = missingSecrets;
    } catch (error) {
      console.error('Error checking Secret Manager:', error);
      secretManagerStatus.error = error.message;
    }
    
    return res.status(200).json({
      localFiles: {
        complete: localMissingFiles.length === 0,
        missingFiles: localMissingFiles
      },
      secretManager: secretManagerStatus
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

/**
 * @route   GET /api/credentials/secrets
 * @desc    Get a list of all credential secrets from Secret Manager
 * @access  Public
 */
router.get('/secrets', async (req, res) => {
  try {
    const secrets = await listSecrets();
    
    return res.status(200).json({
      secrets
    });
  } catch (error) {
    console.error('Error listing credential secrets:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = { router };
