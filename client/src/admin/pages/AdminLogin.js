import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAuthAPI, webAuthnHelpers } from '../services/adminApi';
import { toast } from 'react-toastify';
import {
  FaShieldAlt, FaLock, FaEnvelope, FaKey,
  FaFingerprint, FaEye, FaEyeSlash, FaExclamationTriangle,
  FaCheckCircle, FaTimesCircle, FaUserShield
} from 'react-icons/fa';
import './AdminLogin.css';

const AdminLogin = () => {
  const [step, setStep] = useState('credentials'); // credentials | biometric-fingerprint | biometric-face
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [mfaQR, setMfaQR] = useState(null);
  const [mfaSecret, setMfaSecret] = useState(null);
  const [loading, setLoading] = useState(false);

  // Biometric state
  const [biometricSteps, setBiometricSteps] = useState([]);
  const [currentBiometricIndex, setCurrentBiometricIndex] = useState(0);
  const [bioSessionToken, setBioSessionToken] = useState(null);
  const [scanPhase, setScanPhase] = useState('idle'); // idle | scanning | processing | verified | failed
  const [scanProgress, setScanProgress] = useState(0);
  const [matchScore, setMatchScore] = useState(null);
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const { loginSuccess } = useAdminAuth();
  const navigate = useNavigate();

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [videoStream]);

  const handleCredentials = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('All fields required');
    setLoading(true);
    try {
      const res = await adminAuthAPI.login({ email, password });
      const d = res.data;

      if (d.requiresBiometric && d.biometricSteps?.length > 0) {
        setAdminId(d.adminId);
        setBiometricSteps(d.biometricSteps);
        setCurrentBiometricIndex(0);
        if (d.bioSessionToken) setBioSessionToken(d.bioSessionToken);
        const firstStep = d.biometricSteps[0];
        setStep(firstStep === 'fingerprint' ? 'biometric-fingerprint' : 'biometric-face');
        toast.info('🛡️ Biometric authentication required');
      } else if (d.token) {
        loginSuccess(d.token, d.admin);
        toast.success('Welcome, Officer');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    if (!mfaToken || mfaToken.length !== 6) return toast.error('Enter 6-digit code');
    setLoading(true);
    try {
      const res = await adminAuthAPI.verifyMFA({
        adminId,
        mfaToken,
        isSetup: step === 'mfa-setup'
      });
      const d = res.data;

      // Check if biometric verification is required
      if (d.requiresBiometric && d.biometricSteps?.length > 0) {
        setBiometricSteps(d.biometricSteps);
        setCurrentBiometricIndex(0);
        if (d.bioSessionToken) setBioSessionToken(d.bioSessionToken);
        const firstStep = d.biometricSteps[0];
        setStep(firstStep === 'fingerprint' ? 'biometric-fingerprint' : 'biometric-face');
        toast.info(`🛡️ MFA Verified — Biometric authentication required`);
      } else if (d.autoRecovered) {
        // Server detected invalid biometric credentials and auto-recovered
        loginSuccess(d.token, d.admin);
        toast.warn(d.recoveryMessage || '⚠️ Biometric credentials were reset. Please re-enroll from KYC settings.', { autoClose: 8000 });
        navigate('/admin/dashboard');
      } else if (d.token) {
        loginSuccess(d.token, d.admin);
        toast.success('🛡️ MFA Verified — Access Granted');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'MFA verification failed');
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
        const res = await adminAuthAPI.completeBiometricLogin({ adminId, bioSessionToken });
        loginSuccess(res.data.token, res.data.admin);
        toast.success('🛡️ All verifications passed — Access Granted');
        navigate('/admin/dashboard');
      } catch (err) {
        toast.error('Login completion failed');
      } finally {
        setLoading(false);
      }
    }
  }, [currentBiometricIndex, biometricSteps, adminId, bioSessionToken, loginSuccess, navigate]);

  // ─── Fingerprint Scan Handler (Real WebAuthn — triggers system sensor) ───
  const handleFingerprintScan = useCallback(async () => {
    setScanPhase('scanning');
    setScanProgress(0);
    setMatchScore(null);

    try {
      // Check sensor availability
      const available = await webAuthnHelpers.isPlatformAvailable();
      if (!available) {
        throw new Error('No biometric sensor detected on this device');
      }
      setScanProgress(20);

      // Step 1: Get authentication challenge from server
      const optionsRes = await adminAuthAPI.verifyBiometric({
        adminId,
        biometricType: 'fingerprint',
        phase: 'options'
      });
      setScanProgress(40);

      toast.info('🔐 Touch your fingerprint sensor now...', { autoClose: 10000 });

      // Step 2: Trigger real fingerprint sensor via WebAuthn
      // This opens the native OS fingerprint dialog (Touch ID / Windows Hello)
      const credential = await webAuthnHelpers.startAuthentication(optionsRes.data.options);
      setScanProgress(80);
      setScanPhase('processing');

      // Step 3: Verify credential on server
      const verifyRes = await adminAuthAPI.verifyBiometric({
        adminId,
        biometricType: 'fingerprint',
        phase: 'verify',
        credential
      });

      if (verifyRes.data.verified) {
        setScanProgress(100);
        setScanPhase('verified');
        setMatchScore(verifyRes.data.score);
        toast.success(`✅ Fingerprint verified via system sensor`);

        setTimeout(() => {
          proceedToNextBiometricStep();
        }, 1500);
      }
    } catch (err) {
      // Handle credential mismatch auto-recovery (409)
      if (err.response?.status === 409 && err.response?.data?.credentialMismatch) {
        setScanPhase('failed');
        toast.warn(err.response.data.message || '⚠️ Biometric credentials were out of sync and have been reset.', { autoClose: 8000 });
        // Auto-complete login since server downgraded to standard
        try {
          const recoveryRes = await adminAuthAPI.completeBiometricLogin({ adminId, bioSessionToken: '__recovery__' });
          // If recovery login also fails (expected since session is invalid), do a fresh standard login
          loginSuccess(recoveryRes.data.token, recoveryRes.data.admin);
          navigate('/admin/dashboard');
        } catch {
          // Expected — biometric session is now invalid. Restart login flow.
          toast.info('🔄 Please log in again — biometrics have been reset to standard mode.', { autoClose: 6000 });
          setStep('credentials');
          setBiometricSteps([]);
          setCurrentBiometricIndex(0);
          setBioSessionToken(null);
          setScanPhase('idle');
          setScanProgress(0);
        }
        return;
      }
      setScanPhase('failed');
      setMatchScore(0);
      const msg = err.name === 'NotAllowedError'
        ? 'Fingerprint scan cancelled or timed out. Try again.'
        : err.response?.data?.message || err.message || 'Fingerprint verification failed';
      toast.error(msg);
    }
  }, [adminId, bioSessionToken]);

  // ─── Face Scan Handler (Camera-Based — Real webcam face capture) ───
  const startFaceCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setVideoStream(stream);
      // Retry attaching to video element with a delay for DOM rendering
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
    // Mirror the image to match the video display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const handleFaceScan = useCallback(async () => {
    setScanPhase('scanning');
    setScanProgress(0);
    setMatchScore(null);

    try {
      // Ensure camera is running
      if (!videoStream) {
        await startFaceCamera();
        // Give camera time to warm up
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setScanProgress(10);
      toast.info('📸 Position your face within the frame...', { autoClose: 6000 });

      // Step 1: Request face verification readiness from server
      const optionsRes = await adminAuthAPI.verifyBiometric({
        adminId,
        biometricType: 'face',
        phase: 'options'
      });
      setScanProgress(20);

      if (!optionsRes.data.ready) {
        throw new Error('Server not ready for face verification');
      }

      // Step 2: Animate face scanning — capture multiple frames for analysis
      const scanDuration = 3000; // 3 second scan
      const startTime = Date.now();
      const frames = [];

      await new Promise((resolve) => {
        const scanInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(20 + (elapsed / scanDuration) * 50, 70);
          setScanProgress(Math.round(progress));

          // Capture frames at intervals
          const frame = captureFrame();
          if (frame) frames.push(frame);

          if (elapsed >= scanDuration) {
            clearInterval(scanInterval);
            resolve();
          }
        }, 300);
      });

      setScanProgress(75);
      setScanPhase('processing');

      // Step 3: Take final high-quality capture
      const finalCapture = captureFrame();
      if (!finalCapture) {
        throw new Error('Failed to capture face image. Ensure camera is working.');
      }

      setScanProgress(85);

      // Step 4: Send face capture to server for verification
      const verifyRes = await adminAuthAPI.verifyBiometric({
        adminId,
        biometricType: 'face',
        phase: 'verify',
        faceCapture: finalCapture
      });

      // Stop camera after verification
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        setVideoStream(null);
      }

      if (verifyRes.data.verified) {
        setScanProgress(100);
        setScanPhase('verified');
        setMatchScore(verifyRes.data.score);
        toast.success(`✅ Face verified — ${verifyRes.data.score}% match`);

        setTimeout(() => {
          proceedToNextBiometricStep();
        }, 1500);
      }
    } catch (err) {
      // Handle credential mismatch auto-recovery (409)
      if (err.response?.status === 409 && err.response?.data?.credentialMismatch) {
        setScanPhase('failed');
        toast.warn(err.response.data.message || '⚠️ Face credentials were out of sync and have been reset.', { autoClose: 8000 });
        toast.info('🔄 Please log in again — biometrics have been reset to standard mode.', { autoClose: 6000 });
        setStep('credentials');
        setBiometricSteps([]);
        setCurrentBiometricIndex(0);
        setBioSessionToken(null);
        setScanPhase('idle');
        setScanProgress(0);
        return;
      }
      setScanPhase('failed');
      setMatchScore(err.response?.data?.score || 0);
      const msg = err.response?.data?.message || err.message || 'Face verification failed';
      toast.error(msg);
    }
  }, [adminId, videoStream, startFaceCamera, captureFrame, proceedToNextBiometricStep]);

  // Start face camera when entering face scan step
  useEffect(() => {
    if (step === 'biometric-face' && scanPhase === 'idle') {
      // Delay to ensure DOM has rendered the video element
      const timer = setTimeout(() => startFaceCamera(), 300);
      return () => clearTimeout(timer);
    }
  }, [step, scanPhase, startFaceCamera]);

  const currentBiometricType = biometricSteps[currentBiometricIndex];
  const biometricProgress = biometricSteps.length > 0 
    ? `Step ${currentBiometricIndex + 1} of ${biometricSteps.length}` 
    : '';

  return (
    <div className="admin-login-page">
      {/* Ambient background */}
      <div className="admin-login-ambient" />
      <div className="admin-login-grid" />

      <div className="admin-login-container">
        {/* Header */}
        <div className="admin-login-header">
          <div className="admin-login-emblem">
            <FaShieldAlt />
          </div>
          <h1>Command Center</h1>
          <p className="admin-login-subtitle">
            Smart Bhoomi National Land Infrastructure — Government Portal
          </p>
          <div className="admin-login-classification">
            <FaLock /> RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
          </div>
        </div>

        {/* Step: Credentials */}
        {step === 'credentials' && (
          <form className="admin-login-form" onSubmit={handleCredentials}>
            <div className="admin-form-group">
              <label><FaEnvelope /> Government Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="officer@gov.in"
                autoComplete="email"
                required
              />
            </div>
            <div className="admin-form-group">
              <label><FaLock /> Password</label>
              <div className="admin-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="admin-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? <span className="admin-spinner" /> : <FaKey />}
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
            <div className="admin-login-warning">
              <FaExclamationTriangle /> This system is for authorized government officials only.
              Unauthorized access is a punishable offense under IT Act, 2000.
            </div>
          </form>
        )}

        {/* Step: Biometric — Fingerprint */}
        {step === 'biometric-fingerprint' && (
          <div className="admin-login-form admin-biometric-section">
            <div className="admin-biometric-header">
              <div className="admin-biometric-badge">
                <FaFingerprint />
              </div>
              <h3>Fingerprint Verification</h3>
              <p className="admin-biometric-sub">{biometricProgress} • Place your finger on the sensor</p>
            </div>

            <div className={`admin-fingerprint-scanner ${scanPhase}`}>
              <div className="fingerprint-visual">
                <svg viewBox="0 0 200 200" className="fingerprint-svg">
                  {/* Fingerprint ridges */}
                  <ellipse cx="100" cy="100" rx="75" ry="90" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <ellipse cx="100" cy="100" rx="60" ry="75" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                  <ellipse cx="100" cy="100" rx="45" ry="60" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                  <ellipse cx="100" cy="100" rx="30" ry="45" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
                  <ellipse cx="100" cy="100" rx="15" ry="28" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7"/>
                  <ellipse cx="100" cy="100" rx="5" ry="12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.8"/>
                </svg>
                {scanPhase === 'scanning' && <div className="fingerprint-scanline" style={{ top: `${scanProgress}%` }} />}
                {scanPhase === 'verified' && (
                  <div className="fingerprint-check"><FaCheckCircle /></div>
                )}
                {scanPhase === 'failed' && (
                  <div className="fingerprint-fail"><FaTimesCircle /></div>
                )}
              </div>

              {scanPhase !== 'idle' && (
                <div className="scan-progress-bar">
                  <div className="scan-progress-fill" style={{ width: `${Math.min(scanProgress, 100)}%` }} />
                </div>
              )}

              <div className="scan-status-text">
                {scanPhase === 'idle' && 'Ready to scan'}
                {scanPhase === 'scanning' && 'Reading fingerprint ridges...'}
                {scanPhase === 'processing' && 'Matching biometric template...'}
                {scanPhase === 'verified' && `✅ Verified — ${matchScore}% match`}
                {scanPhase === 'failed' && `❌ Failed — Score: ${matchScore}% (min 80% required)`}
              </div>
            </div>

            {(scanPhase === 'idle' || scanPhase === 'failed') && (
              <button
                type="button"
                className="admin-login-btn admin-biometric-btn"
                onClick={handleFingerprintScan}
                disabled={loading}
              >
                <FaFingerprint /> {scanPhase === 'failed' ? 'Retry Fingerprint Scan' : 'Begin Fingerprint Scan'}
              </button>
            )}

            <button type="button" className="admin-back-btn" onClick={() => { setStep('credentials'); setScanPhase('idle'); }}>
              ← Back to MFA
            </button>
          </div>
        )}

        {/* Step: Biometric — Face */}
        {step === 'biometric-face' && (
          <div className="admin-login-form admin-biometric-section">
            <div className="admin-biometric-header">
              <div className="admin-biometric-badge face">
                <FaUserShield />
              </div>
              <h3>Face Verification</h3>
              <p className="admin-biometric-sub">{biometricProgress} • Position your face within the frame</p>
            </div>

            <div className={`admin-face-scanner ${scanPhase}`}>
              <div className="face-camera-container">
                <video ref={videoRef} autoPlay muted playsInline className="face-video" />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="face-overlay">
                  <div className="face-frame">
                    {/* Corner markers for face detection */}
                    <span className="face-corner top-left" />
                    <span className="face-corner top-right" />
                    <span className="face-corner bottom-left" />
                    <span className="face-corner bottom-right" />
                  </div>
                  {scanPhase === 'scanning' && <div className="face-scanline" style={{ top: `${scanProgress}%` }} />}
                  {scanPhase === 'scanning' && (
                    <div className="face-scan-label">
                      <span className="face-scan-dot" /> SCANNING
                    </div>
                  )}
                  {scanPhase === 'processing' && (
                    <div className="face-scan-label processing">
                      <span className="face-scan-dot" /> MATCHING
                    </div>
                  )}
                </div>
                {scanPhase === 'verified' && (
                  <div className="face-check-overlay"><FaCheckCircle /></div>
                )}
                {scanPhase === 'failed' && (
                  <div className="face-fail-overlay"><FaTimesCircle /></div>
                )}
                {!videoStream && scanPhase === 'idle' && (
                  <div className="face-camera-placeholder">
                    <FaUserShield />
                    <span>Initializing camera...</span>
                  </div>
                )}
              </div>

              {scanPhase !== 'idle' && (
                <div className="scan-progress-bar">
                  <div className="scan-progress-fill face-fill" style={{ width: `${Math.min(scanProgress, 100)}%` }} />
                </div>
              )}

              <div className="scan-status-text">
                {scanPhase === 'idle' && (videoStream ? '📸 Camera active — position your face' : '⏳ Starting camera...')}
                {scanPhase === 'scanning' && `Capturing facial features... ${scanProgress}%`}
                {scanPhase === 'processing' && 'Matching face against enrolled template...'}
                {scanPhase === 'verified' && `✅ Face Verified — ${matchScore}% match`}
                {scanPhase === 'failed' && `❌ Failed — Score: ${matchScore}% (min 70% required)`}
              </div>
            </div>

            {(scanPhase === 'idle' || scanPhase === 'failed') && (
              <button
                type="button"
                className="admin-login-btn admin-biometric-btn face-btn"
                onClick={handleFaceScan}
                disabled={loading}
              >
                <FaUserShield /> {scanPhase === 'failed' ? 'Retry Face Scan' : 'Begin Face Scan'}
              </button>
            )}

            <button type="button" className="admin-back-btn" onClick={() => {
              if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); setVideoStream(null); }
              setStep('credentials'); setScanPhase('idle');
            }}>
              ← Back to MFA
            </button>
          </div>
        )}

        <div className="admin-login-footer">
          <span>🇮🇳 Government of India — Ministry of Electronics & IT</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
