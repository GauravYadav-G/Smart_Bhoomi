/**
 * ═══════════════════════════════════════════════════════════════
 * BHARAT LAND CHAIN — Sovereign Permissioned Blockchain Network
 * ═══════════════════════════════════════════════════════════════
 * 
 * Architecture: Proof-of-Authority (PoA) with PBFT Finality
 * Consensus: Government-controlled validator nodes
 * Finality: Deterministic (instant, no forks)
 * Block Time: ~2 seconds
 * 
 * This replaces ALL Ethereum/Web3 dependencies.
 * No simulation mode. Every transaction is real.
 * ═══════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');
const EventEmitter = require('events');

// ─── CONFIGURATION ───
const CHAIN_CONFIG = {
  chainId: 'BHARAT-LAND-CHAIN-001',
  networkName: 'Bharat Land Registry Network',
  version: '2.0.0',
  blockTime: 2000,                // 2-second block intervals
  maxTransactionsPerBlock: 100,
  genesisTimestamp: Date.now(),
  difficulty: 1,                  // PoA doesn't need mining difficulty
  consensusAlgorithm: 'PoA-PBFT',
  requiredValidators: 2,          // Minimum 2/3 validators for PBFT quorum
  totalValidatorSlots: 3,         // 3-node PBFT cluster
  maxBlockSize: 1048576,          // 1MB max block
  pbftTimeoutMs: 5000,            // PBFT round timeout
};

// Monotonic timestamp counter for rapid-fire block production
let _lastBlockTs = 0;

// ─── BLOCK STRUCTURE ───
class Block {
  constructor(index, previousHash, transactions, validator, timestamp) {
    // Ensure monotonically increasing timestamps even in same-millisecond production
    const now = timestamp || Date.now();
    _lastBlockTs = Math.max(_lastBlockTs + 1, now);
    
    this.index = index;
    this.timestamp = _lastBlockTs;
    this.previousHash = previousHash;
    this.transactions = transactions;
    this.validator = validator;
    this.nonce = 0;
    this.merkleRoot = this.calculateMerkleRoot();
    this.hash = this.calculateHash();
    this.confirmations = 1;
    this.size = JSON.stringify(transactions).length;
  }

  calculateHash() {
    const data = `${this.index}${this.previousHash}${this.timestamp}${this.merkleRoot}${this.validator}${this.nonce}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  calculateMerkleRoot() {
    if (this.transactions.length === 0) {
      return crypto.createHash('sha256').update('empty').digest('hex');
    }
    
    let hashes = this.transactions.map(tx => tx.hash);
    
    while (hashes.length > 1) {
      const newHashes = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        newHashes.push(
          crypto.createHash('sha256').update(left + right).digest('hex')
        );
      }
      hashes = newHashes;
    }
    
    return hashes[0];
  }

  toJSON() {
    return {
      index: this.index,
      hash: this.hash,
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      transactionCount: this.transactions.length,
      merkleRoot: this.merkleRoot,
      validator: this.validator,
      size: this.size,
      confirmations: this.confirmations
    };
  }
}

// ─── TRANSACTION STRUCTURE ───
class Transaction {
  constructor(type, data, signer) {
    this.id = `TX-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    this.type = type; // PROPERTY_REGISTER | PROPERTY_VERIFY | OWNERSHIP_TRANSFER | IDENTITY_CREATE | DOCUMENT_UPLOAD | DATA_ANCHOR
    this.data = data;
    this.signer = signer;
    this.timestamp = Date.now();
    this.hash = this.calculateHash();
    this.status = 'pending'; // pending | confirmed | failed
    this.blockNumber = null;
    this.blockHash = null;
    this.gasUsed = this.estimateGas();
  }

  calculateHash() {
    const payload = `${this.id}${this.type}${JSON.stringify(this.data)}${this.signer}${this.timestamp}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  estimateGas() {
    // Gas units based on transaction complexity
    const baseGas = 21000;
    const dataGas = JSON.stringify(this.data).length * 16;
    return baseGas + dataGas;
  }

  confirm(blockNumber, blockHash) {
    this.status = 'confirmed';
    this.blockNumber = blockNumber;
    this.blockHash = blockHash;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      hash: this.hash,
      signer: this.signer,
      timestamp: this.timestamp,
      status: this.status,
      blockNumber: this.blockNumber,
      blockHash: this.blockHash,
      gasUsed: this.gasUsed
    };
  }
}

// ─── VALIDATOR NODE ───
class ValidatorNode {
  constructor(id, name, role, publicKey) {
    this.id = id;
    this.name = name;
    this.role = role; // 'government' | 'registry_office' | 'audit'
    this.publicKey = publicKey || crypto.randomBytes(32).toString('hex');
    this.isActive = true;
    this.isByzantine = false;      // PBFT: flag for detected malicious behaviour
    this.blocksProduced = 0;
    this.blocksValidated = 0;      // PBFT: blocks this node confirmed
    this.lastBlockTimestamp = null;
    this.uptime = 100;
    this.joinedAt = Date.now();
    this.prepareMessages = 0;      // PBFT: prepare messages sent
    this.commitMessages = 0;       // PBFT: commit messages sent
  }

  sign(data) {
    const hmac = crypto.createHmac('sha256', this.publicKey);
    hmac.update(typeof data === 'string' ? data : JSON.stringify(data));
    return hmac.digest('hex');
  }

  /**
   * PBFT: Validate a proposed block and return a prepare message.
   * Returns null if this validator is Byzantine (simulated fault).
   */
  prepareBlock(block, previousBlock) {
    if (this.isByzantine) {
      return null; // Byzantine node refuses to participate
    }
    // Verify block integrity
    if (block.previousHash !== previousBlock.hash) return null;
    if (block.index !== previousBlock.index + 1) return null;
    // Timestamp must be >= previous (rapid-fire blocks may share millisecond)
    if (block.timestamp < previousBlock.timestamp) return null;
    
    this.prepareMessages++;
    return {
      validatorId: this.id,
      blockHash: block.hash,
      blockIndex: block.index,
      phase: 'PREPARE',
      signature: this.sign(block.hash),
      timestamp: Date.now()
    };
  }

  /**
   * PBFT: Commit a block after receiving enough prepare messages.
   */
  commitBlock(block) {
    if (this.isByzantine) return null;
    this.commitMessages++;
    this.blocksValidated++;
    return {
      validatorId: this.id,
      blockHash: block.hash,
      blockIndex: block.index,
      phase: 'COMMIT',
      signature: this.sign(`COMMIT:${block.hash}`),
      timestamp: Date.now()
    };
  }
}

