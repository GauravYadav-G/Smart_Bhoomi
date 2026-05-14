/**
 * Command Center Dashboard
 * AI-Enhanced Governance Intelligence Hub
 * Real-time metrics, predictive insights, risk monitoring
 * P2P system — accessible to all authenticated users
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaChartLine, 
  FaExclamationTriangle, 
  FaClock, 
  FaCheckCircle,
  FaShieldAlt,
  FaCube,
  FaUsers,
  FaFileAlt,
  FaExchangeAlt,
  FaBrain,
  FaRobot,
  FaBell,
  FaTachometerAlt,
  FaMapMarkedAlt,
  FaSearch,
  FaLightbulb,
  FaArrowUp,
  FaArrowDown,
  FaTimes,
  FaUserShield,
  FaDatabase,
  FaChartBar,
  FaEye,
  FaSyncAlt
} from 'react-icons/fa';
import { useIntelligence } from '../context/IntelligenceContext';
import BlockchainTransparencyPanel from './BlockchainTransparencyPanel';
import BlockchainNetworkPanel from './BlockchainNetworkPanel';
import SpatialConflictPanel from './SpatialConflictPanel';
import RiskIntelligenceDashboard from './RiskIntelligenceDashboard';
import IPFSDashboard from './IPFSDashboard';
import IPFSStoragePanel from './IPFSStoragePanel';
import './CommandCenter.css';

/* ─── Error Boundary for Blockchain View ─── */
class BlockchainErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Panel crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 30, textAlign: 'center', color: '#DC2626', background: '#FEF2F2', borderRadius: 12, margin: 10, border: '1px solid #FCA5A5' }}>
          <h3 style={{ margin: '0 0 8px' }}>⚠ Panel Error</h3>
          <p style={{ fontSize: 13, color: '#64748B', wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error || 'Unknown error')}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ marginTop: 12, padding: '8px 20px', background: '#0B3D91', color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Safe wrapper that catches any crash in blockchain sub-panels */
const SafePanel = ({ name, children }) => (
  <BlockchainErrorBoundary>
    {children}
  </BlockchainErrorBoundary>
);

const BlockchainViewSafe = () => (
  <div>
    <SafePanel name="BlockchainNetworkPanel"><BlockchainNetworkPanel /></SafePanel>
    <div style={{ marginTop: 20 }}><SafePanel name="BlockchainTransparencyPanel"><BlockchainTransparencyPanel /></SafePanel></div>
    <div style={{ marginTop: 20 }}><SafePanel name="SpatialConflictPanel"><SpatialConflictPanel /></SafePanel></div>
    <div style={{ marginTop: 20 }}><SafePanel name="IPFSStoragePanel"><IPFSStoragePanel /></SafePanel></div>
    <div style={{ marginTop: 20 }}><SafePanel name="IPFSDashboard"><IPFSDashboard /></SafePanel></div>
  </div>
);

