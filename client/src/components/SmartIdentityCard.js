import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import QRCode from 'react-qr-code';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useAuth } from '../context/AuthContext';
import { kycAPI, propertyAPI, blockchainAPI } from '../services/api';
import {
  FaFingerprint,
  FaShieldAlt,
  FaCheckCircle,
  FaCopy,
  FaSync,
  FaLock,
  FaUserCheck,
  FaCube,
  FaLink,
  FaQrcode,
  FaIdCard,
  FaTimesCircle,
  FaEye,
  FaEyeSlash,
  FaCertificate,
  FaUserShield,
} from 'react-icons/fa';
import './SmartIdentityCard.css';

/* ─────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────── */
const generateTOTPPayload = (user, epoch) => {
  const step = Math.floor(epoch / 30000);
  return JSON.stringify({
    v: 2,
    bid: user?.blockchainId || 'BID-PENDING',
    name: user?.name,
    t: step,
    sig: btoa(`${user?._id || user?.id}:${step}`).slice(0, 16),
  });
};

const computeTrustScore = (kyc, propCount) => {
  let score = 10;
  if (kyc?.aadhaarVerified) score += 20;
  if (kyc?.panVerified) score += 15;
  if (kyc?.fingerprintEnrolled) score += 20;
  if (kyc?.faceEnrolled) score += 15;
  if (kyc?.kycLevel === 'full') score += 10;
  else if (kyc?.kycLevel === 'standard') score += 5;
  score += Math.min(propCount * 2, 10);
  return Math.min(score, 100);
};

const trustColor = (score) => {
  if (score >= 80) return '#059669';
  if (score >= 50) return '#D97706';
  return '#DC2626';
};

const trustLabel = (score) => {
  if (score >= 80) return 'Verified';
  if (score >= 50) return 'Standard';
  return 'Unverified';
};

const trustGrade = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
};

/* ─────────────────────────────────────────────────────────
   BIOMETRIC HASH ART
   ───────────────────────────────────────────────────────── */
const BiometricHashArt = ({ enrolled, hash }) => {
  const strands = useMemo(() => {
    const seed = hash || 'default-no-biometric';
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const code = seed.charCodeAt(i % seed.length) || 42;
      arr.push({
        rx: 14 + (code % 20),
        ry: 8 + (code % 14),
        cx: 50 + ((code * 2) % 15) - 7,
        cy: 50 + ((code * 3) % 15) - 7,
        rotation: (code * 7) % 360,
        delay: i * 0.15,
        opacity: enrolled ? 0.5 + (i % 3) * 0.15 : 0.15,
      });
    }
    return arr;
  }, [hash, enrolled]);

  return (
    <svg viewBox="0 0 100 100" className="sic-biometric-svg">
      <defs>
        <linearGradient id="bio-grad-new" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={enrolled ? '#0B3D91' : '#94A3B8'} stopOpacity="0.9" />
          <stop offset="100%" stopColor={enrolled ? '#059669' : '#CBD5E1'} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {strands.map((s, i) => (
        <ellipse
          key={i}
          cx={s.cx}
          cy={s.cy}
          rx={s.rx}
          ry={s.ry}
          fill="none"
          stroke="url(#bio-grad-new)"
          strokeWidth={enrolled ? 1.3 : 0.7}
          opacity={s.opacity}
          transform={`rotate(${s.rotation} ${s.cx} ${s.cy})`}
          className="sic-strand"
          style={{ animationDelay: `${s.delay}s` }}
        />
      ))}
      <circle cx="50" cy="50" r={enrolled ? 4 : 2.5} fill="url(#bio-grad-new)" className="sic-core-dot" />
    </svg>
  );
};

/* ═════════════════════════════════════════════════════════
   SMART IDENTITY CARD — Full-width Dashboard Panel
   ═════════════════════════════════════════════════════════ */
