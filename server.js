require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectDatabase = require('./config/database');
const { initializeWebSocket, emitEvent } = require('./services/realtimeService');

const app = express();
const server = http.createServer(app);

// Connect to database
connectDatabase();

// Initialize WebSocket for real-time blockchain events
const io = initializeWebSocket(server);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: function(origin, callback) {
    // Allow localhost dev ports + configured CLIENT_URL
    const allowed = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // allow all in development
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes — Public User App
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/property'));
app.use('/api/transfers', require('./routes/transfer'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/intelligence', require('./routes/intelligence'));
app.use('/api/blockchain', require('./routes/blockchain'));
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/documents', require('./routes/documents'));

// Routes — Government Admin Command Center (separate JWT guardrails)
app.use('/api/admin', require('./routes/admin'));

// Health check with blockchain status
const blockchainService = require('./blockchain/BlockchainService');
app.get('/api/health', (req, res) => {
  const networkStatus = blockchainService.getNetworkStatus();
  res.status(200).json({
    success: true,
    message: 'Smart Bhoomi National Land Infrastructure API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      blockchain: {
        network: networkStatus.networkName,
        chainId: networkStatus.chainId,
        consensus: networkStatus.consensus,
        blockHeight: networkStatus.currentBlockHeight,
        validators: networkStatus.validators.active,
        status: networkStatus.isRunning ? 'operational' : 'stopped'
      },
      websocket: 'active'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  console.error('\n❌ ERROR OCCURRED:');
  console.error('Message:', err.message);
  console.error('Status:', err.status || 500);
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }
  console.error('');

  // Send error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      details: err
    } : undefined
  });
});

// 404 handler (must be last)
app.use((req, res) => {
  console.log(`⚠️  404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/properties',
      'POST /api/properties',
      'GET /api/transfers'
    ]
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log('\n⛓️  ═══════════════════════════════════════');
  console.log(`   Smart Bhoomi National Land Infrastructure`);
  console.log('   ═══════════════════════════════════════');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/health`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   Blockchain: Bharat Land Chain (Sovereign)`);
  console.log('   ═══════════════════════════════════════\n');
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10s
  setTimeout(() => {
    console.error('⚠️ Forcing shutdown');
    process.exit(1);
  }, 10000);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED PROMISE REJECTION:', err.message);
  console.error('Stack:', err.stack);
  gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err.message);
  console.error('Stack:', err.stack);
  gracefulShutdown();
});

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
