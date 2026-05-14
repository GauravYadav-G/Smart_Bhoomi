const mongoose = require('mongoose');
const { generateIntegrityHash } = require('../utils/encryption');

const propertySchema = new mongoose.Schema({
  propertyId: {
    type: String,
    required: true,
    unique: true
  },
  blockchainHash: {
    type: String,
    unique: true,
    sparse: true
  },
  blockchainTransactionId: {
    type: String,
    sparse: true
  },
  // ─── Data Integrity (links DB record to blockchain for tamper detection) ───
  dataIntegrityHash: { type: String },
  blockchainAnchorTxId: { type: String },
  lastIntegrityCheck: { type: Date },
  integrityStatus: {
    type: String,
    enum: ['valid', 'tampered', 'unchecked'],
    default: 'unchecked'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyDetails: {
    title: {
      type: String,
      required: [true, 'Please provide property title']
    },
    description: {
      type: String,
      required: [true, 'Please provide property description']
    },
    propertyType: {
      type: String,
      enum: ['residential', 'commercial', 'agricultural', 'industrial', 'land'],
      required: true
    },
    area: {
      value: Number,
      unit: {
        type: String,
        enum: ['sqft', 'sqm', 'acre', 'hectare']
      }
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    boundary: [{
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      },
      _id: false
    }],
    surveyNumber: String,
    plotNumber: String
  },
  documents: [{
    documentType: {
      type: String,
      enum: ['ownership_deed', 'sale_deed', 'tax_receipt', 'survey_document', 'legal_clearance', 'other']
    },
    documentName: String,
    documentPath: String,
    documentHash: String,
    // ─── IPFS Decentralised Storage Fields ───
    ipfsCID: { type: String, default: null },          // IPFS Content Identifier
    ipfsIV: { type: String, default: null },           // AES-256-GCM initialisation vector (hex)
    ipfsAuthTag: { type: String, default: null },      // AES-256-GCM auth tag (hex)
    ipfsProvider: { type: String, default: null },     // 'pinata' | 'private-kubo' | 'local_fallback'
    ipfsStatus: {
      type: String,
      enum: ['uploaded', 'pending_ipfs_upload', 'failed', null],
      default: null
    },
    ipfsEncryptedSize: { type: Number, default: 0 },   // Encrypted file size in bytes
    ipfsUploadedAt: { type: Date, default: null },      // When uploaded to IPFS
    ipfsLastVerified: { type: Date, default: null },    // Last integrity check timestamp
    ipfsIntegrityStatus: {
      type: String,
      enum: ['intact', 'tampered', 'unverified', null],
      default: null
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  images: [{
    imagePath: String,
    imageHash: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  verification: {
    status: {
      type: String,
      enum: ['pending', 'auto_verifying', 'verified', 'rejected', 'needs_review'],
      default: 'pending'
    },
    verifiedAt: Date,
    method: {
      type: String,
      enum: ['auto', 'document_hash', 'kyc_cross_reference', 'admin_review'],
      default: 'auto'
    },
    notes: [String],
    rejectionReason: String,
    autoVerificationNotes: String,
    // Auto-verification checklist
    checks: {
      documentHashValid: { type: Boolean, default: false },
      ownerKycVerified: { type: Boolean, default: false },
      duplicateCheck: { type: Boolean, default: false },
      surveyNumberValid: { type: Boolean, default: false },
      geoFenceValid: { type: Boolean, default: false }
    },
    checkScore: { type: Number, default: 0 }, // 0-100
    auditHash: String,  // Hash linking to audit trail
    coordinateConflictWith: String, // PropertyId of conflicting property
    adminReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    adminReviewedAt: Date,
    adminNotes: String
  },
  ownershipHistory: [{
    previousOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    newOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    transferDate: Date,
    transferHash: String,
    transferPrice: Number,
    transactionId: String
  }],
  valuation: {
    currentValue: Number,
    currency: {
      type: String,
      default: 'INR'
    },
    lastUpdated: Date
  },
  // ─── GeoJSON location for 2dsphere spatial queries (Haversine upgrade) ───
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude] — GeoJSON order
      default: undefined
    }
  },
  status: {
    type: String,
    enum: ['active', 'transfer_pending', 'disputed', 'archived', 'frozen'],
    default: 'active'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

propertySchema.index({ propertyId: 1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ blockchainHash: 1 });
propertySchema.index({ 'verification.status': 1 });
propertySchema.index({ location: '2dsphere' });
propertySchema.index({ dataIntegrityHash: 1 }, { sparse: true });

// ─── Pre-save: Compute data integrity hash for blockchain anchoring ───
propertySchema.pre('save', function(next) {
  // Auto-populate GeoJSON location from propertyDetails.coordinates
  const coords = this.propertyDetails?.coordinates;
  if (coords && coords.latitude != null && coords.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [parseFloat(coords.longitude), parseFloat(coords.latitude)]
    };
  }

  if (this.isModified('propertyDetails') || this.isModified('owner') || this.isModified('documents') || this.isModified('verification')) {
    this.dataIntegrityHash = generateIntegrityHash({
      propertyId: this.propertyId,
      owner: this.owner?.toString(),
      title: this.propertyDetails?.title,
      address: this.propertyDetails?.address,
      area: this.propertyDetails?.area,
      coordinates: this.propertyDetails?.coordinates,
      documentHashes: (this.documents || []).map(d => d.documentHash).filter(Boolean),
      verificationStatus: this.verification?.status
    });
  }
  next();
});

// ─── Verify data integrity against stored hash ───
propertySchema.methods.verifyIntegrity = function() {
  const currentHash = generateIntegrityHash({
    propertyId: this.propertyId,
    owner: this.owner?.toString(),
    title: this.propertyDetails?.title,
    address: this.propertyDetails?.address,
    area: this.propertyDetails?.area,
    coordinates: this.propertyDetails?.coordinates,
    documentHashes: (this.documents || []).map(d => d.documentHash).filter(Boolean),
    verificationStatus: this.verification?.status
  });
  return currentHash === this.dataIntegrityHash;
};

propertySchema.virtual('boundaryPointsCount').get(function() {
  return this.propertyDetails.boundary ? this.propertyDetails.boundary.length : 0;
});

propertySchema.methods.hasValidBoundary = function() {
  return this.propertyDetails.boundary && this.propertyDetails.boundary.length >= 3;
};

propertySchema.methods.calculateBoundaryArea = function() {
  if (!this.hasValidBoundary()) return null;

  const points = this.propertyDetails.boundary;
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].longitude * points[j].latitude;
    area -= points[j].longitude * points[i].latitude;
  }

  return Math.abs(area / 2);
};

module.exports = mongoose.model('Property', propertySchema);