const SmartIdentityCard = () => {
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState(null);
  const [propertyCount, setPropertyCount] = useState(0);
  const [chainData, setChainData] = useState(null);
  const [qrEpoch, setQrEpoch] = useState(Date.now());
  const [qrCountdown, setQrCountdown] = useState(30);
  const [copied, setCopied] = useState(false);
  const [bidVisible, setBidVisible] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  /* ── Fetch data ── */
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [kycRes, propRes, chainRes] = await Promise.allSettled([
          kycAPI.getKYCStatus(),
          propertyAPI.getMyProperties(),
          blockchainAPI.getNetworkStatus(),
        ]);
        if (kycRes.status === 'fulfilled') setKycStatus(kycRes.value.data.kycStatus || kycRes.value.data);
        if (propRes.status === 'fulfilled') {
          const props = propRes.value.data.properties || propRes.value.data.data || propRes.value.data || [];
          setPropertyCount(Array.isArray(props) ? props.length : 0);
        }
        if (chainRes.status === 'fulfilled') setChainData(chainRes.value.data.network || chainRes.value.data);
      } catch { /* non-critical */ }
    };
    loadData();
  }, [user]);

  /* ── TOTP QR timer ── */
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      const remaining = 30 - (Math.floor(now / 1000) % 30);
      setQrCountdown(remaining);
      if (remaining === 30) setQrEpoch(now);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const trustScore = useMemo(() => computeTrustScore(kycStatus, propertyCount), [kycStatus, propertyCount]);
  const qrPayload = useMemo(() => generateTOTPPayload(user, qrEpoch), [user, qrEpoch]);

  const copyBID = useCallback(() => {
    const bid = user?.blockchainId || '';
    if (!bid) return;
    navigator.clipboard.writeText(bid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [user]);

  const bioHash = useMemo(() => user?.blockchainVerificationHash || user?.blockchainId || '', [user]);

  if (!user) return null;

  const bid = user.blockchainId || 'BID-PENDING';
  const biometricEnrolled = !!(kycStatus?.fingerprintEnrolled || kycStatus?.faceEnrolled);
  const kycLevel = kycStatus?.kycLevel || 'none';
  const verifications = [
    { key: 'aadhaar', label: 'Aadhaar e-KYC', icon: <FaShieldAlt />, done: !!kycStatus?.aadhaarVerified },
    { key: 'pan', label: 'PAN Verification', icon: <FaCertificate />, done: !!kycStatus?.panVerified },
    { key: 'fingerprint', label: 'Fingerprint (FIDO2)', icon: <FaFingerprint />, done: !!kycStatus?.fingerprintEnrolled },
    { key: 'face', label: 'Face Liveness', icon: <FaUserShield />, done: !!kycStatus?.faceEnrolled },
  ];
  const verifiedCount = verifications.filter(v => v.done).length;

  /* ── Animation variants ── */
  const panelVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.97 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.12 }
    }
  };

  const columnVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.08 } }
  };

  const cardSlideUp = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  const headerBadgeVariants = {
    hidden: { opacity: 0, scale: 0.8, x: 10 },
    visible: (i) => ({
      opacity: 1, scale: 1, x: 0,
      transition: { delay: 0.3 + i * 0.1, type: 'spring', stiffness: 400, damping: 20 }
    })
  };

  const verifyRowVariants = {
    hidden: { opacity: 0, x: -16 },
    visible: (i) => ({
      opacity: 1, x: 0,
      transition: { delay: 0.1 * i, type: 'spring', stiffness: 300, damping: 22 }
    })
  };

  return (
    <>
      <motion.div
        className="sic-panel"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Panel Header ── */}
        <motion.div
          className="sic-panel-header"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="sic-panel-title-group">
            <motion.div
              className="sic-panel-icon"
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.15 }}
              whileHover={{ rotate: [0, -8, 8, -4, 0], transition: { duration: 0.5 } }}
            >
              <FaIdCard />
            </motion.div>
            <div>
              <h2 className="sic-panel-title">Digital Identity Card</h2>
              <p className="sic-panel-subtitle">Sovereign on-chain identity · TOTP QR · AI Trust Score</p>
            </div>
          </div>
          <div className="sic-panel-badges">
            <motion.span
              className={`sic-status-chip ${kycLevel}`}
              custom={0}
              variants={headerBadgeVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.06, y: -1 }}
            >
              <span className="sic-status-dot" />
              KYC: {kycLevel.charAt(0).toUpperCase() + kycLevel.slice(1)}
            </motion.span>
            <motion.span
              className="sic-status-chip chain"
              custom={1}
              variants={headerBadgeVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.06, y: -1 }}
            >
              <FaCube /> Block #{chainData?.currentBlockHeight ?? '—'}
            </motion.span>
          </div>
        </motion.div>

        {/* ── Main 3-Column Grid ── */}
        <motion.div className="sic-main-grid" variants={panelVariants}>

          {/* ═══ LEFT — Physical ID Card ═══ */}
          <motion.div className="sic-card-column" variants={columnVariants}>
            <Tilt
              tiltMaxAngleX={8}
              tiltMaxAngleY={8}
              perspective={1200}
              scale={1.02}
              transitionSpeed={600}
              gyroscope={true}
              glareEnable={true}
              glareMaxOpacity={0.12}
              glarePosition="all"
              glareBorderRadius="16px"
              className="sic-tilt-wrapper"
            >
              <motion.div
                className="sic-card"
                initial={{ rotateY: -8, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ boxShadow: '0 20px 60px rgba(11, 61, 145, 0.4), 0 0 0 1px rgba(255,255,255,0.12) inset' }}
              >
                <div className="sic-holo-overlay" />
                <div className="sic-security-pattern" />
                <div className="sic-laser-scan" />

                {/* Card Top */}
                <motion.div
                  className="sic-card-top"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <div className="sic-emblem">
                    <span className="sic-emblem-icon">🏛️</span>
                    <div className="sic-emblem-text">
                      <span className="sic-gov-label">Government of India</span>
                      <span className="sic-chain-label">Bharat Land Chain</span>
                    </div>
                  </div>
                  <motion.div
                    className={`sic-role-chip sic-role-${user.role === 'buyer' ? 'buyer' : user.role === 'seller' ? 'seller' : 'owner'}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 500, damping: 20 }}
                    whileHover={{ scale: 1.08 }}
                  >
                    {user.role === 'property_owner' ? '🏠 Owner' : user.role === 'buyer' ? '🤝 Buyer' : '📋 Seller'}
                  </motion.div>
                </motion.div>

                {/* Tricolor */}
                <div className="sic-tricolor" />

                {/* Card Body */}
                <motion.div
                  className="sic-card-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <motion.div
                    className="sic-identity-area"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                  >
                    <motion.div
                      className="sic-avatar"
                      whileHover={{ scale: 1.1, rotate: 3 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    </motion.div>
                    <div className="sic-name-block">
                      <h3 className="sic-name">{user.name}</h3>
                      <span className="sic-email">{user.email}</span>
                    </div>
                  </motion.div>

                  {/* BID */}
                  <motion.div
                    className="sic-bid-row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.4 }}
                  >
                    <span className="sic-bid-label">Blockchain ID</span>
                    <div className="sic-bid-value-row">
                      <code className="sic-bid-value">
                        {bidVisible
                          ? bid
                          : bid.length > 12 ? `${bid.slice(0, 6)}${'•'.repeat(8)}${bid.slice(-4)}` : bid
                        }
                      </code>
                      <button className="sic-icon-btn" onClick={() => setBidVisible(v => !v)} title={bidVisible ? 'Hide' : 'Show'}>
                        {bidVisible ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      <button className="sic-icon-btn" onClick={copyBID} title="Copy">
                        {copied ? <FaCheckCircle className="sic-copied" /> : <FaCopy />}
                      </button>
                    </div>
                  </motion.div>

                  {/* Info Grid */}
                  <div className="sic-info-grid">
                    <div className="sic-info-cell">
                      <span className="sic-info-k">Phone</span>
                      <span className="sic-info-v">{user.phoneNumber || '—'}</span>
                    </div>
                    <div className="sic-info-cell">
                      <span className="sic-info-k">Properties</span>
                      <span className="sic-info-v">{propertyCount} registered</span>
                    </div>
                    <div className="sic-info-cell">
                      <span className="sic-info-k">Issued</span>
                      <span className="sic-info-v">{new Date(user.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="sic-info-cell">
                      <span className="sic-info-k">Chain</span>
                      <span className="sic-info-v sic-mono">{chainData?.chainId?.slice(0, 16) || 'BHARAT-LAND'}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Card Bottom */}
                <motion.div
                  className="sic-card-bottom"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.4 }}
                >
                  <div className="sic-biometric-mini">
                    <BiometricHashArt enrolled={biometricEnrolled} hash={bioHash} />
                    <span className={`sic-bio-tag ${biometricEnrolled ? 'enrolled' : ''}`}>
                      {biometricEnrolled ? <><FaFingerprint /> Linked</> : <><FaLock /> Not Enrolled</>}
                    </span>
                  </div>
                  <span className="sic-watermark">Smart Bhoomi Sovereign Registry</span>
                </motion.div>
              </motion.div>
            </Tilt>
          </motion.div>

          {/* ═══ CENTER — Trust Score + Verifications ═══ */}
          <motion.div className="sic-center-column" variants={columnVariants}>
            {/* Trust Score */}
            <motion.div className="sic-trust-card" variants={cardSlideUp} whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(11,61,145,0.1)' }}>
              <div className="sic-trust-header">
                <h4>AI Trust Score</h4>
                <span className={`sic-grade sic-grade-${trustGrade(trustScore).replace('+', 'plus')}`}>
                  {trustGrade(trustScore)}
                </span>
              </div>
              <div className="sic-trust-ring-container">
                <div className="sic-trust-ring">
                  <CircularProgressbar
                    value={trustScore}
                    text={`${trustScore}`}
                    styles={buildStyles({
                      textSize: '26px',
                      textColor: '#0F172A',
                      pathColor: trustColor(trustScore),
                      trailColor: '#E2E8F0',
                      pathTransitionDuration: 1.2,
                      strokeLinecap: 'round',
                    })}
                  />
                </div>
                <span className="sic-trust-status" style={{ color: trustColor(trustScore) }}>
                  {trustLabel(trustScore)}
                </span>
              </div>

              {/* Score Breakdown */}
              <div className="sic-score-breakdown">
                <div className="sic-score-row">
                  <span>Base Account</span>
                  <span className="sic-score-val">+10</span>
                </div>
                <div className={`sic-score-row ${kycStatus?.aadhaarVerified ? 'active' : 'inactive'}`}>
                  <span>Aadhaar e-KYC</span>
                  <span className="sic-score-val">{kycStatus?.aadhaarVerified ? '+20' : '—'}</span>
                </div>
                <div className={`sic-score-row ${kycStatus?.panVerified ? 'active' : 'inactive'}`}>
                  <span>PAN Verified</span>
                  <span className="sic-score-val">{kycStatus?.panVerified ? '+15' : '—'}</span>
                </div>
                <div className={`sic-score-row ${kycStatus?.fingerprintEnrolled ? 'active' : 'inactive'}`}>
                  <span>Fingerprint</span>
                  <span className="sic-score-val">{kycStatus?.fingerprintEnrolled ? '+20' : '—'}</span>
                </div>
                <div className={`sic-score-row ${kycStatus?.faceEnrolled ? 'active' : 'inactive'}`}>
                  <span>Face Liveness</span>
                  <span className="sic-score-val">{kycStatus?.faceEnrolled ? '+15' : '—'}</span>
                </div>
                <div className="sic-score-row">
                  <span>Properties ({propertyCount})</span>
                  <span className="sic-score-val">+{Math.min(propertyCount * 2, 10)}</span>
                </div>
              </div>
            </motion.div>

            {/* Verification Checklist */}
            <motion.div className="sic-verify-card" variants={cardSlideUp} whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(11,61,145,0.1)' }}>
              <div className="sic-verify-header">
                <h4><FaUserCheck /> Verifications</h4>
                <span className="sic-verify-count">{verifiedCount}/{verifications.length}</span>
              </div>
              <div className="sic-verify-list">
                {verifications.map((v, i) => (
                  <motion.div
                    key={v.key}
                    className={`sic-verify-row ${v.done ? 'done' : 'pending'}`}
                    custom={i}
                    variants={verifyRowVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ x: 4, backgroundColor: v.done ? '#ECFDF5' : '#FAFBFF' }}
                  >
                    <span className="sic-verify-icon">{v.icon}</span>
                    <span className="sic-verify-label">{v.label}</span>
                    <span className="sic-verify-badge">
                      {v.done ? <><FaCheckCircle /> Done</> : <><FaTimesCircle /> Pending</>}
                    </span>
                  </motion.div>
                ))}
              </div>
              <motion.div
                className="sic-verify-progress"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
                style={{ transformOrigin: 'left' }}
              >
                <div className="sic-verify-progress-bar" style={{ width: `${(verifiedCount / verifications.length) * 100}%` }} />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ═══ RIGHT — QR Code + Chain Info ═══ */}
          <motion.div className="sic-right-column" variants={columnVariants}>
            <motion.div className="sic-qr-card" variants={cardSlideUp} whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(11,61,145,0.1)' }}>
              <div className="sic-qr-card-header">
                <h4><FaQrcode /> Identity QR</h4>
                <span className="sic-qr-totp-tag">TOTP · {qrCountdown}s</span>
              </div>
              <div className="sic-qr-display" onClick={() => setShowQRModal(true)}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={qrEpoch}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="sic-qr-frame"
                  >
                    <QRCode
                      value={qrPayload}
                      size={180}
                      bgColor="#FFFFFF"
                      fgColor="#0B3D91"
                      level="H"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="sic-qr-expand-hint">
                  <FaEye /> Click to enlarge
                </div>
              </div>
              {/* Timer */}
              <div className="sic-qr-timer">
                <div className="sic-qr-timer-fill" style={{ width: `${(qrCountdown / 30) * 100}%` }} />
              </div>
              <div className="sic-qr-footer">
                <FaSync className={`sic-qr-sync ${qrCountdown <= 5 ? 'warning' : ''}`} />
                <span>Regenerates in <strong>{qrCountdown}s</strong></span>
              </div>
              <p className="sic-qr-note">Scan to verify identity on-chain. QR rotates every 30s for security.</p>
            </motion.div>

            {/* Chain Status */}
            <motion.div className="sic-chain-card" variants={cardSlideUp} whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(11,61,145,0.1)' }}>
              <h4><FaLink /> Chain Status</h4>
              <div className="sic-chain-rows">
                <div className="sic-chain-row">
                  <span className="sic-chain-k">Network</span>
                  <span className="sic-chain-v">{chainData?.chainId || 'BHARAT-LAND-CHAIN'}</span>
                </div>
                <div className="sic-chain-row">
                  <span className="sic-chain-k">Block Height</span>
                  <span className="sic-chain-v sic-mono">#{chainData?.currentBlockHeight ?? '—'}</span>
                </div>
                <div className="sic-chain-row">
                  <span className="sic-chain-k">Consensus</span>
                  <span className="sic-chain-v">{chainData?.consensus || 'PoA-PBFT'}</span>
                </div>
                <div className="sic-chain-row">
                  <span className="sic-chain-k">Status</span>
                  <span className="sic-chain-v sic-chain-live">● Active</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── QR Fullscreen Modal ── */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            className="sic-qr-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              className="sic-qr-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sic-qr-modal-header">
                <h3><FaQrcode /> Sovereign Identity QR</h3>
                <button className="sic-qr-modal-close" onClick={() => setShowQRModal(false)}>✕</button>
              </div>
              <div className="sic-qr-modal-body">
                <div className="sic-qr-modal-frame">
                  <QRCode
                    value={qrPayload}
                    size={280}
                    bgColor="#FFFFFF"
                    fgColor="#0B3D91"
                    level="H"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <div className="sic-qr-modal-info">
                  <p><strong>{user.name}</strong></p>
                  <code className="sic-qr-modal-bid">{bid}</code>
                  <div className="sic-qr-modal-timer">
                    <div className="sic-qr-timer">
                      <div className="sic-qr-timer-fill" style={{ width: `${(qrCountdown / 30) * 100}%` }} />
                    </div>
                    <span>Expires in {qrCountdown}s</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartIdentityCard;