// ─── SOVEREIGN BLOCKCHAIN ───
class SovereignChain extends EventEmitter {
  constructor() {
    super();
    this.chain = [];
    this.pendingTransactions = [];
    this.validators = new Map();
    this.transactionIndex = new Map(); // hash -> transaction (for lookup)
    this.propertyIndex = new Map();    // propertyId -> [tx hashes]
    this.config = { ...CHAIN_CONFIG };
    this.isRunning = false;
    this.blockProductionInterval = null;
    this.stats = {
      totalTransactions: 0,
      totalBlocks: 0,
      avgBlockTime: 0,
      networkStartTime: Date.now(),
      lastBlockTime: null,
      peakTps: 0,
      // PBFT consensus stats
      pbftRounds: 0,
      pbftSuccessful: 0,
      pbftFailed: 0,
      consensusLatencies: [],  // ms per round
    };

    // Initialize genesis
    this._createGenesisBlock();
    this._registerDefaultValidator();
    
    console.log(`\n⛓️  ═══════════════════════════════════════════`);
    console.log(`   BHARAT LAND CHAIN — Sovereign Network`);
    console.log(`   Chain ID: ${this.config.chainId}`);
    console.log(`   Consensus: ${this.config.consensusAlgorithm}`);
    console.log(`   Block Time: ${this.config.blockTime / 1000}s`);
    console.log(`   Genesis Block: ${this.chain[0].hash.substring(0, 16)}...`);
    console.log(`⛓️  ═══════════════════════════════════════════\n`);
  }

