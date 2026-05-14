const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@(gov\.in|nic\.in|\w+\.gov\.in)$/, 'Must be a government email (.gov.in / .nic.in)']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 12,
    select: false
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  rank: {
    type: String,
    enum: [
      'Secretary',
      'Joint Secretary',
      'Director',
      'Deputy Director',
      'Under Secretary',
      'Section Officer',
      'Sub-Registrar',
      'Tehsildar',
      'District Collector',
      'Commissioner',
      'Superintendent'
    ],
    required: true
  },
  department: {
    type: String,
    enum: [
      'Revenue & Land Records',
      'Registration & Stamps',
      'Survey & Settlement',
      'Urban Development',
      'Rural Development',
      'Housing & Urban Affairs',
      'Land Acquisition',
      'National Informatics Centre',
      'Ministry of Electronics & IT'
    ],
    required: true
  },
  jurisdiction: {
    state: { type: String },
    district: { type: String },
    level: {
      type: String,
      enum: ['national', 'state', 'district', 'tehsil'],
      default: 'district'
    }
  },
  // Security clearance level
  clearanceLevel: {
    type: Number,
    enum: [1, 2, 3, 4, 5], // 5 = highest (Secretary), 1 = lowest (Section Officer)
    default: 1
  },
  // MFA — TOTP secret
  mfaSecret: {
    type: String,
    select: false
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  // MFA is MANDATORY for admin — track setup status
  mfaSetupCompleted: {
    type: Boolean,
    default: false
  },
  // FIDO2 biometric credentials (for admin portal access)
  biometricCredentials: [{
    credentialId: String,
    publicKey: String,
    counter: { type: Number, default: 0 },
    deviceType: String,
    backedUp: { type: Boolean, default: false },
    transports: [String],
    registeredAt: { type: Date, default: Date.now }
  }],
  // WebAuthn challenge (temporary, for registration/authentication flow)
  currentChallenge: { type: String, select: false },
  // Admin KYC Profile
  kyc: {
    aadhaarNumber: { type: String, select: false },
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarVerifiedAt: Date,
    panNumber: { type: String, select: false },
    panVerified: { type: Boolean, default: false },
    panVerifiedAt: Date,
    governmentIdType: { type: String, enum: ['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license'], default: 'aadhaar' },
    governmentIdNumber: { type: String, select: false },
    governmentIdVerified: { type: Boolean, default: false },
    governmentIdVerifiedAt: Date,
    faceEnrolled: { type: Boolean, default: false },
    faceEnrolledAt: Date,
    faceTemplateHash: String,
    faceCaptures: [{
      capturedAt: Date,
      imageHash: String,
      imageSignature: String
    }],
    fingerprintEnrolled: { type: Boolean, default: false },
    fingerprintEnrolledAt: Date,
    fingerprintTemplateHash: String,
    kycCompletedAt: Date,
    kycLevel: { type: Number, default: 0, min: 0, max: 5 } // 0=none, 1=basic, 2=aadhaar, 3=biometric, 4=full, 5=enhanced
  },
  // Login security mode
  loginSecurityMode: {
    type: String,
    enum: ['standard', 'biometric', 'enhanced'],
    default: 'standard'
    // standard = password + TOTP
    // biometric = password + TOTP + fingerprint/face
    // enhanced = password + TOTP + fingerprint + face
  },
  // Activity tracking for Trust Score
  activityLog: [{
    action: String,
    target: String,
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    riskScore: { type: Number, default: 0 }
  }],
  // Aggregated stats
  stats: {
    propertiesVerified: { type: Number, default: 0 },
    transfersApproved: { type: Number, default: 0 },
    fraudsFlagged: { type: Number, default: 0 },
    loginCount: { type: Number, default: 0 },
    lastLogin: Date,
    avgSessionMinutes: { type: Number, default: 0 }
  },
  // Trust/Activity Index (0-100)
  trustScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  blockchainId: {
    type: String,
    unique: true,
    sparse: true
  },
  blockchainVerificationHash: String,
  profilePhoto: String,
  isActive: {
    type: Boolean,
    default: true
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  refreshTokens: [{
    token: String,
    expiresAt: Date,
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true
});

// Hash password
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12); // Higher rounds for admin
  this.password = await bcrypt.hash(this.password, salt);
  this.lastPasswordChange = new Date();
});

adminSchema.methods.comparePassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};

// Check if account is locked
adminSchema.methods.isLocked = function() {
  if (this.accountLockedUntil && this.accountLockedUntil > Date.now()) {
    return true;
  }
  return false;
};

// Increment failed attempts
adminSchema.methods.incrementFailedAttempts = async function() {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock 30 mins
  }
  await this.save();
};

// Reset failed attempts
adminSchema.methods.resetFailedAttempts = async function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  await this.save();
};

// Compute trust score from activity
adminSchema.methods.computeTrustScore = function() {
  let score = 30; // Base
  const s = this.stats;
  if (s.propertiesVerified > 10) score += 10;
  if (s.propertiesVerified > 50) score += 5;
  if (s.transfersApproved > 5) score += 10;
  if (s.fraudsFlagged > 0) score += 10;
  if (this.mfaEnabled) score += 10;
  if (this.biometricCredentials?.length > 0) score += 10;
  if (this.kyc?.aadhaarVerified) score += 5;
  if (this.kyc?.faceEnrolled) score += 5;
  if (this.kyc?.fingerprintEnrolled) score += 5;
  if (s.loginCount > 20) score += 5;
  // Penalize inactivity
  if (s.lastLogin) {
    const daysSinceLogin = (Date.now() - new Date(s.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin > 30) score -= 10;
    if (daysSinceLogin > 90) score -= 15;
  }
  return Math.min(100, Math.max(0, score));
};

module.exports = mongoose.model('Admin', adminSchema);
