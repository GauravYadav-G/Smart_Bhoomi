/**
 * Blockchain Network API Routes
 * Exposes sovereign chain data to frontend
 */

const express = require('express');
const router = express.Router();
const { protectDual } = require('../middleware/adminAuth');
const blockchainService = require('../blockchain/BlockchainService');

// All routes require authentication — accepts both citizen JWT and admin JWT
router.use(protectDual);

// ─── PUBLIC (All authenticated users) ───

// Network status
router.get('/network-status', (req, res) => {
  try {
    const status = blockchainService.getNetworkStatus();
    res.json({ success: true, network: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Recent blocks
router.get('/recent-blocks', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const blocks = blockchainService.getRecentBlocks(limit);
    res.json({ success: true, blocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Recent transactions
router.get('/recent-transactions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const transactions = blockchainService.getRecentTransactions(limit);
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single transaction
router.get('/transaction/:hash', (req, res) => {
  try {
    const tx = blockchainService.getTransaction(req.params.hash);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get block by index
router.get('/block/:index', (req, res) => {
  try {
    const block = blockchainService.getBlockByIndex(parseInt(req.params.index));
    if (!block) return res.status(404).json({ success: false, message: 'Block not found' });
    res.json({ success: true, block });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Explorer data (paginated)
router.get('/explorer', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = blockchainService.getExplorerData(page, limit);
    res.json({ success: true, explorer: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Property chain verification
router.get('/verify-property/:propertyId', async (req, res) => {
  try {
    const Property = require('../models/Property');
    const property = await Property.findOne({ propertyId: req.params.propertyId });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    
    const verification = blockchainService.chain.verifyPropertyOnChain(
      req.params.propertyId, 
      property.blockchainHash
    );
    res.json({ success: true, verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── CHAIN AUDIT (all authenticated users) ───

// Chain integrity audit
router.get('/integrity', (req, res) => {
  try {
    const result = blockchainService.verifyChainIntegrity();
    res.json({ success: true, integrity: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Validator list
router.get('/validators', (req, res) => {
  try {
    const validators = blockchainService.getValidators();
    res.json({ success: true, validators });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