const CommandCenterDashboard = ({ userRole }) => {
  const navigate = useNavigate();
  const { 
    systemAnalytics, 
    workflowSuggestions, 
    priorityTasks, 
    riskAlerts,
    investigateAlert,
    refreshAnalytics,
    refreshAlerts,
    refreshTasks,
    refreshSuggestions,
    loading: intelligenceLoading 
  } = useIntelligence();

  const [activeView, setActiveView] = useState('overview');
  const [investigationModal, setInvestigationModal] = useState(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Derive queue status from real analytics
  const queueStatus = systemAnalytics ? {
    verifications: { pending: systemAnalytics.pendingVerifications || 0, underReview: systemAnalytics.underReview || 0 },
    transfers: { pending: systemAnalytics.pendingTransfers || 0, completed: systemAnalytics.completedTransfers || 0 },
    properties: { total: systemAnalytics.totalProperties || 0, verified: systemAnalytics.verifiedProperties || 0 }
  } : null;

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshAnalytics(),
      refreshAlerts(),
      refreshTasks(),
      refreshSuggestions()
    ]);
    setRefreshing(false);
  };

  // Handle investigation drill-down
  const handleInvestigate = async (alert) => {
    setInvestigationLoading(true);

    // Determine entityId based on alert type
    let entityId = '';
    if (alert.type === 'rapid_registration') {
      entityId = alert.userId || (alert.affectedEntities?.[0] || '');
    } else if (alert.type === 'duplicate_property') {
      entityId = (alert.affectedEntities || []).join(',');
    } else if (alert.type === 'high_value_quick_transfer') {
      entityId = alert.affectedEntities?.[1] || alert.affectedEntities?.[0] || '';
    } else if (alert.type === 'stale_pending') {
      entityId = 'all';
    }

    const result = await investigateAlert(alert.type, entityId);
    setInvestigationModal({ alert, data: result });
    setInvestigationLoading(false);
  };

  const getTrendClass = (value) => {
    if (value > 0) return 'trend-up';
    if (value < 0) return 'trend-down';
    return 'trend-neutral';
  };

  const getRiskSeverityClass = (severity) => {
    switch (severity) {
      case 'critical': return 'risk-critical';
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      default: return 'risk-low';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      default: return 'priority-low';
    }
  };

  if (intelligenceLoading) {
    return (
      <div className="command-center-loading">
        <div className="command-loader"></div>
        <p>Initializing Command Center...</p>
      </div>
    );
  }

  return (
    <div className="command-center">
      {/* Command Center Header */}
      <div className="command-header">
        <div className="command-title-group">
          <FaTachometerAlt className="command-icon" />
          <div>
            <h1>Command Center</h1>
            <p>National Digital Land Governance • AI-Enhanced Intelligence Hub</p>
          </div>
        </div>
        <div className="command-header-actions">
          <button className={`refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh} disabled={refreshing}>
            <FaSyncAlt /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="command-view-toggle">
          <button 
            className={`view-btn ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            <FaChartLine /> Overview
          </button>
          <button 
            className={`view-btn ${activeView === 'intelligence' ? 'active' : ''}`}
            onClick={() => setActiveView('intelligence')}
          >
            <FaBrain /> Intelligence
          </button>
          <button 
            className={`view-btn ${activeView === 'blockchain' ? 'active' : ''}`}
            onClick={() => setActiveView('blockchain')}
          >
            <FaCube /> Blockchain
          </button>
          <button 
            className={`view-btn ${activeView === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveView('performance')}
          >
            <FaTachometerAlt /> Performance
          </button>
        </div>
        </div>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <div className="command-content">
          {/* Key Metrics Row */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon-wrap metric-primary">
                <FaFileAlt />
              </div>
              <div className="metric-content">
                <span className="metric-label">Total Properties</span>
                <span className="metric-value">{(systemAnalytics?.totalProperties ?? 0).toLocaleString()}</span>
                <span className={`metric-trend ${getTrendClass(systemAnalytics?.trends?.registrations?.change)}`}>
                  {systemAnalytics?.trends?.registrations?.change > 0 ? <FaArrowUp /> : <FaArrowDown />}
                  {Math.abs(systemAnalytics?.trends?.registrations?.change || 0)}% this month
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrap metric-success">
                <FaCheckCircle />
              </div>
              <div className="metric-content">
                <span className="metric-label">Verified Properties</span>
                <span className="metric-value">{(systemAnalytics?.verifiedProperties ?? 0).toLocaleString()}</span>
                <span className="metric-percentage">
                  {systemAnalytics?.totalProperties ? ((systemAnalytics.verifiedProperties / systemAnalytics.totalProperties) * 100).toFixed(1) : '0.0'}% verified
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrap metric-warning">
                <FaClock />
              </div>
              <div className="metric-content">
                <span className="metric-label">Avg Approval Time</span>
                <span className="metric-value">{systemAnalytics?.averageApprovalTime ?? 0}h</span>
                <span className="metric-info">Within SLA targets</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrap metric-blockchain">
                <FaCube />
              </div>
              <div className="metric-content">
                <span className="metric-label">Blockchain Sync</span>
                <span className="metric-value">{systemAnalytics?.blockchainSync ?? 99.8}%</span>
                <span className="metric-info">Operational</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrap metric-users">
                <FaUsers />
              </div>
              <div className="metric-content">
                <span className="metric-label">Active Users</span>
                <span className="metric-value">{systemAnalytics?.activeUsers ?? 0}</span>
                <span className="metric-info">Real-time</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrap metric-shield">
                <FaShieldAlt />
              </div>
              <div className="metric-content">
                <span className="metric-label">System Health</span>
                <span className="metric-value">{systemAnalytics?.systemHealth ?? 100}%</span>
                <span className="metric-info">All systems operational</span>
              </div>
            </div>
          </div>

          {/* AI Insights & Risk Alerts */}
          <div className="command-layout">
            <div className="command-main">
              {/* Priority Tasks */}
              {priorityTasks && priorityTasks.length > 0 && (
                <div className="command-section">
                  <div className="section-header">
                    <FaLightbulb className="section-icon" />
                    <div>
                      <h2>Priority Tasks</h2>
                      <p>AI-ranked actions requiring immediate attention</p>
                    </div>
                  </div>
                  <div className="priority-tasks-list">
                    {priorityTasks.map((task) => (
                      <div key={task.id} className={`priority-task ${getPriorityClass(task.priority)}`}>
                        <div className="task-priority-badge">{task.priority}</div>
                        <div className="task-content">
                          <h4>{task.title}</h4>
                          <p>{task.description}</p>
                          <div className="task-meta">
                            <span><FaClock /> {task.estimatedTime}</span>
                            {task.deadline && (
                              <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <button className="task-action-btn">Take Action</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow Suggestions */}
              {workflowSuggestions && workflowSuggestions.length > 0 && (
                <div className="command-section">
                  <div className="section-header">
                    <FaRobot className="section-icon" />
                    <div>
                      <h2>AI Workflow Suggestions</h2>
                      <p>Intelligent recommendations to optimize operations</p>
                    </div>
                  </div>
                  <div className="suggestions-list">
                    {workflowSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className={`suggestion-card suggestion-${suggestion.priority}`}>
                        <div className="suggestion-icon">
                          {suggestion.type === 'incomplete_registration' && <FaFileAlt />}
                          {suggestion.type === 'approval_delay' && <FaClock />}
                          {suggestion.type === 'document_missing' && <FaExclamationTriangle />}
                        </div>
                        <div className="suggestion-content">
                          <h4>{suggestion.message}</h4>
                          <span className="suggestion-time">
                            {new Date(suggestion.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button 
                          className="suggestion-action-btn"
                          onClick={() => navigate(suggestion.actionUrl)}
                        >
                          {suggestion.action}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Heatmap */}
              <div className="command-section">
                <div className="section-header">
                  <FaMapMarkedAlt className="section-icon" />
                  <div>
                    <h2>Pending Verifications Heatmap</h2>
                    <p>Geographic distribution of pending approvals</p>
                  </div>
                </div>
                <div className="heatmap-placeholder">
                  <div className="heatmap-info">
                    <FaMapMarkedAlt />
                    <p>Interactive heatmap visualization</p>
                    <span>{systemAnalytics?.pendingVerifications} properties awaiting verification</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="command-sidebar">
              {/* Risk Alerts */}
              {riskAlerts && riskAlerts.length > 0 && (
                <div className="command-widget">
                  <div className="widget-header">
                    <FaExclamationTriangle />
                    <span>Risk Alerts</span>
                    <span className="widget-badge">{riskAlerts.length}</span>
                  </div>
                  <div className="risk-alerts-list">
                    {riskAlerts.map((alert) => (
                      <div key={alert.id} className={`risk-alert ${getRiskSeverityClass(alert.severity)}`}>
                        <div className="risk-alert-header">
                          <span className="risk-severity">{alert.severity}</span>
                          <span className="risk-score">{alert.riskScore}</span>
                        </div>
                        <h4>{alert.title}</h4>
                        <p>{alert.description}</p>
                        {alert.affectedEntities && (
                          <div className="risk-entities">
                            {alert.affectedEntities.map((entity) => (
                              <span key={entity} className="entity-tag">{entity}</span>
                            ))}
                          </div>
                        )}
                        <button className="risk-investigate-btn" onClick={() => handleInvestigate(alert)} disabled={investigationLoading}>
                          <FaSearch /> {investigationLoading ? 'Loading...' : 'Investigate'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Stats */}
              {systemAnalytics && (
                <div className="command-widget">
                  <div className="widget-header">
                    <FaDatabase />
                    <span>Platform Stats</span>
                  </div>
                  <div className="system-load-list">
                    <div className="load-item">
                      <span className="load-label">Verified</span>
                      <div className="load-bar-container">
                        <div className={`load-bar status-healthy`} style={{width: `${systemAnalytics.totalProperties > 0 ? (systemAnalytics.verifiedProperties / systemAnalytics.totalProperties * 100) : 0}%`}}></div>
                      </div>
                      <span className="load-value">{systemAnalytics.totalProperties > 0 ? Math.round(systemAnalytics.verifiedProperties / systemAnalytics.totalProperties * 100) : 0}%</span>
                    </div>
                    <div className="load-item">
                      <span className="load-label">Pending</span>
                      <div className="load-bar-container">
                        <div className={`load-bar status-warning`} style={{width: `${systemAnalytics.totalProperties > 0 ? (systemAnalytics.pendingVerifications / systemAnalytics.totalProperties * 100) : 0}%`}}></div>
                      </div>
                      <span className="load-value">{systemAnalytics.pendingVerifications}</span>
                    </div>
                    <div className="load-item">
                      <span className="load-label">Under Review</span>
                      <div className="load-bar-container">
                        <div className={`load-bar status-warning`} style={{width: `${systemAnalytics.totalProperties > 0 ? ((systemAnalytics.underReview || 0) / systemAnalytics.totalProperties * 100) : 0}%`}}></div>
                      </div>
                      <span className="load-value">{systemAnalytics.underReview || 0}</span>
                    </div>
                    <div className="load-item">
                      <span className="load-label">Rejected</span>
                      <div className="load-bar-container">
                        <div className={`load-bar status-critical`} style={{width: `${systemAnalytics.totalProperties > 0 ? ((systemAnalytics.rejectedProperties || 0) / systemAnalytics.totalProperties * 100) : 0}%`}}></div>
                      </div>
                      <span className="load-value">{systemAnalytics.rejectedProperties || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Queue Status */}
              {queueStatus && (
                <div className="command-widget">
                  <div className="widget-header">
                    <FaBell />
                    <span>Queue Overview</span>
                  </div>
                  <div className="queue-status-list">
                    <div className="queue-item">
                      <span className="queue-label">Pending Verifications</span>
                      <span className="queue-count">{queueStatus.verifications.pending}</span>
                      <span className="queue-wait">+ {queueStatus.verifications.underReview} under review</span>
                    </div>
                    <div className="queue-item">
                      <span className="queue-label">Pending Transfers</span>
                      <span className="queue-count">{queueStatus.transfers.pending}</span>
                      <span className="queue-wait">{queueStatus.transfers.completed} completed</span>
                    </div>
                    <div className="queue-item">
                      <span className="queue-label">Total Properties</span>
                      <span className="queue-count">{queueStatus.properties.total}</span>
                      <span className="queue-wait">{queueStatus.properties.verified} verified</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blockchain View */}
      {activeView === 'blockchain' && (
        <div className="command-content">
          <BlockchainViewSafe />
        </div>
      )}

      {/* Intelligence View — Full Risk & Investigation Dashboard */}
      {activeView === 'intelligence' && (
        <div className="command-content">
          {/* NEW: Full Risk Intelligence Dashboard with charts */}
          <RiskIntelligenceDashboard />

          <div className="intelligence-dashboard" style={{ marginTop: 20 }}>
            {/* Risk Alerts Full View */}
            <div className="command-section">
              <div className="section-header">
                <FaExclamationTriangle className="section-icon" />
                <div>
                  <h2>Risk Detection & Alerts</h2>
                  <p>AI-powered anomaly detection from real database patterns</p>
                </div>
                <span className="section-badge">{riskAlerts.length} active</span>
              </div>
              {riskAlerts.length === 0 ? (
                <div className="empty-state">
                  <FaShieldAlt />
                  <h3>All Clear</h3>
                  <p>No risk alerts detected. All operations are within normal parameters.</p>
                </div>
              ) : (
                <div className="risk-alerts-full">
                  {riskAlerts.map((alert) => (
                    <div key={alert.id} className={`risk-alert-card ${getRiskSeverityClass(alert.severity)}`}>
                      <div className="risk-card-header">
                        <div className="risk-type-badge">{alert.type.replace(/_/g, ' ')}</div>
                        <div className="risk-score-circle">
                          <span>{alert.riskScore}</span>
                        </div>
                      </div>
                      <h3>{alert.title}</h3>
                      <p>{alert.description}</p>
                      <div className="risk-card-meta">
                        <span className="risk-severity-tag">{alert.severity}</span>
                        <span className="risk-time">{new Date(alert.timestamp).toLocaleString()}</span>
                        <span className={`risk-status-tag ${alert.status}`}>{alert.status}</span>
                      </div>
                      {alert.affectedEntities?.length > 0 && (
                        <div className="risk-entities">
                          {alert.affectedEntities.map((entity) => (
                            <span key={entity} className="entity-tag">{entity}</span>
                          ))}
                        </div>
                      )}
                      <button className="risk-investigate-btn full" onClick={() => handleInvestigate(alert)} disabled={investigationLoading}>
                        <FaSearch /> {investigationLoading ? 'Investigating...' : 'Deep Investigation'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analytics Summary */}
            {systemAnalytics && (
              <div className="command-section">
                <div className="section-header">
                  <FaChartBar className="section-icon" />
                  <div>
                    <h2>Analytics Summary</h2>
                    <p>Real-time database metrics and trends</p>
                  </div>
                </div>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <FaUsers className="analytics-icon" />
                    <div className="analytics-info">
                      <span className="analytics-value">{systemAnalytics.totalUsers}</span>
                      <span className="analytics-label">Total Users</span>
                    </div>
                    <span className="analytics-sub">{systemAnalytics.activeUsers} active</span>
                  </div>
                  <div className="analytics-card">
                    <FaFileAlt className="analytics-icon" />
                    <div className="analytics-info">
                      <span className="analytics-value">{systemAnalytics.totalProperties}</span>
                      <span className="analytics-label">Properties</span>
                    </div>
                    <span className="analytics-sub">{systemAnalytics.verifiedProperties} verified</span>
                  </div>
                  <div className="analytics-card">
                    <FaExchangeAlt className="analytics-icon" />
                    <div className="analytics-info">
                      <span className="analytics-value">{systemAnalytics.totalTransfers}</span>
                      <span className="analytics-label">Transfers</span>
                    </div>
                    <span className="analytics-sub">{systemAnalytics.completedTransfers} completed</span>
                  </div>
                  <div className="analytics-card highlight">
                    <FaShieldAlt className="analytics-icon" />
                    <div className="analytics-info">
                      <span className="analytics-value">{systemAnalytics.highValueProperties || 0}</span>
                      <span className="analytics-label">High-Value (₹1Cr+)</span>
                    </div>
                    <span className="analytics-sub">Requires extra review</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance View — Queue & Trend Analysis */}
      {activeView === 'performance' && (
        <div className="command-content">
          <div className="performance-dashboard">
            {systemAnalytics ? (
              <>
                <div className="command-section">
                  <div className="section-header">
                    <FaChartLine className="section-icon" />
                    <div>
                      <h2>30-Day Trends</h2>
                      <p>Registration, transfer, and verification activity</p>
                    </div>
                  </div>
                  <div className="trend-cards">
                    <div className="trend-card">
                      <div className="trend-header">
                        <FaFileAlt />
                        <span>New Registrations</span>
                      </div>
                      <div className="trend-value">{systemAnalytics.trends?.registrations?.value || 0}</div>
                      <div className={`trend-change ${getTrendClass(systemAnalytics.trends?.registrations?.change)}`}>
                        {systemAnalytics.trends?.registrations?.change > 0 ? <FaArrowUp /> : <FaArrowDown />}
                        {Math.abs(systemAnalytics.trends?.registrations?.change || 0)}% vs prev 30d
                      </div>
                    </div>
                    <div className="trend-card">
                      <div className="trend-header">
                        <FaExchangeAlt />
                        <span>Transfers Initiated</span>
                      </div>
                      <div className="trend-value">{systemAnalytics.trends?.transfers?.value || 0}</div>
                      <div className={`trend-change ${getTrendClass(systemAnalytics.trends?.transfers?.change)}`}>
                        {systemAnalytics.trends?.transfers?.change > 0 ? <FaArrowUp /> : <FaArrowDown />}
                        {Math.abs(systemAnalytics.trends?.transfers?.change || 0)}% vs prev 30d
                      </div>
                    </div>
                    <div className="trend-card">
                      <div className="trend-header">
                        <FaCheckCircle />
                        <span>Verifications Completed</span>
                      </div>
                      <div className="trend-value">{systemAnalytics.trends?.verifications?.value || 0}</div>
                      <div className="trend-change trend-neutral">
                        This period
                      </div>
                    </div>
                  </div>
                </div>

                <div className="command-section">
                  <div className="section-header">
                    <FaClock className="section-icon" />
                    <div>
                      <h2>Processing Performance</h2>
                      <p>Average approval times and queue depth</p>
                    </div>
                  </div>
                  <div className="performance-metrics">
                    <div className="perf-metric">
                      <span className="perf-label">Avg Approval Time</span>
                      <span className="perf-value">{systemAnalytics.averageApprovalTime || 0}h</span>
                      <span className="perf-sub">{systemAnalytics.averageApprovalTime <= 48 ? '✓ Within SLA' : '⚠ Above SLA'}</span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">Pending Queue</span>
                      <span className="perf-value">{systemAnalytics.pendingVerifications || 0}</span>
                      <span className="perf-sub">properties awaiting review</span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">Under Review</span>
                      <span className="perf-value">{systemAnalytics.underReview || 0}</span>
                      <span className="perf-sub">currently being inspected</span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">Rejection Rate</span>
                      <span className="perf-value">
                        {systemAnalytics.totalProperties > 0
                          ? Math.round(((systemAnalytics.rejectedProperties || 0) / systemAnalytics.totalProperties) * 100)
                          : 0}%
                      </span>
                      <span className="perf-sub">{systemAnalytics.rejectedProperties || 0} rejected</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <FaTachometerAlt />
                <h3>No Analytics Available</h3>
                <p>Analytics data is loading or you don't have the required permissions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Investigation Modal */}
      {investigationModal && (
        <div className="investigation-overlay" onClick={() => setInvestigationModal(null)}>
          <div className="investigation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="investigation-header">
              <div>
                <h2><FaSearch /> Investigation Report</h2>
                <p>Alert: {investigationModal.alert.title}</p>
              </div>
              <button className="close-investigation" onClick={() => setInvestigationModal(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="investigation-body">
              <div className="investigation-alert-summary">
                <span className={`severity-badge ${investigationModal.alert.severity}`}>
                  {investigationModal.alert.severity}
                </span>
                <span className="risk-score-badge">Risk Score: {investigationModal.alert.riskScore}</span>
                <span className="alert-type-badge">{investigationModal.alert.type.replace(/_/g, ' ')}</span>
              </div>
              <p className="investigation-desc">{investigationModal.alert.description}</p>

              {investigationModal.data ? (
                <div className="investigation-data">
                  {/* Rapid Registration Investigation */}
                  {investigationModal.alert.type === 'rapid_registration' && investigationModal.data.user && (
                    <>
                      <div className="investigation-section">
                        <h3><FaUserShield /> User Details</h3>
                        <div className="investigation-table">
                          <div className="inv-row"><span>Name</span><span>{investigationModal.data.user.name}</span></div>
                          <div className="inv-row"><span>Email</span><span>{investigationModal.data.user.email}</span></div>
                          <div className="inv-row"><span>Phone</span><span>{investigationModal.data.user.phoneNumber || 'N/A'}</span></div>
                          <div className="inv-row"><span>Govt ID</span><span>{investigationModal.data.user.governmentId || 'N/A'}</span></div>
                          <div className="inv-row"><span>Joined</span><span>{new Date(investigationModal.data.user.createdAt).toLocaleDateString()}</span></div>
                          <div className="inv-row"><span>Total Properties</span><span>{investigationModal.data.totalRegistrations}</span></div>
                        </div>
                      </div>
                      <div className="investigation-section">
                        <h3><FaFileAlt /> Registered Properties</h3>
                        <div className="investigation-list">
                          {investigationModal.data.properties?.map((p) => (
                            <div key={p.propertyId} className="inv-item" onClick={() => navigate(`/properties/${p.propertyId}`)}>
                              <span className="inv-item-id">{p.propertyId}</span>
                              <span>{p.propertyDetails?.title}</span>
                              <span className={`inv-status ${p.verification?.status}`}>{p.verification?.status}</span>
                              <span>{new Date(p.createdAt).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Duplicate Property Investigation */}
                  {investigationModal.alert.type === 'duplicate_property' && investigationModal.data.properties && (
                    <div className="investigation-section">
                      <h3><FaEye /> Property Comparison</h3>
                      <div className="comparison-grid">
                        {investigationModal.data.properties.map((p) => (
                          <div key={p.propertyId} className="comparison-card" onClick={() => navigate(`/properties/${p.propertyId}`)}>
                            <h4>{p.propertyId}</h4>
                            <p>{p.propertyDetails?.title}</p>
                            <div className="inv-row"><span>Owner</span><span>{p.owner?.name}</span></div>
                            <div className="inv-row"><span>Address</span><span>{p.propertyDetails?.address?.fullAddress || 'N/A'}</span></div>
                            <div className="inv-row"><span>Lat</span><span>{p.propertyDetails?.coordinates?.latitude}</span></div>
                            <div className="inv-row"><span>Lng</span><span>{p.propertyDetails?.coordinates?.longitude}</span></div>
                            <div className="inv-row"><span>Status</span><span className={`inv-status ${p.verification?.status}`}>{p.verification?.status}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* High Value Quick Transfer Investigation */}
                  {investigationModal.alert.type === 'high_value_quick_transfer' && investigationModal.data.transfer && (
                    <div className="investigation-section">
                      <h3><FaExchangeAlt /> Transfer Details</h3>
                      <div className="investigation-table">
                        <div className="inv-row"><span>Request ID</span><span>{investigationModal.data.transfer.requestId}</span></div>
                        <div className="inv-row"><span>Property</span><span>{investigationModal.data.transfer.property?.propertyDetails?.title || 'N/A'}</span></div>
                        <div className="inv-row"><span>Current Owner</span><span>{investigationModal.data.transfer.currentOwner?.name}</span></div>
                        <div className="inv-row"><span>Buyer</span><span>{investigationModal.data.transfer.buyer?.name}</span></div>
                        <div className="inv-row"><span>Price</span><span>₹{(investigationModal.data.transfer.proposedPrice || 0).toLocaleString('en-IN')}</span></div>
                        <div className="inv-row"><span>Status</span><span>{investigationModal.data.transfer.status}</span></div>
                        <div className="inv-row"><span>Created</span><span>{new Date(investigationModal.data.transfer.createdAt).toLocaleString()}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Stale Pending Investigation */}
                  {investigationModal.alert.type === 'stale_pending' && investigationModal.data.staleProperties && (
                    <div className="investigation-section">
                      <h3><FaClock /> Stale Pending Properties ({investigationModal.data.count})</h3>
                      <div className="investigation-list">
                        {investigationModal.data.staleProperties.map((p) => (
                          <div key={p.propertyId} className="inv-item" onClick={() => navigate(`/properties/${p.propertyId}`)}>
                            <span className="inv-item-id">{p.propertyId}</span>
                            <span>{p.propertyDetails?.title}</span>
                            <span>Owner: {p.owner?.name}</span>
                            <span>Submitted: {new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="investigation-empty">
                  <p>No investigation data available for this alert.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandCenterDashboard;
