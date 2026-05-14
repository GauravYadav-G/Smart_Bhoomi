import React, { useState, useEffect, useCallback } from 'react';
import {
  FaCubes, FaCheckCircle, FaShieldAlt, FaClock,
  FaSyncAlt, FaExclamationTriangle, FaLink, FaServer,
  FaNetworkWired, FaHashtag, FaUsers,
  FaChevronDown, FaChevronUp, FaGlobe
} from 'react-icons/fa';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { adminBlockchainAPI } from '../services/adminApi';
import './BlockchainAdminPanel.css';

const BlockchainAdminPanel = () => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [recentTxns, setRecentTxns] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedBlock, setExpandedBlock] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const results = await Promise.allSettled([
        adminBlockchainAPI.getNetworkStatus(),
        adminBlockchainAPI.getRecentBlocks(15),
        adminBlockchainAPI.getRecentTransactions(20),
        adminBlockchainAPI.getChainIntegrity(),
        adminBlockchainAPI.getValidators(),
      ]);
      if (results[0].status === 'fulfilled') setNetworkStatus(results[0].value.data?.network || results[0].value.data);
      if (results[1].status === 'fulfilled') setRecentBlocks(results[1].value.data?.blocks || []);
      if (results[2].status === 'fulfilled') setRecentTxns(results[2].value.data?.transactions || []);
      if (results[3].status === 'fulfilled') setIntegrity(results[3].value.data?.integrity || results[3].value.data);
      if (results[4].status === 'fulfilled') {
        const v = results[4].value.data;
        setValidators(Array.isArray(v) ? v : v?.validators || []);
      }
    } catch (err) {
      setError('Failed to load blockchain data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const chainLength = networkStatus?.chainLength || recentBlocks.length || 0;
  const totalTxns = networkStatus?.totalTransactions || recentTxns.length || 0;
  const consensusType = networkStatus?.consensus || 'PBFT';
  const isValid = integrity?.valid !== false;
  const validatorCount = Array.isArray(validators) ? validators.length : 0;

  // Block size chart data
  const blockChartData = recentBlocks.slice(0, 10).map((b, i) => ({
    name: `#${b.index || i}`,
    txns: b.transactions?.length || b.transactionCount || 0,
    size: b.size || ((b.transactions?.length || 1) * 250),
  })).reverse();

  // Transaction type distribution
  const txnTypeData = recentTxns.reduce((acc, t) => {
    const type = t.type || 'property_registration';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const txnDistribution = Object.entries(txnTypeData).map(([type, count]) => ({
    type: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count,
  }));

  const formatTime = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const truncHash = (h) => h ? `${h.slice(0, 10)}...${h.slice(-6)}` : 'N/A';

  if (loading) return (
    <div className="bc-admin-loading">
      <div className="bc-loading-blocks">
        <div className="bc-block-anim" />
        <div className="bc-block-anim d1" />
        <div className="bc-block-anim d2" />
      </div>
      <span>Syncing with Bharat Land Chain...</span>
    </div>
  );

  return (
    <div className="bc-admin-panel">
      {/* Header */}
      <div className="bc-admin-header">
        <div className="bc-admin-header-left">
          <div className="bc-admin-icon"><FaCubes /></div>
          <div>
            <h2 className="bc-admin-title">Bharat Land Chain</h2>
            <p className="bc-admin-subtitle">Multi-Validator PBFT Consensus · Sovereign Blockchain Network</p>
          </div>
        </div>
        <div className="bc-admin-header-right">
          <div className={`bc-chain-status ${isValid ? 'valid' : 'invalid'}`}>
            <span className="bc-cs-dot" />
            {isValid ? 'Chain Valid' : 'Chain Compromised'}
          </div>
          <button className="bc-refresh-btn" onClick={fetchData}><FaSyncAlt /> Refresh</button>
        </div>
      </div>

      {error && (
        <div className="bc-admin-error">
          <FaExclamationTriangle /> {error}
          <button onClick={fetchData}><FaSyncAlt /> Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bc-admin-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: <FaGlobe /> },
          { id: 'blocks', label: `Blocks (${chainLength})`, icon: <FaCubes /> },
          { id: 'transactions', label: `Transactions (${totalTxns})`, icon: <FaLink /> },
          { id: 'validators', label: `Validators (${validatorCount})`, icon: <FaUsers /> },
        ].map(tab => (
          <button key={tab.id}
            className={`bc-admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon} <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="bc-overview">
          {/* KPI Row */}
          <div className="bc-kpi-row">
            <div className="bc-kpi chain">
              <div className="bc-kpi-icon"><FaCubes /></div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-value">{chainLength}</span>
                <span className="bc-kpi-label">Chain Height</span>
              </div>
            </div>
            <div className="bc-kpi txns">
              <div className="bc-kpi-icon"><FaLink /></div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-value">{totalTxns}</span>
                <span className="bc-kpi-label">Total Transactions</span>
              </div>
            </div>
            <div className="bc-kpi validators">
              <div className="bc-kpi-icon"><FaUsers /></div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-value">{validatorCount}</span>
                <span className="bc-kpi-label">Active Validators</span>
              </div>
            </div>
            <div className="bc-kpi consensus">
              <div className="bc-kpi-icon"><FaShieldAlt /></div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-value">{consensusType}</span>
                <span className="bc-kpi-label">Consensus Protocol</span>
              </div>
            </div>
            <div className={`bc-kpi ${isValid ? 'integrity-ok' : 'integrity-bad'}`}>
              <div className="bc-kpi-icon">{isValid ? <FaCheckCircle /> : <FaExclamationTriangle />}</div>
              <div className="bc-kpi-info">
                <span className="bc-kpi-value">{isValid ? 'Valid' : 'Invalid'}</span>
                <span className="bc-kpi-label">Chain Integrity</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="bc-charts-row">
            <div className="bc-chart-card wide">
              <h3><FaCubes /> Block Activity (Recent 10)</h3>
              {blockChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={blockChartData}>
                    <defs>
                      <linearGradient id="bcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                    <YAxis fontSize={11} stroke="#94A3B8" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="txns" stroke="#8B5CF6" fill="url(#bcGrad)" strokeWidth={2.5} name="Transactions" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="bc-no-data">No block data available</div>
              )}
            </div>
            <div className="bc-chart-card">
              <h3><FaLink /> Transaction Types</h3>
              {txnDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={txnDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis type="number" fontSize={11} stroke="#94A3B8" />
                    <YAxis dataKey="type" type="category" fontSize={10} stroke="#94A3B8" width={120} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 6, 6, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="bc-no-data">No transactions yet</div>
              )}
            </div>
          </div>

          {/* Network Info */}
          <div className="bc-network-info">
            <h3><FaNetworkWired /> Network Configuration</h3>
            <div className="bc-ni-grid">
              {[
                { label: 'Network Name', value: 'Bharat Land Chain', icon: <FaGlobe /> },
                { label: 'Consensus', value: 'Practical BFT (PBFT)', icon: <FaShieldAlt /> },
                { label: 'Block Time', value: '~5 seconds', icon: <FaClock /> },
                { label: 'Hash Algorithm', value: 'SHA-256', icon: <FaHashtag /> },
                { label: 'Governance', value: 'Multi-Validator', icon: <FaUsers /> },
                { label: 'Data Layer', value: 'Property Registry', icon: <FaServer /> },
              ].map((item, i) => (
                <div key={i} className="bc-ni-item">
                  <div className="bc-ni-icon">{item.icon}</div>
                  <div>
                    <span className="bc-ni-label">{item.label}</span>
                    <span className="bc-ni-value">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Blocks Tab */}
      {activeTab === 'blocks' && (
        <div className="bc-blocks-tab">
          {recentBlocks.length === 0 ? (
            <div className="bc-empty"><FaCubes /> No blocks yet</div>
          ) : (
            <div className="bc-blocks-list">
              {recentBlocks.map((block, i) => {
                const isExpanded = expandedBlock === i;
                return (
                  <div key={i} className={`bc-block-card ${isExpanded ? 'expanded' : ''}`}>
                    <div className="bc-block-header" onClick={() => setExpandedBlock(isExpanded ? null : i)}>
                      <div className="bc-block-index">
                        <FaCubes />
                        <span>#{block.index ?? i}</span>
                      </div>
                      <div className="bc-block-meta">
                        <span className="bc-bm-hash" title={block.hash}><FaHashtag /> {truncHash(block.hash)}</span>
                        <span className="bc-bm-txns"><FaLink /> {block.transactions?.length || block.transactionCount || 0} txns</span>
                        <span className="bc-bm-time"><FaClock /> {formatTime(block.timestamp)}</span>
                      </div>
                      <div className="bc-block-toggle">
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bc-block-details">
                        <div className="bc-bd-grid">
                          <div className="bc-bd-item"><span>Block Hash</span><code>{block.hash || 'N/A'}</code></div>
                          <div className="bc-bd-item"><span>Previous Hash</span><code>{truncHash(block.previousHash)}</code></div>
                          <div className="bc-bd-item"><span>Nonce</span><code>{block.nonce || 'N/A'}</code></div>
                          <div className="bc-bd-item"><span>Merkle Root</span><code>{truncHash(block.merkleRoot)}</code></div>
                          <div className="bc-bd-item"><span>Validator</span><code>{block.validator || 'Genesis'}</code></div>
                          <div className="bc-bd-item"><span>Timestamp</span><code>{formatTime(block.timestamp)}</code></div>
                        </div>
                        {block.transactions?.length > 0 && (
                          <div className="bc-bd-txns">
                            <h4>Transactions ({block.transactions.length})</h4>
                            {block.transactions.slice(0, 5).map((tx, j) => (
                              <div key={j} className="bc-bd-tx">
                                <span className="bc-bd-tx-hash"><FaLink /> {truncHash(tx.hash || tx.id)}</span>
                                <span className="bc-bd-tx-type">{(tx.type || 'registration').replace(/_/g, ' ')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bc-txns-tab">
          {recentTxns.length === 0 ? (
            <div className="bc-empty"><FaLink /> No transactions yet</div>
          ) : (
            <div className="bc-txns-list">
              {recentTxns.map((tx, i) => (
                <div key={i} className="bc-txn-card">
                  <div className="bc-txn-type-badge">
                    {(tx.type || 'registration').replace(/_/g, ' ')}
                  </div>
                  <div className="bc-txn-info">
                    <span className="bc-txn-hash"><FaHashtag /> {truncHash(tx.hash || tx.id)}</span>
                    {tx.propertyId && <span className="bc-txn-prop">Property: {tx.propertyId}</span>}
                  </div>
                  <div className="bc-txn-meta">
                    <span className="bc-txn-time"><FaClock /> {formatTime(tx.timestamp)}</span>
                    <span className={`bc-txn-status ${tx.status || 'confirmed'}`}>
                      <FaCheckCircle /> {tx.status || 'Confirmed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Validators Tab */}
      {activeTab === 'validators' && (
        <div className="bc-validators-tab">
          {!Array.isArray(validators) || validators.length === 0 ? (
            <div className="bc-empty"><FaUsers /> No validators configured</div>
          ) : (
            <div className="bc-validators-grid">
              {validators.map((v, i) => (
                <div key={i} className={`bc-validator-card ${v.isActive !== false ? 'active' : 'inactive'}`}>
                  <div className="bc-v-header">
                    <div className="bc-v-avatar">
                      <FaServer />
                    </div>
                    <div className="bc-v-name-block">
                      <h4>{v.name || v.id || `Validator ${i + 1}`}</h4>
                      <span className="bc-v-id">{truncHash(v.publicKey || v.id || '')}</span>
                    </div>
                    <div className={`bc-v-status ${v.isActive !== false ? 'online' : 'offline'}`}>
                      <span className="bc-v-status-dot" />
                      {v.isActive !== false ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="bc-v-stats">
                    <div className="bc-v-stat">
                      <span className="bc-v-stat-label">Stake</span>
                      <span className="bc-v-stat-value">{v.stake || '1000'}</span>
                    </div>
                    <div className="bc-v-stat">
                      <span className="bc-v-stat-label">Blocks</span>
                      <span className="bc-v-stat-value">{v.blocksValidated || v.blocksMined || 0}</span>
                    </div>
                    <div className="bc-v-stat">
                      <span className="bc-v-stat-label">Uptime</span>
                      <span className="bc-v-stat-value">{v.uptime || '99.9%'}</span>
                    </div>
                    <div className="bc-v-stat">
                      <span className="bc-v-stat-label">Trust</span>
                      <span className="bc-v-stat-value">{v.reputation || v.trustScore || 'A+'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockchainAdminPanel;
