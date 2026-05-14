/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIMULATED BLOCKCHAIN ENVIRONMENT
 * Interactive Visual Sandbox — Bharat Land Chain
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * An interactive, visual blockchain simulator where users can:
 *  • Watch blocks being mined in real-time with animations
 *  • Submit custom transactions and see them flow through the pipeline
 *  • Inspect individual blocks, transactions, and Merkle trees
 *  • Tamper with blocks and watch the chain detect corruption
 *  • Visualize PoA consensus and validator rotation
 *  • Understand hashing, linking, and immutability hands-on
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaCube, FaCubes, FaPlay, FaPause, FaPlus, FaLink, FaUnlink,
  FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaArrowRight,
  FaRedo, FaBolt, FaLock, FaLockOpen, FaNetworkWired, FaServer,
  FaFingerprint, FaHashtag, FaClock, FaMicrochip, FaEye,
  FaSitemap, FaTimesCircle, FaArrowDown, FaTachometerAlt, FaLayerGroup
} from 'react-icons/fa';
import './BlockchainGovernance.css';

// ═══════════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC UTILITIES (browser-safe deterministic hash)
// ═══════════════════════════════════════════════════════════════════

const generateHash = (data) => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const val = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  const hex = val.toString(16).padStart(16, '0');
  return (hex + hex + hex + hex).substring(0, 64);
};

const generateMerkleRoot = (txHashes) => {
  if (txHashes.length === 0) return generateHash('empty');
  if (txHashes.length === 1) return txHashes[0];
  let hashes = [...txHashes];
  while (hashes.length > 1) {
    const newLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      newLevel.push(generateHash(left + right));
    }
    hashes = newLevel;
  }
  return hashes[0];
};

// ═══════════════════════════════════════════════════════════════════
// SIMULATED BLOCKCHAIN ENGINE
// ═══════════════════════════════════════════════════════════════════

