const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt, generateIntegrityHash } = require('../utils/encryption');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['property_owner', 'buyer', 'seller'],
    default: 'property_owner'
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide a phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // ─── Encrypted: Government ID stored with AES-256-GCM ───
  governmentId: {
    type: String,
    required: true,
    unique: true
  },
  governmentIdEncrypted: { type: String }, // AES-256-GCM encrypted version
  governmentIdMasked: { type: String },    // Display-safe masked version (e.g., ABCD****EFGH)

  // ─── Profile fields ───
  profilePicture: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', ''] },
  occupation: { type: String, trim: true },
  bio: { type: String, maxlength: 500 },

  // ─── WebAuthn / FIDO2 ───
  currentChallenge: { type: String, select: false },
  biometricCredentials: [{
    credentialId: String,
    publicKey: String,
    counter: { type: Number, default: 0 },
    deviceType: String,
    backedUp: { type: Boolean, default: false },
    transports: [String],
    registeredAt: { type: Date, default: Date.now }
  }],

  // ─── Face captures (stores image hashes for liveness tracking) ───
  faceCaptures: [{
    imageHash: String,
    capturedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['kyc_enrollment', 'login_verify', 'transfer_verify', 're_enrollment'], default: 'login_verify' }
  }],
  // Store face descriptor as JSON array of 128 floats for face-api.js matching
  faceDescriptors: [{
    descriptor: { type: String, select: false }, // JSON stringified Float32Array
    capturedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    linkedAadhaar: String // Masked Aadhaar this descriptor was enrolled against
  }],

  // ─── e-KYC verification status ───
  kycStatus: {
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarVerifiedAt: Date,
    panVerified: { type: Boolean, default: false },
    panVerifiedAt: Date,
    faceEnrolled: { type: Boolean, default: false },
    faceEnrolledAt: Date,
    faceLastUpdated: Date,
    faceDescriptor: { type: String, select: false },
    faceEnrollmentVersion: { type: Number, default: 0 },
    fingerprintEnrolled: { type: Boolean, default: false },
    fingerprintEnrolledAt: Date,
    fingerprintLastUpdated: Date,
    fingerprintEnrollmentVersion: { type: Number, default: 0 },
    kycLevel: {
      type: String,
      enum: ['none', 'basic', 'standard', 'full'],
      default: 'none'
    }
  },
  // ─── Encrypted KYC data ───
  kycData: {
    aadhaarMasked: String,
    aadhaarRefId: String,         // plain reference (for backward compat)
    aadhaarEncrypted: String,     // AES-256-GCM encrypted full Aadhaar
    panMasked: String,
    panRefId: String,
    panEncrypted: String,         // AES-256-GCM encrypted full PAN
    aadhaarLinkedName: String,    // Name fetched from Aadhaar during KYC
    panLinkedName: String         // Name fetched from PAN during KYC
  },

  // ─── Biometric Re-enrollment Tracking ───
  biometricUpdateHistory: [{
    type: { type: String, enum: ['fingerprint', 'face'] },
    action: { type: String, enum: ['enrolled', 're_enrolled', 'revoked'] },
    previousVersion: Number,
    newVersion: Number,
    verifiedVia: { type: String, enum: ['email_otp', 'aadhaar_otp'] },
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
    blockchainTxId: String
  }],
  biometricReEnrollOtp: { type: String, select: false },
  biometricReEnrollOtpExpires: { type: Date, select: false },
  biometricReEnrollOtpAttempts: { type: Number, default: 0, select: false },
  biometricReEnrollType: { type: String, select: false }, // 'fingerprint' | 'face'
  biometricReEnrollSessionToken: { type: String, select: false },
  biometricReEnrollSessionType: { type: String, select: false },
  biometricReEnrollSessionExpiresAt: { type: Date, select: false },
  biometricReEnrollSessionVerified: { type: Boolean, default: false, select: false },

  // ─── Blockchain Identity ───
  blockchainId: { type: String, unique: true, sparse: true },
  blockchainNodeId: String,
  blockchainVerificationHash: String,
  blockchainQRCode: String,
  blockchainIssuedAt: Date,

  // ─── Data Integrity (links DB record to blockchain for tamper detection) ───
  dataIntegrityHash: { type: String },           // SHA-256 of critical fields
  blockchainAnchorTxId: { type: String },         // Blockchain TX that anchors this record
  lastIntegrityCheck: { type: Date },
  integrityStatus: {
    type: String,
    enum: ['valid', 'tampered', 'unchecked'],
    default: 'unchecked'
  },

  // ─── Email OTP Login ───
  emailOtp: { type: String, select: false },
  emailOtpExpires: { type: Date, select: false },
  emailOtpAttempts: { type: Number, default: 0, select: false },

  // ─── Biometric Auth Preference (master toggle) ───
  biometricAuthEnabled: { type: Boolean, default: true },

  // ─── Biometric Login Session Tracking ───
  biometricLoginSession: {
    sessionId: { type: String },
    completedSteps: [{ type: String }], // ['fingerprint', 'face']
    requiredSteps: [{ type: String }],
    createdAt: { type: Date },
    expiresAt: { type: Date }
  },

  // ─── Login Attempt Tracking ───
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  // ─── Nominee System ───
  nominee: {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true },
    phoneNumber: String,
    relationship: { type: String, enum: ['spouse', 'child', 'parent', 'sibling', 'legal_heir', 'other'] },
    governmentId: String,
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    nomineeSecret: { type: String, select: false }, // hashed passphrase set during nomination
    activatedAt: Date, // set when death claim is verified
    deathCertificateHash: String,
    nomineeLoginEnabled: { type: Boolean, default: false }
  },

  // ─── Account Status ───
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isDeceased: { type: Boolean, default: false }, // flagged when nominee activates
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// ─── Indexes ───
userSchema.index({ 'nominee.email': 1 }, { sparse: true });
userSchema.index({ lockUntil: 1 }, { sparse: true });
userSchema.index({ dataIntegrityHash: 1 }, { sparse: true });
userSchema.index({ 'biometricUpdateHistory.timestamp': -1 }, { sparse: true });

