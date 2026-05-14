const User = require('../models/User');
const eKYCService = require('../services/eKYCService');
const biometricService = require('../services/BiometricService');
const { encrypt, maskData } = require('../utils/encryption');
const blockchainService = require('../blockchain/BlockchainService');

/**
 * KYC & Biometric Controller
 * 
 * Handles e-KYC verification (Aadhaar/PAN) and
 * FIDO2 biometric registration/authentication endpoints.
 */

// ─── e-KYC: Aadhaar ────────────────────────────────────

// Request Aadhaar OTP
exports.requestAadhaarOTP = async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;
    const result = await eKYCService.requestAadhaarOTP(aadhaarNumber);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.status(200).json({
      success: true,
      txnId: result.txnId,
      message: result.message,
      generatedOTP: result.generatedOTP // Real OTP for user to enter
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to request OTP', error: error.message });
  }
};

// Verify Aadhaar with OTP
exports.verifyAadhaar = async (req, res) => {
  try {
    const { aadhaarNumber, otp } = req.body;
    const result = await eKYCService.verifyAadhaar(aadhaarNumber, otp);

    if (!result.verified) {
      return res.status(400).json({ success: false, message: result.error, errorCode: result.errorCode });
    }

    // Update user KYC status
    const user = await User.findById(req.user._id);
    user.kycStatus = {
      ...user.kycStatus,
      aadhaarVerified: true,
      aadhaarVerifiedAt: new Date()
    };
    user.kycData = {
      ...user.kycData,
      aadhaarMasked: result.maskedAadhaar,
      aadhaarRefId: result.referenceId,
      aadhaarEncrypted: encrypt(aadhaarNumber.replace(/\\s|-/g, '')),
      aadhaarLinkedName: result.name || user.name
    };
    user.kycStatus.kycLevel = eKYCService.calculateKYCLevel(user.kycStatus);
    await user.save();

    // Anchor to blockchain
    try {
      await blockchainService.recordTransaction({
        type: 'KYC_AADHAAR_VERIFIED',
        data: { userId: user._id.toString(), aadhaarMasked: result.maskedAadhaar, refId: result.referenceId, timestamp: Date.now() }
      });
    } catch (bcErr) { console.error('Blockchain anchor (non-fatal):', bcErr.message); }

    res.status(200).json({
      success: true,
      message: 'Aadhaar verified successfully',
      maskedAadhaar: result.maskedAadhaar,
      kycLevel: user.kycStatus.kycLevel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Aadhaar verification failed', error: error.message });
  }
};

// ─── e-KYC: PAN ─────────────────────────────────────────

exports.verifyPAN = async (req, res) => {
  try {
    const { panNumber, name, dob } = req.body;
    const result = await eKYCService.verifyPAN(panNumber, name || req.user.name, dob);

    if (!result.verified) {
      return res.status(400).json({ success: false, message: result.error, errorCode: result.errorCode });
    }

    const user = await User.findById(req.user._id);
    user.kycStatus = {
      ...user.kycStatus,
      panVerified: true,
      panVerifiedAt: new Date()
    };
    user.kycData = {
      ...user.kycData,
      panMasked: result.maskedPan,
      panRefId: result.referenceId,
      panEncrypted: encrypt(panNumber.toUpperCase()),
      panLinkedName: result.nameOnPan || name || user.name
    };
    user.kycStatus.kycLevel = eKYCService.calculateKYCLevel(user.kycStatus);
    await user.save();

    // Anchor to blockchain
    try {
      await blockchainService.recordTransaction({
        type: 'KYC_PAN_VERIFIED',
        data: { userId: user._id.toString(), panMasked: result.maskedPan, refId: result.referenceId, timestamp: Date.now() }
      });
    } catch (bcErr) { console.error('Blockchain anchor (non-fatal):', bcErr.message); }

    res.status(200).json({
      success: true,
      message: 'PAN verified successfully',
      maskedPan: result.maskedPan,
      kycLevel: user.kycStatus.kycLevel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'PAN verification failed', error: error.message });
  }
};

// ─── Get KYC Status ─────────────────────────────────────

exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const eligibility = eKYCService.checkTransferEligibility(user);

    res.status(200).json({
      success: true,
      kycStatus: user.kycStatus || {},
      kycData: user.kycData || {},
      transferEligibility: eligibility,
      biometricCredentials: (user.biometricCredentials || []).map(c => ({
        credentialId: c.credentialId,
        deviceType: c.deviceType,
        registeredAt: c.registeredAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch KYC status', error: error.message });
  }
};

// ─── FIDO2 Biometric: Registration ─────────────────────

exports.biometricRegisterOptions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const options = await biometricService.generateRegistrationOptions(user);
    res.status(200).json({ success: true, options });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate registration options', error: error.message });
  }
};

exports.biometricRegisterVerify = async (req, res) => {
  try {
    const { challengeId, credential } = req.body;
    const user = await User.findById(req.user._id);
    const result = await biometricService.verifyRegistration(challengeId, credential, user);

    if (!result.verified) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // Save credential to user
    user.biometricCredentials = user.biometricCredentials || [];
    user.biometricCredentials.push(result.credential);
    const prevVersion = user.kycStatus?.fingerprintEnrollmentVersion || 0;
    user.kycStatus = {
      ...user.kycStatus,
      fingerprintEnrolled: true,
      fingerprintEnrolledAt: user.kycStatus?.fingerprintEnrolledAt || new Date(),
      fingerprintLastUpdated: new Date(),
      fingerprintEnrollmentVersion: prevVersion + 1
    };
    user.kycStatus.kycLevel = eKYCService.calculateKYCLevel(user.kycStatus);
    
    // Track enrollment history
    user.biometricUpdateHistory = user.biometricUpdateHistory || [];
    user.biometricUpdateHistory.push({
      type: 'fingerprint',
      action: prevVersion === 0 ? 'enrolled' : 're_enrolled',
      previousVersion: prevVersion,
      newVersion: prevVersion + 1,
      verifiedVia: 'email_otp',
      timestamp: new Date()
    });
    await user.save();

    // Anchor to blockchain
    try {
      const txResult = await blockchainService.recordTransaction({
        type: 'BIOMETRIC_FINGERPRINT_ENROLLED',
        data: { userId: user._id.toString(), credentialId: result.credential.credentialId, version: prevVersion + 1, timestamp: Date.now() }
      });
      if (txResult?.transactionHash) {
        user.biometricUpdateHistory[user.biometricUpdateHistory.length - 1].blockchainTxId = txResult.transactionHash;
        await user.save();
      }
    } catch (bcErr) { console.error('Blockchain anchor (non-fatal):', bcErr.message); }

    res.status(200).json({
      success: true,
      message: 'Biometric credential registered successfully',
      credentialId: result.credential.credentialId,
      kycLevel: user.kycStatus.kycLevel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Biometric registration failed', error: error.message });
  }
};

// ─── Face Liveness ──────────────────────────────────────

exports.faceLivenessChallenge = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const challenge = biometricService.generateLivenessChallenge(user);
    res.status(200).json({ success: true, ...challenge });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate liveness challenge', error: error.message });
  }
};

exports.faceLivenessVerify = async (req, res) => {
  try {
    const { challengeId, livenessData } = req.body;
    const user = await User.findById(req.user._id);
    const result = await biometricService.verifyLiveness(challengeId, livenessData, user);

    if (!result.verified) {
      return res.status(400).json({ success: false, message: 'Liveness verification failed', ...result });
    }

    // If enrolling face for the first time or re-enrolling
    if (livenessData?.faceDescriptor) {
      const prevVersion = user.kycStatus?.faceEnrollmentVersion || 0;
      const isNewEnrollment = !user.kycStatus?.faceEnrolled;
      user.kycStatus = {
        ...user.kycStatus,
        faceEnrolled: true,
        faceEnrolledAt: user.kycStatus?.faceEnrolledAt || new Date(),
        faceLastUpdated: new Date(),
        faceEnrollmentVersion: prevVersion + 1
      };
      user.kycStatus.kycLevel = eKYCService.calculateKYCLevel(user.kycStatus);

      // Store face descriptor linked to Aadhaar identity
      user.faceDescriptors = user.faceDescriptors || [];
      user.faceDescriptors.push({
        descriptor: JSON.stringify(livenessData.faceDescriptor),
        capturedAt: new Date(),
        version: prevVersion + 1,
        linkedAadhaar: user.kycData?.aadhaarMasked || ''
      });
      // Keep last 3 versions
      if (user.faceDescriptors.length > 3) {
        user.faceDescriptors = user.faceDescriptors.slice(-3);
      }

      // Track enrollment history
      user.biometricUpdateHistory = user.biometricUpdateHistory || [];
      user.biometricUpdateHistory.push({
        type: 'face',
        action: isNewEnrollment ? 'enrolled' : 're_enrolled',
        previousVersion: prevVersion,
        newVersion: prevVersion + 1,
        verifiedVia: 'email_otp',
        timestamp: new Date()
      });
      await user.save();

      // Anchor to blockchain
      try {
        const txResult = await blockchainService.recordTransaction({
          type: 'BIOMETRIC_FACE_ENROLLED',
          data: { userId: user._id.toString(), version: prevVersion + 1, linkedAadhaar: user.kycData?.aadhaarMasked, timestamp: Date.now() }
        });
        if (txResult?.transactionHash) {
          user.biometricUpdateHistory[user.biometricUpdateHistory.length - 1].blockchainTxId = txResult.transactionHash;
          await user.save();
        }
      } catch (bcErr) { console.error('Blockchain anchor (non-fatal):', bcErr.message); }
    }

    res.status(200).json({
      success: true,
      message: 'Liveness verification passed',
      livenessScore: result.livenessScore,
      faceMatchScore: result.faceMatchScore,
      kycLevel: user.kycStatus?.kycLevel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Liveness verification failed', error: error.message });
  }
};
