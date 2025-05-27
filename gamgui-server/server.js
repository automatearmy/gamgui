const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost') || origin.includes('run.app')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Still allow for now, but log it
    }
  },
  credentials: true,
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
  exposedHeaders: 'Access-Control-Allow-Origin'
};

// Configure Socket.io with CORS and improved connection settings
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for WebSocket connections
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

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(createCorsMiddleware({
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
  exposedHeaders: 'Access-Control-Allow-Origin',
  credentials: true
}));

// User authentication middleware (IAP or OAuth)
app.use((req, res, next) => {
  // Check for IAP headers first
  const iapJwt = req.headers['x-goog-iap-jwt-assertion'];
  if (iapJwt) {
    // Extract user information from IAP headers
    const email = req.headers['x-goog-authenticated-user-email'];
    if (email) {
      // Remove the prefix "accounts.google.com:" from the email
      req.user = {
        email: email.replace('accounts.google.com:', ''),
        id: email.replace('accounts.google.com:', '').split('@')[0], // Use email prefix as ID for consistency
      };
      logger.info(`IAP authenticated user: ${req.user.email}`);
    }
  }
  next();
});

// Force consistent userId for all authenticated routes
app.use('/api', (req, res, next) => {
  // If user is authenticated via OAuth (authMiddleware), override the ID
  if (req.user && req.user.email) {
    // Always use email prefix as ID for consistency
    const emailPrefix = req.user.email.split('@')[0];
    req.user.id = emailPrefix;
    logger.info(`Normalized userId to: ${req.user.id} for email: ${req.user.email}`);
  }
  next();
});

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
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

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to GamGUI API' });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  // Simple timestamp-based version for now
  res.json({ version: '2025-05-02T18:35:00-03:00' });
});

// Protected routes (require authentication)
app.use('/api/images', authMiddleware, imageRoutes);
app.use('/api/sessions', authMiddleware, sessionRouter);
app.use('/api/credentials', authMiddleware, credentialRoutes);
app.use('/api/sessions', authMiddleware, fileRouter);

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
