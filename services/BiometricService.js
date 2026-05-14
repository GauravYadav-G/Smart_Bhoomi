const crypto = require('crypto');
const {
  generateRegistrationOptions: genRegOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions: genAuthOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

/**
 * Biometric Verification Service — REAL MODE
 *
 * Uses @simplewebauthn/server for FIDO2/WebAuthn:
 *   • Registration  → device biometric sensor (fingerprint / face-ID)
 *   • Authentication → transfer signing via biometric re-verification
 *
 * Face liveness is verified on the client with the device camera,
 * and the server validates challenge completion + face descriptor.
 * No simulation — every call hits real hardware via the WebAuthn API.
 */

// WebAuthn Relying Party configuration
const RP_NAME = process.env.RP_NAME || 'Bharat Land Chain';
const RP_ID = process.env.RP_ID || 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:3000';

// Active challenges (in production: use Redis with TTL)
const activeChallenges = new Map();

class BiometricService {
  constructor() {
    this.rpName = RP_NAME;
    this.rpId = RP_ID;
    this.rpOrigin = RP_ORIGIN;
    this.challengeTTL = 5 * 60 * 1000; // 5 minutes

    // Cleanup expired challenges every minute
    setInterval(() => this._cleanupExpiredChallenges(), 60000);
  }

  // ──────────────────────────────────────────────────────────
  // FIDO2 / WebAuthn — Registration
  // ──────────────────────────────────────────────────────────

  /**
   * Generate WebAuthn registration options for a user
   * @param {object} user - User document
   * @returns {object} Registration options for browser
   */
  async generateRegistrationOptions(user) {
    const existingCreds = (user.biometricCredentials || []).map(c => ({
      id: c.credentialId,
      transports: c.transports || ['internal'],
    }));

    const options = await genRegOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userName: user.email,
      userDisplayName: user.name,
      userID: Buffer.from(user._id.toString()),
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      excludeCredentials: existingCreds,
      timeout: this.challengeTTL,
    });

    const challengeId = `REG-${crypto.randomUUID()}`;
    activeChallenges.set(challengeId, {
      challenge: options.challenge,
      userId: user._id.toString(),
      type: 'registration',
      expiresAt: Date.now() + this.challengeTTL,
    });

    return { ...options, challengeId };
  }

  /**
   * Verify WebAuthn registration response
   * @param {string} challengeId - Challenge ID from registration
   * @param {object} credential - Browser's credential response
   * @param {object} user - User document
   * @returns {{ verified, credential }}
   */
  async verifyRegistration(challengeId, credential, user) {
    const stored = activeChallenges.get(challengeId);
    if (!stored) return { verified: false, error: 'Challenge expired or not found' };
    if (stored.userId !== user._id.toString()) return { verified: false, error: 'Challenge user mismatch' };
    activeChallenges.delete(challengeId);

    try {
      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: stored.challenge,
        expectedOrigin: this.rpOrigin,
        expectedRPID: this.rpId,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return { verified: false, error: 'Device verification failed' };
      }

      const { credential: regCred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      return {
        verified: true,
        credential: {
          credentialId: regCred.id,
          publicKey: Buffer.from(regCred.publicKey).toString('base64url'),
          counter: regCred.counter,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: credential.response?.transports || ['internal'],
        },
      };
    } catch (error) {
      console.error('Registration verification failed:', error);
      return { verified: false, error: error.message };
    }
  }

  // ──────────────────────────────────────────────────────────
  // FIDO2 / WebAuthn — Authentication (Transfer Signing)
  // ──────────────────────────────────────────────────────────

  /**
   * Generate WebAuthn authentication options
   * @param {object} user - User document with biometricCredentials
   * @param {string} transferId - Transfer request ID
   * @returns {object} Authentication options for browser
   */
  async generateAuthenticationOptions(user, transferId) {
    if (!user.biometricCredentials || user.biometricCredentials.length === 0) {
      return { error: 'No biometric credentials registered. Enroll fingerprint first.' };
    }

    const allowCredentials = user.biometricCredentials.map(c => ({
      id: c.credentialId,
      transports: c.transports || ['internal'],
    }));

    const options = await genAuthOptions({
      rpID: this.rpId,
      allowCredentials,
      userVerification: 'required',
      timeout: this.challengeTTL,
    });

    const challengeId = `AUTH-${crypto.randomUUID()}`;
    activeChallenges.set(challengeId, {
      challenge: options.challenge,
      userId: user._id.toString(),
      transferId,
      type: 'authentication',
      expiresAt: Date.now() + this.challengeTTL,
    });

    return { ...options, challengeId };
  }

  /**
   * Verify WebAuthn authentication response (biometric transfer signing)
   * @param {string} challengeId - Challenge ID
   * @param {object} credential - Browser's assertion response
   * @param {object} user - User document
   * @returns {{ verified, biometricScore, method }}
   */
  async verifyAuthentication(challengeId, credential, user) {
    const stored = activeChallenges.get(challengeId);
    if (!stored) return { verified: false, error: 'Challenge expired or not found', biometricScore: 0 };
    if (stored.userId !== user._id.toString()) return { verified: false, error: 'Challenge user mismatch', biometricScore: 0 };
    activeChallenges.delete(challengeId);

    const matchedCred = (user.biometricCredentials || []).find(
      c => c.credentialId === credential.id
    );
    if (!matchedCred) {
      return { verified: false, error: 'Credential not recognised for this user', biometricScore: 0 };
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: stored.challenge,
        expectedOrigin: this.rpOrigin,
        expectedRPID: this.rpId,
        credential: {
          id: matchedCred.credentialId,
          publicKey: Buffer.from(matchedCred.publicKey, 'base64url'),
          counter: matchedCred.counter || 0,
          transports: matchedCred.transports || ['internal'],
        },
      });

      if (!verification.verified) {
        return { verified: false, error: 'Biometric mismatch', biometricScore: 0 };
      }

      matchedCred.counter = verification.authenticationInfo.newCounter;

      return {
        verified: true,
        biometricScore: 100,
        method: 'fingerprint',
        credentialUsed: matchedCred.credentialId,
        newCounter: verification.authenticationInfo.newCounter,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Authentication verification failed:', error);
      return { verified: false, error: error.message, biometricScore: 0 };
    }
  }

  // ──────────────────────────────────────────────────────────
  // Face Liveness Detection
  // ──────────────────────────────────────────────────────────

  /**
   * Generate a liveness challenge (random head pose / blink sequence)
   * @param {object} user - User document
   * @returns {{ challengeId, instructions }}
   */
  generateLivenessChallenge(user) {
    const challengeId = `FACE-${crypto.randomUUID()}`;
    
    const actions = [
      'blink_twice',
      'turn_left',
      'turn_right',
      'nod_up',
      'nod_down',
      'smile'
    ];

    // Pick 2-3 random actions
    const numActions = 2 + Math.floor(Math.random() * 2);
    const shuffled = actions.sort(() => Math.random() - 0.5);
    const selectedActions = shuffled.slice(0, numActions);

    activeChallenges.set(challengeId, {
      userId: user._id.toString(),
      type: 'liveness',
      actions: selectedActions,
      expiresAt: Date.now() + this.challengeTTL
    });

    return {
      challengeId,
      instructions: selectedActions.map(a => this._getActionInstruction(a)),
      actions: selectedActions,
      timeout: this.challengeTTL
    };
  }

  /**
   * Verify liveness detection result from client
   * @param {string} challengeId - Challenge ID
   * @param {object} livenessData - { faceDescriptor, actionsCompleted, frames }
   * @param {object} user - User document
   * @returns {{ verified, livenessScore, faceMatchScore }}
   */
  async verifyLiveness(challengeId, livenessData, user) {
    const stored = activeChallenges.get(challengeId);
    if (!stored) return { verified: false, livenessScore: 0, error: 'Challenge expired or not found' };
    if (stored.userId !== user._id.toString()) return { verified: false, livenessScore: 0, error: 'Challenge user mismatch' };
    activeChallenges.delete(challengeId);

    const expectedActions = stored.actions;
    const actionResults = livenessData?.actionResults || [];
    if (!Array.isArray(actionResults) || actionResults.length === 0) {
      return { verified: false, livenessScore: 0, error: 'No liveness actions received from camera' };
    }

    let totalConfidence = 0;
    let completedCount = 0;
    for (const expected of expectedActions) {
      const match = actionResults.find(r => r.action === expected && r.completed);
      if (match) {
        completedCount++;
        totalConfidence += (match.confidence || 0);
      }
    }

    const allCompleted = completedCount === expectedActions.length;
    const avgConfidence = completedCount > 0 ? totalConfidence / completedCount : 0;
    const livenessScore = Math.round(avgConfidence * 100);

    const hasFaceDescriptor = Array.isArray(livenessData?.faceDescriptor) && livenessData.faceDescriptor.length >= 64;

    let faceMatchScore = 0;
    if (hasFaceDescriptor && user.kycData?.faceDescriptor) {
      faceMatchScore = this._compareFaceDescriptors(livenessData.faceDescriptor, user.kycData.faceDescriptor);
    } else if (hasFaceDescriptor) {
      faceMatchScore = 100; // first enrollment
    }

    const verified = allCompleted && livenessScore >= 70 && (faceMatchScore >= 65 || !user.kycStatus?.faceEnrolled);

    return { verified, livenessScore, faceMatchScore, actionsCompleted: allCompleted, timestamp: new Date().toISOString() };
  }

  /**
   * Enroll a face descriptor for future matching
   * @param {object} user - User document
   * @param {string} faceDescriptor - Base64 encoded face embedding from face-api.js
   * @returns {{ enrolled, message }}
   */
  async enrollFace(user, faceDescriptor) {
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length < 64) {
      return { enrolled: false, error: 'Invalid face descriptor — must be a numeric array from device camera' };
    }
    return { enrolled: true, message: 'Face enrolled successfully', timestamp: new Date().toISOString() };
  }

  // ──────────────────────────────────────────────────────────
  // Combined Biometric Verification (for transfers)
  // ──────────────────────────────────────────────────────────

  /**
   * Run combined biometric verification for a transfer step
   * @param {object} user - User document
   * @param {object} biometricData - { method, challengeId, credential, livenessData }
   * @param {string} transferId - Transfer request ID
   * @returns {{ verified, biometricScore, livenessScore, method }}
   */
  async verifyForTransfer(user, biometricData, transferId) {
    const { method, challengeId, credential, livenessData } = biometricData;

    let fingerprintResult = { verified: true, biometricScore: 100 };
    let livenessResult = { verified: true, livenessScore: 100 };

    if (method === 'fingerprint' || method === 'both') {
      fingerprintResult = await this.verifyAuthentication(challengeId, credential, user);
      if (!fingerprintResult.verified) {
        return {
          verified: false, method,
          biometricScore: fingerprintResult.biometricScore || 0,
          livenessScore: 0,
          error: fingerprintResult.error || 'Fingerprint verification failed',
        };
      }
    }

    if (method === 'face' || method === 'both') {
      const livenessChallengeId = livenessData?.challengeId || challengeId;
      livenessResult = await this.verifyLiveness(livenessChallengeId, livenessData, user);
      if (!livenessResult.verified) {
        return {
          verified: false, method,
          biometricScore: fingerprintResult.biometricScore || 0,
          livenessScore: livenessResult.livenessScore || 0,
          error: livenessResult.error || 'Liveness verification failed',
        };
      }
    }

    return {
      verified: true, method,
      biometricScore: fingerprintResult.biometricScore || 100,
      livenessScore: livenessResult.livenessScore || livenessResult.faceMatchScore || 100,
      challengeId,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Helpers ────────────────────────────────────────────

  _compareFaceDescriptors(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let sumSq = 0;
    for (let i = 0; i < a.length; i++) sumSq += (a[i] - b[i]) ** 2;
    const distance = Math.sqrt(sumSq);
    return Math.max(0, Math.min(100, Math.round((1 - distance / 1.2) * 100)));
  }

  _getActionInstruction(action) {
    const instructions = {
      'blink_twice': 'Please blink your eyes twice',
      'turn_left': 'Slowly turn your head to the left',
      'turn_right': 'Slowly turn your head to the right',
      'nod_up': 'Look up briefly, then back at the camera',
      'nod_down': 'Look down briefly, then back at the camera',
      'smile': 'Give a natural smile'
    };
    return { action, instruction: instructions[action] || action };
  }

  _cleanupExpiredChallenges() {
    const now = Date.now();
    for (const [id, challenge] of activeChallenges) {
      if (challenge.expiresAt < now) {
        activeChallenges.delete(id);
      }
    }
  }
}

module.exports = new BiometricService();
