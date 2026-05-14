const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  requestAadhaarOTP,
  verifyAadhaar,
  verifyPAN,
  getKYCStatus,
  biometricRegisterOptions,
  biometricRegisterVerify,
  faceLivenessChallenge,
  faceLivenessVerify
} = require('../controllers/kycController');

// All routes require authentication
router.use(protect);

// ─── KYC Status ─────────────────────────────────────────
router.get('/status', getKYCStatus);

// ─── Aadhaar Verification ───────────────────────────────
router.post('/aadhaar/request-otp', requestAadhaarOTP);
router.post('/aadhaar/verify', verifyAadhaar);

// ─── PAN Verification ───────────────────────────────────
router.post('/pan/verify', verifyPAN);

// ─── FIDO2 Biometric Registration ──────────────────────
router.post('/biometric/register-options', biometricRegisterOptions);
router.post('/biometric/register-verify', biometricRegisterVerify);

// ─── Face Liveness ──────────────────────────────────────
router.post('/face/challenge', faceLivenessChallenge);
router.post('/face/verify', faceLivenessVerify);

module.exports = router;
