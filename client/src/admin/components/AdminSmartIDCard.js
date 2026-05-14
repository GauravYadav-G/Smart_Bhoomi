import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  FaShieldAlt, FaFingerprint, FaCertificate, FaCube,
  FaCheckCircle, FaTimesCircle, FaUserShield,
  FaEye, FaEyeSlash, FaLock, FaStar, FaAward,
  FaIdBadge, FaGlobe, FaClock
} from 'react-icons/fa';
import './AdminSmartIDCard.css';

/* ── Helpers ── */
const trustColor = (s) => s >= 80 ? '#138808' : s >= 50 ? '#FF9933' : '#DC2626';
const trustGrade = (s) => {
  if (s >= 90) return 'A+'; if (s >= 80) return 'A'; if (s >= 70) return 'B+';
  if (s >= 60) return 'B'; if (s >= 50) return 'C'; return 'D';
};

/* ── Holographic Seal ── */
const OfficialSeal = ({ hash }) => {
  const points = useMemo(() => {
    const seed = hash || 'official';
    return Array.from({ length: 12 }, (_, i) => {
      const code = seed.charCodeAt(i % seed.length) || 42;
      const angle = (i * 30 + code % 15) * (Math.PI / 180);
      const r = 30 + (code % 12);
      return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle), opacity: 0.25 + (i % 3) * 0.15 };
    });
  }, [hash]);

  return (
    <svg viewBox="0 0 100 100" className="admin-id-seal-svg">
      <defs>
        <linearGradient id="seal-gr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#1D0A69" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id="seal-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#seal-glow)" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2" fill="#D4AF37" opacity={p.opacity} className="admin-seal-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          <line x1="50" y1="50" x2={p.x} y2={p.y} stroke="url(#seal-gr)" strokeWidth="0.4" opacity={p.opacity * 0.6} />
        </g>
      ))}
      <circle cx="50" cy="50" r="22" fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.3" strokeDasharray="4 3" className="admin-seal-ring" />
      <circle cx="50" cy="50" r="10" fill="none" stroke="#D4AF37" strokeWidth="0.8" opacity="0.4" />
      <text x="50" y="54" textAnchor="middle" fill="#D4AF37" fontSize="7" fontWeight="700" opacity="0.5">GOI</text>
    </svg>
  );
};

