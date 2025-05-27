const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { createCorsMiddleware } = require('./middleware/cors');

// Load environment variables
dotenv.config();

// Import routes
const { router: imageRoutes } = require('./routes/imageRoutes');
// Import sessionRoutes
const { router: sessionRouter } = require('./routes/sessionRoutes');
const { router: credentialRoutes } = require('./routes/credentialRoutes');
const { router: authRoutes } = require('./routes/authRoutes');
// Import fileRoutes factory function
const { createFileRouter } = require('./routes/fileRoutes');
const initializeSocketHandler = require('./routes/socketHandler');
const logger = require('./utils/logger'); // Assuming logger is available

// Import auth middleware
const { authMiddleware } = require('./middleware/auth');
const UserService = require('./services/UserService');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Dynamic CORS configuration
const getAllowedOrigins = () => {
  // Check for explicit environment variable first
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  
  // Auto-detect based on project number
  const projectNumber = process.env.PROJECT_NUMBER || '1381612022';
  const region = process.env.REGION || 'us-central1';
  
  return [
    `https://gamgui-client-${projectNumber}.${region}.run.app`,
    `https://gamgui-server-${projectNumber}.${region}.run.app`,
    'http://localhost:3000',
    'http://localhost:5173'
  ];
};

// Get allowed origins dynamically
const allowedOrigins = getAllowedOrigins();
console.log('CORS allowed origins:', allowedOrigins);

// Configure CORS - Production-ready with environment-based restrictions
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.includes('localhost') || 
        origin.includes('run.app')) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin:', { origin, environment: process.env.NODE_ENV });
      
      // Environment-based CORS policy
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        // Allow in development/staging for easier testing
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  optionsSuccessStatus: 200 // For legacy browser support
};

// Configure Socket.io with CORS and improved connection settings
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);
      
      // Use same origin validation as HTTP CORS
      if (allowedOrigins.indexOf(origin) !== -1 || 
          origin.includes('localhost') || 
          origin.includes('run.app')) {
        callback(null, true);
      } else {
        logger.warn('WebSocket CORS blocked origin:', { origin, environment: process.env.NODE_ENV });
        
        // Environment-based WebSocket CORS policy
        if (process.env.NODE_ENV === 'production') {
          callback(new Error('WebSocket connection not allowed by CORS'));
        } else {
          // Allow in development/staging
          callback(null, true);
        }
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  pingTimeout: 120000, // Increase ping timeout to 120 seconds
  pingInterval: 25000, // Send ping every 25 seconds
  connectTimeout: 60000, // Increase connection timeout to 60 seconds
  maxHttpBufferSize: 10e6, // Increase buffer size for larger payloads
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  allowUpgrades: true, // Allow transport upgrades
  perMessageDeflate: {
    threshold: 1024 // Compress data if message is larger than 1KB
  }
});

const PORT = process.env.PORT || 3001;

// Security and Middleware - Production-ready configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for WebSocket compatibility
  referrerPolicy: { policy: 'no-referrer' }, // Enhanced privacy
  crossOriginResourcePolicy: { policy: 'same-origin' }, // Prevent resource leaks
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors(corsOptions)); // Single, unified CORS configuration
app.use(express.json());

// User authentication middleware (IAP or OAuth) - Improved validation
app.use((req, res, next) => {
  // Check for IAP headers first
  const iapJwt = req.headers['x-goog-iap-jwt-assertion'];
  if (iapJwt) {
    // Extract user information from IAP headers
    const rawEmail = req.headers['x-goog-authenticated-user-email'];
    if (rawEmail) {
      // Safely remove the prefix "accounts.google.com:" if it exists
      const email = rawEmail.startsWith('accounts.google.com:') 
        ? rawEmail.replace('accounts.google.com:', '')
        : rawEmail;
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        req.user = {
          email: email,
          id: email.split('@')[0], // Use email prefix as ID for consistency
          rawEmail: rawEmail, // Keep original for debugging
        };
        logger.info(`IAP authenticated user: ${req.user.email}`);
      } else {
        logger.warn(`Invalid email format from IAP: ${rawEmail}`);
      }
    }
  }
  next();
});

