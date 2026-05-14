import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, kycAPI } from '../services/api';
import { startRegistration } from '@simplewebauthn/browser';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaIdCard,
  FaShieldAlt, FaFingerprint, FaCamera, FaLink, FaCube,
  FaEdit, FaSave, FaTimes, FaCheckCircle, FaExclamationTriangle,
  FaUserShield, FaUsers, FaCopy, FaQrcode, FaLock,
  FaBriefcase, FaCalendarAlt, FaVenusMars, FaInfoCircle,
  FaRedo, FaHistory, FaPaperPlane, FaKey, FaShieldVirus,
  FaToggleOn, FaToggleOff
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import './Profile.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const Profile = () => {
  const { user, biometricAuthEnabled, toggleBiometricAuth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [editForm, setEditForm] = useState({});
  const [biometricToggleLoading, setBiometricToggleLoading] = useState(false);

  // Biometric re-enrollment state
  const [reEnrollType, setReEnrollType] = useState(null);
  const [reEnrollStep, setReEnrollStep] = useState('idle');
  const [reEnrollOtp, setReEnrollOtp] = useState('');
  const [reEnrollToken, setReEnrollToken] = useState(null);
  const [reEnrollLoading, setReEnrollLoading] = useState(false);
  const [biometricHistory, setBiometricHistory] = useState(null);
  const [biometricHistoryLoading, setBiometricHistoryLoading] = useState(false);

  // Face camera state
  const [faceStream, setFaceStream] = useState(null);
  const faceVideoRef = useRef(null);
  const faceCanvasRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await authAPI.getProfile();
      setProfile(res.data.user);
      setEditForm({
        name: res.data.user.name || '',
        phoneNumber: res.data.user.phoneNumber || '',
        dateOfBirth: res.data.user.dateOfBirth ? res.data.user.dateOfBirth.split('T')[0] : '',
        gender: res.data.user.gender || '',
        occupation: res.data.user.occupation || '',
        bio: res.data.user.bio || '',
        address: {
          street: res.data.user.address?.street || '',
          city: res.data.user.address?.city || '',
          state: res.data.user.address?.state || '',
          zipCode: res.data.user.address?.zipCode || '',
          country: res.data.user.address?.country || 'India'
        }
      });
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Cleanup face camera on unmount
  useEffect(() => {
    return () => {
      if (faceStream) faceStream.getTracks().forEach(t => t.stop());
    };
  }, [faceStream]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(editForm);
      setProfile(prev => ({ ...prev, ...res.data.user }));
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // ─── Biometric Re-enrollment Methods ───

  const fetchBiometricHistory = useCallback(async () => {
    setBiometricHistoryLoading(true);
    try {
      const res = await authAPI.getBiometricHistory();
      setBiometricHistory(res.data);
    } catch (err) {
      console.error('Failed to load biometric history:', err);
    } finally {
      setBiometricHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'biometric') fetchBiometricHistory();
  }, [activeSection, fetchBiometricHistory]);

  const startReEnrollment = (type) => {
    setReEnrollType(type);
    setReEnrollStep('idle');
    setReEnrollOtp('');
    setReEnrollToken(null);
  };

  const cancelReEnrollment = () => {
    setReEnrollType(null);
    setReEnrollStep('idle');
    setReEnrollOtp('');
    setReEnrollToken(null);
    if (faceStream) { faceStream.getTracks().forEach(t => t.stop()); setFaceStream(null); }
  };

  const sendReEnrollOtp = async () => {
    setReEnrollLoading(true);
    try {
      await authAPI.requestBiometricReEnrollOtp({ biometricType: reEnrollType });
      setReEnrollStep('otp_sent');
      toast.success('OTP sent to your registered email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setReEnrollLoading(false);
    }
  };

  const verifyReEnrollOtp = async () => {
    if (!reEnrollOtp || reEnrollOtp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    setReEnrollLoading(true);
    try {
      const res = await authAPI.verifyBiometricReEnrollOtp({ otp: reEnrollOtp, biometricType: reEnrollType });
      setReEnrollToken(res.data.reEnrollToken);
      setReEnrollStep('otp_verified');
      toast.success('OTP verified! Proceed with biometric capture.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setReEnrollLoading(false);
    }
  };

  // Face re-enrollment camera
  const startFaceCapture = async () => {
    setReEnrollStep('capturing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      setFaceStream(stream);
      const attach = () => {
        if (faceVideoRef.current) { faceVideoRef.current.srcObject = stream; }
        else { setTimeout(attach, 100); }
      };
      attach();
    } catch (err) {
      toast.error('Camera access denied');
      setReEnrollStep('otp_verified');
    }
  };

  const captureFaceAndSubmit = async () => {
    if (!faceVideoRef.current || !faceCanvasRef.current) return;
    setReEnrollLoading(true);
    try {
      const video = faceVideoRef.current;
      const canvas = faceCanvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const faceCapture = canvas.toDataURL('image/jpeg', 0.85);
      if (faceStream) { faceStream.getTracks().forEach(t => t.stop()); setFaceStream(null); }
      const res = await authAPI.completeFaceReEnroll({ reEnrollToken, faceCapture });
      setReEnrollStep('done');
      toast.success(res.data.message || 'Face updated successfully!');
      fetchProfile();
      fetchBiometricHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Face re-enrollment failed');
      setReEnrollStep('otp_verified');
    } finally {
      setReEnrollLoading(false);
    }
  };

  // Fingerprint re-enrollment
  const handleFingerprintReEnroll = async () => {
    setReEnrollLoading(true);
    try {
      setReEnrollStep('registering');
      await authAPI.completeFingerprintReEnroll({ reEnrollToken });
      toast.info('Old fingerprint revoked. Registering new one...');
      const optionsRes = await kycAPI.biometricRegisterOptions();
      toast.info('Touch your fingerprint sensor to register...');
      const credential = await startRegistration({ optionsJSON: optionsRes.data.options });
      await kycAPI.biometricRegisterVerify({ challengeId: optionsRes.data.options.challengeId, credential });
      setReEnrollStep('done');
      toast.success('New fingerprint registered successfully!');
      fetchProfile();
      fetchBiometricHistory();
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? 'Fingerprint registration cancelled or timed out.' :
        err.response?.data?.message || err.message || 'Fingerprint re-enrollment failed';
      toast.error(msg);
      setReEnrollStep('otp_verified');
    } finally {
      setReEnrollLoading(false);
    }
  };

  // ─── First-time Enrollment Handlers ───
  const [enrolling, setEnrolling] = useState(null); // 'fingerprint' | 'face' | null
  const [faceEnrollStream, setFaceEnrollStream] = useState(null);
  const faceEnrollVideoRef = useRef(null);
  const faceEnrollCanvasRef = useRef(null);

  const handleFirstFingerprintEnroll = async () => {
    setEnrolling('fingerprint');
    try {
      const optionsRes = await kycAPI.biometricRegisterOptions();
      toast.info('Touch your fingerprint sensor to register...');
      const credential = await startRegistration({ optionsJSON: optionsRes.data.options });
      await kycAPI.biometricRegisterVerify({ challengeId: optionsRes.data.options.challengeId, credential });
      toast.success('Fingerprint enrolled successfully!');
      fetchProfile();
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Fingerprint registration was cancelled or timed out.'
        : err.response?.data?.message || err.message || 'Fingerprint enrollment failed';
      toast.error(msg);
    } finally {
      setEnrolling(null);
    }
  };

  const handleFirstFaceEnroll = async () => {
    setEnrolling('face-setup');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      setFaceEnrollStream(stream);
      setEnrolling('face-capture');
      const attach = () => {
        if (faceEnrollVideoRef.current) { faceEnrollVideoRef.current.srcObject = stream; }
        else { setTimeout(attach, 100); }
      };
      attach();
    } catch (err) {
      toast.error('Camera access denied. Please allow camera permission.');
      setEnrolling(null);
    }
  };

  const captureFaceEnroll = async () => {
    if (!faceEnrollVideoRef.current || !faceEnrollCanvasRef.current) return;
    setEnrolling('face-submitting');
    try {
      const video = faceEnrollVideoRef.current;
      const canvas = faceEnrollCanvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const faceCapture = canvas.toDataURL('image/jpeg', 0.85);
      if (faceEnrollStream) { faceEnrollStream.getTracks().forEach(t => t.stop()); setFaceEnrollStream(null); }
      const challengeRes = await kycAPI.faceLivenessChallenge();
      await kycAPI.faceLivenessVerify({
        challengeId: challengeRes.data.challengeId,
        faceCapture,
        challengeResponse: challengeRes.data.challenge
      });
      toast.success('Face enrolled successfully!');
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Face enrollment failed');
    } finally {
      setEnrolling(null);
    }
  };

  const cancelFaceEnroll = () => {
    if (faceEnrollStream) { faceEnrollStream.getTracks().forEach(t => t.stop()); setFaceEnrollStream(null); }
    setEnrolling(null);
  };

  // Cleanup face enroll camera on unmount
  useEffect(() => {
    return () => {
      if (faceEnrollStream) faceEnrollStream.getTracks().forEach(t => t.stop());
    };
  }, [faceEnrollStream]);

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-spinner" />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-error">
        <FaExclamationTriangle />
        <h3>Unable to load profile</h3>
        <button onClick={fetchProfile}>Try Again</button>
      </div>
    );
  }

  const handleBiometricToggle = async () => {
    setBiometricToggleLoading(true);
    try {
      const newValue = !biometricAuthEnabled;
      await toggleBiometricAuth(newValue);
      toast.success(`Biometric authentication ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update biometric preference');
    } finally {
      setBiometricToggleLoading(false);
    }
  };

  const FloatingParticles = () => (
    <div className="profile-particles">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="profile-particle" style={{
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          width: `${4 + Math.random() * 6}px`, height: `${4 + Math.random() * 6}px`,
          animationDuration: `${8 + Math.random() * 12}s`, animationDelay: `${Math.random() * 5}s`
        }} />
      ))}
    </div>
  );

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: <FaUser /> },
    { id: 'security', label: 'Security', icon: <FaShieldAlt /> },
    { id: 'biometric', label: 'Biometric & KYC', icon: <FaFingerprint /> },
    { id: 'blockchain', label: 'Blockchain', icon: <FaCube /> },
    { id: 'nominee', label: 'Nominee', icon: <FaUsers /> },
  ];

  const kycLevel = profile.kycStatus?.kycLevel || 'none';
  const kycLevelColors = { none: '#ef4444', basic: '#f59e0b', standard: '#3b82f6', full: '#10b981' };

  return (
    <motion.div className="profile-page" initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}>
      <FloatingParticles />
      
      {/* ─── PROFILE HEADER ─── */}
      <motion.div className="profile-header" variants={fadeUp}>
        <div className="profile-header-bg">
          <div className="profile-header-orb orb-1" />
          <div className="profile-header-orb orb-2" />
          <div className="profile-header-orb orb-3" />
        </div>
        <div className="profile-tricolor-top" />
        <div className="profile-header-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="Profile" />
              ) : (
                <span>{profile.name?.charAt(0)?.toUpperCase()}</span>
              )}
              <div className="profile-avatar-badge">
                <FaCheckCircle />
              </div>
            </div>
            <div className="profile-identity">
              <h1>{profile.name}</h1>
              <p className="profile-email">{profile.email}</p>
              <div className="profile-role-chip">
                <FaUserShield /> {profile.role?.replace(/_/g, ' ').toUpperCase()}
              </div>
              <p className="profile-member-since">
                Member since {new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="profile-header-actions">
            {!editing ? (
              <motion.button className="profile-edit-btn" onClick={() => setEditing(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <FaEdit /> Edit Profile
              </motion.button>
            ) : (
              <div className="profile-edit-actions">
                <motion.button className="profile-save-btn" onClick={handleSave} disabled={saving} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                </motion.button>
                <motion.button className="profile-cancel-btn" onClick={() => setEditing(false)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <FaTimes /> Cancel
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── SECTION TABS ─── */}
      <motion.div className="profile-tabs" variants={fadeUp}>
        {sections.map(s => (
          <button
            key={s.id}
            className={`profile-tab ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.icon} <span>{s.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ─── SECTION CONTENT ─── */}
      <AnimatePresence mode="wait">
        {/* ═══ PERSONAL INFO ═══ */}
        {activeSection === 'personal' && (
          <motion.div key="personal" className="profile-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="profile-section-header">
              <FaUser className="section-icon" />
              <div>
                <h2>Personal Information</h2>
                <p>Manage your personal details and contact information</p>
              </div>
            </div>

            <div className="profile-fields-grid">
              <div className="profile-field">
                <label><FaUser /> Full Name</label>
                {editing ? (
                  <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                ) : (
                  <div className="field-value">{profile.name}</div>
                )}
              </div>

              <div className="profile-field">
                <label><FaEnvelope /> Email</label>
                <div className="field-value readonly">{profile.email} <FaLock className="lock-icon" /></div>
              </div>

              <div className="profile-field">
                <label><FaPhone /> Phone</label>
                {editing ? (
                  <input type="tel" value={editForm.phoneNumber} onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })} />
                ) : (
                  <div className="field-value">{profile.phoneNumber || 'Not set'}</div>
                )}
              </div>

              <div className="profile-field">
                <label><FaIdCard /> Government ID</label>
                <div className="field-value readonly">{profile.governmentId} <FaLock className="lock-icon" /></div>
              </div>

              <div className="profile-field">
                <label><FaCalendarAlt /> Date of Birth</label>
                {editing ? (
                  <input type="date" value={editForm.dateOfBirth} onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })} />
                ) : (
                  <div className="field-value">{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : 'Not set'}</div>
                )}
              </div>

              <div className="profile-field">
                <label><FaVenusMars /> Gender</label>
                {editing ? (
                  <select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <div className="field-value">{profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not set'}</div>
                )}
              </div>

              <div className="profile-field">
                <label><FaBriefcase /> Occupation</label>
                {editing ? (
                  <input type="text" value={editForm.occupation} onChange={e => setEditForm({ ...editForm, occupation: e.target.value })} placeholder="e.g., Software Engineer" />
                ) : (
                  <div className="field-value">{profile.occupation || 'Not set'}</div>
                )}
              </div>

              <div className="profile-field full-width">
                <label><FaInfoCircle /> Bio</label>
                {editing ? (
                  <textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell us about yourself..." rows="3" maxLength={500} />
                ) : (
                  <div className="field-value">{profile.bio || 'No bio set'}</div>
                )}
              </div>
            </div>

            <div className="profile-subsection">
              <h3><FaMapMarkerAlt /> Address</h3>
              <div className="profile-fields-grid">
                {['street', 'city', 'state', 'zipCode', 'country'].map(field => (
                  <div className="profile-field" key={field}>
                    <label>{field.charAt(0).toUpperCase() + field.replace(/([A-Z])/g, ' $1').slice(1)}</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.address?.[field] || ''}
                        onChange={e => setEditForm({ ...editForm, address: { ...editForm.address, [field]: e.target.value } })}
                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      />
                    ) : (
                      <div className="field-value">{profile.address?.[field] || 'Not set'}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ SECURITY ═══ */}
        {activeSection === 'security' && (
          <motion.div key="security" className="profile-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="profile-section-header">
              <FaShieldAlt className="section-icon" />
              <div>
                <h2>Security Settings</h2>
                <p>Manage your account security and authentication methods</p>
              </div>
            </div>

            <div className="security-cards-grid">
              <div className="security-card">
                <div className="security-card-icon blue"><FaLock /></div>
                <div className="security-card-info">
                  <h4>Password</h4>
                  <p>Protected with bcrypt (12 rounds)</p>
                </div>
                <span className="security-status active"><FaCheckCircle /> Active</span>
              </div>

              <div className="security-card">
                <div className={`security-card-icon ${profile.kycStatus?.fingerprintEnrolled ? 'green' : 'gray'}`}><FaFingerprint /></div>
                <div className="security-card-info">
                  <h4>Fingerprint (WebAuthn)</h4>
                  <p>{profile.biometricCredentials?.length || 0} device(s) &bull; v{profile.kycStatus?.fingerprintEnrollmentVersion || 0}</p>
                </div>
                {profile.kycStatus?.fingerprintEnrolled ? (
                  <span className="security-status active"><FaCheckCircle /> Enrolled</span>
                ) : (
                  <button
                    className="security-action-btn enroll"
                    onClick={handleFirstFingerprintEnroll}
                    disabled={enrolling === 'fingerprint'}
                  >
                    {enrolling === 'fingerprint' ? <><div className="btn-mini-spinner" /> Enrolling...</> : <><FaFingerprint /> Enroll Now</>}
                  </button>
                )}
              </div>

              <div className="security-card">
                <div className={`security-card-icon ${profile.kycStatus?.faceEnrolled ? 'green' : 'gray'}`}><FaCamera /></div>
                <div className="security-card-info">
                  <h4>Face Recognition</h4>
                  <p>{profile.kycStatus?.faceEnrolled ? `Enrolled \u2022 v${profile.kycStatus?.faceEnrollmentVersion || 1}` : 'Not enrolled yet'}</p>
                </div>
                {profile.kycStatus?.faceEnrolled ? (
                  <span className="security-status active"><FaCheckCircle /> Enrolled</span>
                ) : (
                  <button
                    className="security-action-btn enroll"
                    onClick={handleFirstFaceEnroll}
                    disabled={!!enrolling}
                  >
                    {enrolling?.startsWith('face') ? <><div className="btn-mini-spinner" /> Setting up...</> : <><FaCamera /> Enroll Now</>}
                  </button>
                )}
              </div>

              <div className="security-card">
                <div className="security-card-icon blue"><FaEnvelope /></div>
                <div className="security-card-info">
                  <h4>Email OTP Login</h4>
                  <p>Alternative login via email one-time password</p>
                </div>
                <span className="security-status active"><FaCheckCircle /> Available</span>
              </div>

              <div className="security-card full-width">
                <div className={`security-card-icon ${profile.integrityStatus === 'valid' ? 'green' : 'orange'}`}><FaLink /></div>
                <div className="security-card-info">
                  <h4>Data Integrity</h4>
                  <p>Hash: {profile.dataIntegrityHash ? `${profile.dataIntegrityHash.slice(0, 16)}...` : 'Not computed'}</p>
                </div>
                <span className={`security-status ${profile.integrityStatus === 'valid' ? 'active' : 'pending'}`}>
                  <HiSparkles /> {profile.integrityStatus || 'Unchecked'}
                </span>
              </div>
            </div>

            {/* ─── BIOMETRIC AUTH MASTER TOGGLE ─── */}
            <div className="biometric-toggle-card">
              <div className="biometric-toggle-header">
                <div className="biometric-toggle-icon-wrap">
                  <FaShieldVirus />
                </div>
                <div className="biometric-toggle-info">
                  <h3>Biometric Authentication</h3>
                  <p>
                    {biometricAuthEnabled 
                      ? 'Face recognition & fingerprint verification is required during login and property transfers.' 
                      : 'Biometric verification is disabled. Only password authentication will be used.'}
                  </p>
                </div>
              </div>

              <div className="biometric-toggle-control">
                <div className="biometric-toggle-status">
                  <span className={`biometric-status-dot ${biometricAuthEnabled ? 'active' : 'inactive'}`} />
                  <span className={`biometric-toggle-label ${biometricAuthEnabled ? 'active' : 'inactive'}`}>
                    Status: {biometricAuthEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <button
                  className={`biometric-toggle-switch ${biometricAuthEnabled ? 'on' : 'off'}`}
                  onClick={handleBiometricToggle}
                  disabled={biometricToggleLoading}
                  aria-label="Toggle biometric authentication"
                >
                  {biometricToggleLoading ? (
                    <div className="biometric-toggle-spinner" />
                  ) : biometricAuthEnabled ? (
                    <FaToggleOn />
                  ) : (
                    <FaToggleOff />
                  )}
                </button>
              </div>

              <button
                className={`biometric-action-btn ${biometricAuthEnabled ? 'disable' : 'enable'}`}
                onClick={handleBiometricToggle}
                disabled={biometricToggleLoading}
              >
                {biometricToggleLoading ? (
                  <><div className="btn-mini-spinner" /> Processing...</>
                ) : biometricAuthEnabled ? (
                  <><FaToggleOff /> Disable Biometric Authentication</>
                ) : (
                  <><FaToggleOn /> Enable Biometric Authentication</>
                )}
              </button>

              {!biometricAuthEnabled && (
                <div className="biometric-toggle-warning">
                  <FaExclamationTriangle />
                  <span>Biometric auth is disabled. Fingerprint & face verification will be skipped during login and transfers. Click "Enable" above to re-activate.</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ BIOMETRIC & KYC ═══ */}
        {activeSection === 'biometric' && (
          <motion.div key="biometric" className="profile-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="profile-section-header">
              <FaFingerprint className="section-icon" />
              <div>
                <h2>Biometric & KYC Management</h2>
                <p>Identity verification, biometric enrollment, and OTP-verified re-enrollment</p>
              </div>
            </div>

            {/* KYC Level Banner */}
            <div className="kyc-level-banner" style={{ borderColor: kycLevelColors[kycLevel] }}>
              <div className="kyc-level-badge" style={{ background: kycLevelColors[kycLevel] }}>
                {kycLevel.toUpperCase()}
              </div>
              <div className="kyc-level-info">
                <h4>KYC Level: {kycLevel.charAt(0).toUpperCase() + kycLevel.slice(1)}</h4>
                <p>{kycLevel === 'full' ? 'All verifications complete \u2014 Aadhaar + PAN + Fingerprint + Face' : kycLevel === 'none' ? 'Complete KYC to unlock all features' : 'Some verifications pending'}</p>
              </div>
            </div>

            {/* Identity Verification Cards */}
            <div className="bio-subsection-title"><FaIdCard /> Identity Verification</div>
            <div className="kyc-grid">
              <div className={`kyc-item ${profile.kycStatus?.aadhaarVerified ? 'verified' : 'pending'}`}>
                <div className="kyc-item-icon"><FaIdCard /></div>
                <div className="kyc-item-info">
                  <h4>Aadhaar (UIDAI)</h4>
                  <p>{profile.kycData?.aadhaarMasked || 'Not verified'}</p>
                  {profile.kycData?.aadhaarLinkedName && <span className="kyc-linked-name">Name: {profile.kycData.aadhaarLinkedName}</span>}
                  {profile.kycStatus?.aadhaarVerifiedAt && (
                    <span className="kyc-date">Verified: {new Date(profile.kycStatus.aadhaarVerifiedAt).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
                <span className={`kyc-status ${profile.kycStatus?.aadhaarVerified ? 'done' : 'pending'}`}>
                  {profile.kycStatus?.aadhaarVerified ? <><FaCheckCircle /> Verified</> : 'Pending'}
                </span>
              </div>

              <div className={`kyc-item ${profile.kycStatus?.panVerified ? 'verified' : 'pending'}`}>
                <div className="kyc-item-icon"><FaIdCard /></div>
                <div className="kyc-item-info">
                  <h4>PAN (NSDL)</h4>
                  <p>{profile.kycData?.panMasked || 'Not verified'}</p>
                  {profile.kycData?.panLinkedName && <span className="kyc-linked-name">Name: {profile.kycData.panLinkedName}</span>}
                  {profile.kycStatus?.panVerifiedAt && (
                    <span className="kyc-date">Verified: {new Date(profile.kycStatus.panVerifiedAt).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
                <span className={`kyc-status ${profile.kycStatus?.panVerified ? 'done' : 'pending'}`}>
                  {profile.kycStatus?.panVerified ? <><FaCheckCircle /> Verified</> : 'Pending'}
                </span>
              </div>
            </div>

            {/* Biometric Enrollment Cards */}
            <div className="bio-subsection-title" style={{ marginTop: 24 }}><FaShieldVirus /> Biometric Data</div>
            <div className="biometric-cards-grid">
              {/* Fingerprint Card */}
              <div className={`biometric-manage-card ${profile.kycStatus?.fingerprintEnrolled ? 'enrolled' : ''}`}>
                <div className="bio-card-header">
                  <div className="bio-card-icon fp"><FaFingerprint /></div>
                  <div className="bio-card-title">
                    <h4>Fingerprint</h4>
                    <p>WebAuthn / FIDO2 credential</p>
                  </div>
                  <span className={`bio-card-badge ${profile.kycStatus?.fingerprintEnrolled ? 'active' : 'inactive'}`}>
                    {profile.kycStatus?.fingerprintEnrolled ? 'ENROLLED' : 'NOT ENROLLED'}
                  </span>
                </div>
                <div className="bio-card-details">
                  <div className="bio-detail-row">
                    <span>Status</span>
                    <span className={profile.kycStatus?.fingerprintEnrolled ? 'text-green' : 'text-amber'}>{profile.kycStatus?.fingerprintEnrolled ? 'Active' : 'Pending'}</span>
                  </div>
                  <div className="bio-detail-row">
                    <span>Devices</span>
                    <span>{profile.biometricCredentials?.length || 0} registered</span>
                  </div>
                  <div className="bio-detail-row">
                    <span>Version</span>
                    <span>v{profile.kycStatus?.fingerprintEnrollmentVersion || 0}</span>
                  </div>
                  {profile.kycStatus?.fingerprintEnrolledAt && (
                    <div className="bio-detail-row">
                      <span>Enrolled</span>
                      <span>{new Date(profile.kycStatus.fingerprintEnrolledAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                  {profile.kycStatus?.fingerprintLastUpdated && (
                    <div className="bio-detail-row">
                      <span>Last Updated</span>
                      <span>{new Date(profile.kycStatus.fingerprintLastUpdated).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                  {profile.kycData?.aadhaarMasked && (
                    <div className="bio-detail-row linked">
                      <span><FaLink /> Linked Aadhaar</span>
                      <span>{profile.kycData.aadhaarMasked}</span>
                    </div>
                  )}
                </div>
                {profile.kycStatus?.fingerprintEnrolled ? (
                  <button className="bio-update-btn" onClick={() => startReEnrollment('fingerprint')} disabled={reEnrollType === 'fingerprint'}>
                    <FaRedo /> Update Fingerprint
                  </button>
                ) : (
                  <button className="bio-update-btn enroll-new" onClick={handleFirstFingerprintEnroll} disabled={enrolling === 'fingerprint'}>
                    {enrolling === 'fingerprint' ? <><div className="btn-mini-spinner light" /> Enrolling...</> : <><FaFingerprint /> Enroll Fingerprint</>}
                  </button>
                )}
              </div>

              {/* Face Card */}
              <div className={`biometric-manage-card ${profile.kycStatus?.faceEnrolled ? 'enrolled' : ''}`}>
                <div className="bio-card-header">
                  <div className="bio-card-icon face"><FaCamera /></div>
                  <div className="bio-card-title">
                    <h4>Face Recognition</h4>
                    <p>Liveness-verified face capture</p>
                  </div>
                  <span className={`bio-card-badge ${profile.kycStatus?.faceEnrolled ? 'active' : 'inactive'}`}>
                    {profile.kycStatus?.faceEnrolled ? 'ENROLLED' : 'NOT ENROLLED'}
                  </span>
                </div>
                <div className="bio-card-details">
                  <div className="bio-detail-row">
                    <span>Status</span>
                    <span className={profile.kycStatus?.faceEnrolled ? 'text-green' : 'text-amber'}>{profile.kycStatus?.faceEnrolled ? 'Active' : 'Pending'}</span>
                  </div>
                  <div className="bio-detail-row">
                    <span>Version</span>
                    <span>v{profile.kycStatus?.faceEnrollmentVersion || 0}</span>
                  </div>
                  {profile.kycStatus?.faceEnrolledAt && (
                    <div className="bio-detail-row">
                      <span>Enrolled</span>
                      <span>{new Date(profile.kycStatus.faceEnrolledAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                  {profile.kycStatus?.faceLastUpdated && (
                    <div className="bio-detail-row">
                      <span>Last Updated</span>
                      <span>{new Date(profile.kycStatus.faceLastUpdated).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                  {profile.kycData?.aadhaarMasked && (
                    <div className="bio-detail-row linked">
                      <span><FaLink /> Linked Aadhaar</span>
                      <span>{profile.kycData.aadhaarMasked}</span>
                    </div>
                  )}
                </div>
                {profile.kycStatus?.faceEnrolled ? (
                  <button className="bio-update-btn" onClick={() => startReEnrollment('face')} disabled={reEnrollType === 'face'}>
                    <FaRedo /> Update Face Data
                  </button>
                ) : (
                  <button className="bio-update-btn enroll-new" onClick={handleFirstFaceEnroll} disabled={!!enrolling}>
                    {enrolling?.startsWith('face') ? <><div className="btn-mini-spinner light" /> Setting up...</> : <><FaCamera /> Enroll Face</>}
                  </button>
                )}
              </div>
            </div>

            {/* First-time Face Enrollment Camera */}
            <AnimatePresence>
              {(enrolling === 'face-capture' || enrolling === 'face-submitting') && (
                <motion.div className="face-enroll-panel" initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 20 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}>
                  <div className="face-enroll-panel-header">
                    <div className="face-enroll-panel-icon"><FaCamera /></div>
                    <div>
                      <h3>Face Enrollment</h3>
                      <p>Position your face in the frame and capture</p>
                    </div>
                    <button className="re-enroll-close" onClick={cancelFaceEnroll}><FaTimes /></button>
                  </div>
                  <div className="face-enroll-panel-body">
                    <div className="face-capture-wrapper">
                      <video ref={faceEnrollVideoRef} autoPlay muted playsInline className="face-capture-video" />
                      <canvas ref={faceEnrollCanvasRef} style={{ display: 'none' }} />
                      <div className="face-guide-overlay">
                        <span className="corner tl" /><span className="corner tr" />
                        <span className="corner bl" /><span className="corner br" />
                      </div>
                    </div>
                    <p className="face-enroll-hint">Look directly at the camera. Keep your face centered within the guide frame.</p>
                    <div className="face-enroll-actions">
                      <button className="btn-primary" onClick={captureFaceEnroll} disabled={enrolling === 'face-submitting'}>
                        {enrolling === 'face-submitting' ? 'Submitting...' : <><FaCamera /> Capture & Enroll</>}
                      </button>
                      <button className="btn-text" onClick={cancelFaceEnroll}>Cancel</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Re-enrollment Flow Panel */}
            <AnimatePresence>
              {reEnrollType && (
                <motion.div className="re-enroll-panel" initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 20 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}>
                  <div className="re-enroll-header">
                    <div className="re-enroll-icon">
                      {reEnrollType === 'fingerprint' ? <FaFingerprint /> : <FaCamera />}
                    </div>
                    <div>
                      <h3>Update {reEnrollType === 'fingerprint' ? 'Fingerprint' : 'Face'} Data</h3>
                      <p>OTP verification required for security</p>
                    </div>
                    <button className="re-enroll-close" onClick={cancelReEnrollment}><FaTimes /></button>
                  </div>

                  {/* Steps Progress */}
                  <div className="re-enroll-steps">
                    <div className={`re-step ${reEnrollStep !== 'idle' ? 'done' : 'current'}`}>
                      <div className="re-step-num">1</div>
                      <span>Request OTP</span>
                    </div>
                    <div className="re-step-line" />
                    <div className={`re-step ${['otp_verified', 'capturing', 'registering', 'done'].includes(reEnrollStep) ? 'done' : reEnrollStep === 'otp_sent' ? 'current' : ''}`}>
                      <div className="re-step-num">2</div>
                      <span>Verify OTP</span>
                    </div>
                    <div className="re-step-line" />
                    <div className={`re-step ${reEnrollStep === 'done' ? 'done' : ['capturing', 'registering'].includes(reEnrollStep) ? 'current' : ''}`}>
                      <div className="re-step-num">3</div>
                      <span>Capture</span>
                    </div>
                  </div>

                  <div className="re-enroll-content">
                    {reEnrollStep === 'idle' && (
                      <div className="re-enroll-action">
                        <p>We will send a 6-digit OTP to <strong>{profile.email}</strong> to verify your identity before updating biometric data.</p>
                        <button className="btn-primary" onClick={sendReEnrollOtp} disabled={reEnrollLoading}>
                          {reEnrollLoading ? 'Sending...' : <><FaPaperPlane /> Send OTP</>}
                        </button>
                      </div>
                    )}

                    {reEnrollStep === 'otp_sent' && (
                      <div className="re-enroll-action">
                        <p>Enter the 6-digit OTP sent to your email:</p>
                        <div className="otp-input-row">
                          <input
                            type="text" maxLength={6} value={reEnrollOtp}
                            onChange={e => setReEnrollOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000" className="otp-input-field"
                          />
                          <button className="btn-primary" onClick={verifyReEnrollOtp} disabled={reEnrollLoading || reEnrollOtp.length !== 6}>
                            {reEnrollLoading ? 'Verifying...' : <><FaKey /> Verify</>}
                          </button>
                        </div>
                        <button className="btn-text" onClick={sendReEnrollOtp} disabled={reEnrollLoading}>Resend OTP</button>
                      </div>
                    )}

                    {reEnrollStep === 'otp_verified' && reEnrollType === 'face' && (
                      <div className="re-enroll-action">
                        <p className="text-green"><FaCheckCircle /> OTP verified! Now capture your face.</p>
                        <button className="btn-primary" onClick={startFaceCapture} disabled={reEnrollLoading}>
                          <FaCamera /> Open Camera
                        </button>
                      </div>
                    )}

                    {reEnrollStep === 'otp_verified' && reEnrollType === 'fingerprint' && (
                      <div className="re-enroll-action">
                        <p className="text-green"><FaCheckCircle /> OTP verified! Click below to revoke old and register new fingerprint.</p>
                        <p className="text-warn"><FaExclamationTriangle /> This will remove all existing fingerprint credentials.</p>
                        <button className="btn-primary" onClick={handleFingerprintReEnroll} disabled={reEnrollLoading}>
                          {reEnrollLoading ? 'Processing...' : <><FaFingerprint /> Re-register Fingerprint</>}
                        </button>
                      </div>
                    )}

                    {reEnrollStep === 'capturing' && (
                      <div className="re-enroll-camera">
                        <div className="face-capture-wrapper">
                          <video ref={faceVideoRef} autoPlay muted playsInline className="face-capture-video" />
                          <canvas ref={faceCanvasRef} style={{ display: 'none' }} />
                          <div className="face-guide-overlay">
                            <span className="corner tl" /><span className="corner tr" />
                            <span className="corner bl" /><span className="corner br" />
                          </div>
                        </div>
                        <p>Position your face within the frame and click capture.</p>
                        <button className="btn-primary" onClick={captureFaceAndSubmit} disabled={reEnrollLoading}>
                          {reEnrollLoading ? 'Submitting...' : <><FaCamera /> Capture and Submit</>}
                        </button>
                      </div>
                    )}

                    {reEnrollStep === 'registering' && (
                      <div className="re-enroll-action">
                        <div className="re-enroll-spinner" />
                        <p>Processing biometric re-enrollment...</p>
                      </div>
                    )}

                    {reEnrollStep === 'done' && (
                      <div className="re-enroll-action re-enroll-success">
                        <FaCheckCircle className="success-icon-large" />
                        <h4>Biometric Updated Successfully!</h4>
                        <p>Your {reEnrollType} data has been re-enrolled and anchored to the blockchain.</p>
                        <button className="btn-primary" onClick={cancelReEnrollment}><FaTimes /> Close</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Update History */}
            <div className="bio-subsection-title" style={{ marginTop: 24 }}><FaHistory /> Update History</div>
            {biometricHistoryLoading ? (
              <div className="bio-history-loading"><div className="profile-loading-spinner" /></div>
            ) : biometricHistory?.updateHistory?.length > 0 ? (
              <div className="bio-history-list">
                {biometricHistory.updateHistory.map((entry, idx) => (
                  <div className="bio-history-item" key={idx}>
                    <div className={`bio-history-icon ${entry.type === 'fingerprint' ? 'fp' : 'face'}`}>
                      {entry.type === 'fingerprint' ? <FaFingerprint /> : <FaCamera />}
                    </div>
                    <div className="bio-history-info">
                      <h5>{entry.type === 'fingerprint' ? 'Fingerprint' : 'Face'} &mdash; {entry.action?.replace('_', '-')}</h5>
                      <p>v{entry.previousVersion} &rarr; v{entry.newVersion} &bull; via {entry.verifiedVia?.replace('_', ' ')}</p>
                      {entry.blockchainTxId && <span className="bio-history-tx"><FaCube /> TX: {entry.blockchainTxId.slice(0, 16)}...</span>}
                    </div>
                    <span className="bio-history-date">{new Date(entry.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bio-history-empty">
                <FaHistory />
                <p>No biometric updates yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ BLOCKCHAIN ═══ */}
        {activeSection === 'blockchain' && (
          <motion.div key="blockchain" className="profile-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="profile-section-header">
              <FaCube className="section-icon" />
              <div>
                <h2>Blockchain Identity</h2>
                <p>Your decentralized identity on the Smart Bhoomi Sovereign Chain</p>
              </div>
            </div>

            <div className="blockchain-identity-card">
              <div className="blockchain-card-header">
                <div className="blockchain-logo"><FaCube /></div>
                <div>
                  <h3>Sovereign Chain Identity</h3>
                  <p>Immutable record on the blockchain</p>
                </div>
              </div>

              <div className="blockchain-fields">
                <div className="blockchain-field">
                  <label>Blockchain ID</label>
                  <div className="blockchain-value copyable" onClick={() => copyToClipboard(profile.blockchainId || '')}>
                    <code>{profile.blockchainId || 'Not assigned'}</code>
                    {profile.blockchainId && <FaCopy className="copy-btn" />}
                  </div>
                </div>
                <div className="blockchain-field">
                  <label>Node ID</label>
                  <div className="blockchain-value copyable" onClick={() => copyToClipboard(profile.blockchainNodeId || '')}>
                    <code>{profile.blockchainNodeId || 'N/A'}</code>
                    {profile.blockchainNodeId && <FaCopy className="copy-btn" />}
                  </div>
                </div>
                <div className="blockchain-field">
                  <label>Verification Hash</label>
                  <div className="blockchain-value copyable" onClick={() => copyToClipboard(profile.blockchainVerificationHash || '')}>
                    <code>{profile.blockchainVerificationHash ? `${profile.blockchainVerificationHash.slice(0, 24)}...` : 'N/A'}</code>
                    {profile.blockchainVerificationHash && <FaCopy className="copy-btn" />}
                  </div>
                </div>
                {profile.blockchainAnchorTxId && (
                  <div className="blockchain-field">
                    <label>Latest Anchor TX</label>
                    <div className="blockchain-value copyable" onClick={() => copyToClipboard(profile.blockchainAnchorTxId)}>
                      <code>{profile.blockchainAnchorTxId.slice(0, 24)}...</code>
                      <FaCopy className="copy-btn" />
                    </div>
                  </div>
                )}
              </div>

              {profile.blockchainQRCode && (
                <div className="blockchain-qr-section">
                  <h4><FaQrcode /> Identity QR Code</h4>
                  <div className="blockchain-qr"><img src={profile.blockchainQRCode} alt="Blockchain QR" /></div>
                  <p className="qr-hint">Scan to verify your blockchain identity</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ NOMINEE ═══ */}
        {activeSection === 'nominee' && (
          <motion.div key="nominee" className="profile-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="profile-section-header">
              <FaUsers className="section-icon" />
              <div>
                <h2>Nominee Information</h2>
                <p>Emergency access configuration for your property records</p>
              </div>
            </div>

            {profile.nominee ? (
              <div className="nominee-card">
                <div className="nominee-header">
                  <div className="nominee-avatar">{profile.nominee.name?.charAt(0)?.toUpperCase()}</div>
                  <div className="nominee-info">
                    <h3>{profile.nominee.name}</h3>
                    <p>{profile.nominee.email}</p>
                    <span className="nominee-relation">{profile.nominee.relationship?.replace(/_/g, ' ')}</span>
                  </div>
                  <span className={`nominee-status ${profile.nominee.nomineeLoginEnabled ? 'active' : profile.nominee.isVerified ? 'verified' : 'pending'}`}>
                    {profile.nominee.nomineeLoginEnabled ? 'Active' : profile.nominee.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="nominee-details">
                  <p><FaInfoCircle /> Nominee can access your property records in case of emergency using the passphrase you provided during setup.</p>
                </div>
              </div>
            ) : (
              <div className="nominee-empty">
                <FaUsers className="nominee-empty-icon" />
                <h3>No Nominee Configured</h3>
                <p>Set up a nominee from your Dashboard to allow emergency access to your property records.</p>
                <a href="/dashboard" className="nominee-setup-link">Go to Dashboard - Setup Nominee</a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Profile;
