import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaBuilding, FaIdCard, FaBullhorn, FaBookOpen, FaLink,
  FaInfoCircle, FaBell, FaShieldAlt, FaFingerprint,
  FaExchangeAlt, FaChartLine, FaArrowRight, FaCheckCircle
} from 'react-icons/fa';
import { announcementAPI } from '../services/api';
import './LandingPage.css';

const LandingPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnn = async () => {
      try {
        const res = await announcementAPI.getPublicAnnouncements();
        setAnnouncements(res.data.announcements || []);
      } catch (err) { console.error('Announcements error:', err); }
    };
    fetchAnn();
  }, []);

  const features = [
    { icon: <FaShieldAlt />, title: 'Blockchain Secured', desc: 'Every property record is cryptographically sealed on the Bharat Land Chain' },
    { icon: <FaFingerprint />, title: 'Biometric Auth', desc: 'Face recognition & fingerprint for tamper-proof identity verification' },
    { icon: <FaExchangeAlt />, title: 'Smart Transfers', desc: 'Initiate, track and complete property transfers digitally with full audit trail' },
    { icon: <FaChartLine />, title: 'AI Intelligence', desc: 'Automated valuation, fraud detection & document verification powered by AI' },
  ];

  return (
    <div className="landing-page">
      {/* Tricolor bar */}
      <div className="landing-tricolor-top">
        <div className="tricolor-saffron" />
        <div className="tricolor-white" />
        <div className="tricolor-green" />
      </div>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="landing-hero-orb landing-orb-1" />
          <div className="landing-hero-orb landing-orb-2" />
          <div className="landing-hero-orb landing-orb-3" />
        </div>
        <div className="landing-hero-inner">
          <img src="/smart-bhoomi-logo.svg" alt="Smart Bhoomi" className="landing-logo-main" />
          <h1 className="landing-hero-title">
            Welcome to <span>Smart Bhoomi</span>
          </h1>
          <p className="landing-hero-sub">
            National Digital Land Registry Portal — Government of India
          </p>
          <p className="landing-hero-desc">
            India's premier blockchain-powered property management system.
            Register, verify, and transfer land ownership with complete transparency and security.
          </p>
          <div className="landing-hero-actions">
            {isAuthenticated ? (
              <>
                <button className="landing-btn-primary" onClick={() => navigate('/dashboard')}>
                  <FaBuilding /> Go to Dashboard
                </button>
                <button className="landing-btn-secondary" onClick={() => navigate('/register-property')}>
                  <FaIdCard /> Register Property
                </button>
              </>
            ) : (
              <>
                <button className="landing-btn-primary" onClick={() => navigate('/login')}>
                  <FaArrowRight /> Login to Portal
                </button>
                <button className="landing-btn-secondary" onClick={() => navigate('/register')}>
                  <FaIdCard /> Create Account
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <h2 className="landing-section-heading">Why Smart Bhoomi?</h2>
        <div className="landing-features-grid">
          {features.map((f, i) => (
            <div key={i} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="landing-stats">
        <div className="landing-stat-item">
          <span className="landing-stat-num">100%</span>
          <span className="landing-stat-label">Blockchain Verified</span>
        </div>
        <div className="landing-stat-item">
          <span className="landing-stat-num">256-bit</span>
          <span className="landing-stat-label">Encryption Standard</span>
        </div>
        <div className="landing-stat-item">
          <span className="landing-stat-num">24/7</span>
          <span className="landing-stat-label">Digital Access</span>
        </div>
        <div className="landing-stat-item">
          <span className="landing-stat-num">Zero</span>
          <span className="landing-stat-label">Paper Required</span>
        </div>
      </section>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section className="landing-announcements-section">
          <h2 className="landing-section-heading">
            <FaBullhorn /> Latest Announcements
          </h2>
          <div className="landing-ann-list">
            {announcements.filter(a => a.category === 'announcement' || a.category === 'alert' || a.category === 'update').slice(0, 3).map(ann => (
              <div key={ann._id} className={`landing-ann-item ${ann.priority}`}>
                <div className="landing-ann-priority-dot" />
                <div className="landing-ann-content">
                  <h4>{ann.title}</h4>
                  <p>{ann.message.length > 150 ? ann.message.slice(0, 150) + '...' : ann.message}</p>
                  {ann.links?.length > 0 && (
                    <div className="landing-ann-links">
                      {ann.links.slice(0, 2).map((lnk, i) => (
                        <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer" className="landing-ann-link">
                          <FaLink /> {lnk.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {ann.isPinned && <span className="landing-ann-pin">📌</span>}
              </div>
            ))}
          </div>

          {announcements.filter(a => a.category === 'guideline' || a.category === 'policy').length > 0 && (
            <div className="landing-guidelines">
              <h3 className="landing-section-sub-heading">
                <FaBookOpen /> Guidelines & Policies
              </h3>
              <div className="landing-guidelines-list">
                {announcements.filter(a => a.category === 'guideline' || a.category === 'policy').slice(0, 3).map(gl => (
                  <div key={gl._id} className="landing-guideline-item">
                    <FaInfoCircle className="landing-gl-icon" />
                    <div className="landing-gl-content">
                      <h4>{gl.title}</h4>
                      <p>{gl.message.length > 100 ? gl.message.slice(0, 100) + '...' : gl.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* How it works */}
      <section className="landing-how-it-works">
        <h2 className="landing-section-heading">How It Works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <h3>Register & Verify</h3>
            <p>Create account with Aadhaar / PAN, complete KYC and enroll biometrics</p>
          </div>
          <div className="landing-step-arrow"><FaArrowRight /></div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <h3>Add Property</h3>
            <p>Upload documents, mark boundaries on map, submit for auto-verification</p>
          </div>
          <div className="landing-step-arrow"><FaArrowRight /></div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <h3>Manage & Transfer</h3>
            <p>Track records, initiate blockchain-secured transfers with digital payments</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <FaCheckCircle className="landing-cta-icon" />
          <h2>Ready to secure your land records?</h2>
          <p>Join Smart Bhoomi — India's most advanced property registry platform</p>
          {!isAuthenticated && (
            <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate('/register')}>
              Get Started — It's Free <FaArrowRight />
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/smart-bhoomi-logo.svg" alt="Smart Bhoomi" className="landing-footer-logo" />
            <span>Smart Bhoomi</span>
          </div>
          <p>National Digital Land Registry • Government of India • Bharat Land Chain</p>
          <div className="landing-footer-tricolor">
            <div className="tricolor-saffron" />
            <div className="tricolor-white" />
            <div className="tricolor-green" />
          </div>
          <p className="landing-footer-copy">© {new Date().getFullYear()} Smart Bhoomi. All rights reserved. Digital India Initiative 🇮��</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