// Unified User ID middleware using UserService
app.use('/api', (req, res, next) => {
  if (req.user && req.user.email) {
    try {
      // Generate deterministic user ID using UserService
      const newUserId = UserService.generateUserId(req.user.email);
      const legacyUserId = req.user.email.split('@')[0];
      
      // Update user object with new format
      req.user.id = newUserId;
      req.user.legacyId = legacyUserId; // Keep for backward compatibility
      req.user.userInfo = UserService.getUserInfo(req);
      
      logger.info(`User authenticated with unified ID`, {
        email: req.user.email,
        userId: newUserId,
        legacyId: legacyUserId,
        domain: UserService.extractDomain(req.user.email)
      });
    } catch (error) {
      logger.error('Error generating user ID:', error);
      // Fallback to legacy format
      req.user.id = req.user.email.split('@')[0];
    }
  }
  next();
});


// Routes
// Initialize Socket.IO and dependent services
const services = initializeSocketHandler(io);
const { sessionService } = services; // Extract sessionService

// Create routers that depend on services
const fileRouter = createFileRouter(sessionService); // Pass sessionService

// Public routes
app.use('/api/auth', authRoutes); // Auth routes don't need authentication

// Health check endpoint for Kubernetes/Load Balancer - Enhanced with real checks
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  let overallStatus = 'healthy';
  let httpStatus = 200;
  
  const services = {
    socketio: {
      status: io ? 'connected' : 'disconnected',
      details: io ? `${io.engine.clientsCount} clients connected` : 'Socket.IO not initialized'
    },
    userService: {
      status: 'available',
      details: 'UserService v2.0 operational'
    },
    memory: {
      status: 'ok',
      details: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + 'MB'
      }
    },
    cors: {
      status: 'configured',
      details: `${allowedOrigins.length} origins allowed, environment: ${process.env.NODE_ENV || 'development'}`
    }
  };
  
  // Check memory usage (warn if over 512MB, critical if over 1GB)
  const memoryUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;
  if (memoryUsageMB > 1024) {
    services.memory.status = 'critical';
    overallStatus = 'unhealthy';
    httpStatus = 503;
  } else if (memoryUsageMB > 512) {
    services.memory.status = 'warning';
    overallStatus = 'degraded';
  }
  
  // Check if Socket.IO is working
  if (!io) {
    services.socketio.status = 'failed';
    overallStatus = 'degraded';
  }
  
  // Check UserService functionality
  try {
    const testUserId = UserService.generateUserId('test@example.com');
    if (!testUserId.startsWith('usr_')) {
      services.userService.status = 'failed';
      services.userService.details = 'UserService not generating correct IDs';
      overallStatus = 'degraded';
    }
  } catch (error) {
    services.userService.status = 'failed';
    services.userService.details = `UserService error: ${error.message}`;
    overallStatus = 'unhealthy';
    httpStatus = 503;
  }
  
  const responseTime = Date.now() - startTime;
  
  const healthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    responseTime: `${responseTime}ms`,
    environment: process.env.NODE_ENV || 'development',
    version: '2025-05-27T16:38:00-03:00',
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    services
  };
  
  // Log health check if not healthy
  if (overallStatus !== 'healthy') {
    logger.warn('Health check failed', { status: overallStatus, services });
  }
  
  res.status(httpStatus).json(healthCheck);
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to GamGUI API',
    version: '2025-05-27T16:35:00-03:00',
    endpoints: {
      health: '/health',
      version: '/api/version',
      auth: '/api/auth',
      sessions: '/api/sessions',
      credentials: '/api/credentials',
      images: '/api/images'
    }
  });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  res.json({ 
    version: '2025-05-27T16:35:00-03:00',
    userService: 'v2.0',
    features: ['unified-userid', 'deterministic-hashing', 'legacy-fallback']
  });
});

// Protected routes (require authentication)
app.use('/api/images', authMiddleware, imageRoutes);
app.use('/api/credentials', authMiddleware, credentialRoutes);

// Session routes - Combined to avoid conflicts
app.use('/api/sessions', authMiddleware, sessionRouter);
app.use('/api/sessions', authMiddleware, fileRouter); // File operations on sessions

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
