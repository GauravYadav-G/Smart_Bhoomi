import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  FaFingerprint,
  FaShieldAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaCube,
  FaIdCard,
  FaCertificate,
  FaUserShield,
} from 'react-icons/fa';
import './TransferIdentityCard.css';

/* ── Helpers ── */
const computeTrustScore = (kyc, role) => {
  let score = 10;
  if (kyc?.aadhaarVerified) score += 20;
  if (kyc?.panVerified) score += 15;
  if (kyc?.fingerprintEnrolled) score += 20;
  if (kyc?.faceEnrolled) score += 15;
  if (kyc?.kycLevel === 'full') score += 10;
  else if (kyc?.kycLevel === 'standard') score += 5;
  return Math.min(score, 100);
};

const trustColor = (s) => s >= 80 ? '#059669' : s >= 50 ? '#D97706' : '#DC2626';
const trustLabel = (s) => s >= 80 ? 'Verified' : s >= 50 ? 'Standard' : 'Unverified';
const trustGrade = (s) => {
  if (s >= 90) return 'A+'; if (s >= 80) return 'A'; if (s >= 70) return 'B+';
  if (s >= 60) return 'B'; if (s >= 50) return 'C'; return 'D';
};

/* ── BiometricArt mini ── */
const BiometricArtMini = ({ enrolled, hash }) => {
  const strands = useMemo(() => {
    const seed = hash || 'no-bio';
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const code = seed.charCodeAt(i % seed.length) || 42;
      arr.push({
        rx: 14 + (code % 18), ry: 8 + (code % 12),
        cx: 50 + ((code * 2) % 12) - 6, cy: 50 + ((code * 3) % 12) - 6,
        rotation: (code * 7) % 360,
        opacity: enrolled ? 0.5 + (i % 3) * 0.15 : 0.15,
      });
    }
    return arr;
  }, [hash, enrolled]);

  return (
    <svg viewBox="0 0 100 100" className="tic-bio-svg">
      <defs>
        <linearGradient id="tic-bio-gr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={enrolled ? '#0B3D91' : '#94A3B8'} stopOpacity="0.9" />
          <stop offset="100%" stopColor={enrolled ? '#059669' : '#CBD5E1'} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {strands.map((s, i) => (
        <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="none"
          stroke="url(#tic-bio-gr)" strokeWidth={enrolled ? 1.2 : 0.7} opacity={s.opacity}
          transform={`rotate(${s.rotation} ${s.cx} ${s.cy})`} className="tic-strand" />
      ))}
      <circle cx="50" cy="50" r={enrolled ? 4 : 2.5} fill="url(#tic-bio-gr)" />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════
   TRANSFER IDENTITY CARD
   Shows a party's identity card inside the transfer modal
   ═══════════════════════════════════════════════════════════ */
const TransferIdentityCard = ({ person, label, transferInfo }) => {
  if (!person) return null;

  const kyc = person.kycStatus || {};
  const trustScore = computeTrustScore(kyc);
  const bid = person.blockchainId || 'BID-PENDING';
  const biometricEnrolled = !!(kyc.fingerprintEnrolled || kyc.faceEnrolled);
  const kycLevel = kyc.kycLevel || 'none';

  const verifications = [
    { key: 'aadhaar', label: 'Aadhaar e-KYC', icon: <FaShieldAlt />, done: !!kyc.aadhaarVerified },
    { key: 'pan', label: 'PAN Verified', icon: <FaCertificate />, done: !!kyc.panVerified },
    { key: 'fingerprint', label: 'Fingerprint', icon: <FaFingerprint />, done: !!kyc.fingerprintEnrolled },
    { key: 'face', label: 'Face Liveness', icon: <FaUserShield />, done: !!kyc.faceEnrolled },
  ];
  const verifiedCount = verifications.filter(v => v.done).length;

  const qrPayload = JSON.stringify({
    v: 1, bid, name: person.name, role: person.role,
    transfer: transferInfo?.requestId || 'N/A',
    ts: Date.now(),
  });

  return (
    <motion.div
      className="tic-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Header ── */}
      <div className="tic-header">
        <div className="tic-header-left">
          <FaIdCard className="tic-header-icon" />
          <div>
            <span className="tic-label">{label || 'Identity Card'}</span>
            <span className="tic-sublabel">Sovereign Digital Identity</span>
          </div>
        </div>
        <span className={`tic-kyc-chip tic-kyc-${kycLevel}`}>
          <span className="tic-kyc-dot" />
          {kycLevel.charAt(0).toUpperCase() + kycLevel.slice(1)}
        </span>
      </div>

      {/* ── Card Body ── */}
      <div className="tic-body">
        {/* Top Row: ID Card + QR */}
        <div className="tic-top-row">
          {/* Mini ID Card */}
          <div className="tic-id-card">
            <div className="tic-id-holo" />
            <div className="tic-id-tricolor" />
            <div className="tic-id-content">
              <div className="tic-id-top">
                <span className="tic-id-gov">🏛️ Government of India</span>
                <span className="tic-id-chain">Bharat Land Chain</span>
              </div>
              <div className="tic-id-main">
                <div className="tic-avatar">
                  <span>{person.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
                <div className="tic-id-info">
                  <h4 className="tic-id-name">{person.name}</h4>
                  <span className="tic-id-email">{person.email}</span>
                  <span className="tic-id-role">
                    {person.role === 'property_owner' ? '🏠 Owner' : person.role === 'buyer' ? '🤝 Buyer' : '📋 Seller'}
                  </span>
                </div>
              </div>
              <div className="tic-id-bid">
                <span className="tic-id-bid-label">Blockchain ID</span>
                <code className="tic-id-bid-value">
                  {bid.length > 20 ? `${bid.slice(0, 8)}…${bid.slice(-6)}` : bid}
                </code>
              </div>
              <div className="tic-id-bottom">
                <div className="tic-id-bio-mini">
                  <BiometricArtMini enrolled={biometricEnrolled} hash={person.blockchainVerificationHash || bid} />
                  <span className={biometricEnrolled ? 'active' : ''}>{biometricEnrolled ? '🔐 Linked' : '🔒 N/A'}</span>
                </div>
                <span className="tic-id-issued">
                  Issued: {new Date(person.createdAt || Date.now()).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* QR + Trust */}
          <div className="tic-right-col">
            {/* QR Code */}
            <div className="tic-qr-block">
              <div className="tic-qr-frame">
                <QRCode
                  value={qrPayload}
                  size={120}
                  bgColor="#FFFFFF"
                  fgColor="#0B3D91"
                  level="H"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <span className="tic-qr-label">Scan to verify</span>
            </div>

            {/* Trust Ring */}
            <div className="tic-trust-block">
              <div className="tic-trust-ring">
                <CircularProgressbar
                  value={trustScore}
                  text={`${trustScore}`}
                  styles={buildStyles({
                    textSize: '28px',
                    textColor: '#0F172A',
                    pathColor: trustColor(trustScore),
                    trailColor: '#E2E8F0',
                    pathTransitionDuration: 1,
                    strokeLinecap: 'round',
                  })}
                />
              </div>
              <div className="tic-trust-meta">
                <span className="tic-trust-label" style={{ color: trustColor(trustScore) }}>
                  {trustLabel(trustScore)}
                </span>
                <span className={`tic-trust-grade tic-grade-${trustGrade(trustScore).replace('+', 'plus')}`}>
                  {trustGrade(trustScore)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Grid */}
        <div className="tic-verify-section">
          <div className="tic-verify-title">
            <span>Verification Status</span>
            <span className="tic-verify-count">{verifiedCount}/{verifications.length}</span>
          </div>
          <div className="tic-verify-grid">
            {verifications.map(v => (
              <div key={v.key} className={`tic-verify-item ${v.done ? 'done' : 'pending'}`}>
                <span className="tic-verify-icon">{v.icon}</span>
                <span className="tic-verify-text">{v.label}</span>
                <span className="tic-verify-status">
                  {v.done ? <FaCheckCircle /> : <FaTimesCircle />}
                </span>
              </div>
            ))}
          </div>
          <div className="tic-verify-bar">
            <div className="tic-verify-bar-fill" style={{ width: `${(verifiedCount / verifications.length) * 100}%` }} />
          </div>
        </div>

        {/* Transfer Context */}
        {transferInfo && (
          <div className="tic-transfer-context">
            <div className="tic-ctx-row">
              <span className="tic-ctx-k">Transfer ID</span>
              <span className="tic-ctx-v">{transferInfo.requestId}</span>
            </div>
            <div className="tic-ctx-row">
              <span className="tic-ctx-k">Property</span>
              <span className="tic-ctx-v">{transferInfo.propertyTitle || '—'}</span>
            </div>
            <div className="tic-ctx-row">
              <span className="tic-ctx-k">Amount</span>
              <span className="tic-ctx-v tic-ctx-price">₹{transferInfo.price?.toLocaleString('en-IN') || '0'}</span>
            </div>
            {transferInfo.blockchainHash && (
              <div className="tic-ctx-row">
                <span className="tic-ctx-k"><FaCube /> Chain</span>
                <span className="tic-ctx-v tic-ctx-hash">{transferInfo.blockchainHash.slice(0, 16)}…</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TransferIdentityCard;
