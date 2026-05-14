const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proposedPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',              // Buyer initiated, awaiting owner
      'owner_approved',       // Owner accepted the transfer
      'owner_rejected',       // Owner rejected
      'buyer_biometric_verified',  // Buyer passed biometric + KYC
      'payment_pending',      // Awaiting payment
      'payment_completed',    // Payment received
      'seller_biometric_confirmed', // Seller confirmed with biometric
      'completed',            // Ownership transferred atomically
      'cancelled',            // Cancelled by either party
      'disputed'              // Flagged for dispute resolution
    ],
    default: 'pending'
  },
  ownerApproval: {
    approved: Boolean,
    approvedAt: Date,
    rejectionReason: String,
    paymentReceived: { type: Boolean, default: false }
  },
  // Buyer biometric verification (replaces government approval)
  buyerBiometric: {
    verified: { type: Boolean, default: false },
    method: { type: String, enum: ['fingerprint', 'face', 'both', 'kyc_only'] },
    biometricScore: Number,    // 0-100 match confidence
    livenessScore: Number,     // 0-100 liveness score
    challengeId: String,       // FIDO2 challenge reference
    kycVerified: { type: Boolean, default: false },
    kycReferenceId: String,
    biometricDisabled: { type: Boolean, default: false },
    verifiedAt: Date
  },
  // Seller biometric confirmation (final step before execution)
  sellerBiometric: {
    confirmed: { type: Boolean, default: false },
    method: { type: String, enum: ['fingerprint', 'face', 'both', 'kyc_only'] },
    biometricScore: Number,
    livenessScore: Number,
    challengeId: String,
    biometricDisabled: { type: Boolean, default: false },
    confirmedAt: Date
  },
  // Immutable audit trail reference
  auditChainHead: String,  // Hash of latest audit log entry
  auditEntryCount: { type: Number, default: 0 },
  payment: {
    orderId: String,
    paymentId: String,
    transactionId: String,
    amount: Number,
    currency: {
      type: String,
      default: 'INR'
    },
    method: String,
    status: {
      type: String,
      enum: ['pending', 'initiated', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentDate: Date,
    razorpaySignature: String,
    upiTransactionId: String,
    refundId: String,
    refundAmount: Number,
    refundReason: String
  },
  notifications: {
    email: {
      ownerNotified: { type: Boolean, default: false },
      buyerNotified: { type: Boolean, default: false }
    },
    sms: {
      ownerNotified: { type: Boolean, default: false },
      buyerNotified: { type: Boolean, default: false }
    }
  },
  smartContractAddress: String,
  blockchainTransactionHash: String,
  documents: [{
    documentType: String,
    documentPath: String,
    documentHash: String,
    uploadedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
