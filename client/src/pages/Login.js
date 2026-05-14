import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { startAuthentication } from '@simplewebauthn/browser';
import { toast } from 'react-toastify';
import { 
  FaEnvelope, 
  FaLock, 
  FaEye, 
  FaEyeSlash,
  FaShieldAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaLockOpen,
  FaUserPlus,
  FaFingerprint,
  FaKey,
  FaUserShield,
  FaCamera,
  FaPaperPlane,
  FaUsers
} from 'react-icons/fa';
import './Auth.css';

const Login = () => {
  // ─── Login mode: 'password' | 'email-otp' | 'nominee' ───
  const [loginMode, setLoginMode] = useState('password');
  // ─── Step: credentials | otp-verify | nominee | 2fa | biometric-fingerprint | biometric-face | biometric-fallback ───
  const [step, setStep] = useState('credentials');
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  // User & biometric state
  const [userId, setUserId] = useState(null);
  const [biometricSteps, setBiometricSteps] = useState([]);
  const [currentBiometricIndex, setCurrentBiometricIndex] = useState(0);
  const [biometricSessionId, setBiometricSessionId] = useState(null);
  const [scanPhase, setScanPhase] = useState('idle'); // idle | scanning | processing | verified | failed
  const [scanProgress, setScanProgress] = useState(0);
  const [matchScore, setMatchScore] = useState(null);
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Email OTP state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpUserId, setOtpUserId] = useState(null);

  // Nominee state
  const [nomineeOriginalEmail, setNomineeOriginalEmail] = useState('');
  const [nomineeOwnEmail, setNomineeOwnEmail] = useState('');
  const [nomineePassphrase, setNomineePassphrase] = useState('');

  // Biometric fallback state
  const [fallbackMethod, setFallbackMethod] = useState(null); // 'email_otp' | 'google_auth'
  const [fallbackCode, setFallbackCode] = useState('');
  const [failedBiometricStep, setFailedBiometricStep] = useState(null);

  const { login, loginWithToken, loginWithOtp, nomineeLogin: nomineeLoginCtx } = useAuth();
  const navigate = useNavigate();

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [videoStream]);

  // Auto-start camera when entering face step
  useEffect(() => {
    if (step === 'biometric-face' && scanPhase === 'idle') {
      const timer = setTimeout(() => startFaceCamera(), 300);
      return () => clearTimeout(timer);
    }
  }, [step, scanPhase]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Minimum 8 characters required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Phase 1: Credentials (Password Login) ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.requiresBiometric) {
        setUserId(result.userId);
        setBiometricSteps(result.biometricSteps);
        setBiometricSessionId(result.biometricSessionId);
        setCurrentBiometricIndex(0);
        const firstStep = result.biometricSteps[0];
        setStep(firstStep === 'fingerprint' ? 'biometric-fingerprint' : 'biometric-face');
        toast.info('🛡️ Biometric verification required');
      } else {
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
      if (error.response?.data?.lockedUntil) {
        toast.warning('⚠️ Account temporarily locked. Try again later.');
      }
      setFormData({ ...formData, password: '' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Email OTP: Send OTP ───
  const handleSendOtp = async () => {
    if (!otpEmail || !/\S+@\S+\.\S+/.test(otpEmail)) {
      toast.error('Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.sendEmailOtp({ email: otpEmail });
      setOtpUserId(res.data.userId);
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success('📧 OTP sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ─── Email OTP: Verify ───
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await loginWithOtp(otpUserId, otpCode);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Nominee Login (auto-activates if not yet activated) ───
  const handleNomineeLogin = async (e) => {
    e.preventDefault();
    if (!nomineeOriginalEmail || !nomineeOwnEmail || !nomineePassphrase) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await nomineeLoginCtx(nomineeOriginalEmail, nomineeOwnEmail, nomineePassphrase);
      toast.success('Nominee access granted — Read-only mode');
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || '';
      // If nominee isn't activated yet, try to activate first then login
      if (msg.toLowerCase().includes('not activated') || msg.toLowerCase().includes('not found')) {
        try {
          toast.info('Activating nominee access...');
          await authAPI.activateNominee({
            email: nomineeOriginalEmail,
            nomineeEmail: nomineeOwnEmail,
            passphrase: nomineePassphrase
          });
          toast.info('✅ Nominee activated. Logging in...');
          // Retry login after activation
          await nomineeLoginCtx(nomineeOriginalEmail, nomineeOwnEmail, nomineePassphrase);
          toast.success('Nominee access granted — Read-only mode');
          navigate('/dashboard');
        } catch (activateErr) {
          toast.error(activateErr.response?.data?.message || 'Nominee activation/login failed');
        }
      } else {
        toast.error(msg || 'Nominee login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Proceed to next biometric step or complete login ───
  const proceedToNextBiometricStep = useCallback(async () => {
    const nextIndex = currentBiometricIndex + 1;
    if (nextIndex < biometricSteps.length) {
      setCurrentBiometricIndex(nextIndex);
      setScanPhase('idle');
      setScanProgress(0);
      setMatchScore(null);
      const nextStep = biometricSteps[nextIndex];
      setStep(nextStep === 'fingerprint' ? 'biometric-fingerprint' : 'biometric-face');
    } else {
      // All biometric steps done — complete login
      setLoading(true);
      try {
        const res = await authAPI.completeBiometricLogin({ userId, biometricSessionId });
        loginWithToken(res.data.token, res.data.user);
        toast.success('🛡️ All verifications passed — Welcome!');
        navigate('/dashboard');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Login completion failed');
      } finally {
        setLoading(false);
      }
    }
  }, [currentBiometricIndex, biometricSteps, userId, biometricSessionId, loginWithToken, navigate]);

  // ─── Phase 3a: Fingerprint (WebAuthn) ───
  const handleFingerprintScan = useCallback(async () => {
    setScanPhase('scanning');
    setScanProgress(0);
    setMatchScore(null);

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported on this browser. Use Email OTP instead.');
      }
      setScanProgress(20);

      // Step 1: Get authentication options
      let optionsRes;
      try {
        optionsRes = await authAPI.verifyBiometric({
          userId,
          biometricType: 'fingerprint',
          phase: 'options',
          biometricSessionId
        });
      } catch (optErr) {
        // If server says no credentials found, auto-skip to next step
        if (optErr.response?.data?.noCredentials) {
          toast.info('🔄 No fingerprint credentials on this device — skipping to next step...');
          // Try to skip this step on the server too
          try {
            await authAPI.skipBiometricStep({ userId, biometricSessionId, stepToSkip: 'fingerprint', fallbackMethod: 'auto_skip' });
          } catch (skipErr) {
            console.warn('Skip step API failed (non-fatal):', skipErr.message);
          }
          // Auto-proceed to next step
          setScanPhase('idle');
          proceedToNextBiometricStep();
          return;
        }
        throw optErr;
      }
      setScanProgress(40);

      toast.info('🔐 Touch your fingerprint sensor now...', { autoClose: 10000 });

      // Step 2: Trigger real sensor via WebAuthn
      const credential = await startAuthentication({ optionsJSON: optionsRes.data.options });
      setScanProgress(80);
      setScanPhase('processing');

      // Step 3: Verify on server
      const verifyRes = await authAPI.verifyBiometric({
        userId,
        biometricType: 'fingerprint',
        phase: 'verify',
        credential,
        biometricSessionId
      });

      if (verifyRes.data.verified) {
        setScanProgress(100);
        setScanPhase('verified');
        setMatchScore(verifyRes.data.score);
        toast.success(`✅ Fingerprint verified — ${verifyRes.data.score}% match`);
        setTimeout(() => proceedToNextBiometricStep(), 1500);
      } else {
        // Server returned 200 but verified=false
        setScanPhase('failed');
        setMatchScore(verifyRes.data.score || 0);
        setFailedBiometricStep('fingerprint');
        toast.error(verifyRes.data.message || 'Fingerprint did not match. Try again or use a fallback.');
      }
    } catch (err) {
      // If browser WebAuthn rejects because credential doesn't exist on this device, auto-skip
      if (err.name === 'NotAllowedError' || err.name === 'InvalidStateError' || 
          err.name === 'SecurityError' || err.name === 'AbortError') {
        toast.info('🔄 Fingerprint not available on this device — skipping...');
        try {
          await authAPI.skipBiometricStep({ userId, biometricSessionId, stepToSkip: 'fingerprint', fallbackMethod: 'auto_skip' });
        } catch (skipErr) { console.warn('Auto-skip failed:', skipErr.message); }
        setScanPhase('idle');
        proceedToNextBiometricStep();
        return;
      }
      // Session expired or invalid — redirect back to credentials
      if (err.response?.status === 400 && (err.response?.data?.message || '').toLowerCase().includes('session')) {
        toast.error('Biometric session expired. Please login again.');
        setScanPhase('idle');
        setStep('credentials');
        return;
      }
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        setScanPhase('idle');
        setStep('credentials');
        return;
      }
      setScanPhase('failed');
      setMatchScore(0);
      setFailedBiometricStep('fingerprint');
      const msg = err.response?.data?.message || err.message || 'Fingerprint verification failed';
      toast.error(msg);
    }
  }, [userId, biometricSessionId, proceedToNextBiometricStep]);

  // ─── Phase 3b: Face Camera ───
  const startFaceCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setVideoStream(stream);
      const attachVideo = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        } else {
          setTimeout(attachVideo, 100);
        }
      };
      attachVideo();
    } catch (err) {
      toast.error('Camera access denied. Please allow camera permission for face scan.');
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const handleFaceScan = useCallback(async () => {
    setScanPhase('scanning');
    setScanProgress(0);
    setMatchScore(null);

    try {
      if (!videoStream) {
        await startFaceCamera();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setScanProgress(10);
      toast.info('📸 Position your face within the frame...', { autoClose: 6000 });

      const optionsRes = await authAPI.verifyBiometric({
        userId,
        biometricType: 'face',
        phase: 'options',
        biometricSessionId
      });
      setScanProgress(20);

      if (!optionsRes.data.ready) {
        throw new Error('Server not ready for face verification');
      }

      // Animate scanning — capture frames over 3 seconds
      const scanDuration = 3000;
      const startTime = Date.now();

      await new Promise((resolve) => {
        const scanInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(20 + (elapsed / scanDuration) * 50, 70);
          setScanProgress(Math.round(progress));
          captureFrame();
          if (elapsed >= scanDuration) {
            clearInterval(scanInterval);
            resolve();
          }
        }, 300);
      });

      setScanProgress(75);
      setScanPhase('processing');

      const finalCapture = captureFrame();
      if (!finalCapture) throw new Error('Failed to capture face image');

      setScanProgress(85);

      const verifyRes = await authAPI.verifyBiometric({
        userId,
        biometricType: 'face',
        phase: 'verify',
        faceCapture: finalCapture,
        biometricSessionId
      });

      // Stop camera
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        setVideoStream(null);
      }

      if (verifyRes.data.verified) {
        setScanProgress(100);
        setScanPhase('verified');
        setMatchScore(verifyRes.data.score);
        toast.success(`✅ Face verified — ${verifyRes.data.score}% match`);
        setTimeout(() => proceedToNextBiometricStep(), 1500);
      } else {
        // Server returned 200 but verified=false
        setScanPhase('failed');
        setMatchScore(verifyRes.data.score || 0);
        setFailedBiometricStep('face');
        toast.error(verifyRes.data.message || 'Face did not match. Try again or use a fallback.');
      }
    } catch (err) {
      // Stop camera on failure
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        setVideoStream(null);
      }
      // Session expired or invalid — redirect back to credentials
      if (err.response?.status === 400 && (err.response?.data?.message || '').toLowerCase().includes('session')) {
        toast.error('Biometric session expired. Please login again.');
        setScanPhase('idle');
        setStep('credentials');
        return;
      }
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        setScanPhase('idle');
        setStep('credentials');
        return;
      }
      setScanPhase('failed');
      setMatchScore(err.response?.data?.score || 0);
      setFailedBiometricStep('face');
      toast.error(err.response?.data?.message || err.message || 'Face verification failed');
    }
  }, [userId, videoStream, biometricSessionId, startFaceCamera, captureFrame, proceedToNextBiometricStep]);

  // ─── Biometric Fallback: Request fallback ───
  const handleRequestFallback = async (method) => {
    setLoading(true);
    try {
      const res = await authAPI.skipBiometricStep({
        userId,
        stepToSkip: failedBiometricStep || biometricSteps[currentBiometricIndex],
        fallbackMethod: method
      });
      setFallbackMethod(method);
      setStep('biometric-fallback');
      setFallbackCode('');
      toast.info(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fallback unavailable');
    } finally {
      setLoading(false);
    }
  };

  // ─── Biometric Fallback: Verify code ───
  const handleVerifyFallback = async (e) => {
    e.preventDefault();
    if (!fallbackCode || fallbackCode.length !== 6) {
      toast.error('Enter 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyBiometricFallback({
        userId,
        code: fallbackCode,
        fallbackMethod,
        stepToSkip: failedBiometricStep || biometricSteps[currentBiometricIndex],
        biometricSessionId
      });

      if (res.data.success) {
        toast.success('✅ Fallback verification successful');
        // Reset scan state and proceed
        setScanPhase('idle');
        setScanProgress(0);
        setMatchScore(null);
        setFallbackMethod(null);
        setFallbackCode('');
        setTimeout(() => proceedToNextBiometricStep(), 500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fallback verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Switch login mode ───
  const switchMode = (mode) => {
    setLoginMode(mode);
    setStep('credentials');
    setErrors({});
    setOtpSent(false);
    setOtpCode('');
    setOtpEmail('');
    setOtpUserId(null);
    setNomineeOriginalEmail('');
    setNomineeOwnEmail('');
    setNomineePassphrase('');
  };

  const biometricProgress = biometricSteps.length > 0
    ? `Step ${currentBiometricIndex + 1} of ${biometricSteps.length}`
    : '';

  return (
    <div className="auth-page">
      <div className="auth-content">
        <div className="auth-grid">
          {/* Left Column - Info */}
          <aside className="info-section">
            <div className="info-wrapper">
              <div className="info-badge">
                <span>🔒</span>
                <span>Secure Portal</span>
              </div>
              
              <h1 className="info-title">Property Registry Portal</h1>
              <p className="info-description">
                A unified digital platform for secure property registration, 
                verification, and management with government-grade security.
              </p>

              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon blue">
                    <FaShieldAlt />
                  </div>
                  <h3>2-Phase Security</h3>
                  <p>Password → Biometric multi-layer authentication</p>
                </div>

                <div className="benefit-card">
                  <div className="benefit-icon green">
                    <FaFingerprint />
                  </div>
                  <h3>Biometric Verified</h3>
                  <p>Fingerprint & face scan authentication</p>
                </div>

                <div className="benefit-card">
                  <div className="benefit-icon orange">
                    <FaLockOpen />
                  </div>
                  <h3>24/7 Access</h3>
                  <p>Manage properties anytime, anywhere</p>
                </div>
              </div>

              <div className="info-stats">
                <div className="stat-item">
                  <strong>50K+</strong>
                  <span>Properties Registered</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <strong>99.9%</strong>
                  <span>Uptime</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <strong>100%</strong>
                  <span>Secure</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column - Form */}
          <div className="form-section">
            <div className="form-card">
              {/* Register Banner */}
              <Link to="/register" className="register-banner">
                <div className="register-banner-icon">
                  <FaUserPlus />
                </div>
                <div className="register-banner-text">
                  <strong>New to Smart Bhoomi?</strong>
                  <span>Create your account to get started →</span>
                </div>
              </Link>

              {/* ─── Login Mode Tabs (only show on credentials step) ─── */}
              {step === 'credentials' && (
                <div className="login-mode-tabs" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
                  <button 
                    type="button"
                    className={`login-tab ${loginMode === 'password' ? 'active' : ''}`}
                    onClick={() => switchMode('password')}
                    style={{
                      flex: 1, padding: '10px 8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                      background: loginMode === 'password' ? '#0B3D91' : 'transparent',
                      color: loginMode === 'password' ? '#fff' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <FaLock style={{ fontSize: '11px' }} /> Password
                  </button>
                  <button 
                    type="button"
                    className={`login-tab ${loginMode === 'email-otp' ? 'active' : ''}`}
                    onClick={() => switchMode('email-otp')}
                    style={{
                      flex: 1, padding: '10px 8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                      background: loginMode === 'email-otp' ? '#0B3D91' : 'transparent',
                      color: loginMode === 'email-otp' ? '#fff' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <FaEnvelope style={{ fontSize: '11px' }} /> Email OTP
                  </button>
                  <button 
                    type="button"
                    className={`login-tab ${loginMode === 'nominee' ? 'active' : ''}`}
                    onClick={() => switchMode('nominee')}
                    style={{
                      flex: 1, padding: '10px 8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                      background: loginMode === 'nominee' ? '#0B3D91' : 'transparent',
                      color: loginMode === 'nominee' ? '#fff' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <FaUsers style={{ fontSize: '11px' }} /> Nominee
                  </button>
                </div>
              )}

              {/* ─── Phase Indicator ─── */}
              {step !== 'credentials' && (
                <div className="login-phase-indicator">
                  <div className={`phase-dot ${step !== 'credentials' ? 'completed' : 'active'}`}>
                    <FaLock />
                  </div>
                  <div className={`phase-line ${step.startsWith('biometric') ? 'completed' : ''}`} />
                  <div className={`phase-dot ${step.startsWith('biometric') ? 'active' : ''}`}>
                    <FaFingerprint />
                  </div>
                </div>
              )}

              {/* ═══ PASSWORD LOGIN ═══ */}
              {step === 'credentials' && loginMode === 'password' && (
                <>
                  <div className="form-header">
                    <h2>Welcome Back</h2>
                    <p>Please login to your account</p>
                  </div>

                  <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                      <label htmlFor="email" className="input-label">Email Address</label>
                      <div className="input-container">
                        <div className="input-icon"><FaEnvelope /></div>
                        <input
                          type="email" id="email" name="email"
                          value={formData.email} onChange={handleChange}
                          placeholder="name@example.com"
                          className={`input-field ${errors.email ? 'has-error' : ''}`}
                          autoComplete="email"
                        />
                      </div>
                      {errors.email && <div className="input-error"><span>⚠</span> {errors.email}</div>}
                    </div>

                    <div className="input-group">
                      <label htmlFor="password" className="input-label">Password</label>
                      <div className="input-container">
                        <div className="input-icon"><FaLock /></div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password" name="password"
                          value={formData.password} onChange={handleChange}
                          placeholder="Enter your password"
                          className={`input-field ${errors.password ? 'has-error' : ''}`}
                          autoComplete="current-password"
                        />
                        <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {errors.password && <div className="input-error"><span>⚠</span> {errors.password}</div>}
                    </div>

                    <div className="form-options">
                      <label className="checkbox-label">
                        <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} className="checkbox-input" />
                        <span className="checkbox-text">Keep me signed in</span>
                      </label>
                      <Link to="/forgot-password" className="link-primary">Forgot password?</Link>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                      {loading ? (
                        <><span className="btn-spinner"></span><span>Signing in...</span></>
                      ) : (
                        <span>Login to Account</span>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ═══ EMAIL OTP LOGIN ═══ */}
              {step === 'credentials' && loginMode === 'email-otp' && (
                <>
                  <div className="form-header">
                    <h2>Email OTP Login</h2>
                    <p>Login using a one-time password sent to your email</p>
                  </div>

                  <div className="auth-form">
                    <div className="input-group">
                      <label htmlFor="otpEmail" className="input-label">Email Address</label>
                      <div className="input-container">
                        <div className="input-icon"><FaEnvelope /></div>
                        <input
                          type="email" id="otpEmail"
                          value={otpEmail} onChange={e => setOtpEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="input-field"
                          autoComplete="email"
                          disabled={otpSent}
                        />
                      </div>
                    </div>

                    {!otpSent ? (
                      <button type="button" className="btn-login" onClick={handleSendOtp} disabled={loading}>
                        {loading ? (
                          <><span className="btn-spinner"></span> Sending OTP...</>
                        ) : (
                          <><FaPaperPlane /> Send OTP</>
                        )}
                      </button>
                    ) : (
                      <form onSubmit={handleVerifyOtp}>
                        <div className="input-group">
                          <label htmlFor="otpCode" className="input-label">Enter 6-digit OTP</label>
                          <div className="input-container">
                            <div className="input-icon"><FaKey /></div>
                            <input
                              type="text" id="otpCode"
                              value={otpCode}
                              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              maxLength="6"
                              className="input-field mfa-input"
                              autoFocus
                            />
                          </div>
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}>
                          {loading ? <><span className="btn-spinner"></span> Verifying...</> : <><FaCheckCircle /> Verify & Login</>}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '12px' }}>
                          <button
                            type="button"
                            onClick={() => { setOtpSent(false); setOtpCode(''); handleSendOtp(); }}
                            disabled={otpCountdown > 0}
                            style={{
                              background: 'none', border: 'none', color: otpCountdown > 0 ? '#94a3b8' : '#0B3D91',
                              cursor: otpCountdown > 0 ? 'default' : 'pointer', fontSize: '13px', fontWeight: 600
                            }}
                          >
                            {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend OTP'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              )}

              {/* ═══ NOMINEE LOGIN ═══ */}
              {step === 'credentials' && loginMode === 'nominee' && (
                <>
                  <div className="form-header">
                    <h2>Nominee Login</h2>
                    <p>Access property records of a deceased account holder</p>
                  </div>

                  <form onSubmit={handleNomineeLogin} className="auth-form">
                    <div style={{
                      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
                      padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#991B1B', lineHeight: 1.5
                    }}>
                      ⚠️ This access is for authorized nominees only. Unauthorized access is a criminal offense under the IT Act, 2000.
                    </div>

                    <div className="input-group">
                      <label htmlFor="nomineeOriginalEmail" className="input-label">Account Holder's Email</label>
                      <div className="input-container">
                        <div className="input-icon"><FaEnvelope /></div>
                        <input
                          type="email" id="nomineeOriginalEmail"
                          value={nomineeOriginalEmail} onChange={e => setNomineeOriginalEmail(e.target.value)}
                          placeholder="deceased.user@example.com"
                          className="input-field"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="nomineeOwnEmail" className="input-label">Your Email (Nominee)</label>
                      <div className="input-container">
                        <div className="input-icon"><FaEnvelope /></div>
                        <input
                          type="email" id="nomineeOwnEmail"
                          value={nomineeOwnEmail} onChange={e => setNomineeOwnEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="input-field"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="nomineePassphrase" className="input-label">Nominee Passphrase</label>
                      <div className="input-container">
                        <div className="input-icon"><FaKey /></div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="nomineePassphrase"
                          value={nomineePassphrase} onChange={e => setNomineePassphrase(e.target.value)}
                          placeholder="Enter the passphrase provided by account holder"
                          className="input-field"
                        />
                        <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                      {loading ? (
                        <><span className="btn-spinner"></span> Verifying...</>
                      ) : (
                        <><FaUsers /> Access as Nominee</>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ═══ BIOMETRIC FINGERPRINT ═══ */}
              {step === 'biometric-fingerprint' && (
                <div className="auth-form biometric-section">
                  <div className="form-header biometric-header">
                    <div className="biometric-icon-wrapper fingerprint">
                      <FaFingerprint />
                    </div>
                    <h2>Fingerprint Verification</h2>
                    <p className="biometric-sub">{biometricProgress} • Place finger on sensor</p>
                  </div>

                  <div className={`user-fingerprint-scanner ${scanPhase}`}>
                    <div className="fingerprint-visual">
                      <svg viewBox="0 0 200 200" className="fingerprint-svg">
                        <ellipse cx="100" cy="100" rx="75" ry="90" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                        <ellipse cx="100" cy="100" rx="60" ry="75" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                        <ellipse cx="100" cy="100" rx="45" ry="60" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                        <ellipse cx="100" cy="100" rx="30" ry="45" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
                        <ellipse cx="100" cy="100" rx="15" ry="28" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7"/>
                        <ellipse cx="100" cy="100" rx="5" ry="12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.8"/>
                      </svg>
                      {scanPhase === 'scanning' && <div className="fp-scanline" style={{ top: `${scanProgress}%` }} />}
                      {scanPhase === 'verified' && <div className="fp-check"><FaCheckCircle /></div>}
                      {scanPhase === 'failed' && <div className="fp-fail"><FaTimesCircle /></div>}
                    </div>

                    {scanPhase !== 'idle' && (
                      <div className="scan-progress-bar">
                        <div className="scan-progress-fill" style={{ width: `${Math.min(scanProgress, 100)}%` }} />
                      </div>
                    )}

                    <div className="scan-status-text">
                      {scanPhase === 'idle' && 'Ready to scan'}
                      {scanPhase === 'scanning' && 'Reading fingerprint...'}
                      {scanPhase === 'processing' && 'Matching biometric template...'}
                      {scanPhase === 'verified' && `✅ Verified — ${matchScore}% match`}
                      {scanPhase === 'failed' && `❌ Failed — Try again`}
                    </div>
                  </div>

                  {(scanPhase === 'idle' || scanPhase === 'failed') && (
                    <>
                      <button type="button" className="btn-login biometric-btn" onClick={handleFingerprintScan} disabled={loading}>
                        <FaFingerprint /> {scanPhase === 'failed' ? 'Retry Scan' : 'Begin Fingerprint Scan'}
                      </button>

                      {/* Fallback Options — always visible so users aren't forced to fail first */}
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                          {scanPhase === 'failed' ? 'Fingerprint failed? Try an alternative:' : "Can't use fingerprint? Use an alternative:"}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button type="button" onClick={() => { setFailedBiometricStep('fingerprint'); handleRequestFallback('email_otp'); }} disabled={loading}
                            style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#0B3D91', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaEnvelope /> Email OTP
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <button type="button" className="btn-back-login" onClick={() => { setStep('credentials'); setScanPhase('idle'); }}>
                    ← Back to login
                  </button>
                </div>
              )}

              {/* ═══ BIOMETRIC FACE ═══ */}
              {step === 'biometric-face' && (
                <div className="auth-form biometric-section">
                  <div className="form-header biometric-header">
                    <div className="biometric-icon-wrapper face">
                      <FaUserShield />
                    </div>
                    <h2>Face Verification</h2>
                    <p className="biometric-sub">{biometricProgress} • Position your face within the frame</p>
                  </div>

                  <div className={`user-face-scanner ${scanPhase}`}>
                    <div className="face-camera-container">
                      <video ref={videoRef} autoPlay muted playsInline className="face-video-feed" />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                      <div className="face-overlay-frame">
                        <div className="face-guide">
                          <span className="corner tl" />
                          <span className="corner tr" />
                          <span className="corner bl" />
                          <span className="corner br" />
                        </div>
                        {scanPhase === 'scanning' && <div className="face-scanline-bar" style={{ top: `${scanProgress}%` }} />}
                        {scanPhase === 'scanning' && (
                          <div className="face-scan-label"><span className="dot-pulse" /> SCANNING</div>
                        )}
                        {scanPhase === 'processing' && (
                          <div className="face-scan-label processing"><span className="dot-pulse" /> MATCHING</div>
                        )}
                      </div>
                      {scanPhase === 'verified' && <div className="face-result-overlay success"><FaCheckCircle /></div>}
                      {scanPhase === 'failed' && <div className="face-result-overlay fail"><FaTimesCircle /></div>}
                      {!videoStream && scanPhase === 'idle' && (
                        <div className="face-camera-placeholder">
                          <FaCamera />
                          <span>Initializing camera...</span>
                        </div>
                      )}
                    </div>

                    {scanPhase !== 'idle' && (
                      <div className="scan-progress-bar">
                        <div className="scan-progress-fill face" style={{ width: `${Math.min(scanProgress, 100)}%` }} />
                      </div>
                    )}

                    <div className="scan-status-text">
                      {scanPhase === 'idle' && (videoStream ? '📸 Camera active — position your face' : '⏳ Starting camera...')}
                      {scanPhase === 'scanning' && `Capturing facial features... ${scanProgress}%`}
                      {scanPhase === 'processing' && 'Matching face against enrolled template...'}
                      {scanPhase === 'verified' && `✅ Face Verified — ${matchScore}% match`}
                      {scanPhase === 'failed' && `❌ Failed — Score: ${matchScore}%`}
                    </div>
                  </div>

                  {(scanPhase === 'idle' || scanPhase === 'failed') && (
                    <>
                      <button type="button" className="btn-login biometric-btn face-btn" onClick={handleFaceScan} disabled={loading}>
                        <FaCamera /> {scanPhase === 'failed' ? 'Retry Face Scan' : 'Begin Face Scan'}
                      </button>

                      {/* Fallback Options — always visible so users aren't forced to fail first */}
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                          {scanPhase === 'failed' ? 'Face scan failed? Try an alternative:' : "Can't use camera? Use an alternative:"}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button type="button" onClick={() => { setFailedBiometricStep('face'); handleRequestFallback('email_otp'); }} disabled={loading}
                            style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#0B3D91', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaEnvelope /> Email OTP
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <button type="button" className="btn-back-login" onClick={() => {
                    if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); setVideoStream(null); }
                    setStep('credentials'); setScanPhase('idle');
                  }}>
                    ← Back to login
                  </button>
                </div>
              )}

              {/* ═══ BIOMETRIC FALLBACK (Email OTP) ═══ */}
              {step === 'biometric-fallback' && (
                <form onSubmit={handleVerifyFallback} className="auth-form">
                  <div className="form-header biometric-header">
                    <div className="biometric-icon-wrapper mfa">
                      <FaEnvelope />
                    </div>
                    <h2>Email OTP Verification</h2>
                    <p>Enter the 6-digit code sent to your registered email</p>
                  </div>

                  <div className="input-group">
                    <label htmlFor="fallbackCode" className="input-label">
                      Email OTP Code
                    </label>
                    <div className="input-container">
                      <div className="input-icon"><FaKey /></div>
                      <input
                        type="text" id="fallbackCode"
                        value={fallbackCode}
                        onChange={e => setFallbackCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength="6"
                        className="input-field mfa-input"
                        autoFocus required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-login" disabled={loading}>
                    {loading ? <><span className="btn-spinner"></span> Verifying...</> : <><FaCheckCircle /> Verify & Continue</>}
                  </button>

                  <button type="button" className="btn-back-login" onClick={() => {
                    setStep(failedBiometricStep === 'fingerprint' ? 'biometric-fingerprint' : 'biometric-face');
                    setScanPhase('idle');
                    setFallbackMethod(null);
                    setFallbackCode('');
                  }}>
                    ← Back to biometric scan
                  </button>
                </form>
              )}

              {/* Security Note */}
              <div className="security-note">
                <FaShieldAlt className="note-icon" />
                <span>Your connection is secured with 256-bit SSL encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="auth-footer">
        <div className="footer-container">
          <p>© 2025 Government of India. All Rights Reserved.</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Accessibility</a>
            <a href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;