// ─── Pre-save: Hash password + encrypt sensitive fields + compute integrity hash ───
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Encrypt government ID if modified and not already encrypted
  if (this.isModified('governmentId') && this.governmentId && !this.governmentId.startsWith('ENC:')) {
    const { maskData } = require('../utils/encryption');
    this.governmentIdMasked = maskData(this.governmentId, 4, 4);
    this.governmentIdEncrypted = encrypt(this.governmentId);
  }

  // Compute data integrity hash for blockchain anchoring
  if (this.isModified('name') || this.isModified('email') || this.isModified('governmentId') || 
      this.isModified('blockchainId') || this.isModified('kycStatus')) {
    this.dataIntegrityHash = generateIntegrityHash({
      name: this.name,
      email: this.email,
      governmentId: this.governmentId,
      blockchainId: this.blockchainId,
      kycLevel: this.kycStatus?.kycLevel,
      role: this.role
    });
  }

  next();
});

// ─── Compare password ───
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Get decrypted government ID ───
userSchema.methods.getDecryptedGovernmentId = function() {
  if (this.governmentIdEncrypted) {
    return decrypt(this.governmentIdEncrypted);
  }
  return this.governmentId;
};

// ─── Verify data integrity against stored hash ───
userSchema.methods.verifyIntegrity = function() {
  const currentHash = generateIntegrityHash({
    name: this.name,
    email: this.email,
    governmentId: this.governmentId,
    blockchainId: this.blockchainId,
    kycLevel: this.kycStatus?.kycLevel,
    role: this.role
  });
  return currentHash === this.dataIntegrityHash;
};

// ─── Account lockout check ───
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// ─── Increment login attempts ───
userSchema.methods.incrementLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 8) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
  }
  return this.updateOne(updates);
};

// ─── Reset login attempts on success ───
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
};

module.exports = mongoose.model('User', userSchema);
