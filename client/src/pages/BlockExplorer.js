import React, { useState, useEffect, useCallback } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import { 
  FaCubes, FaExchangeAlt, FaCheckCircle, FaShieldAlt,
  FaClock, FaSearch, FaSync, FaCircle, FaChevronRight,
  FaHashtag, FaLink, FaNetworkWired, FaDatabase
} from 'react-icons/fa';
import './BlockExplorer.css';

const BlockExplorer = () => {
  const { 
    networkStatus, recentBlocks, recentTransactions, 
    validators, connected, loading, getBlock, getTransaction, refreshData
  } = useBlockchain();
  
  const [activeTab, setActiveTab] = useState('blocks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim();
    if (q.startsWith('TX-')) {
      try {
        const data = await getTransaction(q);
        setSelectedTx(data.data || data);
        setSelectedBlock(null);
      } catch (e) { /* not found */ }
    } else if (!isNaN(q)) {
      try {
        const data = await getBlock(parseInt(q));
        setSelectedBlock(data.data || data);
        setSelectedTx(null);
      } catch (e) { /* not found */ }
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const truncateHash = (hash) => {
    if (!hash) return '—';
    return hash.length > 16 ? hash.substring(0, 8) + '...' + hash.substring(hash.length - 8) : hash;
  };

  const getTxTypeLabel = (type) => {
    const labels = {
      'PROPERTY_REGISTER': 'Property Registration',
      'PROPERTY_VERIFY': 'Property Verification',
      'OWNERSHIP_TRANSFER': 'Ownership Transfer',
      'IDENTITY_CREATE': 'Identity Creation'
    };
    return labels[type] || type;
  };

  const getTxTypeColor = (type) => {
    const colors = {
      'PROPERTY_REGISTER': '#0B3D91',
      'PROPERTY_VERIFY': '#138808',
      'OWNERSHIP_TRANSFER': '#FF9933',
      'IDENTITY_CREATE': '#6366f1'
    };
    return colors[type] || '#64748b';
  };

  return (
    <div className="explorer-page">
      {/* Page Header */}
      <div className="explorer-header">
        <div className="explorer-header-left">
          <h1><FaCubes /> Block Explorer</h1>
          <p>Bharat Land Chain — Real-time sovereign blockchain explorer</p>
        </div>
        <div className="explorer-header-actions">
          <div className={`chain-live-badge ${connected ? 'online' : ''}`}>
            <FaCircle /> {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <button className="explorer-refresh-btn" onClick={refreshData}>
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Network Stats */}
      <div className="explorer-stats">
        <div className="explorer-stat-card">
          <div className="stat-icon blue"><FaCubes /></div>
          <div className="stat-content">
            <span className="stat-value">{networkStatus?.blockHeight || 0}</span>
            <span className="stat-label">Block Height</span>
          </div>
        </div>
        <div className="explorer-stat-card">
          <div className="stat-icon green"><FaExchangeAlt /></div>
          <div className="stat-content">
            <span className="stat-value">{networkStatus?.totalTransactions || 0}</span>
            <span className="stat-label">Total Transactions</span>
          </div>
        </div>
        <div className="explorer-stat-card">
          <div className="stat-icon orange"><FaNetworkWired /></div>
          <div className="stat-content">
            <span className="stat-value">{networkStatus?.validatorCount || 0}</span>
            <span className="stat-label">Active Validators</span>
          </div>
        </div>
        <div className="explorer-stat-card">
          <div className="stat-icon purple"><FaShieldAlt /></div>
          <div className="stat-content">
            <span className="stat-value">{networkStatus?.consensus || 'PoA-PBFT'}</span>
            <span className="stat-label">Consensus</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="explorer-search">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search by block number or transaction ID (TX-...)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {/* Search Results */}
      {selectedBlock && (
        <div className="explorer-detail-card">
          <div className="detail-card-header">
            <h3><FaCubes /> Block #{selectedBlock.index}</h3>
            <button className="close-detail" onClick={() => setSelectedBlock(null)}>✕</button>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span>Hash</span><code>{selectedBlock.hash}</code></div>
            <div className="detail-item"><span>Previous Hash</span><code>{truncateHash(selectedBlock.previousHash)}</code></div>
            <div className="detail-item"><span>Timestamp</span><span>{formatDate(selectedBlock.timestamp)} {formatTime(selectedBlock.timestamp)}</span></div>
            <div className="detail-item"><span>Validator</span><span>{selectedBlock.validator}</span></div>
            <div className="detail-item"><span>Transactions</span><span>{selectedBlock.transactionCount || selectedBlock.transactions?.length || 0}</span></div>
            <div className="detail-item"><span>Merkle Root</span><code>{truncateHash(selectedBlock.merkleRoot)}</code></div>
          </div>
        </div>
      )}

      {selectedTx && (
        <div className="explorer-detail-card">
          <div className="detail-card-header">
            <h3><FaExchangeAlt /> Transaction {selectedTx.id}</h3>
            <button className="close-detail" onClick={() => setSelectedTx(null)}>✕</button>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span>Hash</span><code>{selectedTx.hash}</code></div>
            <div className="detail-item"><span>Type</span><span style={{color: getTxTypeColor(selectedTx.type)}}>{getTxTypeLabel(selectedTx.type)}</span></div>
            <div className="detail-item"><span>Status</span><span className={`tx-status ${selectedTx.status}`}>{selectedTx.status}</span></div>
            <div className="detail-item"><span>Block</span><span>#{selectedTx.blockNumber}</span></div>
            <div className="detail-item"><span>Timestamp</span><span>{formatDate(selectedTx.timestamp)} {formatTime(selectedTx.timestamp)}</span></div>
            <div className="detail-item"><span>Signer</span><span>{selectedTx.signer}</span></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="explorer-tabs">
        <button 
          className={`explorer-tab ${activeTab === 'blocks' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocks')}
        >
          <FaCubes /> Recent Blocks
        </button>
        <button 
          className={`explorer-tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <FaExchangeAlt /> Recent Transactions
        </button>
        <button 
          className={`explorer-tab ${activeTab === 'validators' ? 'active' : ''}`}
          onClick={() => setActiveTab('validators')}
        >
          <FaNetworkWired /> Validators
        </button>
      </div>

      {/* Tab Content */}
      <div className="explorer-content">
        {activeTab === 'blocks' && (
          <div className="explorer-table-wrapper">
            <table className="explorer-table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Time</th>
                  <th>Txs</th>
                  <th>Validator</th>
                  <th>Hash</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {(recentBlocks || []).map((block, i) => (
                  <tr key={i} onClick={() => setSelectedBlock(block)} className="clickable-row">
                    <td><span className="block-number">#{block.index}</span></td>
                    <td className="time-cell">{formatTime(block.timestamp)}</td>
                    <td><span className="tx-count">{block.transactionCount || block.transactions?.length || 0}</span></td>
                    <td className="validator-cell">{block.validator || '—'}</td>
                    <td><code className="hash-display">{truncateHash(block.hash)}</code></td>
                    <td>{block.size ? `${block.size} B` : '—'}</td>
                  </tr>
                ))}
                {(!recentBlocks || recentBlocks.length === 0) && (
                  <tr><td colSpan="6" className="empty-row">No blocks recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="explorer-table-wrapper">
            <table className="explorer-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Block</th>
                  <th>Time</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {(recentTransactions || []).map((tx, i) => (
                  <tr key={i} onClick={() => setSelectedTx(tx)} className="clickable-row">
                    <td><code className="tx-id">{tx.id}</code></td>
                    <td>
                      <span className="tx-type-badge" style={{background: getTxTypeColor(tx.type) + '15', color: getTxTypeColor(tx.type)}}>
                        {getTxTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td><span className={`tx-status ${tx.status}`}>{tx.status}</span></td>
                    <td>#{tx.blockNumber || '—'}</td>
                    <td className="time-cell">{formatTime(tx.timestamp)}</td>
                    <td><code className="hash-display">{truncateHash(tx.hash)}</code></td>
                  </tr>
                ))}
                {(!recentTransactions || recentTransactions.length === 0) && (
                  <tr><td colSpan="6" className="empty-row">No transactions recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'validators' && (
          <div className="validators-grid">
            {(validators || []).map((v, i) => (
              <div key={i} className="validator-card">
                <div className="validator-card-header">
                  <div className={`validator-status ${v.isActive ? 'active' : 'inactive'}`}>
                    <FaCircle /> {v.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <span className="validator-role">{v.role}</span>
                </div>
                <h4 className="validator-name">{v.name || v.id}</h4>
                <div className="validator-stats">
                  <div className="validator-stat">
                    <span>Blocks Produced</span>
                    <strong>{v.blocksProduced || 0}</strong>
                  </div>
                  <div className="validator-stat">
                    <span>Uptime</span>
                    <strong>{v.uptime ? `${v.uptime.toFixed(1)}%` : '—'}</strong>
                  </div>
                </div>
                <div className="validator-key">
                  <FaHashtag /> <code>{truncateHash(v.publicKey)}</code>
                </div>
              </div>
            ))}
            {(!validators || validators.length === 0) && (
              <div className="empty-state">
                <FaNetworkWired />
                <p>Validator information not available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockExplorer;
