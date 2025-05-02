const express = require('express');
const { verifyGoogleToken, isAuthorizedDomain } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/auth/verify
 * @desc    Verify Google token and check domain authorization
 * @access  Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Verify the token
    const payload = await verifyGoogleToken(token);
    
    // Check if the user's email domain is authorized
    if (!isAuthorizedDomain(payload.email)) {
      logger.warn(`Unauthorized domain access attempt: ${payload.email}`);
      return res.status(403).json({ 
        message: 'Access denied: Your email domain is not authorized',
        email: payload.email,
        domain: payload.email.split('@')[1]
      });
    }
    
    // Return user info
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      domain: payload.email.split('@')[1]
    };
    
    logger.info(`User authenticated: ${user.email} (${user.domain})`);
    res.json(user);
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

/**
 * @route   GET /api/auth/user
 * @desc    Get current user info
 * @access  Private (requires auth middleware)
 */
router.get('/user', (req, res) => {
  // The auth middleware will have already verified the token and added user info to req.user
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  res.json(req.user);
});

module.exports = { router };
