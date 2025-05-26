/**
 * CORS middleware
 * Provides CORS headers for all routes
 */

/**
 * Create CORS middleware
 * @param {object} options - CORS options
 * @returns {function} - Express middleware function
 */
function createCorsMiddleware(options = {}) {
  return (req, res, next) => {
    // Get origin from request
    const origin = req.headers.origin;
    
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', options.methods || 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', options.allowedHeaders || 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', options.credentials || 'true');
    
    // Add Cross-Origin-Opener-Policy for OAuth popups
    res.header('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    // Add exposed headers if provided
    if (options.exposedHeaders) {
      res.header('Access-Control-Expose-Headers', options.exposedHeaders);
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  };
}

module.exports = { createCorsMiddleware };
