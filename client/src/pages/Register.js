import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaPhone,
  FaIdCard,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import './Auth.css';


const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    governmentId: '',
    role: 'property_owner',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();


  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };


  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }

    if (name === 'phoneNumber') {
      // Remove all non-digit chars except keep max 10 digits
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        phoneNumber: digitsOnly
      }));
      return;
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };


  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return false;
    }


    if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }


    if (formData.phoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number (excluding country code)');
      return false;
    }


    return true;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;


    setLoading(true);


    try {
      // Prepend +91 during submit
      const dataToSend = {
        ...formData,
        phoneNumber: '+91' + formData.phoneNumber
      };

      const result = await register(dataToSend);

      if (result.success === false) {
        toast.error(result.error || 'Registration failed. Please try again.');
        return;
      }

      // register() in AuthContext already stores token & sets user state
      toast.success('🎉 Registration successful! Your blockchain identity has been created.');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const getPasswordStrengthLabel = () => {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[passwordStrength] || 'Very Weak';
  };


  const getPasswordStrengthColor = () => {
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#059669'];
    return colors[passwordStrength] || '#ef4444';
  };


  return (
    <div className="auth-page">
      <div className="auth-content">
        <div className="auth-grid">
          {/* Left Side - Info Panel */}
          <div className="info-section">
            <div className="info-wrapper">
              <span className="info-badge">
                🏛️ Government Portal
              </span>

              <h1 className="info-title">
                Smart Bhoomi <span className="highlight">Registration</span>
              </h1>

              <p className="info-description">
                Join thousands of property owners who trust our blockchain-powered platform
                for transparent and secure property management.
              </p>


              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon blue">
                    <FaShieldAlt />
                  </div>
                  <h3>Blockchain Security</h3>
                  <p>Immutable records on distributed ledger</p>
                </div>


                <div className="benefit-card">
                  <div className="benefit-icon green">
                    <FaCheckCircle />
                  </div>
                  <h3>Instant Verification</h3>
                  <p>Real-time property authentication</p>
                </div>


                <div className="benefit-card">
                  <div className="benefit-icon orange">
                    <FaIdCard />
                  </div>
                  <h3>Legal Compliance</h3>
                  <p>Government-approved documentation</p>
                </div>


                <div className="benefit-card">
                  <div className="benefit-icon purple">
                    <FaMapMarkerAlt />
                  </div>
                  <h3>Transparent Process</h3>
                  <p>Track every transaction step</p>
                </div>
              </div>


              <div className="info-stats">
                <div className="stat-item">
                  <strong>10K+</strong>
                  <span>Properties</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <strong>5K+</strong>
                  <span>Users</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <strong>99.9%</strong>
                  <span>Uptime</span>
                </div>
              </div>
            </div>
          </div>


          {/* Right Side - Registration Form */}
          <div className="form-section">
            <div className="form-card form-card-register">
              <div className="form-header">
                <h2>Create Account</h2>
                <p>Start managing your properties securely</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                {/* Personal Information */}
                <div className="form-section-group">
                  <h3 className="section-title">Personal Information</h3>

                  <div className="form-group">
                    <label htmlFor="name">
                      <FaUser className="label-icon" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <FaEnvelope className="label-icon" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="phoneNumber">
                        <FaPhone className="label-icon" />
                        Phone *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#eee', borderRadius: '6px', userSelect: 'none' }}>
                          +91
                        </div>
                        <input
                          type="tel"
                          id="phoneNumber"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          placeholder="9876543210"
                          autoComplete="tel"
                          maxLength={10}
                          required
                          pattern="\d{10}"
                          title="Enter 10 digit phone number"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="governmentId">
                        <FaIdCard className="label-icon" />
                        Gov ID *
                      </label>
                      <input
                        type="text"
                        id="governmentId"
                        name="governmentId"
                        value={formData.governmentId}
                        onChange={handleChange}
                        placeholder="Aadhaar/PAN"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>


                  <div className="form-group">
                    <label htmlFor="role">
                      <FaUser className="label-icon" />
                      Account Type *
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="select-input"
                    >
                      <option value="property_owner">Property Owner</option>
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                    </select>
                  </div>
                </div>

                {/* Security */}
                <div className="form-section-group">
                  <h3 className="section-title">Security</h3>

                  <div className="form-group">
                    <label htmlFor="password">
                      <FaLock className="label-icon" />
                      Password *
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="password-strength">
                        <div className="strength-bar">
                          <div
                            className="strength-fill"
                            style={{
                              width: `${(passwordStrength / 5) * 100}%`,
                              backgroundColor: getPasswordStrengthColor()
                            }}
                          ></div>
                        </div>
                        <span
                          className="strength-label"
                          style={{ color: getPasswordStrengthColor() }}
                        >
                          {getPasswordStrengthLabel()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <FaLock className="label-icon" />
                      Confirm Password *
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {formData.confirmPassword && (
                      <span className={`match-indicator ${formData.password === formData.confirmPassword ? 'match' : 'no-match'}`}>
                        {formData.password === formData.confirmPassword ? (
                          <>
                            <FaCheckCircle /> Passwords match
                          </>
                        ) : (
                          <>
                            <FaExclamationCircle /> Passwords don&apos;t match
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <FaShieldAlt /> Create Account
                    </>
                  )}
                </button>


                <div className="form-footer">
                  <p>
                    Already have an account? <Link to="/login">Login here</Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Register;
