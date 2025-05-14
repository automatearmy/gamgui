const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');

// Create a new OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// List of authorized domains
const AUTHORIZED_DOMAINS = (process.env.AUTHORIZED_DOMAINS || 'automatearmy.com')
  .split(',')
  .map(domain => domain.trim());

console.log('Authorized domains:', AUTHORIZED_DOMAINS);

/**
 * Verify Google token
 * @param {string} token - The Google ID token to verify
 * @returns {Promise<Object>} The decoded token payload
 */
async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
}

/**
 * Check if the user's email domain is authorized
 * @param {string} email - The user's email address
 * @returns {boolean} Whether the domain is authorized
 */
function isAuthorizedDomain(email) {
  if (!email) return false;
  
  const domain = email.split('@')[1];
  return AUTHORIZED_DOMAINS.includes(domain);
}

/**
 * Authentication middleware
 * Verifies the token from the Authorization header and checks if the user's domain is authorized
 */
function authMiddleware(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Verify token
  verifyGoogleToken(token)
    .then(payload => {
      // Check if the user's email domain is authorized
      if (!isAuthorizedDomain(payload.email)) {
        logger.warn(`Unauthorized domain access attempt: ${payload.email}`);
        return res.status(403).json({ 
          message: 'Access denied: Your email domain is not authorized',
          email: payload.email,
          domain: payload.email.split('@')[1]
        });
      }
      
      // Add user info to request object
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        domain: payload.email.split('@')[1]
      };
      
      logger.info(`Authenticated user: ${req.user.email} (${req.user.domain})`);
      next();
    })
    .catch(error => {
      logger.error('Authentication error:', error);
      res.status(401).json({ message: 'Authentication failed' });
    });
}

module.exports = {
  authMiddleware,
  verifyGoogleToken,
  isAuthorizedDomain
};