const AdminSmartIDCard = ({ admin }) => {
  const [showBID, setShowBID] = useState(false);
  const [totpSeed, setTotpSeed] = useState(0);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t1 = setInterval(() => setTotpSeed(s => s + 1), 60000);
    const t2 = setInterval(() => setLiveTime(new Date()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  if (!admin) return null;

  const initials = (admin.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const score = admin.trustScore || 50;
  const grade = trustGrade(score);
  const color = trustColor(score);
  const bid = admin.blockchainId || 'BHR-GOV-PENDING';
  const maskedBID = showBID ? bid : bid.slice(0, 8) + '••••••' + bid.slice(-4);

  const qrPayload = JSON.stringify({
    type: 'ADMIN_ID', bid: admin.blockchainId, eid: admin.employeeId,
    ts: Math.floor(Date.now() / 60000) + totpSeed, cl: admin.clearanceLevel, rank: admin.rank
  });

  const verifications = [
    { label: 'MFA Auth', done: admin.mfaEnabled, icon: <FaShieldAlt /> },
    { label: 'Biometric', done: (admin.biometricCredentials?.length || 0) > 0, icon: <FaFingerprint /> },
    { label: 'Blockchain', done: !!admin.blockchainId, icon: <FaCube /> },
    { label: `Clearance L${admin.clearanceLevel}`, done: admin.clearanceLevel >= 2, icon: <FaCertificate /> },
  ];
  const verified = verifications.filter(v => v.done).length;

  const totalActions = (admin.stats?.propertiesVerified || 0) + (admin.stats?.transfersApproved || 0) + (admin.stats?.fraudsFlagged || 0);

  return (
    <motion.div className="admin-id-card-v2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
      {/* Tricolor Stripe */}
      <div className="aid-tricolor">
        <div className="aid-tc-saffron" />
        <div className="aid-tc-white" />
        <div className="aid-tc-green" />
      </div>

      {/* Card Header */}
      <div className="aid-header">
        <div className="aid-header-left">
          <div className="aid-emblem">
            <FaUserShield />
          </div>
          <div className="aid-header-text">
            <h3 className="aid-card-title">Official Smart ID</h3>
            <span className="aid-card-subtitle">Smart Bhoomi National Command Center</span>
          </div>
        </div>
        <div className="aid-clearance-badge">
          <FaLock />
          <span>LEVEL {admin.clearanceLevel}</span>
          {admin.isSuperAdmin && <FaStar className="aid-super-star" />}
        </div>
      </div>

      {/* Main Body */}
      <div className="aid-body">
        {/* Left Column — Identity */}
        <div className="aid-identity">
          {/* Dark Card */}
          <div className="aid-dark-card">
            <div className="aid-dark-shimmer" />
            <div className="aid-dark-triline" />

            <div className="aid-dark-top">
              <span className="aid-gov-label">GOVERNMENT OF INDIA</span>
              <span className="aid-dept-label">{admin.department?.toUpperCase()}</span>
            </div>

            <div className="aid-dark-main">
              <div className="aid-avatar-block">
                <div className="aid-avatar">
                  <span>{initials}</span>
                </div>
                <div className="aid-avatar-badge">
                  <FaAward />
                </div>
              </div>
              <div className="aid-name-block">
                <h2 className="aid-name">{admin.name}</h2>
                <div className="aid-rank-line">
                  <FaIdBadge />
                  <span>{admin.rank}</span>
                </div>
                <div className="aid-jurisdiction-line">
                  <FaGlobe />
                  <span>
                    {admin.jurisdiction?.level === 'national' ? 'All India Jurisdiction' :
                      `${admin.jurisdiction?.district || ''}, ${admin.jurisdiction?.state || ''}`}
                  </span>
                </div>
                <span className="aid-eid">ID: {admin.employeeId}</span>
              </div>
            </div>

            <div className="aid-dark-bottom">
              <div className="aid-bid-section">
                <span className="aid-bid-label"><FaCube /> Blockchain Identity</span>
                <div className="aid-bid-row">
                  <span className="aid-bid-value">{maskedBID}</span>
                  <button className="aid-bid-toggle" onClick={() => setShowBID(!showBID)} title={showBID ? 'Hide' : 'Reveal'}>
                    {showBID ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="aid-seal-wrap">
                <OfficialSeal hash={admin.blockchainVerificationHash || admin.employeeId} />
              </div>
            </div>

            <div className="aid-dark-footer">
              <span className="aid-email">{admin.email}</span>
              <span className="aid-issued">Since {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Right Column — Intelligence */}
        <div className="aid-intel">
          {/* QR Section */}
          <div className="aid-qr-section">
            <div className="aid-qr-container">
              <div className="aid-qr-frame">
                <QRCode value={qrPayload} size={140} fgColor="#1D0A69" bgColor="#FFFFFF" level="M" />
              </div>
              <div className="aid-qr-timer">
                <FaClock />
                <span>{60 - (liveTime.getSeconds() % 60)}s</span>
              </div>
            </div>
            <span className="aid-qr-label">Facility Access QR • TOTP Secured</span>
          </div>

          {/* Trust Score */}
          <div className="aid-trust-section">
            <div className="aid-trust-ring-wrap">
              <CircularProgressbar
                value={score}
                text={`${score}`}
                styles={buildStyles({
                  textSize: '26px',
                  textColor: color,
                  pathColor: color,
                  trailColor: '#E2E8F0',
                  pathTransitionDuration: 1.5,
                })}
              />
            </div>
            <div className="aid-trust-info">
              <span className="aid-trust-label">Trust Index</span>
              <span className={`aid-trust-grade grade-${grade.replace('+', 'plus')}`} style={{ color }}>Grade {grade}</span>
              <span className="aid-trust-actions">{totalActions} actions logged</span>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="aid-stats-row">
            <div className="aid-stat-item verified">
              <span className="aid-stat-num">{admin.stats?.propertiesVerified || 0}</span>
              <span className="aid-stat-label">Verified</span>
            </div>
            <div className="aid-stat-item approved">
              <span className="aid-stat-num">{admin.stats?.transfersApproved || 0}</span>
              <span className="aid-stat-label">Approved</span>
            </div>
            <div className="aid-stat-item flagged">
              <span className="aid-stat-num">{admin.stats?.fraudsFlagged || 0}</span>
              <span className="aid-stat-label">Flagged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Verifications */}
      <div className="aid-security">
        <div className="aid-security-header">
          <span className="aid-security-title"><FaShieldAlt /> Security Verifications</span>
          <span className="aid-security-count">{verified}/{verifications.length} Active</span>
        </div>
        <div className="aid-security-grid">
          {verifications.map((v, i) => (
            <div key={i} className={`aid-security-item ${v.done ? 'active' : 'inactive'}`}>
              <span className="aid-sec-icon">{v.icon}</span>
              <span className="aid-sec-text">{v.label}</span>
              <span className="aid-sec-status">{v.done ? <FaCheckCircle /> : <FaTimesCircle />}</span>
            </div>
          ))}
        </div>
        <div className="aid-security-bar">
          <div className="aid-security-fill" style={{ width: `${(verified / verifications.length) * 100}%` }} />
        </div>
      </div>
    </motion.div>
  );
};

export default AdminSmartIDCard;
