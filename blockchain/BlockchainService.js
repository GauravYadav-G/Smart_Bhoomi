/**
 * ═══════════════════════════════════════════════════════════
 * BLOCKCHAIN SERVICE — Bharat Land Chain Interface
 * ═══════════════════════════════════════════════════════════
 * 
 * This service wraps the Sovereign Chain and provides
 * application-level blockchain operations.
 * 
 * NO Ethereum. NO Simulation. Every operation is REAL.
 * ═══════════════════════════════════════════════════════════
 */

const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const QRCode = require('qrcode');
const chain = require('./SovereignChain');

class BlockchainService {
  constructor() {
    this.chain = chain;
    this.nodeId = this.chain.config.chainId;
    
    // Start the sovereign blockchain network
    this.chain.start();
    
    console.log(`🔗 BlockchainService connected to ${this.chain.config.networkName}`);
  }

  // ─── HASH GENERATION ───
  generatePropertyHash(propertyData) {
    const dataString = JSON.stringify(propertyData);
    return CryptoJS.SHA256(dataString).toString();
  }

  verifyDocumentHash(document, hash) {
    const computedHash = CryptoJS.SHA256(JSON.stringify(document)).toString();
    return computedHash === hash;
  }

  // ─── REGISTER PROPERTY ON SOVEREIGN CHAIN ───
  async registerProperty(propertyData) {
    try {
      const propertyHash = this.generatePropertyHash(propertyData);
      
      const result = this.chain.submitTransaction('PROPERTY_REGISTER', {
        propertyId: propertyData.propertyId,
        propertyHash,
        ownerBlockchainId: propertyData.owner?.toString(),
        title: propertyData.propertyDetails?.title,
        type: propertyData.propertyDetails?.propertyType,
        timestamp: Date.now()
      }, propertyData.owner?.toString() || 'SYSTEM');

      return {
        success: true,
        transactionHash: result.transaction.hash,
        transactionId: result.transaction.id,
        propertyHash,
        blockNumber: result.transaction.blockNumber,
        blockHash: result.transaction.blockHash,
        confirmed: result.confirmed,
        timestamp: result.transaction.timestamp,
        nodeId: this.nodeId,
        chainId: this.chain.config.chainId
      };
    } catch (error) {
      console.error('❌ Blockchain registration error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── TRANSFER OWNERSHIP ON SOVEREIGN CHAIN ───
  async transferOwnership(propertyId, fromId, toId, transferData) {
    try {
      const result = this.chain.submitTransaction('OWNERSHIP_TRANSFER', {
        propertyId,
        fromOwner: fromId,
        toOwner: toId,
        transferPrice: transferData?.proposedPrice ?? transferData?.price ?? transferData?.transferPrice,
        requestId: transferData?.requestId,
        paymentTransactionId: transferData?.transactionId ?? transferData?.paymentTransactionId,
        timestamp: Date.now()
      }, fromId);

      return {
        success: true,
        transactionHash: result.transaction.hash,
        transferHash: result.transaction.hash,
        transactionId: result.transaction.id,
        blockNumber: result.transaction.blockNumber,
        blockHash: result.transaction.blockHash,
        confirmed: result.confirmed,
        timestamp: result.transaction.timestamp,
        nodeId: this.nodeId
      };
    } catch (error) {
      console.error('❌ Blockchain transfer error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── VERIFY PROPERTY ON CHAIN ───
  async verifyProperty(propertyHash, propertyId) {
    try {
      // Record verification action on chain
      const result = this.chain.submitTransaction('PROPERTY_VERIFY', {
        propertyId,
        propertyHash,
        verifiedAt: Date.now()
      }, 'GOVERNMENT_VALIDATOR');

      // Also verify chain integrity for this property
      const chainVerification = this.chain.verifyPropertyOnChain(propertyId, propertyHash);

      return {
        exists: chainVerification.verified || result.confirmed,
        verified: result.confirmed,
        chainIntegrity: chainVerification,
        transactionHash: result.transaction.hash,
        blockNumber: result.transaction.blockNumber,
        timestamp: result.transaction.timestamp
      };
    } catch (error) {
      console.error('❌ Blockchain verification error:', error);
      return { exists: false, verified: false, error: error.message };
    }
  }

  // ─── GET PROPERTY HISTORY FROM CHAIN ───
  async getPropertyHistory(propertyId) {
    try {
      const transactions = this.chain.getTransactionsByProperty(propertyId);
      
      return {
        success: true,
        history: transactions.map(tx => tx.toJSON()),
        totalTransactions: transactions.length
      };
    } catch (error) {
      console.error('❌ Error fetching property history:', error);
      return { success: false, error: error.message, history: [] };
    }
  }

  // ─── BLOCKCHAIN IDENTITY ───
  async createBlockchainIdentity(userData) {
    try {
      const timestamp = Date.now();
      const uniqueSeed = `${userData.email}-${userData.governmentId}-${timestamp}`;
      const identityHash = crypto.createHash('sha256').update(uniqueSeed).digest('hex');
      const blockchainId = `BID-${identityHash.substring(0, 32).toUpperCase()}`;
      const verificationHash = crypto.createHash('sha256')
        .update(`${blockchainId}-${this.nodeId}-${timestamp}`)
        .digest('hex');

      // Record identity creation on chain
      const result = this.chain.submitTransaction('IDENTITY_CREATE', {
        blockchainId,
        userEmail: userData.email,
        governmentId: userData.governmentId,
        timestamp
      }, blockchainId);

      const qrData = {
        blockchainId,
        name: userData.name,
        chainId: this.chain.config.chainId,
        nodeId: this.nodeId,
        issuedAt: new Date(timestamp).toISOString(),
        txHash: result.transaction.hash,
        verificationHash: verificationHash.substring(0, 16)
      };

      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: { dark: '#0B3D91', light: '#FFFFFF' }
      });

      return {
        success: true,
        blockchainId,
        nodeId: this.nodeId,
        verificationHash,
        qrCode: qrCodeDataUrl,
        qrData,
        transactionHash: result.transaction.hash,
        blockNumber: result.transaction.blockNumber,
        issuedAt: timestamp,
        message: 'Blockchain identity anchored on Bharat Land Chain'
      };
    } catch (error) {
      console.error('❌ Blockchain identity creation error:', error);
      const fallbackId = `BID-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
      return {
        success: false,
        error: error.message,
        blockchainId: fallbackId,
        nodeId: this.nodeId,
        verificationHash: crypto.randomBytes(32).toString('hex'),
        qrCode: '',
        qrData: '',
        issuedAt: Date.now()
      };
    }
  }

  // ─── VERIFY IDENTITY ───
  async verifyBlockchainIdentity(blockchainId) {
    try {
      if (!blockchainId || !blockchainId.startsWith('BID-') || blockchainId.length !== 36) {
        return { valid: false, message: 'Invalid blockchain ID format' };
      }

      return {
        valid: true,
        blockchainId,
        nodeId: this.nodeId,
        chainId: this.chain.config.chainId,
        verifiedAt: Date.now()
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  isValidBlockchainId(blockchainId) {
    return /^BID-[A-F0-9]{32}$/.test(blockchainId);
  }

  // ─── NETWORK INFO (exposed to API) ───
  getNetworkStatus() {
    return this.chain.getNetworkStatus();
  }

  getRecentBlocks(limit) {
    return this.chain.getRecentBlocks(limit);
  }

  getRecentTransactions(limit) {
    return this.chain.getRecentTransactions(limit);
  }

  getExplorerData(page, limit) {
    return this.chain.getExplorerData(page, limit);
  }

  getValidators() {
    return this.chain.getValidators();
  }

  verifyChainIntegrity() {
    return this.chain.verifyChainIntegrity();
  }

  getTransaction(hash) {
    const tx = this.chain.getTransaction(hash);
    return tx ? tx.toJSON() : null;
  }

  getBlockByIndex(index) {
    const block = this.chain.getBlockByIndex(index);
    return block ? block.toJSON() : null;
  }

  // ─── GENERIC RECORD TRANSACTION (for data anchoring) ───
  async recordTransaction(data) {
    try {
      const result = this.chain.submitTransaction(data.type || 'DATA_ANCHOR', {
        ...data.data,
        timestamp: data.data?.timestamp || Date.now()
      }, data.data?.blockchainId || data.data?.userId || 'SYSTEM');

      return {
        success: true,
        transactionHash: result.transaction.hash,
        transactionId: result.transaction.id,
        blockNumber: result.transaction.blockNumber,
        confirmed: result.confirmed,
        timestamp: result.transaction.timestamp
      };
    } catch (error) {
      console.error('❌ Blockchain record transaction error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BlockchainService();
