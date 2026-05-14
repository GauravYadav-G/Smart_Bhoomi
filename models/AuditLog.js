const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Immutable Audit Log — Cryptographic Hash Chain
 * 
 * Each entry hashes {previousHash + step + data + timestamp},
 * creating an append-only tamper-evident chain per transfer.
 * This replaces government oversight with cryptographic proof.
 */
const auditLogSchema = new mongoose.Schema({
  transferId: {
    type: String,
    required: true,
    index: true
  },
  step: {
    type: String,
    enum: [
      'transfer_initiated',
      'property_locked',
      'buyer_kyc_verified',
      'buyer_biometric_challenge',
      'buyer_biometric_verified',
      'seller_biometric_challenge',
      'seller_biometric_confirmed',
      'payment_initiated',
      'payment_completed',
      'ownership_transferred',
      'blockchain_recorded',
      'transfer_completed',
      'transfer_rejected',
      'transfer_cancelled',
      'anomaly_detected'
    ],
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actorRole: {
    type: String,
    required: true
  },
  data: {
    // Flexible data per step
    biometricMethod: String,        // 'fingerprint', 'face', 'both'
    biometricScore: Number,         // 0-100 match confidence
    livenessScore: Number,          // 0-100 liveness confidence
    kycType: String,                // 'aadhaar', 'pan'
    kycVerified: Boolean,
    kycReferenceId: String,
    paymentId: String,
    paymentAmount: Number,
    paymentMethod: String,
    propertyId: String,
    blockchainHash: String,
    challengeId: String,
    reason: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  previousHash: {
    type: String,
    required: true,
    default: '0'.repeat(64) // Genesis hash for first entry
  },
  hash: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Generate SHA-256 hash of the audit entry
auditLogSchema.statics.generateHash = function(previousHash, step, data, timestamp) {
  const payload = JSON.stringify({ previousHash, step, data, timestamp: timestamp.toISOString() });
  return crypto.createHash('sha256').update(payload).digest('hex');
};

// Append a new entry to the chain for a given transfer
auditLogSchema.statics.appendEntry = async function(transferId, step, actorId, actorRole, data = {}) {
  // Get the last entry in this transfer's chain
  const lastEntry = await this.findOne({ transferId }).sort({ timestamp: -1 });
  const previousHash = lastEntry ? lastEntry.hash : '0'.repeat(64);
  const timestamp = new Date();

  const hash = this.generateHash(previousHash, step, data, timestamp);

  return this.create({
    transferId,
    step,
    actorId,
    actorRole,
    data,
    previousHash,
    hash,
    timestamp
  });
};

// Verify the integrity of a transfer's audit chain
auditLogSchema.statics.verifyChain = async function(transferId) {
  const entries = await this.find({ transferId }).sort({ timestamp: 1 });
  
  if (entries.length === 0) return { valid: false, message: 'No audit entries found' };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrevHash = i === 0 ? '0'.repeat(64) : entries[i - 1].hash;

    // Verify previous hash link
    if (entry.previousHash !== expectedPrevHash) {
      return { 
        valid: false, 
        message: `Chain broken at entry ${i}: previousHash mismatch`,
        brokenAt: i 
      };
    }

    // Verify hash integrity
    const recomputedHash = this.generateHash(
      entry.previousHash, entry.step, entry.data, entry.timestamp
    );
    if (entry.hash !== recomputedHash) {
      return { 
        valid: false, 
        message: `Hash tampered at entry ${i}: hash mismatch`,
        brokenAt: i 
      };
    }
  }

  return { valid: true, entries: entries.length, message: 'Chain integrity verified' };
};

auditLogSchema.index({ transferId: 1, timestamp: 1 });
auditLogSchema.index({ hash: 1 });
auditLogSchema.index({ actorId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
