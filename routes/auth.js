const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authLimiter, registerValidation, validate } = require('../middleware/security');
const {
  register,
  login,
  getProfile,
  updateProfile,
  toggleBiometricAuth,
  verifyUserBiometric,
  completeBiometricLogin,
  verifyTransferFace,
  // New: Email OTP
  sendEmailOtp,
  verifyEmailOtp,
  // New: Nominee
  setupNominee,
  activateNomineeAccess,
  nomineeLogin,
  // New: Biometric fallbacks
  skipBiometricStep,
  verifyBiometricFallback,
  // New: Biometric re-enrollment
  requestBiometricReEnrollOtp,
  verifyBiometricReEnrollOtp,
  completeFaceReEnroll,
  completeFingerprintReEnroll,
  getBiometricHistory
} = require('../controllers/authController');

// ─── Public auth routes ───
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, login);

// ─── Email OTP login (public — user logs in via OTP instead of password) ───
router.post('/send-email-otp', authLimiter, sendEmailOtp);
router.post('/verify-email-otp', authLimiter, verifyEmailOtp);

// ─── Nominee access (public) ───
router.post('/nominee-login', authLimiter, nomineeLogin);
router.post('/activate-nominee', authLimiter, activateNomineeAccess);

// ─── Biometric login routes (public — user is mid-login) ───
router.post('/verify-biometric', authLimiter, verifyUserBiometric);
router.post('/complete-biometric-login', authLimiter, completeBiometricLogin);
router.post('/skip-biometric-step', authLimiter, skipBiometricStep);
router.post('/verify-biometric-fallback', authLimiter, verifyBiometricFallback);

// ─── Protected routes ───
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/biometric-auth-toggle', protect, toggleBiometricAuth);
router.post('/setup-nominee', protect, setupNominee);
router.post('/verify-transfer-face', protect, verifyTransferFace);

// ─── Biometric Re-enrollment (protected) ───
router.post('/biometric/re-enroll/request-otp', protect, requestBiometricReEnrollOtp);
router.post('/biometric/re-enroll/verify-otp', protect, verifyBiometricReEnrollOtp);
router.post('/biometric/re-enroll/face', protect, completeFaceReEnroll);
router.post('/biometric/re-enroll/fingerprint', protect, completeFingerprintReEnroll);
router.get('/biometric/history', protect, getBiometricHistory);

module.exports = router;
