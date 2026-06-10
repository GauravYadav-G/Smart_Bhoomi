import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIntelligence } from '../context/IntelligenceContext';
import { propertyAPI, transferAPI, authAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
  FaBuilding,
  FaExchangeAlt,
  FaCheckCircle,
  FaIdCard,
  FaShoppingCart,
  FaClock,
  FaBrain,
  FaRobot,
  FaExclamationTriangle,
  FaArrowRight,
  FaChartLine,
  FaFingerprint,
  FaGlobe,
  FaEye,
  FaUsers,
  FaDownload,
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import './Dashboard.css';
import SmartIdentityCard from '../components/SmartIdentityCard';
import BlockchainConfirmation from '../components/BlockchainConfirmation';

/* ─── Animation Variants ─── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const fadeScale = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};
const staggerGrid = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardPop = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── Floating Particles ─── */
const FloatingParticles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
    })), []
  );
  return (
    <div className="db-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="db-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

/* ─── Animated Stat Card ─── */
const StatCard = ({ icon, value, label, type, delay = 0 }) => (
  <motion.div
    className={`db-stat-card ${type || ''}`}
    variants={cardPop}
    whileHover={{ y: -6, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="db-stat-glow" />
    <div className={`db-stat-icon ${type || ''}`}>
      {icon}
    </div>
    <div className="db-stat-value">
      <CountUp end={value} duration={1.8} delay={delay} separator="," />
    </div>
    <div className="db-stat-label">{label}</div>
    <div className="db-stat-shine" />
  </motion.div>
);

/* ─── Quick Action Button ─── */
const ActionCard = ({ to, icon, label, description, variant = 'default' }) => (
  <motion.div variants={cardPop} whileHover={{ y: -4, scale: 1.015 }} whileTap={{ scale: 0.98 }}>
    <Link to={to} className={`db-action-card ${variant}`}>
      <div className="db-action-icon">{icon}</div>
      <div className="db-action-text">
        <span className="db-action-label">{label}</span>
        <span className="db-action-desc">{description}</span>
      </div>
      <FaArrowRight className="db-action-arrow" />
    </Link>
  </motion.div>
);

/* ─── Property Row ─── */
const PropertyRow = ({ property, index, isBuying = false, onDownloadCertificate }) => (
  <motion.div
    className={`db-prop-row ${isBuying ? 'buying' : property.verification?.status || ''} ${property.status && property.status !== 'active' ? 'prop-' + property.status : ''}`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ x: 6 }}
  >
    <div className="db-prop-indicator" />
    <div className="db-prop-content">
      <h4>{isBuying ? (property.propertyDetails?.title || 'Property') : property.propertyDetails?.title}</h4>
      <p className="db-prop-location">
        📍 {isBuying ? property.propertyDetails?.address?.city : property.propertyDetails?.address?.city}, {isBuying ? property.propertyDetails?.address?.state : property.propertyDetails?.address?.state}
      </p>
      {!isBuying && <p className="db-prop-id">🆔 {property.propertyId}</p>}
      <div className="db-prop-badges">
        {isBuying ? (
          <>
            <span className={`db-badge ${property.transferStatus}`}>{property.transferStatus?.replace('_', ' ')}</span>
            {property.proposedPrice && <span className="db-badge price">₹{property.proposedPrice.toLocaleString('en-IN')}</span>}
          </>
        ) : (
          <>
            <span className={`db-badge ${property.verification?.status}`}>{property.verification?.status?.replace(/_/g, ' ')}</span>
            {property.status === 'frozen' && <span className="db-badge frozen">❄️ Frozen</span>}
            {property.status === 'disputed' && <span className="db-badge disputed">⚖️ Disputed</span>}
            {property.status === 'archived' && <span className="db-badge archived">📦 Archived</span>}
          </>
        )}
      </div>
      {!isBuying && property.status && property.status !== 'active' && property.status !== 'transfer_pending' && property.verification?.adminNotes && (
        <p className="db-prop-note">
          <FaExclamationTriangle />
          {property.verification.adminNotes.split('\n')[0]}
        </p>
      )}
    </div>
    <div className="db-prop-actions">
      <Link to={isBuying ? `/properties/${property.propertyId}` : `/properties/${property.propertyId}`} className="db-view-btn">
        <FaEye /> <span>View</span>
      </Link>
      {!isBuying && (
        <button 
          onClick={(e) => { e.preventDefault(); onDownloadCertificate(property); }} 
          className="db-view-btn outline"
          title="Download Blockchain Certificate"
          style={{ cursor: 'pointer', border: '1px solid var(--glass-border)' }}
        >
          <FaDownload /> <span>Certificate</span>
        </button>
      )}
      {isBuying && (
        <Link to="/transfers" className="db-view-btn outline">
          <FaExchangeAlt /> <span>Transfer</span>
        </Link>
      )}
    </div>
  </motion.div>
);


const Dashboard = () => {
  const { user } = useAuth();
  const { workflowSuggestions, riskAlerts } = useIntelligence();
  const navigate = useNavigate();

  /* ─── Dashboard State ─── */
  const [stats, setStats] = useState({
    totalProperties: 0, verifiedProperties: 0, pendingTransfers: 0,
    completedTransfers: 0, buyingProperties: 0, frozenProperties: 0, flaggedProperties: 0,
  });
  const [recentProperties, setRecentProperties] = useState([]);
  const [buyingProperties, setBuyingProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('owned');

  /* ─── Nominee Setup State ─── */
  const [showNomineeSetup, setShowNomineeSetup] = useState(false);
  const [nomineeForm, setNomineeForm] = useState({
    name: '', email: '', phoneNumber: '', relationship: '', governmentId: '', passphrase: '', confirmPassphrase: ''
  });
  const [nomineeLoading, setNomineeLoading] = useState(false);
  const [nomineeError, setNomineeError] = useState('');
  const [nomineeSuccess, setNomineeSuccess] = useState(false);

  /* ─── Certificate Modal State ─── */
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedPropertyForCertificate, setSelectedPropertyForCertificate] = useState(null);

  const handleDownloadCertificate = (property) => {
    setSelectedPropertyForCertificate(property);
    setShowCertificateModal(true);
  };


  /* ─── Time Greeting ─── */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  useEffect(() => { if (user) fetchDashboardData(); }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [propertiesRes, transfersRes] = await Promise.all([
        propertyAPI.getMyProperties(),
        transferAPI.getAllTransfers(),
      ]);
      const properties = propertiesRes.data.properties;
      const transfers = transfersRes.data.transfers;
      const buyerTransfers = transfers.filter(t => t.buyer?._id === user?.id);
      const buyingProps = buyerTransfers
        .filter(t => ['pending', 'owner_approved', 'payment_pending', 'payment_completed'].includes(t.status))
        .map(t => ({ ...t.property, transferStatus: t.status, transferId: t.requestId, proposedPrice: t.proposedPrice }));

      setStats({
        totalProperties: properties.length,
        verifiedProperties: properties.filter(p => p.verification.status === 'verified').length,
        pendingTransfers: transfers.filter(t => t.status === 'pending' || t.status === 'owner_approved').length,
        completedTransfers: transfers.filter(t => t.status === 'completed').length,
        buyingProperties: buyingProps.length,
        frozenProperties: properties.filter(p => p.status === 'frozen').length,
        flaggedProperties: properties.filter(p => p.verification.status === 'needs_review').length,
      });
      setRecentProperties(properties.slice(0, 5));
      setBuyingProperties(buyingProps.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  /* ─── Nominee Setup Handler ─── */
  const handleSetupNominee = async () => {
    setNomineeError('');
    const { name, email, relationship, governmentId, passphrase, confirmPassphrase } = nomineeForm;
    if (!name || !email || !relationship || !governmentId || !passphrase) {
      setNomineeError('All fields are required');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setNomineeError('Passphrases do not match');
      return;
    }
    if (passphrase.length < 8) {
      setNomineeError('Passphrase must be at least 8 characters');
      return;
    }
    setNomineeLoading(true);
    try {
      await authAPI.setupNominee({
        nomineeName: name,
        nomineeEmail: email,
        nomineePhone: nomineeForm.phoneNumber,
        relationship,
        nomineeGovId: governmentId,
        nomineePassphrase: passphrase
      });
      setNomineeSuccess(true);
      setNomineeForm({ name: '', email: '', phoneNumber: '', relationship: '', governmentId: '', passphrase: '', confirmPassphrase: '' });
    } catch (err) {
      setNomineeError(err.response?.data?.message || 'Failed to setup nominee');
    } finally {
      setNomineeLoading(false);
    }
  };

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="db-loading">
        <div className="db-loading-ring">
          <div className="db-loading-orbit" />
          <div className="db-loading-orbit db-orbit-2" />
          <div className="db-loading-orbit db-orbit-3" />
          <FaGlobe className="db-loading-icon" />
        </div>
        <p>Initializing Dashboard...</p>
        <div className="db-loading-bar"><div className="db-loading-fill" /></div>
      </div>
    );
  }

  return (
    <>
      {/* ─── MAIN DASHBOARD ─── */}
      <motion.div className="db-premium" variants={pageVariants} initial="hidden" animate="visible">
        <FloatingParticles />

        {/* ─── HEADER ─── */}
        <motion.div className="db-header" variants={fadeUp}>
          <div className="db-header-bg">
            <div className="db-header-orb db-orb-1" />
            <div className="db-header-orb db-orb-2" />
            <div className="db-header-orb db-orb-3" />
          </div>
          <div className="db-tricolor-top" />
          <div className="db-header-content">
            <div className="db-header-left">
              <motion.div className="db-greeting-badge"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <HiSparkles /> {greeting}
              </motion.div>
              <h1 className="db-header-title">
                Welcome back, <span className="db-name-highlight">{user?.name}</span>
              </h1>
              <p className="db-header-sub">Property Owner Command Center</p>
              <div className="db-header-meta">
                <span className="db-meta-item"><FaGlobe /> Smart Bhoomi Registry</span>
                <span className="db-meta-divider">•</span>
                <span className="db-meta-item"><FaFingerprint /> Secured Session</span>
              </div>
            </div>
            <div className="db-header-right">
              <motion.div className="db-role-chip"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <div className="db-role-dot" />
                {user?.role?.replace('_', ' ').toUpperCase()}
              </motion.div>
              <div className="db-date-display">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── STATS GRID ─── */}
        <motion.div className="db-stats-grid" variants={staggerGrid}>
          <StatCard icon={<FaBuilding />} value={stats.totalProperties} label="Properties Owned" type="primary" delay={0.1} />
          <StatCard icon={<FaShoppingCart />} value={stats.buyingProperties} label="Properties Buying" type="buying" delay={0.15} />
          <StatCard icon={<FaCheckCircle />} value={stats.verifiedProperties} label="Verified Properties" type="verified" delay={0.2} />
          <StatCard icon={<FaClock />} value={stats.pendingTransfers} label="Pending Transfers" type="pending" delay={0.25} />
          <StatCard icon={<FaChartLine />} value={stats.completedTransfers} label="Completed Transfers" type="completed" delay={0.3} />
          {stats.frozenProperties > 0 && (
            <StatCard icon={<FaExclamationTriangle />} value={stats.frozenProperties} label="Frozen Properties" type="frozen" delay={0.35} />
          )}
          {stats.flaggedProperties > 0 && (
            <StatCard icon={<FaExclamationTriangle />} value={stats.flaggedProperties} label="Under Review" type="flagged" delay={0.4} />
          )}
        </motion.div>

        {/* ─── QUICK ACTIONS ─── */}
        <motion.div className="db-actions-section" variants={fadeUp}>
          <h2 className="db-section-title"><HiSparkles /> Quick Actions</h2>
          <motion.div className="db-actions-grid" variants={staggerGrid}>
            <ActionCard to="/register-property" icon={<FaBuilding />} label="Register Property" description="Add new land record" variant="primary" />
            <ActionCard to="/properties" icon={<FaEye />} label="All Properties" description="View your portfolio" variant="default" />
            <ActionCard to="/transfers" icon={<FaExchangeAlt />} label="Transfers" description="Manage transfers" variant="default" />
            <ActionCard to="/kyc" icon={<FaIdCard />} label="KYC & Biometrics" description="Identity verification" variant="success" />
          </motion.div>
        </motion.div>

        {/* ─── SMART IDENTITY CARD ─── */}
        <motion.div variants={fadeScale}>
          <SmartIdentityCard />
        </motion.div>


        {/* ─── NOMINEE SETUP ─── */}
        <motion.div className="db-security-card" variants={fadeUp} style={{ marginTop: '16px' }}>
          <div className="db-security-inner">
            <div className="db-security-left">
              <div className={`db-security-icon ${nomineeSuccess || user?.nominee?.name ? 'active' : ''}`}>
                <FaUsers />
                {(nomineeSuccess || user?.nominee?.name) && <div className="db-security-pulse" />}
              </div>
              <div className="db-security-info">
                <h3>Nominee Access</h3>
                <p>{user?.nominee?.name ? `Nominee: ${user.nominee.name}` : 'Set up a nominee for emergency access'}</p>
              </div>
            </div>
            <div className="db-security-right">
              <span className={`db-security-status ${user?.nominee?.name || nomineeSuccess ? 'on' : 'off'}`}>
                <span className="db-status-dot" />
                {user?.nominee?.name || nomineeSuccess ? 'Configured' : 'Not Set'}
              </span>
              {!nomineeSuccess && !user?.nominee?.name && (
                <motion.button className="db-mfa-btn db-mfa-enable" onClick={() => setShowNomineeSetup(!showNomineeSetup)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <FaUsers /> {showNomineeSetup ? 'Cancel' : 'Setup Nominee'}
                </motion.button>
              )}
            </div>
          </div>
          {nomineeSuccess && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '12px 16px', margin: '12px 16px 16px', fontSize: '13px', color: '#065F46' }}>
              ✅ Nominee configured successfully. Share the passphrase securely with your nominee.
            </div>
          )}
          {nomineeError && <div className="db-mfa-error" style={{ margin: '8px 16px' }}>{nomineeError}</div>}
          <AnimatePresence>
            {showNomineeSetup && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden', padding: '0 16px 16px' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  <input type="text" placeholder="Nominee Full Name *" value={nomineeForm.name}
                    onChange={e => setNomineeForm({ ...nomineeForm, name: e.target.value })}
                    style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                  <input type="email" placeholder="Nominee Email *" value={nomineeForm.email}
                    onChange={e => setNomineeForm({ ...nomineeForm, email: e.target.value })}
                    style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                  <input type="tel" placeholder="Phone (optional)" value={nomineeForm.phoneNumber}
                    onChange={e => setNomineeForm({ ...nomineeForm, phoneNumber: e.target.value })}
                    style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                  <select value={nomineeForm.relationship}
                    onChange={e => setNomineeForm({ ...nomineeForm, relationship: e.target.value })}
                    style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', color: nomineeForm.relationship ? '#0f172a' : '#94a3b8' }}>
                    <option value="">Relationship *</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="legal_heir">Legal Heir</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="text" placeholder="Government ID (Aadhaar/PAN) *" value={nomineeForm.governmentId}
                    onChange={e => setNomineeForm({ ...nomineeForm, governmentId: e.target.value })}
                    style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', gridColumn: '1 / -1' }} />
                  <input type="password" placeholder="Nominee Passphrase (min 8 chars) *" value={nomineeForm.passphrase}
                    onChange={e => setNomineeForm({ ...nomineeForm, passphrase: e.target.value })}
                    style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                  <input type="password" placeholder="Confirm Passphrase *" value={nomineeForm.confirmPassphrase}
                    onChange={e => setNomineeForm({ ...nomineeForm, confirmPassphrase: e.target.value })}
                    style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                </div>
                <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '10px 14px', margin: '12px 0', fontSize: '12px', color: '#0369A1', lineHeight: 1.5 }}>
                  ℹ️ The nominee passphrase cannot be recovered. Store it securely and share it with your nominated person.
                </div>
                <motion.button
                  onClick={handleSetupNominee} disabled={nomineeLoading}
                  style={{
                    width: '100%', padding: '12px', border: 'none', borderRadius: '8px',
                    background: '#0B3D91', color: '#fff', fontSize: '14px', fontWeight: 600,
                    cursor: nomineeLoading ? 'wait' : 'pointer', opacity: nomineeLoading ? 0.7 : 1
                  }}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                >
                  {nomineeLoading ? 'Setting up...' : '🛡️ Configure Nominee Access'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ─── PROPERTIES SECTION ─── */}
        <motion.div className="db-properties-section" variants={fadeUp}>
          <div className="db-tabs">
            <button className={`db-tab ${activeTab === 'owned' ? 'active' : ''}`} onClick={() => setActiveTab('owned')}>
              <FaBuilding />
              <span>My Properties</span>
              <span className="db-tab-count">{stats.totalProperties}</span>
            </button>
            <button className={`db-tab ${activeTab === 'buying' ? 'active' : ''}`} onClick={() => setActiveTab('buying')}>
              <FaShoppingCart />
              <span>Buying</span>
              <span className="db-tab-count">{stats.buyingProperties}</span>
            </button>
            <div className={`db-tab-indicator ${activeTab === 'buying' ? 'right' : ''}`} />
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'owned' && (
              <motion.div key="owned" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                {recentProperties.length > 0 ? (
                  <div className="db-prop-list">
                    {recentProperties.map((property, i) => (
                      <PropertyRow key={property._id} property={property} index={i} onDownloadCertificate={handleDownloadCertificate} />
                    ))}
                  </div>
                ) : (
                  <div className="db-empty">
                    <div className="db-empty-icon">🏠</div>
                    <h3>No Properties Yet</h3>
                    <p>Start by registering your first property</p>
                    <Link to="/register-property" className="db-empty-btn"><FaBuilding /> Register Property</Link>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'buying' && (
              <motion.div key="buying" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                {buyingProperties.length > 0 ? (
                  <div className="db-prop-list">
                    {buyingProperties.map((property, i) => (
                      <PropertyRow key={property._id} property={property} index={i} isBuying onDownloadCertificate={handleDownloadCertificate} />
                    ))}
                  </div>
                ) : (
                  <div className="db-empty">
                    <div className="db-empty-icon">🛒</div>
                    <h3>No Active Purchases</h3>
                    <p>Browse available properties to make an offer</p>
                    <Link to="/properties" className="db-empty-btn"><FaBuilding /> Browse Properties</Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* ─── AI INTELLIGENCE SIDEBAR ─── */}
      {(workflowSuggestions?.length > 0 || riskAlerts?.length > 0) && (
        <motion.div className="dashboard-intelligence-sidebar"
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          {workflowSuggestions?.length > 0 && (
            <div className="intelligence-widget">
              <div className="widget-header">
                <FaRobot className="widget-icon" />
                <h3>AI Suggestions</h3>
              </div>
              <div className="suggestions-compact-list">
                {workflowSuggestions.slice(0, 3).map(s => (
                  <div key={s.id} className={`suggestion-compact suggestion-${s.priority}`}>
                    <div className="suggestion-compact-icon">
                      {s.type === 'incomplete_registration' && <FaBuilding />}
                      {s.type === 'approval_delay' && <FaClock />}
                      {s.type === 'document_missing' && <FaExclamationTriangle />}
                    </div>
                    <div className="suggestion-compact-content">
                      <p>{s.message}</p>
                      <button className="suggestion-compact-action" onClick={() => navigate(s.actionUrl)}>{s.action}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {riskAlerts?.length > 0 && (
            <div className="intelligence-widget">
              <div className="widget-header widget-header-alert">
                <FaExclamationTriangle className="widget-icon" />
                <h3>Risk Alerts</h3>
                <span className="alert-badge">{riskAlerts.length}</span>
              </div>
              <div className="alerts-compact-list">
                {riskAlerts.slice(0, 2).map(alert => (
                  <div key={alert.id} className={`alert-compact alert-${alert.severity}`}>
                    <div className="alert-compact-header">
                      <span className="alert-severity">{alert.severity}</span>
                      <span className="alert-score">{alert.riskScore}</span>
                    </div>
                    <h4>{alert.title}</h4>
                    <p>{alert.description}</p>
                    <button className="alert-compact-action">Investigate</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="intelligence-widget intelligence-cta">
            <div className="cta-icon"><FaBrain /></div>
            <h3>Full Intelligence Hub</h3>
            <p>Access advanced AI analytics, fraud detection, and system monitoring</p>
            <Link to="/command-center" className="cta-button">Open Command Center</Link>
          </div>
        </motion.div>
      )}

      {/* Blockchain Certificate Modal */}
      {showCertificateModal && selectedPropertyForCertificate && (
        <BlockchainConfirmation
          transaction={{
            hash: selectedPropertyForCertificate.blockchainTransactionId || selectedPropertyForCertificate.blockchainHash || 'N/A',
            blockNumber: selectedPropertyForCertificate.blockNumber || '10482',
            timestamp: selectedPropertyForCertificate.createdAt || new Date().toISOString()
          }}
          property={selectedPropertyForCertificate}
          ipfsCIDs={(selectedPropertyForCertificate.documents || [])
            .filter(d => d.ipfsCID)
            .map(d => ({ name: d.documentType, cid: d.ipfsCID }))}
          onClose={() => {
            setShowCertificateModal(false);
            setSelectedPropertyForCertificate(null);
          }}
        />
      )}

    </>
  );

};

export default Dashboard;
