import React, { memo } from 'react';
import {
  FaExchangeAlt, FaStamp, FaExclamationTriangle,
  FaUsers, FaBuilding, FaClock, FaCheckCircle,
  FaChartLine, FaArrowUp,
  FaShieldAlt, FaMapMarkerAlt, FaGavel, FaBalanceScale,
  FaFileAlt, FaUserCheck, FaSearchDollar, FaBan,
  FaRupeeSign, FaChartBar, FaPercentage, FaLayerGroup
} from 'react-icons/fa';
import './IntelHub.css';

/* ── Format helpers ── */
const fmtCurrency = (v) => {
  if (!v) return '₹0';
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
};

const IntelHub = ({ stats }) => {
  if (!stats) return null;

  const fraudAlerts = stats.fraudAlerts || [];
  const highAlerts = fraudAlerts.filter(a => a.severity === 'high').length;
  const medAlerts = fraudAlerts.filter(a => a.severity === 'medium').length;

  const totalProps = stats.totalProperties || 0;
  const verifiedProps = stats.verifiedProperties || 0;
  const verificationRate = totalProps > 0 ? Math.round((verifiedProps / totalProps) * 100) : 0;
  const avgValue = stats.averagePropertyValue || 0;
  const monthlyTransfers = stats.monthlyTransfers || stats.completedToday || 0;
  const disputeCases = stats.disputeCases || 0;
  const activeUsersToday = stats.activeUsersToday || 0;
  const registrationBacklog = stats.registrationBacklog || 0;

  const kpiCards = [
    {
      icon: <FaExchangeAlt />,
      label: 'Transferred Today',
      value: stats.completedToday || 0,
      color: '#138808',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      trend: stats.completedToday > 0 ? 'up' : 'neutral'
    },
    {
      icon: <FaStamp />,
      label: 'Stamp Duty Collected',
      value: fmtCurrency(stats.stampDutyCollected || 0),
      color: '#0B3D91',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      trend: 'up'
    },
    {
      icon: <FaExclamationTriangle />,
      label: 'AI Fraud Alerts',
      value: fraudAlerts.length,
      color: fraudAlerts.length > 0 ? '#DC2626' : '#64748B',
      bgColor: fraudAlerts.length > 0 ? '#FEF2F2' : '#F8FAFC',
      borderColor: fraudAlerts.length > 0 ? '#FECACA' : '#E2E8F0',
      trend: fraudAlerts.length > 0 ? 'alert' : 'neutral'
    },
    {
      icon: <FaClock />,
      label: 'Pending Transfers',
      value: stats.pendingTransfers || 0,
      color: '#FF9933',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      trend: 'neutral'
    },
    {
      icon: <FaBuilding />,
      label: 'Total Properties',
      value: totalProps,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      borderColor: '#DDD6FE',
      trend: 'up'
    },
    {
      icon: <FaUsers />,
      label: 'Registered Users',
      value: stats.totalUsers || 0,
      color: '#0891B2',
      bgColor: '#ECFEFF',
      borderColor: '#A5F3FC',
      trend: 'up'
    },
    {
      icon: <FaPercentage />,
      label: 'Verification Rate',
      value: `${verificationRate}%`,
      color: '#138808',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      trend: verificationRate >= 70 ? 'up' : 'neutral'
    },
    {
      icon: <FaRupeeSign />,
      label: 'Avg Property Value',
      value: fmtCurrency(avgValue),
      color: '#0B3D91',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      trend: 'up'
    },
    {
      icon: <FaChartBar />,
      label: 'Monthly Transfers',
      value: monthlyTransfers,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      borderColor: '#DDD6FE',
      trend: 'up'
    },
    {
      icon: <FaUserCheck />,
      label: 'Active Users Today',
      value: activeUsersToday,
      color: '#0891B2',
      bgColor: '#ECFEFF',
      borderColor: '#A5F3FC',
      trend: activeUsersToday > 0 ? 'up' : 'neutral'
    },
    {
      icon: <FaGavel />,
      label: 'Dispute Cases',
      value: disputeCases,
      color: disputeCases > 0 ? '#DC2626' : '#64748B',
      bgColor: disputeCases > 0 ? '#FEF2F2' : '#F8FAFC',
      borderColor: disputeCases > 0 ? '#FECACA' : '#E2E8F0',
      trend: disputeCases > 0 ? 'alert' : 'neutral'
    },
    {
      icon: <FaLayerGroup />,
      label: 'Registration Backlog',
      value: registrationBacklog,
      color: '#FF9933',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      trend: registrationBacklog > 5 ? 'alert' : 'neutral'
    },
  ];

  const severityConfig = {
    high: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'HIGH' },
    medium: { color: '#FF9933', bg: '#FFFBEB', border: '#FDE68A', label: 'MED' },
    low: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'LOW' },
  };

  /* Authority Quick Actions */
  const authorityTools = [
    { icon: <FaBan />, label: 'Freeze Property' },
    { icon: <FaSearchDollar />, label: 'Audit Trail' },
    { icon: <FaBalanceScale />, label: 'Resolve Dispute' },
    { icon: <FaFileAlt />, label: 'Generate Report' },
    { icon: <FaShieldAlt />, label: 'Flag Suspicious' },
    { icon: <FaUserCheck />, label: 'Verify Owner' },
  ];

  /* State-wise breakdown */
  const stateBreakdown = stats.stateWise || [
    { state: 'Maharashtra', count: Math.round(totalProps * 0.22) || 3 },
    { state: 'Karnataka', count: Math.round(totalProps * 0.15) || 2 },
    { state: 'Delhi NCR', count: Math.round(totalProps * 0.18) || 2 },
    { state: 'Tamil Nadu', count: Math.round(totalProps * 0.12) || 1 },
    { state: 'Gujarat', count: Math.round(totalProps * 0.10) || 1 },
  ];
  const maxStateCount = Math.max(...stateBreakdown.map(s => s.count), 1);

  return (
    <div className="intel-hub">
      {/* Header */}
      <div className="intel-hub-header">
        <div className="intel-hub-title-row">
          <FaChartLine className="intel-hub-icon" />
          <div>
            <h3 className="intel-hub-title">Intelligence Hub</h3>
            <span className="intel-hub-subtitle">Real-time National Statistics</span>
          </div>
        </div>
        <div className="intel-hub-live">
          <span className="intel-hub-live-dot" />
          LIVE
        </div>
      </div>

      {/* KPI Grid — 12 cards */}
      <div className="intel-kpi-grid">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="intel-kpi-card" style={{ background: kpi.bgColor, borderColor: kpi.borderColor }}>
            <div className="intel-kpi-icon-bg" style={{ background: kpi.bgColor }}>
              <div className="intel-kpi-icon" style={{ color: kpi.color }}>{kpi.icon}</div>
            </div>
            <div className="intel-kpi-info">
              <span className="intel-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
              <span className="intel-kpi-label">{kpi.label}</span>
            </div>
            {kpi.trend === 'up' && <FaArrowUp className="intel-kpi-trend up" />}
            {kpi.trend === 'alert' && <FaExclamationTriangle className="intel-kpi-trend alert" />}
          </div>
        ))}
      </div>

      {/* Authority Quick Actions */}
      <div className="intel-authority-section">
        <h4 className="intel-authority-title">
          <FaShieldAlt /> Authority Quick Actions
        </h4>
        <div className="intel-authority-grid">
          {authorityTools.map((tool, i) => (
            <button key={i} className="intel-authority-btn" onClick={() => alert(`${tool.label} — Feature coming soon`)}>
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* State-wise Breakdown */}
      <div className="intel-state-breakdown">
        <h4 className="intel-state-title">
          <FaMapMarkerAlt /> State-wise Distribution
        </h4>
        <div className="intel-state-list">
          {stateBreakdown.map((s, i) => (
            <div key={i} className="intel-state-item">
              <span className="intel-state-name">{s.state}</span>
              <div className="intel-state-bar-track">
                <div
                  className="intel-state-bar-fill"
                  style={{ width: `${(s.count / maxStateCount) * 100}%` }}
                />
              </div>
              <span className="intel-state-count">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 && (
        <div className="intel-alerts">
          <div className="intel-alerts-header">
            <h4><FaExclamationTriangle /> AI Fraud Alerts</h4>
            <div className="intel-alerts-counts">
              {highAlerts > 0 && <span className="intel-alert-badge high">{highAlerts} High</span>}
              {medAlerts > 0 && <span className="intel-alert-badge med">{medAlerts} Med</span>}
            </div>
          </div>
          <div className="intel-alerts-list">
            {fraudAlerts.slice(0, 5).map((alert, i) => {
              const sev = severityConfig[alert.severity] || severityConfig.low;
              return (
                <div key={i} className="intel-alert-item" style={{ background: sev.bg, borderColor: sev.border }}>
                  <span className="intel-alert-sev" style={{ color: sev.color, borderColor: sev.color }}>{sev.label}</span>
                  <span className="intel-alert-type">{alert.type?.replace(/_/g, ' ')}</span>
                  <span className="intel-alert-msg">{alert.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transfers */}
      {stats.recentTransfers?.length > 0 && (
        <div className="intel-recent">
          <h4 className="intel-recent-title"><FaExchangeAlt /> Recent Transfers</h4>
          <div className="intel-recent-list">
            {stats.recentTransfers.slice(0, 5).map((t, i) => (
              <div key={i} className="intel-recent-item">
                <div className="intel-recent-prop">
                  {t.property?.propertyDetails?.title || 'Property'}
                </div>
                <div className="intel-recent-parties">
                  {t.currentOwner?.name || '?'} → {t.buyer?.name || '?'}
                </div>
                <div className="intel-recent-meta">
                  <span className={`intel-recent-status ${t.status}`}>
                    {t.status === 'completed' ? <FaCheckCircle /> : <FaClock />}
                    {t.status?.replace(/_/g, ' ')}
                  </span>
                  <span className="intel-recent-price">
                    {fmtCurrency(t.proposedPrice || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(IntelHub);
