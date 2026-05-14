require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectDatabase = require('./config/database');
const { initializeWebSocket, emitEvent } = require('./services/realtimeService');

const app = express();
const server = http.createServer(app);

// Trust proxy for production (Render, Heroku, etc use proxies)
app.set('trust proxy', 1);

// Connect to database
connectDatabase();

// Initialize WebSocket for real-time blockchain events
const io = initializeWebSocket(server);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "unpkg.com", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "unpkg.com", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "http://", "tile.openstreetmap.org", "*.tile.openstreetmap.org", "raw.githubusercontent.com"],
      fontSrc: ["'self'", "data:", "fonts.googleapis.com", "fonts.gstatic.com"],
      connectSrc: ["'self'", "https:", "http://", "*.tile.openstreetmap.org", "tile.openstreetmap.org"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.openstreetmap.org", "https://maps.openstreetmap.org"],
    },
  },
}));

app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve React frontend
const path = require('path');
const frontendBuildPath = path.join(__dirname, 'client', 'build');
app.use(express.static(frontendBuildPath));

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

// Handle HEAD requests for SPA (health checks, favicon, etc)
app.head('/', (req, res) => {
  res.status(200).end();
});

// SPA fallback route - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).json({ error: 'Could not serve frontend' });
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.path}`
    });
  }
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