const createTransaction = (type, data, signer) => {
  const id = `TX-${Date.now()}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
  const timestamp = Date.now();
  const hash = generateHash(`${id}${type}${JSON.stringify(data)}${signer}${timestamp}`);
  return { id, type, data, signer, timestamp, hash, status: 'pending', gasUsed: 21000 + JSON.stringify(data).length * 16, blockNumber: null };
};

const createBlock = (index, previousHash, transactions, validatorId) => {
  const timestamp = Date.now();
  const txHashes = transactions.map(tx => tx.hash);
  const merkleRoot = generateMerkleRoot(txHashes);
  const hash = generateHash(`${index}${previousHash}${timestamp}${merkleRoot}${validatorId}`);
  return {
    index, timestamp, previousHash, hash, merkleRoot, validator: validatorId,
    transactions: transactions.map(tx => ({ ...tx, status: 'confirmed', blockNumber: index })),
    transactionCount: transactions.length,
    size: JSON.stringify(transactions).length,
    confirmations: 1, isValid: true, isTampered: false
  };
};

const createGenesisBlock = () => {
  const genesisTx = createTransaction('GENESIS', { message: 'Bharat Land Chain Genesis — National Digital Land Infrastructure', chainId: 'BHARAT-LAND-CHAIN-001' }, 'SYSTEM');
  genesisTx.status = 'confirmed';
  return createBlock(0, '0'.repeat(64), [genesisTx], 'GENESIS_VALIDATOR');
};

const VALIDATORS = [
  { id: 'GOV-NODE-DEL', name: 'Delhi Primary', role: 'Government', region: 'North', color: '#FF9933' },
  { id: 'GOV-NODE-MUM', name: 'Mumbai Registry', role: 'Registry', region: 'West', color: '#138808' },
  { id: 'GOV-NODE-BLR', name: 'Bangalore Audit', role: 'Audit', region: 'South', color: '#0B3D91' },
  { id: 'GOV-NODE-KOL', name: 'Kolkata Registry', role: 'Registry', region: 'East', color: '#9C27B0' },
  { id: 'GOV-NODE-HYD', name: 'Hyderabad Gov', role: 'Government', region: 'South', color: '#E91E63' },
];

const TX_TEMPLATES = [
  { type: 'PROPERTY_REGISTER', label: 'Register Property', icon: '🏠', data: { propertyId: '', title: 'Residential Plot', area: '1200 sqft', city: '' }},
  { type: 'OWNERSHIP_TRANSFER', label: 'Transfer Ownership', icon: '🔄', data: { propertyId: '', from: '', to: '', price: '' }},
  { type: 'PROPERTY_VERIFY', label: 'Verify Property', icon: '✅', data: { propertyId: '', inspector: '', status: 'verified' }},
  { type: 'IDENTITY_CREATE', label: 'Create Identity', icon: '🪪', data: { name: '', govId: '', role: 'property_owner' }},
];

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const BlockchainGovernance = () => {
  // ─── BLOCKCHAIN STATE ───
  const [chain, setChain] = useState([createGenesisBlock()]);
  const [mempool, setMempool] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [blockTime, setBlockTime] = useState(4000);
  const [currentValidator, setCurrentValidator] = useState(0);
  const [stats, setStats] = useState({ totalBlocks: 1, totalTx: 1, avgBlockTime: 0, peakTps: 0 });

  // ─── UI STATE ───
  const [activePanel, setActivePanel] = useState('inspector');
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showTxForm, setShowTxForm] = useState(false);
  const [txTemplate, setTxTemplate] = useState(0);
  const [customTxData, setCustomTxData] = useState({});
  const [notification, setNotification] = useState(null);
  const [animatingBlock, setAnimatingBlock] = useState(null);
  const [chainValid, setChainValid] = useState(true);
  const [showMerkleTree, setShowMerkleTree] = useState(null);
  const [pendingAnimation, setPendingAnimation] = useState([]);
  const [consensusPhase, setConsensusPhase] = useState(null);
  const [validatorVotes, setValidatorVotes] = useState([]);

  const chainRef = useRef(null);
  const intervalRef = useRef(null);

  // ─── NOTIFICATIONS ───
  const notify = useCallback((message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // ─── CHAIN INTEGRITY VERIFICATION ───
  const verifyChain = useCallback((chainToCheck) => {
    for (let i = 1; i < chainToCheck.length; i++) {
      const current = chainToCheck[i];
      const previous = chainToCheck[i - 1];
      if (current.previousHash !== previous.hash) return false;
    }
    return true;
  }, []);

  // ─── MINE NEW BLOCK (functional, clean) ───
  const doMineBlock = useCallback(() => {
    setMempool(prevMempool => {
      if (prevMempool.length === 0) return prevMempool;
      const txsForBlock = prevMempool.slice(0, 5);
      const remaining = prevMempool.slice(5);

      setChain(prevChain => {
        const validatorIdx = prevChain.length % VALIDATORS.length;
        const validator = VALIDATORS[validatorIdx];
        const previousBlock = prevChain[prevChain.length - 1];
        const newBlock = createBlock(prevChain.length, previousBlock.hash, txsForBlock, validator.id);

        setAnimatingBlock(newBlock.index);
        setTimeout(() => setAnimatingBlock(null), 1500);

        const newChain = prevChain.map(block => block.index > 0 ? { ...block, confirmations: block.confirmations + 1 } : block);
        newChain.push(newBlock);

        setStats({
          totalBlocks: newChain.length,
          totalTx: newChain.reduce((sum, b) => sum + b.transactionCount, 0),
          avgBlockTime: blockTime / 1000,
          peakTps: Math.max(txsForBlock.length / (blockTime / 1000), 0)
        });
        setChainValid(verifyChain(newChain));
        setCurrentValidator(validatorIdx);
        notify(`⛏️ Block #${newBlock.index} mined by ${validator.name} — ${txsForBlock.length} transactions`, 'success');
        return newChain;
      });
      return remaining;
    });
  }, [blockTime, verifyChain, notify]);

  // ─── MINE WITH CONSENSUS ANIMATION ───
  const mineWithConsensus = useCallback(() => {
    setConsensusPhase('pre-prepare');
    const votes = VALIDATORS.map(v => ({ validator: v.name, vote: Math.random() > 0.05 ? 'approve' : 'abstain', color: v.color }));
    setValidatorVotes(votes);
    setTimeout(() => setConsensusPhase('prepare'), 500);
    setTimeout(() => setConsensusPhase('commit'), 1000);
    setTimeout(() => {
      setConsensusPhase('finalize');
      doMineBlock();
      setTimeout(() => { setConsensusPhase(null); setValidatorVotes([]); }, 600);
    }, 1500);
  }, [doMineBlock]);

  // ─── AUTO-MINE TOGGLE ───
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => { doMineBlock(); }, blockTime);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, blockTime, doMineBlock]);

  // ─── SUBMIT TRANSACTION ───
  const submitTransaction = useCallback((type, data, signer) => {
    const tx = createTransaction(type, data, signer || `USER-${Math.random().toString(16).substring(2, 6).toUpperCase()}`);
    setMempool(prev => [...prev, tx]);
    setPendingAnimation(prev => [...prev, tx.id]);
    setTimeout(() => setPendingAnimation(prev => prev.filter(id => id !== tx.id)), 1000);
    notify(`📨 Transaction ${tx.id.substring(0, 15)}... submitted to mempool`, 'info');
    return tx;
  }, [notify]);

  // ─── ADD SAMPLE TRANSACTIONS ───
  const addSampleTransactions = useCallback(() => {
    const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Hyderabad', 'Chennai', 'Pune', 'Jaipur'];
    const names = ['Raj Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh'];
    const count = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < count; i++) {
      const template = TX_TEMPLATES[Math.floor(Math.random() * TX_TEMPLATES.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const name = names[Math.floor(Math.random() * names.length)];
      let data = { ...template.data };
      if (template.type === 'PROPERTY_REGISTER') {
        data.propertyId = `PROP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        data.city = city;
        data.title = `${['Residential Plot', 'Commercial Space', 'Agricultural Land', 'Industrial Unit'][Math.floor(Math.random() * 4)]} in ${city}`;
        data.area = `${Math.floor(Math.random() * 5000) + 500} sqft`;
      } else if (template.type === 'OWNERSHIP_TRANSFER') {
        data.propertyId = `PROP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        data.from = names[Math.floor(Math.random() * names.length)];
        data.to = name;
        data.price = `₹${(Math.floor(Math.random() * 90) + 10)} Lakh`;
      } else if (template.type === 'PROPERTY_VERIFY') {
        data.propertyId = `PROP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        data.inspector = `Inspector ${names[Math.floor(Math.random() * names.length)]}`;
      } else {
        data.name = name;
        data.govId = `AADHAAR-${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
      }
      submitTransaction(template.type, data, name);
    }
    notify(`📦 ${count} sample transactions added to mempool`, 'info');
  }, [submitTransaction, notify]);

  // ─── TAMPER WITH BLOCK ───
  const tamperBlock = useCallback((blockIndex) => {
    if (blockIndex === 0) { notify('⚠️ Cannot tamper with Genesis block', 'warning'); return; }
    setChain(prev => {
      const newChain = prev.map((block, idx) => {
        if (idx === blockIndex) return { ...block, hash: generateHash(`TAMPERED-${Date.now()}`), isTampered: true, isValid: false };
        if (idx > blockIndex) return { ...block, isValid: false };
        return block;
      });
      setChainValid(false);
      notify(`🔓 Block #${blockIndex} has been tampered! Chain integrity BROKEN`, 'error');
      return newChain;
    });
  }, [notify]);

  // ─── RESET CHAIN ───
  const resetChain = useCallback(() => {
    setChain([createGenesisBlock()]);
    setMempool([]);
    setIsRunning(false);
    setSelectedBlock(null);
    setSelectedTx(null);
    setChainValid(true);
    setStats({ totalBlocks: 1, totalTx: 1, avgBlockTime: 0, peakTps: 0 });
    setCurrentValidator(0);
    setShowMerkleTree(null);
    notify('🔄 Blockchain reset to Genesis state', 'info');
  }, [notify]);

  // ─── AUTO-SCROLL CHAIN ───
  useEffect(() => {
    if (chainRef.current) chainRef.current.scrollLeft = chainRef.current.scrollWidth;
  }, [chain]);

  // ─── BUILD MERKLE TREE LEVELS ───
  const buildMerkleTreeLevels = (transactions) => {
    if (!transactions || transactions.length === 0) return [];
    let currentLevel = transactions.map(tx => tx.hash.substring(0, 12));
    const levels = [currentLevel];
    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        nextLevel.push(generateHash(left + right).substring(0, 12));
      }
      levels.push(nextLevel);
      currentLevel = nextLevel;
    }
    return levels;
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="sim-blockchain">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`sim-notification sim-notif-${notification.type}`}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <header className="sim-header">
        <div className="sim-header-brand">
          <div className="sim-brand-icon"><FaCubes /></div>
          <div>
            <h1>Simulated Blockchain Environment</h1>
            <p>Bharat Land Chain — Interactive Sandbox</p>
          </div>
        </div>

        <div className="sim-stats-bar">
          <div className="sim-stat-pill"><FaCube /> <span><strong>{stats.totalBlocks}</strong> Blocks</span></div>
          <div className="sim-stat-pill"><FaBolt /> <span><strong>{stats.totalTx}</strong> Transactions</span></div>
          <div className="sim-stat-pill"><FaClock /> <span><strong>{(blockTime / 1000).toFixed(1)}s</strong> Block Time</span></div>
          <div className="sim-stat-pill"><FaServer /> <span><strong>{VALIDATORS.length}</strong> Validators</span></div>
          <div className={`sim-stat-pill ${chainValid ? 'pill-valid' : 'pill-invalid'}`}>
            {chainValid ? <FaLock /> : <FaUnlink />}
            <span><strong>{chainValid ? 'INTACT' : 'BROKEN'}</strong></span>
          </div>
          <div className="sim-stat-pill pill-mempool"><FaLayerGroup /> <span><strong>{mempool.length}</strong> Pending</span></div>
        </div>

        <div className="sim-controls">
          <button className={`sim-ctrl-btn ${isRunning ? 'ctrl-running' : 'ctrl-stopped'}`} onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? <FaPause /> : <FaPlay />} {isRunning ? 'Pause' : 'Start'}
          </button>
          <button className="sim-ctrl-btn ctrl-mine" onClick={mineWithConsensus} disabled={mempool.length === 0}>
            <FaMicrochip /> Mine Block
          </button>
          <button className="sim-ctrl-btn ctrl-add" onClick={addSampleTransactions}>
            <FaPlus /> Add Transactions
          </button>
          <button className="sim-ctrl-btn ctrl-custom" onClick={() => setShowTxForm(!showTxForm)}>
            <FaFingerprint /> Custom TX
          </button>
          <div className="sim-speed-control">
            <label>Speed:</label>
            <input type="range" min="1000" max="8000" step="500" value={blockTime} onChange={(e) => setBlockTime(Number(e.target.value))} />
            <span>{(blockTime / 1000).toFixed(1)}s</span>
          </div>
          <button className="sim-ctrl-btn ctrl-reset" onClick={resetChain}><FaRedo /> Reset</button>
        </div>
      </header>

      {/* ═══ CUSTOM TX FORM ═══ */}
      {showTxForm && (
        <div className="sim-tx-form-panel">
          <div className="sim-tx-form-header">
            <h3><FaFingerprint /> Submit Custom Transaction</h3>
            <button onClick={() => setShowTxForm(false)} className="sim-close-btn"><FaTimesCircle /></button>
          </div>
          <div className="sim-tx-templates">
            {TX_TEMPLATES.map((tmpl, idx) => (
              <button key={idx} className={`sim-tx-tmpl-btn ${txTemplate === idx ? 'tmpl-active' : ''}`} onClick={() => { setTxTemplate(idx); setCustomTxData({ ...tmpl.data }); }}>
                <span className="sim-tx-icon">{tmpl.icon}</span>
                <span>{tmpl.label}</span>
              </button>
            ))}
          </div>
          <div className="sim-tx-form-fields">
            {Object.entries(customTxData).map(([key, value]) => (
              <div key={key} className="sim-tx-field">
                <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                <input type="text" value={value} onChange={(e) => setCustomTxData(prev => ({ ...prev, [key]: e.target.value }))} placeholder={`Enter ${key}...`} />
              </div>
            ))}
          </div>
          <button className="sim-submit-tx-btn" onClick={() => { submitTransaction(TX_TEMPLATES[txTemplate].type, customTxData, 'OFFICER-001'); setShowTxForm(false); setCustomTxData({}); }}>
            <FaBolt /> Submit to Mempool
          </button>
        </div>
      )}

      {/* ═══ CONSENSUS OVERLAY ═══ */}
      {consensusPhase && (
        <div className="sim-consensus-overlay">
          <div className="sim-consensus-panel">
            <h3><FaNetworkWired /> PBFT Consensus Round</h3>
            <div className="sim-consensus-phases">
              {['pre-prepare', 'prepare', 'commit', 'finalize'].map((phase, idx) => (
                <React.Fragment key={phase}>
                  {idx > 0 && <div className="sim-phase-arrow"><FaArrowRight /></div>}
                  <div className={`sim-phase ${consensusPhase === phase ? 'phase-active' : ['pre-prepare', 'prepare', 'commit', 'finalize'].indexOf(consensusPhase) > idx ? 'phase-done' : ''}`}>
                    <div className="sim-phase-dot"></div>
                    <span>{phase.charAt(0).toUpperCase() + phase.slice(1).replace('-', ' ')}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            {validatorVotes.length > 0 && (
              <div className="sim-votes">
                {validatorVotes.map((v, idx) => (
                  <div key={idx} className={`sim-vote vote-${v.vote}`}>
                    <FaServer style={{ color: v.color }} />
                    <span>{v.validator}</span>
                    <span className="sim-vote-badge">{v.vote === 'approve' ? '✓' : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="sim-main-layout">

        {/* LEFT: MEMPOOL */}
        <aside className="sim-mempool-panel">
          <div className="sim-panel-title"><FaLayerGroup /> <h3>Mempool ({mempool.length})</h3></div>
          <div className="sim-mempool-list">
            {mempool.length === 0 ? (
              <div className="sim-empty-mempool">
                <FaBolt style={{ fontSize: '1.5rem', opacity: 0.3 }} />
                <p>No pending transactions</p>
                <button className="sim-add-tx-mini" onClick={addSampleTransactions}><FaPlus /> Add Transactions</button>
              </div>
            ) : mempool.map(tx => (
              <div key={tx.id} className={`sim-mempool-tx ${pendingAnimation.includes(tx.id) ? 'tx-entering' : ''}`}
                onClick={() => { setSelectedTx(tx); setSelectedBlock(null); setActivePanel('inspector'); }}>
                <div className="sim-mempool-tx-header">
                  <span className={`sim-tx-type-badge badge-${tx.type.toLowerCase()}`}>
                    {TX_TEMPLATES.find(t => t.type === tx.type)?.icon || '📝'} {tx.type.replace(/_/g, ' ')}
                  </span>
                  <span className="sim-tx-status-pending">Pending</span>
                </div>
                <div className="sim-mempool-tx-id"><code>{tx.id}</code></div>
                <div className="sim-mempool-tx-hash"><FaHashtag /> {tx.hash.substring(0, 20)}...</div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER: CHAIN + DETAIL */}
        <div className="sim-center-area">
          {/* Chain Visualization */}
          <div className="sim-chain-section">
            <div className="sim-chain-label">
              <FaLink /> <span>Blockchain ({chain.length} blocks)</span>
              {!chainValid && <span className="sim-chain-broken-badge"><FaUnlink /> INTEGRITY BROKEN</span>}
            </div>
            <div className="sim-chain-strip" ref={chainRef}>
              {chain.map((block, idx) => (
                <React.Fragment key={block.index}>
                  {idx > 0 && (
                    <div className={`sim-chain-link ${block.isValid === false || block.isTampered ? 'link-broken' : 'link-valid'}`}>
                      <div className="sim-link-line"></div>
                      {block.isValid === false ? <FaUnlink /> : <FaLink />}
                      <div className="sim-link-line"></div>
                    </div>
                  )}
                  <div className={`sim-block-card ${block.index === 0 ? 'block-genesis' : ''} ${animatingBlock === block.index ? 'block-mining-in' : ''} ${block.isTampered ? 'block-tampered' : ''} ${block.isValid === false && !block.isTampered ? 'block-invalid' : ''} ${selectedBlock?.index === block.index ? 'block-selected' : ''}`}
                    onClick={() => { setSelectedBlock(block); setSelectedTx(null); setActivePanel('inspector'); }}>
                    <div className="sim-block-card-header">
                      <span className="sim-block-number">{block.index === 0 ? '🌱 Genesis' : `#${block.index}`}</span>
                      {block.isTampered && <FaExclamationTriangle className="sim-tamper-icon" />}
                      {block.isValid !== false && !block.isTampered && block.index > 0 && <FaCheckCircle className="sim-valid-icon" />}
                    </div>
                    <div className="sim-block-hash-preview"><code>{block.hash.substring(0, 10)}...</code></div>
                    <div className="sim-block-card-stats"><span>{block.transactionCount} tx</span><span>{block.confirmations} conf</span></div>
                    <div className="sim-block-validator-tag" style={{ borderColor: VALIDATORS.find(v => v.id === block.validator)?.color || '#999' }}>
                      <FaServer />
                      <span>{VALIDATORS.find(v => v.id === block.validator)?.name || block.validator}</span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
              {isRunning && mempool.length > 0 && (
                <>
                  <div className="sim-chain-link link-valid"><div className="sim-link-line"></div><FaLink /><div className="sim-link-line"></div></div>
                  <div className="sim-block-card block-mining-placeholder"><div className="sim-mining-spinner"></div><span>Mining...</span></div>
                </>
              )}
            </div>
          </div>

          {/* Detail Panels */}
          <div className="sim-detail-area">
            <div className="sim-detail-tabs">
              <button className={`sim-detail-tab ${activePanel === 'inspector' ? 'tab-active' : ''}`} onClick={() => setActivePanel('inspector')}><FaEye /> Inspector</button>
              <button className={`sim-detail-tab ${activePanel === 'tamper' ? 'tab-active' : ''}`} onClick={() => setActivePanel('tamper')}><FaLockOpen /> Tamper Lab</button>
              <button className={`sim-detail-tab ${activePanel === 'merkle' ? 'tab-active' : ''}`} onClick={() => setActivePanel('merkle')}><FaSitemap /> Merkle Tree</button>
              <button className={`sim-detail-tab ${activePanel === 'validators' ? 'tab-active' : ''}`} onClick={() => setActivePanel('validators')}><FaNetworkWired /> Validators</button>
            </div>

            {/* INSPECTOR */}
            {activePanel === 'inspector' && (
              <div className="sim-inspector-panel">
                {!selectedBlock && !selectedTx ? (
                  <div className="sim-empty-inspector">
                    <FaEye style={{ fontSize: '2.5rem', opacity: 0.2 }} />
                    <h3>No Selection</h3>
                    <p>Click on a block in the chain or a transaction in the mempool to inspect its details.</p>
                  </div>
                ) : selectedBlock ? (
                  <div className="sim-block-inspector">
                    <div className="sim-inspector-header">
                      <h3>{selectedBlock.index === 0 ? '🌱 Genesis Block' : `⛏️ Block #${selectedBlock.index}`}
                        {selectedBlock.isTampered && <span className="sim-tampered-badge">TAMPERED</span>}
                      </h3>
                    </div>
                    <div className="sim-inspector-grid">
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Block Number</span><span className="sim-inspect-value">#{selectedBlock.index}</span></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Timestamp</span><span className="sim-inspect-value">{new Date(selectedBlock.timestamp).toLocaleString('en-IN')}</span></div>
                      <div className="sim-inspect-row sim-row-full"><span className="sim-inspect-label">Block Hash</span><code className={`sim-inspect-hash ${selectedBlock.isTampered ? 'hash-tampered' : ''}`}>{selectedBlock.hash}</code></div>
                      <div className="sim-inspect-row sim-row-full"><span className="sim-inspect-label">Previous Hash</span><code className="sim-inspect-hash">{selectedBlock.previousHash}</code></div>
                      <div className="sim-inspect-row sim-row-full"><span className="sim-inspect-label">Merkle Root</span><code className="sim-inspect-hash">{selectedBlock.merkleRoot}</code></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Validator</span><span className="sim-inspect-value">{VALIDATORS.find(v => v.id === selectedBlock.validator)?.name || selectedBlock.validator}</span></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Transactions</span><span className="sim-inspect-value">{selectedBlock.transactionCount}</span></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Block Size</span><span className="sim-inspect-value">{(selectedBlock.size / 1024).toFixed(1)} KB</span></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Confirmations</span><span className="sim-inspect-value">{selectedBlock.confirmations}</span></div>
                    </div>
                    {selectedBlock.transactions && selectedBlock.transactions.length > 0 && (
                      <div className="sim-block-txs">
                        <h4>Transactions ({selectedBlock.transactions.length})</h4>
                        {selectedBlock.transactions.map((tx, idx) => (
                          <div key={tx.id || idx} className="sim-block-tx-row" onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); setSelectedBlock(null); }}>
                            <span className={`sim-tx-type-badge badge-${tx.type.toLowerCase()}`}>
                              {TX_TEMPLATES.find(t => t.type === tx.type)?.icon || '📝'} {tx.type.replace(/_/g, ' ')}
                            </span>
                            <code>{tx.id}</code>
                            <span className="sim-tx-confirmed"><FaCheckCircle /> Confirmed</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : selectedTx ? (
                  <div className="sim-tx-inspector">
                    <div className="sim-inspector-header"><h3>📄 Transaction Details</h3></div>
                    <div className="sim-inspector-grid">
                      <div className="sim-inspect-row sim-row-full"><span className="sim-inspect-label">TX ID</span><code className="sim-inspect-hash">{selectedTx.id}</code></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Type</span><span className={`sim-tx-type-badge badge-${selectedTx.type.toLowerCase()}`}>{TX_TEMPLATES.find(t => t.type === selectedTx.type)?.icon || '📝'} {selectedTx.type.replace(/_/g, ' ')}</span></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Status</span><span className={`sim-tx-status-${selectedTx.status}`}>{selectedTx.status === 'confirmed' ? <FaCheckCircle /> : <FaClock />} {selectedTx.status}</span></div>
                      <div className="sim-inspect-row sim-row-full"><span className="sim-inspect-label">Hash</span><code className="sim-inspect-hash">{selectedTx.hash}</code></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Signer</span><span className="sim-inspect-value">{selectedTx.signer}</span></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Gas Used</span><span className="sim-inspect-value">{selectedTx.gasUsed?.toLocaleString()}</span></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Block</span><span className="sim-inspect-value">{selectedTx.blockNumber !== null && selectedTx.blockNumber !== undefined ? `#${selectedTx.blockNumber}` : 'Pending'}</span></div>
                      <div className="sim-inspect-row"><span className="sim-inspect-label">Timestamp</span><span className="sim-inspect-value">{new Date(selectedTx.timestamp).toLocaleString('en-IN')}</span></div>
                      <div className="sim-inspect-row sim-row-full"><span className="sim-inspect-label">Payload Data</span><pre className="sim-inspect-json">{JSON.stringify(selectedTx.data, null, 2)}</pre></div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* TAMPER LAB */}
            {activePanel === 'tamper' && (
              <div className="sim-tamper-panel">
                <div className="sim-tamper-header">
                  <h3><FaLockOpen /> Tamper Lab — Test Blockchain Immutability</h3>
                  <p>Select a block to tamper with and observe how the chain detects corruption through hash verification.</p>
                </div>
                <div className="sim-tamper-status">
                  <div className={`sim-integrity-indicator ${chainValid ? 'integrity-valid' : 'integrity-broken'}`}>
                    {chainValid ? <FaLock /> : <FaUnlink />}
                    <div>
                      <strong>Chain Integrity: {chainValid ? 'VALID ✓' : 'BROKEN ✗'}</strong>
                      <p>{chainValid ? 'All block hashes are consistent. The chain has not been tampered with.' : 'Hash linkage is broken! One or more blocks have been modified. The chain can no longer be trusted.'}</p>
                    </div>
                  </div>
                </div>
                <div className="sim-tamper-blocks">
                  {chain.map(block => (
                    <div key={block.index} className={`sim-tamper-block-item ${block.isTampered ? 'tamper-tampered' : ''} ${block.isValid === false && !block.isTampered ? 'tamper-broken' : ''} ${block.index === 0 ? 'tamper-genesis' : ''}`}>
                      <div className="sim-tamper-block-info">
                        <span className="sim-tamper-block-num">{block.index === 0 ? '🌱 Genesis' : `Block #${block.index}`}</span>
                        <code className="sim-tamper-hash">{block.hash.substring(0, 20)}...</code>
                        <span className={`sim-tamper-badge ${block.isTampered ? 'badge-tampered' : block.isValid === false ? 'badge-broken' : 'badge-valid'}`}>
                          {block.isTampered ? '🔓 TAMPERED' : block.isValid === false ? '⚠️ INVALID' : '🔒 Valid'}
                        </span>
                      </div>
                      {block.index !== 0 && !block.isTampered && (
                        <button className="sim-tamper-btn" onClick={() => tamperBlock(block.index)}><FaLockOpen /> Tamper</button>
                      )}
                    </div>
                  ))}
                </div>
                {!chainValid && (
                  <button className="sim-reset-integrity-btn" onClick={resetChain}><FaRedo /> Reset Chain (Restore Integrity)</button>
                )}
                <div className="sim-tamper-explanation">
                  <h4>How Tamper Detection Works</h4>
                  <div className="sim-explanation-flow">
                    <div className="sim-explain-step"><div className="sim-step-num">1</div><p>Each block stores the <strong>hash of the previous block</strong>, creating a chain of cryptographic links.</p></div>
                    <FaArrowRight className="sim-explain-arrow" />
                    <div className="sim-explain-step"><div className="sim-step-num">2</div><p>If any data in a block is changed, its <strong>hash completely changes</strong> (avalanche effect).</p></div>
                    <FaArrowRight className="sim-explain-arrow" />
                    <div className="sim-explain-step"><div className="sim-step-num">3</div><p>The next block's <code>previousHash</code> <strong>no longer matches</strong>, breaking the chain.</p></div>
                    <FaArrowRight className="sim-explain-arrow" />
                    <div className="sim-explain-step"><div className="sim-step-num">4</div><p>All blocks after the tampered block are <strong>automatically invalidated</strong>.</p></div>
                  </div>
                </div>
              </div>
            )}

            {/* MERKLE TREE */}
            {activePanel === 'merkle' && (
              <div className="sim-merkle-panel">
                <div className="sim-merkle-header">
                  <h3><FaSitemap /> Merkle Tree Visualizer</h3>
                  <p>Select a block to visualize its Merkle tree — the cryptographic summary of all transactions.</p>
                </div>
                <div className="sim-merkle-selector">
                  {chain.filter(b => b.transactionCount > 0).map(block => (
                    <button key={block.index} className={`sim-merkle-block-btn ${showMerkleTree === block.index ? 'merkle-btn-active' : ''}`} onClick={() => setShowMerkleTree(block.index)}>
                      Block #{block.index} ({block.transactionCount} tx)
                    </button>
                  ))}
                </div>
                {showMerkleTree !== null && (() => {
                  const block = chain.find(b => b.index === showMerkleTree);
                  if (!block) return null;
                  const levels = buildMerkleTreeLevels(block.transactions);
                  return (
                    <div className="sim-merkle-tree">
                      <div className="sim-merkle-levels">
                        {[...levels].reverse().map((level, levelIdx) => (
                          <div key={levelIdx} className="sim-merkle-level">
                            <span className="sim-merkle-level-label">
                              {levelIdx === 0 ? '🏔️ Root' : levelIdx === levels.length - 1 ? '📄 Leaves (TX Hashes)' : `Level ${levels.length - 1 - levelIdx}`}
                            </span>
                            <div className="sim-merkle-nodes">
                              {level.map((hash, hashIdx) => (
                                <div key={hashIdx} className={`sim-merkle-node ${levelIdx === 0 ? 'merkle-root' : levelIdx === levels.length - 1 ? 'merkle-leaf' : 'merkle-branch'}`}>
                                  <code>{hash}...</code>
                                  {levelIdx === levels.length - 1 && block.transactions[hashIdx] && (
                                    <span className="sim-merkle-tx-label">{TX_TEMPLATES.find(t => t.type === block.transactions[hashIdx]?.type)?.icon || '📝'}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {levelIdx < levels.length - 1 && (
                              <div className="sim-merkle-connectors">
                                {level.map((_, i) => <div key={i} className="sim-merkle-connector"><FaArrowDown /></div>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="sim-merkle-info">
                        <p><strong>Merkle Root:</strong> <code>{block.merkleRoot}</code></p>
                        <p>The Merkle root is stored in the block header. It allows verification of any single transaction without needing all other transactions (Merkle Proof).</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* VALIDATORS */}
            {activePanel === 'validators' && (
              <div className="sim-validators-panel">
                <div className="sim-validators-header">
                  <h3><FaNetworkWired /> Validator Network — PoA Round-Robin</h3>
                  <p>Bharat Land Chain uses {VALIDATORS.length} government-operated validator nodes. Block production rotates through validators in sequence.</p>
                </div>
                <div className="sim-validator-rotation">
                  <span className="sim-rotation-label">Current Block Producer:</span>
                  <div className="sim-rotation-indicator">
                    {VALIDATORS.map((v, idx) => (
                      <div key={v.id} className={`sim-rotation-node ${idx === currentValidator ? 'rotation-active' : ''}`} style={{ borderColor: v.color }}>
                        <FaServer style={{ color: v.color }} />
                        <span>{v.name}</span>
                        {idx === currentValidator && <span className="sim-producing-badge">⛏️ Mining</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sim-validators-grid">
                  {VALIDATORS.map(v => {
                    const blocksProduced = chain.filter(b => b.validator === v.id).length;
                    return (
                      <div key={v.id} className="sim-validator-card" style={{ borderTopColor: v.color }}>
                        <div className="sim-val-card-header">
                          <FaServer style={{ color: v.color, fontSize: '1.4rem' }} />
                          <div><h4>{v.name}</h4><span className="sim-val-id">{v.id}</span></div>
                          <span className="sim-val-active-dot"></span>
                        </div>
                        <div className="sim-val-card-stats">
                          <div className="sim-val-stat"><span className="sim-val-stat-label">Role</span><span className="sim-val-stat-value">{v.role}</span></div>
                          <div className="sim-val-stat"><span className="sim-val-stat-label">Region</span><span className="sim-val-stat-value">{v.region}</span></div>
                          <div className="sim-val-stat"><span className="sim-val-stat-label">Blocks Produced</span><span className="sim-val-stat-value">{blocksProduced}</span></div>
                          <div className="sim-val-stat"><span className="sim-val-stat-label">Uptime</span><span className="sim-val-stat-value">99.{Math.floor(Math.random() * 9) + 1}%</span></div>
                        </div>
                        <div className="sim-val-bar"><div className="sim-val-bar-fill" style={{ width: `${(blocksProduced / Math.max(stats.totalBlocks, 1)) * 100}%`, backgroundColor: v.color }}></div></div>
                      </div>
                    );
                  })}
                </div>
                <div className="sim-consensus-info">
                  <h4>Consensus Algorithm: PoA-PBFT</h4>
                  <div className="sim-consensus-desc">
                    <div className="sim-consensus-step"><strong>1. Round-Robin Selection</strong><p>Next validator: <code>chain.length % validators.length</code></p></div>
                    <div className="sim-consensus-step"><strong>2. Block Proposal</strong><p>Selected validator takes transactions from mempool and constructs a block.</p></div>
                    <div className="sim-consensus-step"><strong>3. PBFT Voting</strong><p>Other validators verify. ⅔ must approve (Pre-Prepare → Prepare → Commit).</p></div>
                    <div className="sim-consensus-step"><strong>4. Deterministic Finality</strong><p>Once committed, the block is <strong>immediately final</strong>. No forks, no reorgs.</p></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CHAIN INFO */}
        <aside className="sim-info-panel">
          <div className="sim-panel-title"><FaShieldAlt /> <h3>Chain Info</h3></div>
          <div className="sim-info-section">
            <div className="sim-info-row"><span>Chain ID</span><code>BHARAT-LAND-001</code></div>
            <div className="sim-info-row"><span>Consensus</span><code>PoA-PBFT</code></div>
            <div className="sim-info-row"><span>Block Time</span><code>{(blockTime / 1000).toFixed(1)}s</code></div>
            <div className="sim-info-row"><span>Max TX/Block</span><code>5</code></div>
            <div className="sim-info-row"><span>Validators</span><code>{VALIDATORS.length}</code></div>
            <div className="sim-info-row"><span>Hash Algo</span><code>SHA-256</code></div>
          </div>
          <div className="sim-info-section">
            <h4><FaTachometerAlt /> Live Metrics</h4>
            <div className="sim-info-row"><span>Height</span><strong>{chain.length - 1}</strong></div>
            <div className="sim-info-row"><span>Total TX</span><strong>{stats.totalTx}</strong></div>
            <div className="sim-info-row"><span>Pending TX</span><strong>{mempool.length}</strong></div>
            <div className="sim-info-row"><span>Integrity</span><strong className={chainValid ? 'text-valid' : 'text-invalid'}>{chainValid ? '✓ Valid' : '✗ Broken'}</strong></div>
          </div>
          <div className="sim-info-section">
            <h4><FaServer /> Current Producer</h4>
            <div className="sim-current-validator">
              <FaServer style={{ color: VALIDATORS[currentValidator].color }} />
              <div><strong>{VALIDATORS[currentValidator].name}</strong><span>{VALIDATORS[currentValidator].role}</span></div>
            </div>
          </div>
          <div className="sim-info-section">
            <h4>🎓 How It Works</h4>
            <div className="sim-info-explainer">
              <p><strong>1.</strong> Transactions enter the <strong>mempool</strong> (pending pool)</p>
              <p><strong>2.</strong> A validator <strong>mines</strong> a block, taking TX from the mempool</p>
              <p><strong>3.</strong> Each block contains the <strong>previous block's hash</strong>, creating an immutable chain</p>
              <p><strong>4.</strong> Try the <strong>Tamper Lab</strong> to see what happens when a block is modified!</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default BlockchainGovernance;
