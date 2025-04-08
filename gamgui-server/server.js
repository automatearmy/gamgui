const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const { router: imageRoutes } = require('./routes/imageRoutes');
const { router: sessionRoutes } = require('./routes/sessionRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/images', imageRoutes);
app.use('/api/sessions', sessionRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to GamGUI API' });
});

// Pass Socket.io instance to session routes for WebSocket handling
require('./routes/socketHandler')(io);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 