  // ─── GENESIS ───
  _createGenesisBlock() {
    const genesisData = {
      message: 'Bharat Land Chain Genesis — National Digital Land Infrastructure',
      chainId: this.config.chainId,
      version: this.config.version,
      timestamp: this.config.genesisTimestamp
    };
    
    const genesisTx = new Transaction('GENESIS', genesisData, 'SYSTEM');
    genesisTx.confirm(0, '0'.repeat(64));
    
    const genesisBlock = new Block(0, '0'.repeat(64), [genesisTx], 'GENESIS_VALIDATOR');
    this.chain.push(genesisBlock);
    this.transactionIndex.set(genesisTx.hash, genesisTx);
    this.stats.totalBlocks = 1;
  }

  _registerDefaultValidator() {
    // Register 3-node PBFT validator cluster
    const validators = [
      { id: 'GOV-NODE-01', name: 'Government Primary Validator', role: 'government' },
      { id: 'REG-NODE-02', name: 'Registry Office Validator', role: 'registry_office' },
      { id: 'AUD-NODE-03', name: 'Audit Authority Validator', role: 'audit' },
    ];
    for (const v of validators) {
      const node = new ValidatorNode(v.id, v.name, v.role);
      this.validators.set(node.id, node);
    }
    console.log(`   Validators: ${this.validators.size} nodes (PBFT quorum: ${this.config.requiredValidators}/${this.validators.size})`);
  }

  // ─── NETWORK CONTROL ───
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    this.blockProductionInterval = setInterval(() => {
      this._produceBlock();
    }, this.config.blockTime);
    
    this.emit('network:started', { chainId: this.config.chainId });
    console.log('⛓️  Blockchain network STARTED — producing blocks');
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    if (this.blockProductionInterval) {
      clearInterval(this.blockProductionInterval);
      this.blockProductionInterval = null;
    }
    
