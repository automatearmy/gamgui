const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const { router: imageRoutes } = require('./routes/imageRoutes');
// Import sessionRoutes factory function
const { createSessionRouter } = require('./routes/sessionRoutes');
const { router: credentialRoutes } = require('./routes/credentialRoutes');
// Import fileRoutes factory function
const { createFileRouter } = require('./routes/fileRoutes');
const initializeSocketHandler = require('./routes/socketHandler');
const logger = require('./utils/logger'); // Assuming logger is available

// Initialize express app
const app = express();
const server = http.createServer(app);

// Define allowed origins
const allowedOrigins = [
  'https://gamgui-client-vthtec4m3a-uc.a.run.app',
  'https://gamgui-client-2fdozy6y5a-uc.a.run.app',
  'https://gamgui-client-269905622982.us-central1.run.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Still allow for now, but log it
    }
  },
  credentials: true,
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With'
};

// Configure Socket.io with CORS and improved connection settings
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000, // Increase ping timeout to 60 seconds
  pingInterval: 25000, // Send ping every 25 seconds
  connectTimeout: 30000, // Increase connection timeout
  maxHttpBufferSize: 5e6, // Increase buffer size for larger payloads
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

// Routes
// Initialize Socket.IO and dependent services
const services = initializeSocketHandler(io);
const { sessionService } = services; // Extract sessionService

// Create routers that depend on services
const sessionRouter = createSessionRouter(sessionService); // Pass sessionService
const fileRouter = createFileRouter(sessionService); // Pass sessionService

// Routes
app.use('/api/images', imageRoutes);
app.use('/api/sessions', sessionRouter); // Use the created session router
app.use('/api/credentials', credentialRoutes);
app.use('/api/sessions', fileRouter); // Use the created file router, nested under sessions

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to GamGUI API' });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  // Simple timestamp-based version for now
  res.json({ version: '2025-04-28T18:51:00-03:00' }); 
});

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
