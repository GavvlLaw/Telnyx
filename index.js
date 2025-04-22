require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

// Import database
const { sequelize } = require('./src/models/db');

// Import routes
const phoneRoutes = require('./src/routes/phoneRoutes');
const callRoutes = require('./src/routes/callRoutes');
const smsRoutes = require('./src/routes/smsRoutes');
const userRoutes = require('./src/routes/userRoutes');
const voicemailRoutes = require('./src/routes/voicemailRoutes');
const calendarRoutes = require('./src/routes/calendarRoutes');
const smsAutomationRoutes = require('./src/routes/smsAutomationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const webrtcRoutes = require('./src/routes/webrtcRoutes');

// Import webhook controller
const webhookController = require('./src/controllers/webhookController');

// Import middleware
const apiKeyAuth = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('register', async (userId) => {
    if (userId) {
      console.log(`User ${userId} registered with socket ${socket.id}`);
      socket.userId = userId;
      socket.join(`user-${userId}`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to other modules
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Skip API key auth for webhook endpoint
app.use((req, res, next) => {
  if (req.path === '/webhook') {
    return next();
  }
  apiKeyAuth(req, res, next);
});

// Routes
app.use('/api/phones', phoneRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/voicemails', voicemailRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/sms-automation', smsAutomationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webrtc', webrtcRoutes);

// Webhook endpoint for Telnyx events
app.post('/webhook', webhookController.processWebhook);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Connect to database and start server
sequelize.sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => {
    console.log('Connected to PostgreSQL database');
    // Use server.listen instead of app.listen
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
  }); 