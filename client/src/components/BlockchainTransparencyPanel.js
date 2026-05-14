/**
 * Blockchain Transparency Panel
 * Real-time sovereign blockchain visibility — powered by Bharat Land Chain
 */

import React, { useState, useEffect } from 'react';
import { 
  FaCube, 
  FaLink, 
  FaCheckCircle, 
  FaClock, 
  FaExclamationTriangle,
  FaServer,
  FaSync,
  FaShieldAlt,
  FaNetworkWired,
  FaCircle
} from 'react-icons/fa';
import { useBlockchain } from '../context/BlockchainContext';
import './BlockchainPanel.css';

const BlockchainTransparencyPanel = ({ propertyId, compact = false }) => {
  const ctx = useBlockchain() || {};
  const { 
    networkStatus, recentBlocks, recentTransactions, 
    connected, loading, refreshData, verifyProperty 
  } = ctx;

  const [propertyVerification, setPropertyVerification] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (propertyId) {
      checkPropertyVerification();
    }
  }, [propertyId]);

  const checkPropertyVerification = async () => {
    if (!propertyId || !verifyProperty) return;
    try {
      const result = await verifyProperty(propertyId);
      setPropertyVerification(result.data || result);
    } catch (e) {
      console.error('Property verification check failed:', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (refreshData) await refreshData();
    if (propertyId) await checkPropertyVerification();
    setRefreshing(false);
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '—';
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const truncateHash = (hash) => {
    if (!hash) return '—';
    return hash.length > 16 ? hash.substring(0, 8) + '...' + hash.substring(hash.length - 6) : hash;
  };

  if (loading) {
    return (
      <div className="blockchain-panel">
        <div className="blockchain-loading">
          <div className="blockchain-loader"></div>
          <p>Connecting to Sovereign Chain...</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="blockchain-panel blockchain-compact">
        <div className="blockchain-compact-header">
          <FaCube className="blockchain-icon" />
          <div className="blockchain-compact-info">
            <span className="blockchain-compact-title">Sovereign Chain</span>
            <span className={`blockchain-compact-status ${connected ? 'status-success' : 'status-error'}`}>
              <FaCircle style={{fontSize: '6px'}} /> {connected ? 'Operational' : 'Offline'}
            </span>
          </div>
          <button onClick={handleRefresh} className="blockchain-refresh-btn" disabled={refreshing}>
            <FaSync className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
        {propertyVerification && (
          <div className="blockchain-sync-indicator">
            {propertyVerification.verified ? (
              <><FaCheckCircle className="sync-icon-success" /> On-chain data verified</>
            ) : (
              <><FaClock className="sync-icon-pending" /> Not yet recorded on chain</>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="blockchain-panel">
      {/* Network Status */}
      <div className="blockchain-header">
        <div className="blockchain-title-group">
          <FaNetworkWired className="blockchain-header-icon" />
          <div>
            <h3>Bharat Land Chain</h3>
            <p>Sovereign Permissioned Network</p>
          </div>
        </div>
        <div className="blockchain-status-group">
          <span className={`blockchain-status-badge ${connected ? 'status-success' : 'status-error'}`}>
            <FaShieldAlt /> {connected ? 'Operational' : 'Offline'}
          </span>
          <button onClick={handleRefresh} className="blockchain-refresh-btn" disabled={refreshing}>
            <FaSync className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Network Metrics */}
      <div className="blockchain-metrics">
        <div className="blockchain-metric">
          <span className="metric-label">Block Height</span>
          <span className="metric-value">{networkStatus?.blockHeight || 0}</span>
        </div>
        <div className="blockchain-metric">
          <span className="metric-label">Consensus</span>
          <span className="metric-value">{networkStatus?.consensus || 'PoA-PBFT'}</span>
        </div>
        <div className="blockchain-metric">
          <span className="metric-label">Transactions</span>
          <span className="metric-value">{networkStatus?.totalTransactions || 0}</span>
        </div>
        <div className="blockchain-metric">
          <span className="metric-label">Validators</span>
          <span className="metric-value">{networkStatus?.validatorCount || 0}</span>
        </div>
      </div>

      {/* Recent Blocks */}
      <div className="blockchain-blocks-section">
        <h4><FaCube /> Recent Blocks</h4>
        <div className="blockchain-blocks-list">
          {(recentBlocks || []).slice(0, 3).map((block, i) => (
            <div key={i} className="blockchain-block-item">
              <div className="block-header">
                <span className="block-number">#{block.index}</span>
                <span className="block-time">{formatTimeAgo(block.timestamp)}</span>
              </div>
              <div className="block-details">
                <div className="block-hash">
                  <FaLink />
                  <code>{truncateHash(block.hash)}</code>
                </div>
                <div className="block-meta">
                  <span>{block.transactionCount || block.transactions?.length || 0} txns</span>
                  <span>{block.validator || '—'}</span>
                </div>
              </div>
            </div>
          ))}
          {(!recentBlocks || recentBlocks.length === 0) && (
            <div className="blockchain-empty">No blocks recorded yet</div>
          )}
        </div>
      </div>

      {/* Property Verification Status */}
      {propertyVerification && (
        <div className="blockchain-sync-section">
          <h4><FaShieldAlt /> Data Integrity</h4>
          <div className="blockchain-sync-status">
            {propertyVerification.verified ? (
              <div className="sync-success">
                <FaCheckCircle />
                <div className="sync-info">
                  <strong>On-chain data verified</strong>
                  <p>{propertyVerification.transactionCount || 0} transactions recorded</p>
                </div>
              </div>
            ) : (
              <div className="sync-pending">
                <FaClock />
                <div className="sync-info">
                  <strong>Not yet recorded on chain</strong>
                  <p>Property pending blockchain registration</p>
                </div>
              </div>
            )}
            {propertyVerification.propertyHash && (
              <div className="sync-hashes">
                <div className="sync-hash-item">
                  <span className="sync-hash-label">Property Hash</span>
                  <code className="sync-hash-value">{truncateHash(propertyVerification.propertyHash)}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="blockchain-footer">
        <span className="blockchain-last-sync">
          <FaClock /> Chain ID: {networkStatus?.chainId || 'BHARAT-LAND-CHAIN-001'}
        </span>
      </div>
    </div>
  );
};

export default BlockchainTransparencyPanel;
