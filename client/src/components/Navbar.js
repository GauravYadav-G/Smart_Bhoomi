import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaHome, FaBuilding, FaExchangeAlt, FaCheckCircle, 
  FaUser, FaSignOutAlt, FaBars, FaTimes, FaChevronDown,
  FaSignInAlt, FaUserPlus, FaTachometerAlt,
  FaPlusCircle
} from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  const navLinks = useMemo(() => {
    const links = [
      { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
      { path: '/properties', icon: FaBuilding, label: 'Properties' },
      { path: '/register-property', icon: FaPlusCircle, label: 'Register' },
      { path: '/transfers', icon: FaExchangeAlt, label: 'Transfers' },
      { path: '/kyc', icon: FaCheckCircle, label: 'KYC' },
      { path: '/command-center', icon: FaTachometerAlt, label: 'Command Center' }
    ];

    return links;
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  if (isAuthPage || !isAuthenticated) {
    return (
      <header className="auth-header">
        <div className="auth-header-content">
          <Link to="/" className="auth-brand">
            <div className="auth-brand-icon">🏛️</div>
            <div className="auth-brand-text">
              <span className="auth-brand-name">Smart Bhoomi</span>
              <span className="auth-brand-govt">भारत सरकार • Government of India</span>
            </div>
          </Link>
          <div className="auth-header-actions">
            {location.pathname !== '/login' && (
              <Link to="/login" className="auth-header-btn">
                <FaSignInAlt /> Login
              </Link>
            )}
            {location.pathname !== '/register' && (
              <Link to="/register" className="auth-header-btn primary">
                <FaUserPlus /> Register
              </Link>
            )}
          </div>
        </div>
        <div className="auth-header-stripe"></div>
      </header>
    );
  }

  return (
    <>
      <nav className={`navbar-fixed ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-content">
          <Link to="/dashboard" className="brand-logo">
            <div className="brand-icon">
              <img src="/smart-bhoomi-logo.svg" alt="Logo" className="brand-logo-img" />
            </div>
            <div className="brand-text">
              <span className="brand-name">Smart Bhoomi</span>
              <span className="brand-sub">Land Registry</span>
            </div>
          </Link>

          <div className="desktop-nav">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-pill ${isActive(item.path) ? 'active' : ''}`}
              >
                <item.icon className="nav-pill-icon" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="nav-right">
            <div className="user-dropdown-wrapper">
              <button 
                className={`user-dropdown-trigger ${dropdownOpen ? 'open' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="user-avatar">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="user-info-compact">
                  <span className="user-name-compact">{user?.name?.split(' ')[0]}</span>
                  <span className="user-role-compact">{user?.role?.replace(/_/g, ' ')}</span>
                </div>
                <FaChevronDown className={`dropdown-chevron ${dropdownOpen ? 'rotate' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setDropdownOpen(false)} />
                  <div className="user-dropdown-menu">
                    <div className="dropdown-user-header">
                      <div className="dropdown-avatar">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="dropdown-user-details">
                        <strong>{user?.name}</strong>
                        <span>{user?.email}</span>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <FaUser /> Profile
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} className="dropdown-item logout">
                      <FaSignOutAlt /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            <button 
              className="mobile-menu-btn" 
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <FaBars />
            </button>
          </div>
        </div>
      </nav>

      <div 
        className={`mobile-overlay ${mobileOpen ? 'open' : ''}`} 
        onClick={() => setMobileOpen(false)} 
      />
      <aside className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand">
            <img src="/smart-bhoomi-logo.svg" alt="Logo" className="mobile-drawer-logo" />
            <span>Smart Bhoomi</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="mobile-close-btn">
            <FaTimes />
          </button>
        </div>
        
        <div className="mobile-drawer-user">
          <div className="mobile-drawer-avatar">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h4>{user?.name}</h4>
            <span>{user?.role?.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <nav className="mobile-drawer-nav">
          {navLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon /> <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout} className="mobile-drawer-logout">
          <FaSignOutAlt /> Sign Out
        </button>
      </aside>
    </>
  );
};

export default Navbar;
