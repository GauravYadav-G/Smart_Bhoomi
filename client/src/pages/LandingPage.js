import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaBuilding, FaIdCard, FaBullhorn, FaBookOpen, FaLink,
  FaInfoCircle, FaShieldAlt, FaFingerprint,
  FaExchangeAlt, FaChartLine, FaArrowRight, FaCheckCircle,
  FaServer, FaMapMarkedAlt, FaLock, FaUserCheck, FaMicrochip,
  FaGlobeAsia, FaCheck, FaDatabase, FaNode,
  FaSatellite, FaPassport, FaCreditCard, FaUserLock
} from 'react-icons/fa';
import { announcementAPI } from '../services/api';
import './LandingPage.css';

const LandingPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Simulator state
  const [simMode, setSimMode] = useState('gis');
  const [gisStep, setGisStep] = useState('idle');
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [bioScanning, setBioScanning] = useState(false);
  const [bioVerified, setBioVerified] = useState(false);

  const [nodes, setNodes] = useState([
    { id: 1, name: 'Mumbai Validator #1', status: 'Active', ping: '12ms', blocks: 582522 },
    { id: 2, name: 'Delhi Validator #2', status: 'Active', ping: '18ms', blocks: 582522 },
    { id: 3, name: 'Bangalore Validator #3', status: 'Active', ping: '15ms', blocks: 582521 }
  ]);

  useEffect(() => {
    const fetchAnn = async () => {
      try {
        const res = await announcementAPI.getPublicAnnouncements();
        setAnnouncements(res.data.announcements || []);
      } catch (err) {
        console.error('Announcements error:', err);
      }
    };
    fetchAnn();
  }, []);

  // Scroll handler for navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Blockchain live simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(n => ({
        ...n,
        blocks: n.blocks + (Math.random() > 0.5 ? 1 : 0),
        ping: Math.floor(Math.random() * 10 + 10) + 'ms'
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // GIS handlers
  const handlePlotBoundary = useCallback(() => {
    setGisStep('drawing');
    setDrawnPoints([
      { x: 30, y: 30 }, { x: 70, y: 30 },
      { x: 70, y: 70 }, { x: 30, y: 70 }
    ]);
  }, []);

  const handleScanGIS = useCallback((type) => {
    setGisStep('scanning');
    setTimeout(() => {
      setGisStep(type === 'clear' ? 'resolved' : 'conflict');
    }, 2000);
  }, []);

  const resetGIS = useCallback(() => {
    setGisStep('idle');
    setDrawnPoints([]);
  }, []);

  // Biometric handlers
  const handleBioScan = useCallback(() => {
    setBioScanning(true);
    setBioVerified(false);
    setTimeout(() => {
      setBioScanning(false);
      setBioVerified(true);
    }, 2500);
  }, []);

  return (
    <div className="landing-page" id="landing-page">
      {/* Tricolor strip at very top */}
      <div className="lp-tricolor-strip" />

      {/* ─── Floating Navbar ─── */}
      <nav className={`lp-navbar ${scrolled ? 'scrolled' : ''}`} id="lp-navbar">
        <div className="lp-nav-inner">
          <div className="lp-brand" onClick={() => navigate('/')}>
            <div className="lp-brand-icon">
              <img src="/smart-bhoomi-logo.svg" alt="Smart Bhoomi" />
            </div>
            <div className="lp-brand-text">
              <span className="lp-brand-name">Smart Bhoomi</span>
              <span className="lp-brand-sub">Government Property Registry</span>
            </div>
          </div>

          <div className="lp-nav-actions">
            {isAuthenticated ? (
              <button className="lp-btn-solid" onClick={() => navigate('/dashboard')} id="nav-dashboard-btn">
                Go to Portal <FaArrowRight />
              </button>
            ) : (
              <>
                <button className="lp-btn-ghost" onClick={() => navigate('/login')} id="nav-login-btn">
                  Portal Login
                </button>
                <button className="lp-btn-solid" onClick={() => navigate('/register')} id="nav-register-btn">
                  Get Started <FaArrowRight />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="lp-hero" id="hero-section">
        <div className="lp-hero-orb lp-orb-1" />
        <div className="lp-hero-orb lp-orb-2" />
        <div className="lp-hero-orb lp-orb-3" />
        <div className="lp-hero-grid" />

        <div className="lp-hero-content">
          {/* Left Column */}
          <div className="lp-hero-left">
            <div className="lp-hero-badge">
              <FaShieldAlt /> Sovereign Registry Network
            </div>

            <h1 className="lp-hero-title">
              India's Digital{' '}
              <span className="lp-gradient-text">Land Registry</span>{' '}
              Infrastructure
            </h1>

            <p className="lp-hero-desc">
              A blockchain-secured property portal combining decentralized consensus, real-time spatial analysis, and hardware biometrics — built for transparent, tamper-proof land governance.
            </p>

            <div className="lp-hero-btns">
              {isAuthenticated ? (
                <>
                  <button className="lp-btn-hero-primary" onClick={() => navigate('/dashboard')} id="hero-dashboard-btn">
                    <FaBuilding /> Open Dashboard
                  </button>
                  <button className="lp-btn-hero-secondary" onClick={() => navigate('/register-property')} id="hero-register-property-btn">
                    <FaIdCard /> File Registry
                  </button>
                </>
              ) : (
                <>
                  <button className="lp-btn-hero-primary" onClick={() => navigate('/login')} id="hero-login-btn">
                    Access Portal <FaArrowRight />
                  </button>
                  <button className="lp-btn-hero-secondary" onClick={() => navigate('/register')} id="hero-register-btn">
                    <FaUserCheck /> Register Account
                  </button>
                </>
              )}
            </div>

            <div className="lp-hero-metrics">
              <div className="lp-metric-item">
                <span className="lp-metric-val">582K+</span>
                <span className="lp-metric-lbl">Blocks Sealed</span>
              </div>
              <div className="lp-metric-item">
                <span className="lp-metric-val saffron">0.00%</span>
                <span className="lp-metric-lbl">Dispute Ratio</span>
              </div>
              <div className="lp-metric-item">
                <span className="lp-metric-val emerald">15ms</span>
                <span className="lp-metric-lbl">Node Latency</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Simulator */}
          <div className="lp-hero-right">
            <div className="lp-sim-panel">
              <div className="lp-sim-chrome">
                <div className="lp-chrome-dots">
                  <span className="lp-dot red" />
                  <span className="lp-dot yellow" />
                  <span className="lp-dot green" />
                </div>
                <div className="lp-chrome-url">
                  <FaLock /> portal.smartbhoomi.gov.in/sandbox
                </div>
              </div>

              <div className="lp-sim-body">
                <div className="lp-sim-sidebar">
                  <button className={`lp-sim-tab ${simMode === 'gis' ? 'active' : ''}`} onClick={() => setSimMode('gis')}>
                    <FaMapMarkedAlt /> GIS Spatial
                  </button>
                  <button className={`lp-sim-tab ${simMode === 'ledger' ? 'active' : ''}`} onClick={() => setSimMode('ledger')}>
                    <FaServer /> Blockchain
                  </button>
                  <button className={`lp-sim-tab ${simMode === 'biometric' ? 'active' : ''}`} onClick={() => setSimMode('biometric')}>
                    <FaFingerprint /> Biometrics
                  </button>
                  <button className={`lp-sim-tab ${simMode === 'ai' ? 'active' : ''}`} onClick={() => setSimMode('ai')}>
                    <FaMicrochip /> AI Auditing
                  </button>
                </div>

                <div className="lp-sim-display">
                  {/* ─── GIS Simulator ─── */}
                  {simMode === 'gis' && (
                    <div>
                      <div className="lp-sim-title-bar">
                        <span>GIS SPATIAL SURVEYOR</span>
                        <span className="lp-status-tag cyan">LIVE</span>
                      </div>
                      <div className="lp-gis-canvas">
                        <div className="lp-gis-dots">
                          {[...Array(64)].map((_, i) => <div key={i} className="lp-gis-cell" />)}
                        </div>

                        {gisStep === 'scanning' && <div className="lp-sweep-line" />}

                        {drawnPoints.length > 0 && (
                          <svg className="lp-gis-svg" viewBox="0 0 100 100">
                            <polygon
                              points={drawnPoints.map(p => `${p.x},${p.y}`).join(' ')}
                              className={`lp-poly ${gisStep}`}
                            />
                            {gisStep === 'scanning' && (
                              <circle cx="50" cy="50" r="15" className="lp-scan-ring" />
                            )}
                            {gisStep === 'conflict' && (
                              <circle cx="65" cy="50" r="6" className="lp-conflict-dot" />
                            )}
                          </svg>
                        )}

                        {gisStep === 'idle' && (
                          <div className="lp-canvas-overlay">
                            <p>Simulate spatial conflict resolution</p>
                            <button className="lp-sim-btn" onClick={handlePlotBoundary}>Plot Boundary Points</button>
                          </div>
                        )}
                        {gisStep === 'drawing' && (
                          <div className="lp-canvas-overlay">
                            <p>Points mapped. Select scan profile:</p>
                            <div className="lp-sim-btn-row">
                              <button className="lp-sim-btn teal" onClick={() => handleScanGIS('clear')}>Scan (Clear)</button>
                              <button className="lp-sim-btn red" onClick={() => handleScanGIS('conflict')}>Scan (Conflict)</button>
                            </div>
                          </div>
                        )}
                        {gisStep === 'scanning' && (
                          <div className="lp-canvas-overlay">
                            <p className="lp-loading-dots">Running overlap algorithms</p>
                          </div>
                        )}
                        {gisStep === 'resolved' && (
                          <div className="lp-canvas-overlay">
                            <FaCheckCircle className="lp-resolved-icon" />
                            <p><strong>0.00% Spatial Conflict</strong></p>
                            <span className="sub">Plot matched with state cadastral maps.</span>
                            <button className="lp-sim-reset" onClick={resetGIS}>Reset</button>
                          </div>
                        )}
                        {gisStep === 'conflict' && (
                          <div className="lp-canvas-overlay">
                            <FaInfoCircle className="lp-conflict-icon" />
                            <p><strong>Boundary Overlap Warning</strong></p>
                            <span className="sub">1.48m overlap with parcel KA-4029</span>
                            <button className="lp-sim-reset" onClick={resetGIS}>Reset</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── Blockchain Simulator ─── */}
                  {simMode === 'ledger' && (
                    <div>
                      <div className="lp-sim-title-bar">
                        <span>VALIDATOR CHAIN STATS</span>
                        <span className="lp-status-tag green">MAINNET</span>
                      </div>
                      <div className="lp-chain-nodes">
                        {nodes.map(n => (
                          <div key={n.id} className="lp-node-card">
                            <div className="lp-node-left">
                              <FaNode className="lp-node-icon" />
                              <div className="lp-node-info">
                                <strong>{n.name}</strong>
                                <span>Ping: {n.ping}</span>
                              </div>
                            </div>
                            <div className="lp-node-right">
                              <span>Block #{n.blocks}</span>
                              <span className="lp-node-active">Active</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="lp-consensus-bar">
                        <FaShieldAlt /> PoA Consensus: 3/3 signatures required
                      </div>
                    </div>
                  )}

                  {/* ─── Biometric Simulator ─── */}
                  {simMode === 'biometric' && (
                    <div>
                      <div className="lp-sim-title-bar">
                        <span>WEBAUTHN PASSKEY</span>
                        <span className="lp-status-tag purple">BIOMETRIC</span>
                      </div>
                      <div className="lp-bio-workspace">
                        <div className={`lp-fp-box ${bioScanning ? 'scanning' : ''} ${bioVerified ? 'verified' : ''}`}>
                          <FaFingerprint className="lp-fp-icon" />
                          {bioScanning && <div className="lp-fp-laser" />}
                        </div>
                        <div className="lp-bio-info">
                          <strong>Profile Identity Lock</strong>
                          <p>Simulate biometric scanner verification.</p>
                          {!bioScanning && !bioVerified && (
                            <button className="lp-sim-btn purple" onClick={handleBioScan}>Verify Passkey</button>
                          )}
                          {bioScanning && (
                            <span className="lp-scan-blink">Verifying hardware passkey...</span>
                          )}
                          {bioVerified && (
                            <div className="lp-verified-block">
                              <span className="check"><FaCheck /> Verification Succeeded</span>
                              <button className="lp-sim-reset" onClick={() => setBioVerified(false)}>Reset</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── AI Auditing Simulator ─── */}
                  {simMode === 'ai' && (
                    <div>
                      <div className="lp-sim-title-bar">
                        <span>FRAUD INTELLIGENCE ENGINE</span>
                        <span className="lp-status-tag orange">DIAGNOSTIC</span>
                      </div>
                      <div className="lp-ai-dashboard">
                        <div className="lp-ai-gauge">
                          <svg viewBox="0 0 36 36">
                            <path className="lp-gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="lp-gauge-fill" strokeDasharray="94, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <div className="lp-gauge-text">
                            <strong>94%</strong>
                            <span>Registry Safety</span>
                          </div>
                        </div>
                        <div className="lp-ai-checks">
                          <div className="lp-check-row">
                            <span>Biometric Match</span>
                            <span className="lp-check-badge green"><FaCheck /> 99.8%</span>
                          </div>
                          <div className="lp-check-row">
                            <span>Spatial Overlay</span>
                            <span className="lp-check-badge green"><FaCheck /> 0.0m</span>
                          </div>
                          <div className="lp-check-row">
                            <span>Chain Audit</span>
                            <span className="lp-check-badge yellow"><FaInfoCircle /> 1 Alert</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES / INFRASTRUCTURE BENTO ═══ */}
      <section className="lp-features" id="features-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag"><FaShieldAlt /> Core Infrastructure</span>
            <h2 className="lp-section-title">Built with robust security protocols</h2>
            <p className="lp-section-desc">
              Next-generation decentralized capabilities integrated with hardware-bound government systems.
            </p>
          </div>

          <div className="lp-features-grid">
            {/* Blockchain Card */}
            <div className="lp-feature-card span-2">
              <div className="lp-feature-icon"><FaShieldAlt /></div>
              <h3>Bharat Land Chain Ledger</h3>
              <p>Immutable Proof-of-Authority validator architecture sealing cadastral records. Historic deeds cannot be edited or erased by third-parties.</p>
              <div className="lp-node-chips">
                <div className="lp-node-chip"><span className="lp-chip-dot" /> Mumbai Node #1</div>
                <div className="lp-node-chip"><span className="lp-chip-dot" /> Delhi Node #2</div>
                <div className="lp-node-chip"><span className="lp-chip-dot" /> Bangalore Node #3</div>
              </div>
            </div>

            {/* WebAuthn Card */}
            <div className="lp-feature-card">
              <div className="lp-feature-icon"><FaFingerprint /></div>
              <h3>WebAuthn Passkeys</h3>
              <p>Cryptographic passkeys locked to physical devices. Registry modifications require authorized biometric checks.</p>
              <div className="lp-passkey-tag"><FaUserLock /> Credentials Active</div>
            </div>

            {/* Spatial Card */}
            <div className="lp-feature-card">
              <div className="lp-feature-icon"><FaMapMarkedAlt /></div>
              <h3>Spatial Scanning</h3>
              <p>Boundary verification with instant overlap diagnostics against adjacent plots in the cadastral grid.</p>
              <div className="lp-spatial-tag"><FaSatellite /> Cadastral Grid Locked</div>
            </div>

            {/* AI Fraud Card */}
            <div className="lp-feature-card span-2">
              <div className="lp-feature-icon"><FaChartLine /></div>
              <h3>AI Fraud Intelligence</h3>
              <p>Pattern diagnostics engine analyzing ownership duration ratios, historical audits, and flagging suspected title transfer anomalies.</p>
              <div className="lp-ai-tags">
                <span className="lp-ai-tag ok">Cadastral Lock: Active</span>
                <span className="lp-ai-tag ok">KYC Status: Secure</span>
                <span className="lp-ai-tag warn">Title Chain: 1 alert</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ANNOUNCEMENTS ═══ */}
      {announcements.length > 0 && (
        <section className="lp-announcements" id="announcements-section">
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-section-tag"><FaBullhorn /> Notifications</span>
              <h2 className="lp-section-title">Official Announcements & Alerts</h2>
              <p className="lp-section-desc">Stay updated with validator node activations, system updates, and compliance regulations.</p>
            </div>

            <div className="lp-ann-grid">
              {announcements
                .filter(a => ['announcement', 'alert', 'update'].includes(a.category))
                .slice(0, 3)
                .map(ann => (
                  <div key={ann._id} className={`lp-ann-card priority-${ann.priority || 'medium'}`}>
                    <div className="lp-ann-head">
                      <span className="lp-ann-date">{new Date(ann.createdAt).toLocaleDateString()}</span>
                      <span className={`lp-ann-priority ${ann.priority}`}>{ann.priority} Priority</span>
                    </div>
                    <h3>{ann.title}</h3>
                    <p>{ann.message.length > 190 ? ann.message.slice(0, 190) + '...' : ann.message}</p>
                    {ann.links && ann.links.length > 0 && (
                      <div className="lp-ann-links">
                        {ann.links.map((lnk, i) => (
                          <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer" className="lp-ann-link">
                            <FaLink /> {lnk.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {announcements.filter(a => ['guideline', 'policy'].includes(a.category)).length > 0 && (
              <div className="lp-guidelines-box">
                <h3><FaBookOpen /> Legislative Compliance</h3>
                <div className="lp-gl-grid">
                  {announcements
                    .filter(a => ['guideline', 'policy'].includes(a.category))
                    .slice(0, 2)
                    .map(gl => (
                      <div key={gl._id} className="lp-gl-item">
                        <FaInfoCircle />
                        <div>
                          <h4>{gl.title}</h4>
                          <p>{gl.message}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ WORKFLOW STEPS ═══ */}
      <section className="lp-workflow" id="workflow-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-section-tag"><FaGlobeAsia /> How It Works</span>
            <h2 className="lp-section-title">Standard Operating Guidelines</h2>
          </div>

          <div className="lp-steps-row">
            <div className="lp-step-card">
              <div className="lp-step-num">1</div>
              <h4>Identity Match</h4>
              <p>Authorize biometric passkeys to lock your profile against unauthorized registry access.</p>
            </div>
            <div className="lp-step-arrow"><FaArrowRight /></div>
            <div className="lp-step-card">
              <div className="lp-step-num">2</div>
              <h4>Spatial Survey</h4>
              <p>Plot coordinates on the map picker, upload property deeds for spatial audit verification.</p>
            </div>
            <div className="lp-step-arrow"><FaArrowRight /></div>
            <div className="lp-step-card">
              <div className="lp-step-num">3</div>
              <h4>Blockchain Seal</h4>
              <p>Validator nodes confirm consensus signatures, producing IPFS-backed transaction receipts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="lp-cta" id="cta-section">
        <div className="lp-cta-card">
          <div className="lp-cta-glow" />
          <FaCheckCircle className="lp-cta-icon" />
          <h2>Ready to secure your property?</h2>
          <p>Resolve boundary disputes instantly. Appoint validators to seal ownership blocks on the sovereign chain.</p>
          {!isAuthenticated && (
            <button className="lp-cta-btn" onClick={() => navigate('/register')} id="cta-register-btn">
              Create Your Registry Account <FaArrowRight />
            </button>
          )}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer" id="lp-footer">
        <div className="lp-footer-tricolor" />
        <div className="lp-footer-inner">
          <div className="lp-footer-left">
            <div className="lp-footer-brand">
              <img src="/smart-bhoomi-logo.svg" alt="Smart Bhoomi" />
              <span>Smart Bhoomi</span>
            </div>
            <p>National Property Land Registry Infrastructure. Sealed using Proof-of-Authority sovereign network configurations. Government of India.</p>
          </div>
          <div className="lp-footer-right">
            <span className="chain-status">Bharat Land Chain Active (PoA-PBFT)</span>
            <span className="copyright">© {new Date().getFullYear()} Ministry of Housing & Land Registry. Digital India Initiative.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
