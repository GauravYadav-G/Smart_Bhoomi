/**
 * ═══════════════════════════════════════════════════
 * REAL-TIME EVENT SYSTEM — WebSocket Broadcasting
 * ═══════════════════════════════════════════════════
 * 
 * Provides instant UI updates on:
 * - Block commits
 * - Transaction confirmations
 * - Network status changes
 * - Validator events
 * - Property state transitions
 * ═══════════════════════════════════════════════════
 */

const { Server } = require('socket.io');
const chain = require('../blockchain/SovereignChain');

let io = null;

function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // ─── CONNECTION HANDLER ───
  io.on('connection', (socket) => {
    console.log(`🔌 WebSocket client connected: ${socket.id}`);

    // Send current network status on connect
    socket.emit('network:status', chain.getNetworkStatus());
    
    // Send recent blocks
    socket.emit('blocks:recent', chain.getRecentBlocks(5));

    // Handle client requesting specific data
    socket.on('request:networkStatus', () => {
      socket.emit('network:status', chain.getNetworkStatus());
    });

    socket.on('request:recentBlocks', (limit) => {
      socket.emit('blocks:recent', chain.getRecentBlocks(limit || 10));
    });

    socket.on('request:recentTransactions', (limit) => {
      socket.emit('transactions:recent', chain.getRecentTransactions(limit || 20));
    });

    socket.on('request:chainIntegrity', () => {
      socket.emit('chain:integrity', chain.verifyChainIntegrity());
    });

    socket.on('request:validators', () => {
      socket.emit('validators:list', chain.getValidators());
    });

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
    });
  });

  // ─── BLOCKCHAIN EVENT LISTENERS ───
  
  // Broadcast new block to all clients
  chain.on('block:committed', (data) => {
    io.emit('block:new', data);
    io.emit('network:status', chain.getNetworkStatus());
  });

  // Broadcast transaction submission
  chain.on('transaction:submitted', (data) => {
    io.emit('transaction:new', data);
  });

  // Network lifecycle events
  chain.on('network:started', (data) => {
    io.emit('network:started', data);
  });

  chain.on('network:stopped', (data) => {
    io.emit('network:stopped', data);
  });

  chain.on('validator:added', (data) => {
    io.emit('validator:added', data);
    io.emit('validators:list', chain.getValidators());
  });

  chain.on('validator:removed', (data) => {
    io.emit('validator:removed', data);
    io.emit('validators:list', chain.getValidators());
  });

  // Periodic network status broadcast (every 10s)
  setInterval(() => {
    if (io) {
      io.emit('network:heartbeat', {
        blockHeight: chain.chain.length - 1,
        pendingTx: chain.pendingTransactions.length,
        timestamp: Date.now()
      });
    }
  }, 10000);

  console.log('🔌 WebSocket real-time event system initialized');
  
  return io;
}

// Emit custom application events
function emitEvent(event, data) {
  if (io) {
    io.emit(event, { ...data, timestamp: Date.now() });
  }
}

module.exports = { initializeWebSocket, emitEvent };
