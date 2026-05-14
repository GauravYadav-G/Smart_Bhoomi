/**
 * Predictive Status Components
 * AI-enhanced UI indicators for approval times, risk scores, fraud alerts
 */

import React from 'react';
import { 
  FaClock, 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaCheckCircle,
  FaChartLine,
  FaInfoCircle,
  FaBrain,
  FaFingerprint,
  FaFileAlt,
  FaBalanceScaleLeft,
  FaUser,
  FaLink,
  FaMapMarkerAlt,
  FaCamera,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import './PredictiveIndicators.css';

/**
 * Approval Time Estimator Component
 * Shows AI-predicted approval time with confidence level
 */
export const ApprovalTimeEstimator = ({ 
  estimatedHours, 
  confidence, 
  factors = [],
  compact = false 
}) => {
  const getConfidenceClass = (conf) => {
    if (conf >= 0.8) return 'confidence-high';
    if (conf >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  };

  const formatTime = (hours) => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  if (compact) {
    return (
      <div className="approval-estimator-compact">
        <FaClock className="estimator-icon" />
        <span className="estimator-time">{formatTime(estimatedHours)}</span>
        <span className={`estimator-confidence ${getConfidenceClass(confidence)}`}>
          {Math.round(confidence * 100)}%
        </span>
      </div>
    );
  }

  return (
    <div className="approval-estimator">
      <div className="estimator-header">
        <div className="estimator-title">
          <FaBrain className="ai-icon" />
          <span>AI Predicted Approval Time</span>
        </div>
        <span className={`confidence-badge ${getConfidenceClass(confidence)}`}>
          {Math.round(confidence * 100)}% confidence
        </span>
      </div>
      
      <div className="estimator-main">
        <FaClock className="time-icon" />
        <div className="time-display">
          <span className="time-value">{formatTime(estimatedHours)}</span>
          <span className="time-label">Estimated approval time</span>
        </div>
      </div>

      {factors && factors.length > 0 && (
        <div className="estimator-factors">
          <h4>Contributing Factors:</h4>
          <ul>
            {factors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="estimator-note">
        <FaInfoCircle />
        <span>Prediction based on historical data and current workload</span>
      </div>
    </div>
  );
};

/**
 * Risk Score Indicator Component
 * Displays 0-100 risk score with visual gauge and breakdown
 */
export const RiskScoreIndicator = ({ 
  score, 
  riskLevel, 
  factors = [],
  compact = false 
}) => {
  const getRiskClass = (level) => {
    switch (level) {
      case 'critical': return 'risk-critical';
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      default: return 'risk-low';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      default: return '#059669';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'critical': 
      case 'high': 
        return <FaExclamationTriangle />;
      case 'medium': 
        return <FaShieldAlt />;
      default: 
        return <FaCheckCircle />;
    }
  };

  if (compact) {
    return (
      <div className={`risk-score-compact ${getRiskClass(riskLevel)}`}>
        {getRiskIcon(riskLevel)}
        <span className="risk-score-value">{score}</span>
        <span className="risk-level-label">{riskLevel}</span>
      </div>
    );
  }

  return (
    <div className="risk-score-indicator">
      <div className="risk-header">
        <div className="risk-title">
          <FaShieldAlt className="shield-icon" />
          <span>Risk Assessment</span>
        </div>
        <span className={`risk-level-badge ${getRiskClass(riskLevel)}`}>
          {riskLevel.toUpperCase()}
        </span>
      </div>

      <div className="risk-gauge-container">
        <div className="risk-gauge">
          <svg viewBox="0 0 200 120" className="gauge-svg">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="20"
              strokeLinecap="round"
            />
            {/* Colored arc based on score */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={getRiskColor(riskLevel)}
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 251.2} 251.2`}
              className="gauge-fill"
            />
          </svg>
          <div className="gauge-center">
            <span className="gauge-score">{score}</span>
            <span className="gauge-max">/100</span>
          </div>
        </div>
      </div>

      {factors && factors.length > 0 && (
        <div className="risk-factors">
          <h4>Risk Factors:</h4>
          <div className="risk-factors-list">
            {factors.map((factor, index) => (
              <div key={index} className="risk-factor-item">
                <span className="factor-dot"></span>
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Fraud Alert Banner Component
 * High-visibility alert for fraud detection
 */
export const FraudAlertBanner = ({ 
  severity, 
  title, 
  description, 
  affectedEntities = [],
  onInvestigate 
}) => {
  const getSeverityClass = (sev) => {
    switch (sev) {
      case 'critical': return 'fraud-critical';
      case 'high': return 'fraud-high';
      case 'medium': return 'fraud-medium';
      default: return 'fraud-low';
    }
  };

  return (
    <div className={`fraud-alert-banner ${getSeverityClass(severity)}`}>
      <div className="fraud-icon-container">
        <FaExclamationTriangle className="fraud-icon" />
      </div>
      
      <div className="fraud-content">
        <div className="fraud-header">
          <span className="fraud-severity-badge">{severity.toUpperCase()}</span>
          <h3>{title}</h3>
        </div>
        <p>{description}</p>
        
        {affectedEntities.length > 0 && (
          <div className="fraud-entities">
            <span className="entities-label">Affected:</span>
            {affectedEntities.map((entity, index) => (
              <span key={index} className="entity-chip">{entity}</span>
            ))}
          </div>
        )}
      </div>

      <button className="fraud-investigate-btn" onClick={onInvestigate}>
        Investigate Now
      </button>
    </div>
  );
};

/**
 * Workflow Suggestion Card Component
 * Actionable AI recommendation card
 */
export const WorkflowSuggestionCard = ({ 
  priority, 
  message, 
  action, 
  onAction,
  type 
}) => {
  const getPriorityClass = (pri) => {
    switch (pri) {
      case 'urgent': return 'suggestion-urgent';
      case 'high': return 'suggestion-high';
      case 'medium': return 'suggestion-medium';
      default: return 'suggestion-low';
    }
  };

  const getTypeIcon = (typ) => {
    switch (typ) {
      case 'approval_delay': return <FaClock />;
      case 'incomplete_registration': return <FaExclamationTriangle />;
      case 'performance': return <FaChartLine />;
      default: return <FaInfoCircle />;
    }
  };

  return (
    <div className={`workflow-suggestion-card ${getPriorityClass(priority)}`}>
      <div className="suggestion-icon-wrap">
        {getTypeIcon(type)}
      </div>
      
      <div className="suggestion-content">
        <span className="suggestion-priority">{priority}</span>
        <p>{message}</p>
      </div>

      <button className="suggestion-action-btn" onClick={onAction}>
        {action}
      </button>
    </div>
  );
};

/**
 * System Health Badge Component
 * Quick system status indicator
 */
export const SystemHealthBadge = ({ health, label = "System Health" }) => {
  const getHealthClass = (h) => {
    if (h >= 95) return 'health-excellent';
    if (h >= 80) return 'health-good';
    if (h >= 60) return 'health-warning';
    return 'health-critical';
  };

  return (
    <div className={`system-health-badge ${getHealthClass(health)}`}>
      <div className="health-icon">
        {health >= 80 ? <FaCheckCircle /> : <FaExclamationTriangle />}
      </div>
      <div className="health-info">
        <span className="health-label">{label}</span>
        <span className="health-value">{health}%</span>
      </div>
    </div>
  );
};

/**
 * Blockchain Sync Status Component
 * Inline blockchain synchronization indicator
 */
export const BlockchainSyncStatus = ({ syncPercentage, blockHeight, lastSync }) => {
  const getSyncClass = (percentage) => {
    if (percentage >= 99) return 'sync-complete';
    if (percentage >= 95) return 'sync-syncing';
    return 'sync-warning';
  };

  return (
    <div className={`blockchain-sync-status ${getSyncClass(syncPercentage)}`}>
      <div className="sync-icon-container">
        <div className="sync-icon"></div>
      </div>
      <div className="sync-details">
        <span className="sync-label">Blockchain Sync</span>
        <span className="sync-percentage">{syncPercentage}%</span>
      </div>
      <div className="sync-meta">
        <span>Block #{blockHeight?.toLocaleString()}</span>
        <span>•</span>
        <span>{lastSync}</span>
      </div>
    </div>
  );
};

/**
 * ═══════════════════════════════════════════════════
 * AI PROPERTY DNA — Trust Score Neural Ring
 * ═══════════════════════════════════════════════════
 * Animated SVG ring showing composite trust grade
 */
export const AIPropertyDNA = ({ trustDNA }) => {
  if (!trustDNA) return null;

  const { overallScore, grade, factors = [] } = trustDNA;

  const getGradeColor = (g) => {
    switch (g) {
      case 'A+': return '#059669';
      case 'A': return '#10B981';
      case 'B': return '#D97706';
      case 'C': return '#EA580C';
      default: return '#DC2626';
    }
  };

  const gradeColor = getGradeColor(grade);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const getFactorIcon = (icon) => {
    switch (icon) {
      case 'user': return <FaUser />;
      case 'file': return <FaFileAlt />;
      case 'chain': return <FaLink />;
      case 'shield': return <FaShieldAlt />;
      case 'map': return <FaMapMarkerAlt />;
      case 'camera': return <FaCamera />;
      default: return <FaBrain />;
    }
  };

  return (
    <div className="ai-dna-card">
      <div className="ai-dna-header">
        <div className="ai-dna-title">
          <div className="ai-pulse-dot" />
          <FaFingerprint className="ai-dna-icon" />
          <span>Property Trust DNA</span>
        </div>
        <span className="ai-dna-badge" style={{ background: gradeColor }}>
          Grade {grade}
        </span>
      </div>

      <div className="ai-dna-ring-section">
        <div className="ai-dna-ring-wrap">
          <svg viewBox="0 0 120 120" className="ai-dna-svg">
            {/* Outer glow ring */}
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(124,58,237,0.08)" strokeWidth="12" />
            {/* Track */}
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="8" />
            {/* Score arc */}
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke={gradeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 60 60)"
              className="ai-dna-arc"
            />
            {/* Animated pulse ring */}
            <circle cx="60" cy="60" r="54" fill="none" stroke={gradeColor} strokeWidth="2" opacity="0.3" className="ai-dna-pulse-ring" />
          </svg>
          <div className="ai-dna-center">
            <span className="ai-dna-score">{overallScore}</span>
            <span className="ai-dna-label">Trust Score</span>
          </div>
        </div>
      </div>

      <div className="ai-dna-factors">
        {factors.map((factor, i) => (
          <div key={i} className="ai-dna-factor">
            <div className="ai-dna-factor-icon">{getFactorIcon(factor.icon)}</div>
            <div className="ai-dna-factor-info">
              <span className="ai-dna-factor-name">{factor.name}</span>
              <div className="ai-dna-factor-bar-wrap">
                <div
                  className="ai-dna-factor-bar"
                  style={{ width: `${factor.score}%`, background: factor.score >= 70 ? '#059669' : factor.score >= 40 ? '#D97706' : '#DC2626' }}
                />
              </div>
            </div>
            <span className="ai-dna-factor-score">{factor.score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * ═══════════════════════════════════════════════════
 * DOCUMENT ANALYSIS CARD
 * ═══════════════════════════════════════════════════
 * Per-document verification status with scan effect
 */
export const DocumentAnalysisCard = ({ documentAnalysis }) => {
  if (!documentAnalysis) return null;

  const { completeness, documents = [], totalUploaded, totalRequired } = documentAnalysis;

  const getStatusIcon = (status) => {
    return status === 'uploaded' ? <FaCheckCircle className="doc-status-ok" /> : <FaExclamationTriangle className="doc-status-missing" />;
  };

  return (
    <div className="ai-doc-card">
      <div className="ai-doc-header">
        <div className="ai-doc-title">
          <FaFileAlt className="ai-doc-icon" />
          <span>Document Intelligence</span>
        </div>
        <div className="ai-doc-completeness">
          <span className="ai-doc-pct">{completeness}%</span>
          <span className="ai-doc-count">{totalUploaded}/{totalRequired}</span>
        </div>
      </div>

      <div className="ai-doc-progress-wrap">
        <div className="ai-doc-progress-bg">
          <div
            className="ai-doc-progress-fill"
            style={{ width: `${completeness}%` }}
          />
          <div className="ai-doc-scan-line" />
        </div>
      </div>

      <div className="ai-doc-list">
        {documents.map((doc, i) => (
          <div key={i} className={`ai-doc-item ${doc.status}`}>
            <div className="ai-doc-item-icon">{getStatusIcon(doc.status)}</div>
            <div className="ai-doc-item-info">
              <span className="ai-doc-item-name">{doc.label}</span>
              {doc.uploadedAt && (
                <span className="ai-doc-item-date">
                  {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <div className="ai-doc-item-status">
              {doc.hasHash && <span className="ai-doc-hash-badge">Hash ✓</span>}
              <span className={`ai-doc-status-chip ${doc.status}`}>
                {doc.status === 'uploaded' ? 'Verified' : 'Required'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * ═══════════════════════════════════════════════════
 * MARKET COMPARISON WIDGET
 * ═══════════════════════════════════════════════════
 * Valuation vs area average with deviation bar
 */
export const MarketComparisonWidget = ({ marketComparison }) => {
  if (!marketComparison) return null;

  const {
    propertyValue, areaAverage, deviation, deviationLevel,
    comparableCount, pricePerUnit, areaAvgPricePerUnit
  } = marketComparison;

  const formatValue = (v) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
    return `₹${v?.toLocaleString('en-IN')}`;
  };

  const deviationColor = deviationLevel === 'extreme' ? '#DC2626' : deviationLevel === 'significant' ? '#D97706' : '#059669';
  const isAbove = deviation > 0;

  return (
    <div className="ai-market-card">
      <div className="ai-market-header">
        <div className="ai-market-title">
          <FaBalanceScaleLeft className="ai-market-icon" />
          <span>Market Intelligence</span>
        </div>
        <span className={`ai-market-deviation-badge ${deviationLevel}`}>
          {isAbove ? <FaArrowUp /> : <FaArrowDown />}
          {Math.abs(deviation)}%
        </span>
      </div>

      <div className="ai-market-comparison">
        <div className="ai-market-bar-group">
          <div className="ai-market-bar-label">
            <span>This Property</span>
            <span className="ai-market-val">{formatValue(propertyValue)}</span>
          </div>
          <div className="ai-market-bar-track">
            <div
              className="ai-market-bar-fill property-bar"
              style={{ width: `${Math.min(100, (propertyValue / Math.max(propertyValue, areaAverage)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="ai-market-bar-group">
          <div className="ai-market-bar-label">
            <span>Area Average</span>
            <span className="ai-market-val">{formatValue(areaAverage)}</span>
          </div>
          <div className="ai-market-bar-track">
            <div
              className="ai-market-bar-fill average-bar"
              style={{ width: `${Math.min(100, (areaAverage / Math.max(propertyValue, areaAverage)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="ai-market-stats">
        {pricePerUnit && (
          <div className="ai-market-stat">
            <span className="ai-market-stat-label">Price/Unit</span>
            <span className="ai-market-stat-value">{formatValue(pricePerUnit)}</span>
          </div>
        )}
        {areaAvgPricePerUnit && (
          <div className="ai-market-stat">
            <span className="ai-market-stat-label">Area Avg/Unit</span>
            <span className="ai-market-stat-value">{formatValue(areaAvgPricePerUnit)}</span>
          </div>
        )}
        <div className="ai-market-stat">
          <span className="ai-market-stat-label">Comparables</span>
          <span className="ai-market-stat-value">{comparableCount}</span>
        </div>
      </div>

      <div className="ai-market-verdict" style={{ borderColor: deviationColor }}>
        <FaInfoCircle style={{ color: deviationColor }} />
        <span>
          {deviationLevel === 'normal'
            ? 'Valuation aligns with area market rates.'
            : deviationLevel === 'significant'
            ? 'Valuation shows notable deviation — review recommended.'
            : 'Extreme valuation anomaly detected — manual audit required.'}
        </span>
      </div>
    </div>
  );
};

/**
 * ═══════════════════════════════════════════════════
 * ANOMALY TIMELINE
 * ═══════════════════════════════════════════════════
 * Visual timeline of detected anomalies with severity
 */
export const AnomalyTimeline = ({ anomalies = [], insights = [] }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'warning': return '#D97706';
      default: return '#3B82F6';
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive': return <FaCheckCircle className="insight-positive" />;
      case 'action': return <FaExclamationTriangle className="insight-action" />;
      default: return <FaInfoCircle className="insight-info" />;
    }
  };

  return (
    <div className="ai-anomaly-card">
      <div className="ai-anomaly-header">
        <div className="ai-anomaly-title">
          <FaBrain className="ai-anomaly-icon" />
          <span>AI Insights & Anomalies</span>
        </div>
        {anomalies.length > 0 && (
          <span className="ai-anomaly-count">{anomalies.length} detected</span>
        )}
      </div>

      {anomalies.length > 0 ? (
        <div className="ai-anomaly-timeline">
          {anomalies.map((anomaly, i) => (
            <div key={i} className="ai-anomaly-item">
              <div className="ai-anomaly-dot-line">
                <div className="ai-anomaly-dot" style={{ background: getSeverityColor(anomaly.severity) }} />
                {i < anomalies.length - 1 && <div className="ai-anomaly-line" />}
              </div>
              <div className="ai-anomaly-content">
                <div className="ai-anomaly-item-header">
                  <span className={`ai-anomaly-severity ${anomaly.severity}`}>{anomaly.severity}</span>
                  <span className="ai-anomaly-type">{anomaly.title}</span>
                </div>
                <p className="ai-anomaly-desc">{anomaly.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ai-anomaly-clean">
          <FaCheckCircle className="ai-anomaly-clean-icon" />
          <span>No anomalies detected</span>
        </div>
      )}

      {insights.length > 0 && (
        <div className="ai-insights-section">
          <h4 className="ai-insights-title">AI Analysis Summary</h4>
          <div className="ai-insights-list">
            {insights.map((insight, i) => (
              <div key={i} className={`ai-insight-item ${insight.type}`}>
                {getInsightIcon(insight.type)}
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default {
  ApprovalTimeEstimator,
  RiskScoreIndicator,
  FraudAlertBanner,
  WorkflowSuggestionCard,
  SystemHealthBadge,
  BlockchainSyncStatus,
  AIPropertyDNA,
  DocumentAnalysisCard,
  MarketComparisonWidget,
  AnomalyTimeline
};