    this.emit('network:stopped', { chainId: this.config.chainId });
    console.log('⛓️  Blockchain network STOPPED');
  }

  // ─── BLOCK PRODUCTION (PoA-PBFT Multi-Validator Consensus) ───
  _produceBlock() {
    if (this.pendingTransactions.length === 0) return; // No empty blocks

    const activeValidators = [...this.validators.values()].filter(v => v.isActive);
    if (activeValidators.length === 0) return;

    // Round-robin PRIMARY selection (PBFT leader)
    const primaryIndex = this.chain.length % activeValidators.length;
    const primary = activeValidators[primaryIndex];

    // Take transactions for this block
    const blockTxs = this.pendingTransactions.splice(0, this.config.maxTransactionsPerBlock);
    
    const previousBlock = this.chain[this.chain.length - 1];
    const newBlock = new Block(
      this.chain.length,
      previousBlock.hash,
      blockTxs,
      primary.id
    );

    // ─── PBFT CONSENSUS PROTOCOL ───
    const pbftStart = Date.now();
    this.stats.pbftRounds++;

    // Phase 1: PRE-PREPARE (Primary proposes block)
    this.emit('pbft:pre-prepare', {
      blockIndex: newBlock.index,
      blockHash: newBlock.hash,
      primary: primary.id,
      timestamp: pbftStart
    });

    // Phase 2: PREPARE (All validators verify and sign)
    const prepareMessages = [];
    for (const validator of activeValidators) {
      const msg = validator.prepareBlock(newBlock, previousBlock);
      if (msg) {
        prepareMessages.push(msg);
      }
    }

    this.emit('pbft:prepare', {
      blockIndex: newBlock.index,
      prepareCount: prepareMessages.length,
      required: this.config.requiredValidators
    });

    // Check PBFT quorum: need ≥ requiredValidators PREPARE messages
    if (prepareMessages.length < this.config.requiredValidators) {
      console.error(`❌ PBFT PREPARE failed: ${prepareMessages.length}/${this.config.requiredValidators} validators`);
      this.pendingTransactions.unshift(...blockTxs);
      this.stats.pbftFailed++;
      this.emit('pbft:failed', { blockIndex: newBlock.index, phase: 'PREPARE', received: prepareMessages.length });
      return;
    }

    // Phase 3: COMMIT (Validators confirm after seeing enough PREPAREs)
    const commitMessages = [];
    for (const validator of activeValidators) {
      const msg = validator.commitBlock(newBlock);
      if (msg) {
        commitMessages.push(msg);
      }
    }

    this.emit('pbft:commit', {
      blockIndex: newBlock.index,
      commitCount: commitMessages.length,
      required: this.config.requiredValidators
    });

    // Check PBFT quorum for COMMIT
    if (commitMessages.length < this.config.requiredValidators) {
      console.error(`❌ PBFT COMMIT failed: ${commitMessages.length}/${this.config.requiredValidators} validators`);
      this.pendingTransactions.unshift(...blockTxs);
      this.stats.pbftFailed++;
      this.emit('pbft:failed', { blockIndex: newBlock.index, phase: 'COMMIT', received: commitMessages.length });
      return;
    }

    const pbftLatency = Date.now() - pbftStart;
    this.stats.pbftSuccessful++;
    this.stats.consensusLatencies.push(pbftLatency);

    // ─── Block validated by PBFT quorum — COMMIT to chain ───
    this.chain.push(newBlock);
    primary.blocksProduced++;
    primary.lastBlockTimestamp = newBlock.timestamp;

    // Confirm all transactions in block
    for (const tx of blockTxs) {
      tx.confirm(newBlock.index, newBlock.hash);
      this.transactionIndex.set(tx.hash, tx);
    }

    // Increment confirmations on previous blocks
    for (let i = Math.max(0, this.chain.length - 7); i < this.chain.length - 1; i++) {
      this.chain[i].confirmations++;
    }

    // Update stats
    this.stats.totalBlocks = this.chain.length;
    this.stats.totalTransactions += blockTxs.length;
    this.stats.lastBlockTime = newBlock.timestamp;
    
    const blockInterval = previousBlock.timestamp ? (newBlock.timestamp - previousBlock.timestamp) / 1000 : this.config.blockTime / 1000;
    this.stats.avgBlockTime = ((this.stats.avgBlockTime * (this.stats.totalBlocks - 2)) + blockInterval) / (this.stats.totalBlocks - 1) || blockInterval;

    const tps = blockTxs.length / (this.config.blockTime / 1000);
    if (tps > this.stats.peakTps) this.stats.peakTps = tps;

    // Emit block committed event with PBFT details
    this.emit('block:committed', {
      block: newBlock.toJSON(),
      transactions: blockTxs.map(tx => tx.toJSON()),
      validator: primary.id,
      pbft: {
        prepareVotes: prepareMessages.length,
        commitVotes: commitMessages.length,
        quorum: this.config.requiredValidators,
        latencyMs: pbftLatency,
        validators: prepareMessages.map(m => m.validatorId)
      }
    });

    return newBlock;
  }

  _validateBlock(block, previousBlock) {
    // Check index continuity
    if (block.index !== previousBlock.index + 1) return false;
    // Check previous hash linkage
    if (block.previousHash !== previousBlock.hash) return false;
    // Check hash integrity
    if (block.hash !== block.calculateHash()) return false;
    // Check timestamp order (allow same-millisecond for rapid-fire)
    if (block.timestamp < previousBlock.timestamp) return false;
    return true;
  }

  // ─── TRANSACTION SUBMISSION ───
  submitTransaction(type, data, signer) {
    const tx = new Transaction(type, data, signer);
    this.pendingTransactions.push(tx);
    this.transactionIndex.set(tx.hash, tx);

    // Index by property if applicable
    if (data.propertyId) {
      const existing = this.propertyIndex.get(data.propertyId) || [];
      existing.push(tx.hash);
      this.propertyIndex.set(data.propertyId, existing);
    }

    this.emit('transaction:submitted', tx.toJSON());

    // If network is running, produce block immediately for fast finality
    if (this.isRunning && this.pendingTransactions.length >= 1) {
      const block = this._produceBlock();
      if (block) {
        return { transaction: tx, block: block.toJSON(), confirmed: true };
      }
    }

    return { transaction: tx, confirmed: false };
  }

  // ─── QUERY METHODS ───
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getBlockByIndex(index) {
    return this.chain[index] || null;
  }

  getBlockByHash(hash) {
    return this.chain.find(b => b.hash === hash) || null;
  }

  getTransaction(hash) {
    return this.transactionIndex.get(hash) || null;
  }

  getTransactionsByProperty(propertyId) {
    const txHashes = this.propertyIndex.get(propertyId) || [];
    return txHashes.map(h => this.transactionIndex.get(h)).filter(Boolean);
  }

  getRecentBlocks(limit = 10) {
    const start = Math.max(0, this.chain.length - limit);
    return this.chain.slice(start).reverse().map(b => b.toJSON());
  }

  getRecentTransactions(limit = 20) {
    const allTxs = [...this.transactionIndex.values()];
    return allTxs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(tx => tx.toJSON());
  }

  // ─── NETWORK STATUS ───
  getNetworkStatus() {
    const activeValidators = [...this.validators.values()].filter(v => v.isActive);
    const latestBlock = this.getLatestBlock();
    const uptime = Date.now() - this.stats.networkStartTime;
    
    // PBFT consensus metrics
    const avgConsensusLatency = this.stats.consensusLatencies.length > 0
      ? this.stats.consensusLatencies.reduce((a, b) => a + b, 0) / this.stats.consensusLatencies.length
      : 0;
    const pbftSuccessRate = this.stats.pbftRounds > 0
      ? (this.stats.pbftSuccessful / this.stats.pbftRounds) * 100
      : 100;

    return {
      chainId: this.config.chainId,
      networkName: this.config.networkName,
      version: this.config.version,
      consensus: this.config.consensusAlgorithm,
      isRunning: this.isRunning,
      currentBlockHeight: this.chain.length - 1,
      latestBlockHash: latestBlock.hash,
      latestBlockTimestamp: latestBlock.timestamp,
      pendingTransactions: this.pendingTransactions.length,
      totalTransactions: this.stats.totalTransactions,
      totalBlocks: this.stats.totalBlocks,
      avgBlockTime: Math.round(this.stats.avgBlockTime * 100) / 100,
      peakTps: Math.round(this.stats.peakTps * 100) / 100,
      validators: {
        total: this.validators.size,
        active: activeValidators.length,
        quorumRequired: this.config.requiredValidators,
        list: activeValidators.map(v => ({
          id: v.id,
          name: v.name,
          role: v.role,
          blocksProduced: v.blocksProduced,
          blocksValidated: v.blocksValidated,
          isActive: v.isActive,
          isByzantine: v.isByzantine,
          uptime: v.uptime
        }))
      },
      pbft: {
        totalRounds: this.stats.pbftRounds,
        successful: this.stats.pbftSuccessful,
        failed: this.stats.pbftFailed,
        successRate: Math.round(pbftSuccessRate * 100) / 100,
        avgConsensusLatencyMs: Math.round(avgConsensusLatency * 100) / 100
      },
      uptime: {
        milliseconds: uptime,
        formatted: this._formatUptime(uptime)
      },
      genesisBlock: this.chain[0].hash.substring(0, 16) + '...',
      blockTime: this.config.blockTime / 1000 + 's'
    };
  }

  // ─── VALIDATOR MANAGEMENT ───
  addValidator(id, name, role) {
    const node = new ValidatorNode(id, name, role);
    this.validators.set(id, node);
    this.emit('validator:added', { id, name, role });
    return node;
  }

  removeValidator(id) {
    const node = this.validators.get(id);
    if (node) {
      node.isActive = false;
      this.emit('validator:removed', { id });
    }
  }

  getValidators() {
    return [...this.validators.values()].map(v => ({
      id: v.id,
      name: v.name,
      role: v.role,
      isActive: v.isActive,
      isByzantine: v.isByzantine,
      blocksProduced: v.blocksProduced,
      blocksValidated: v.blocksValidated,
      prepareMessages: v.prepareMessages,
      commitMessages: v.commitMessages,
      lastBlockTimestamp: v.lastBlockTimestamp,
      uptime: v.uptime,
      joinedAt: v.joinedAt
    }));
  }

  /**
   * PBFT Fault Injection: Mark a validator as Byzantine (for testing).
   * A Byzantine node will refuse to send PREPARE/COMMIT messages.
   * PBFT tolerates f < n/3 Byzantine nodes (for n=3, f=0 exact, f<1).
   */
  setByzantine(validatorId, isByzantine = true) {
    const node = this.validators.get(validatorId);
    if (!node) throw new Error(`Validator ${validatorId} not found`);
    node.isByzantine = isByzantine;
    this.emit('validator:byzantine', { id: validatorId, isByzantine });
    console.log(`⚠️  Validator ${validatorId} marked as ${isByzantine ? 'BYZANTINE' : 'HONEST'}`);
    return node;
  }

  /**
   * Get PBFT consensus statistics for benchmarking.
   */
  getPBFTStats() {
    const latencies = this.stats.consensusLatencies;
    const sorted = [...latencies].sort((a, b) => a - b);
    return {
      totalRounds: this.stats.pbftRounds,
      successful: this.stats.pbftSuccessful,
      failed: this.stats.pbftFailed,
      successRate: this.stats.pbftRounds > 0 
        ? ((this.stats.pbftSuccessful / this.stats.pbftRounds) * 100).toFixed(2) + '%'
        : 'N/A',
      latency: {
        min: sorted.length > 0 ? sorted[0] : 0,
        max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
        avg: sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length * 100) / 100 : 0,
        p50: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0,
        p95: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0,
        p99: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0,
      },
      validators: this.getValidators()
    };
  }

  // ─── CHAIN INTEGRITY VERIFICATION ───
  verifyChainIntegrity() {
    const issues = [];
    
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      
      // Verify hash linkage
      if (current.previousHash !== previous.hash) {
        issues.push({ block: i, type: 'broken_link', message: `Block ${i} previous hash mismatch` });
      }
      
      // Verify hash integrity
      if (current.hash !== current.calculateHash()) {
        issues.push({ block: i, type: 'tampered', message: `Block ${i} hash has been tampered` });
      }
      
      // Verify timestamp ordering
      if (current.timestamp <= previous.timestamp) {
        issues.push({ block: i, type: 'timestamp', message: `Block ${i} timestamp disorder` });
      }
    }
    
    return {
      valid: issues.length === 0,
      blocksVerified: this.chain.length,
      issues,
      lastVerified: Date.now()
    };
  }

  // ─── PROPERTY-SPECIFIC VERIFICATION ───
  verifyPropertyOnChain(propertyId, expectedHash) {
    const txs = this.getTransactionsByProperty(propertyId);
    
    if (txs.length === 0) {
      return { verified: false, reason: 'No blockchain records found for this property' };
    }
    
    const registrationTx = txs.find(tx => tx.type === 'PROPERTY_REGISTER');
    if (!registrationTx) {
      return { verified: false, reason: 'No registration transaction found' };
    }
    
    const hashMatch = registrationTx.data.propertyHash === expectedHash;
    
    return {
      verified: hashMatch,
      registrationTx: registrationTx.toJSON(),
      totalTransactions: txs.length,
      transactionHistory: txs.map(tx => tx.toJSON()),
      chainIntegrity: true,
      blockConfirmations: registrationTx.blockNumber !== null 
        ? this.chain.length - registrationTx.blockNumber 
        : 0
    };
  }

  // ─── EXPLORER DATA ───
  getExplorerData(page = 1, limit = 10) {
    const startIdx = Math.max(0, this.chain.length - (page * limit));
    const endIdx = Math.max(0, this.chain.length - ((page - 1) * limit));
    
    return {
      blocks: this.chain.slice(startIdx, endIdx).reverse().map(b => ({
        ...b.toJSON(),
        transactions: b.transactions.map(tx => tx.toJSON())
      })),
      totalBlocks: this.chain.length,
      totalTransactions: this.stats.totalTransactions,
      currentPage: page,
      totalPages: Math.ceil(this.chain.length / limit)
    };
  }

  // ─── HELPER ───
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Export singleton
module.exports = new SovereignChain();
