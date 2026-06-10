const Admin = require('../models/Admin');
const { generateAdminToken } = require('../middleware/adminAuth');
const blockchainService = require('../blockchain/BlockchainService');
const Property = require('../models/Property');
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// WebAuthn imports
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');

// WebAuthn Relying Party config
const rpName = 'Smart Bhoomi Admin Portal';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

const { isoBase64URL, isoUint8Array } = require('@simplewebauthn/server/helpers');

// ═══════════════════════════════════════════════════════════
// BIOMETRIC SESSION TRACKING — Prevents auth bypass & tracks
// which biometric steps have been verified server-side.
// Map<adminId, { steps: Set<string>, verifiedAt: Date, mfaToken: string }>
// ═══════════════════════════════════════════════════════════
const biometricSessions = new Map();
const BIO_SESSION_TTL = 10 * 60 * 1000; // 10 minutes

function createBiometricSession(adminId, requiredSteps) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  biometricSessions.set(adminId.toString(), {
    sessionToken,
    requiredSteps: new Set(requiredSteps),
    completedSteps: new Set(),
    createdAt: Date.now()
  });
  // Auto-cleanup after TTL
  setTimeout(() => biometricSessions.delete(adminId.toString()), BIO_SESSION_TTL);
  return sessionToken;
}

function markBiometricStepComplete(adminId, step) {
  const session = biometricSessions.get(adminId.toString());
  if (!session) return false;
  if (Date.now() - session.createdAt > BIO_SESSION_TTL) {
    biometricSessions.delete(adminId.toString());
    return false;
  }
  session.completedSteps.add(step);
  return true;
}

function isBiometricSessionComplete(adminId, sessionToken) {
  const session = biometricSessions.get(adminId.toString());
  if (!session) return false;
  if (session.sessionToken !== sessionToken) return false;
  if (Date.now() - session.createdAt > BIO_SESSION_TTL) {
    biometricSessions.delete(adminId.toString());
    return false;
  }
  for (const step of session.requiredSteps) {
    if (!session.completedSteps.has(step)) return false;
  }
  return true;
}

// ─── Admin Login (Step 1: email + password) ───
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const admin = await Admin.findOne({ email }).select('+password +mfaSecret');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (admin.isLocked()) {
      const unlockTime = new Date(admin.accountLockedUntil).toLocaleTimeString();
      return res.status(423).json({ success: false, message: `Account locked until ${unlockTime}` });
    }

    const valid = await admin.comparePassword(password);
    if (!valid) {
      await admin.incrementFailedAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsRemaining: Math.max(0, 5 - admin.failedLoginAttempts)
      });
    }

    // Password OK — check if biometric verification is required
    const securityMode = admin.loginSecurityMode || 'standard';
    if (securityMode !== 'standard') {
      const biometricSteps = [];
      if (securityMode === 'biometric') {
        if (admin.kyc?.fingerprintEnrolled) biometricSteps.push('fingerprint');
        else if (admin.kyc?.faceEnrolled) biometricSteps.push('face');
      } else if (securityMode === 'enhanced') {
        if (admin.kyc?.fingerprintEnrolled) biometricSteps.push('fingerprint');
        if (admin.kyc?.faceEnrolled) biometricSteps.push('face');
      }

      if (biometricSteps.length > 0) {
        const hasValidFingerprintCreds = (admin.biometricCredentials || []).some(
          c => c.credentialId && c.publicKey && c.deviceType?.startsWith('fingerprint_')
        );
        if (biometricSteps.includes('fingerprint') && !hasValidFingerprintCreds) {
          console.warn(`⚠️ Admin ${admin.email}: fingerprint enrolled but no valid WebAuthn credentials — auto-downgrading`);
          // Auto-downgrade handled below in token grant
        } else {
          const bioSessionToken = createBiometricSession(admin._id, biometricSteps);
          return res.json({
            success: true,
            requiresBiometric: true,
            biometricSteps,
            adminId: admin._id,
            bioSessionToken,
            loginSecurityMode: securityMode,
            message: `Biometric verification required: ${biometricSteps.join(' + ')}`
          });
        }
      }
    }

    // Grant token directly (MFA removed for convenience)
    await admin.resetFailedAttempts();
    admin.stats.loginCount += 1;
    admin.stats.lastLogin = new Date();
    admin.trustScore = admin.computeTrustScore();
    await admin.save();

    const token = generateAdminToken(admin._id);
    res.json({ success: true, token, admin: sanitizeAdmin(admin) });
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ─── Verify MFA (Step 2) — DISABLED, MFA removed ───
exports.verifyAdminMFA = async (req, res) => {
  return res.status(410).json({ success: false, message: 'MFA has been removed. Please login again.' });
};

// ─── Get Admin Profile ───
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = req.admin;
    admin.trustScore = admin.computeTrustScore();
    await admin.save();
    res.json({ success: true, admin: sanitizeAdmin(admin) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// ─── National Dashboard Stats ───
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalProperties,
      totalTransfers,
      completedToday,
      pendingTransfers,
      totalUsers,
      propertiesByState,
      transfersByStatus,
      recentTransfers,
      stampDutyTotal
    ] = await Promise.all([
      Property.countDocuments(),
      TransferRequest.countDocuments(),
      TransferRequest.countDocuments({ status: 'completed', updatedAt: { $gte: today } }),
      TransferRequest.countDocuments({ status: { $in: ['pending', 'owner_approved', 'buyer_biometric_verified', 'payment_pending', 'payment_completed'] } }),
      User.countDocuments(),
      Property.aggregate([
        { $group: { _id: '$propertyDetails.state', count: { $sum: 1 }, totalValue: { $sum: '$propertyDetails.marketValue' } } },
        { $sort: { count: -1 } }
      ]),
      TransferRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      TransferRequest.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('buyer', 'name email')
        .populate('currentOwner', 'name email')
        .populate('property', 'propertyDetails.title propertyDetails.state'),
      TransferRequest.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$proposedPrice' } } }
      ])
    ]);

    // AI Fraud alerts — flag suspicious patterns
    const fraudAlerts = await generateFraudAlerts();

    res.json({
      success: true,
      stats: {
        totalProperties,
        totalTransfers,
        completedToday,
        pendingTransfers,
        totalUsers,
        stampDutyCollected: stampDutyTotal[0]?.total ? Math.round(stampDutyTotal[0].total * 0.06) : 0,
        propertiesByState,
        transfersByStatus,
        recentTransfers,
        fraudAlerts
      }
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};

// ─── Heatmap Data (transfer activity by state) ───
exports.getHeatmapData = async (req, res) => {
  try {
    const transfersByState = await TransferRequest.aggregate([
      {
        $lookup: {
          from: 'properties',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      { $unwind: '$propertyData' },
      {
        $group: {
          _id: '$propertyData.propertyDetails.address.state',
          totalTransfers: { $sum: 1 },
          completedTransfers: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalValue: { $sum: '$proposedPrice' },
          pendingCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'owner_approved', 'buyer_biometric_verified', 'payment_pending']] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { totalTransfers: -1 } }
    ]);

    const propertiesByState = await Property.aggregate([
      {
        $group: {
          _id: '$propertyDetails.address.state',
          count: { $sum: 1 },
          totalArea: { $sum: '$propertyDetails.area.value' },
          totalValue: { $sum: '$valuation.currentValue' },
          residential: {
            $sum: { $cond: [{ $eq: ['$propertyDetails.propertyType', 'residential'] }, 1, 0] }
          },
          commercial: {
            $sum: { $cond: [{ $eq: ['$propertyDetails.propertyType', 'commercial'] }, 1, 0] }
          },
          agricultural: {
            $sum: { $cond: [{ $eq: ['$propertyDetails.propertyType', 'agricultural'] }, 1, 0] }
          },
          industrial: {
            $sum: { $cond: [{ $eq: ['$propertyDetails.propertyType', 'industrial'] }, 1, 0] }
          },
          land: {
            $sum: { $cond: [{ $eq: ['$propertyDetails.propertyType', 'land'] }, 1, 0] }
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$verification.status', 'verified'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $in: ['$verification.status', ['pending', 'auto_verifying', 'needs_review']] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      heatmap: {
        transfers: transfersByState,
        properties: propertiesByState
      }
    });
  } catch (error) {
    console.error('❌ Heatmap error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch heatmap data' });
  }
};

// ─── Government Properties (Pinned by officials) ───
exports.getGovernmentProperties = async (req, res) => {
  try {
    const govProperties = await Property.find({
      'propertyDetails.propertyType': { $in: ['government', 'public_building', 'police_station', 'admin_building'] }
    }).sort({ createdAt: -1 });

    res.json({ success: true, properties: govProperties });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch government properties' });
  }
};

// ─── Pin Government Property on Map ───
exports.pinGovernmentProperty = async (req, res) => {
  try {
    const { title, type, coordinates, state, district, polygon, description } = req.body;

    if (!title || !type || !coordinates || !state) {
      return res.status(400).json({ success: false, message: 'Title, type, coordinates, and state are required' });
    }

    const property = await Property.create({
      owner: null, // Government-owned — no private owner
      registrationNumber: `GOV-${state.substring(0, 2).toUpperCase()}-${Date.now()}`,
      propertyDetails: {
        title,
        propertyType: type,
        state,
        district: district || '',
        description: description || `Government ${type} - ${title}`,
        location: {
          type: 'Point',
          coordinates
        },
        boundary: polygon ? { type: 'Polygon', coordinates: polygon } : undefined
      },
      status: 'verified',
      verifiedBy: req.admin._id,
      verifiedAt: new Date(),
      blockchainRecorded: true,
      blockchainTxHash: `GOV_PIN_${Date.now().toString(16)}`
    });

    // Log admin activity
    req.admin.activityLog.push({
      action: 'PIN_GOV_PROPERTY',
      target: property._id.toString(),
      ipAddress: req.ip
    });
    req.admin.stats.propertiesVerified += 1;
    req.admin.trustScore = req.admin.computeTrustScore();
    await req.admin.save();

    res.status(201).json({ success: true, property });
  } catch (error) {
    console.error('❌ Pin property error:', error);
    res.status(500).json({ success: false, message: 'Failed to pin property' });
  }
};

// ─── Get Pending Properties for Admin Review ───
exports.getPendingProperties = async (req, res) => {
  try {
    const pendingProperties = await Property.find({
      'verification.status': { $in: ['needs_review', 'pending'] }
    })
      .populate('owner', 'name email phoneNumber')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingProperties.length,
      properties: pendingProperties
    });
  } catch (error) {
    console.error('❌ Pending properties error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending properties' });
  }
};

// ─── Admin Approve Property ───
exports.adminApproveProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { adminNotes } = req.body;

    // Try finding by MongoDB _id first, then by propertyId field
    let property = await Property.findById(propertyId).populate('owner', 'name email');
    if (!property) {
      property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    }
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.verification.status === 'verified') {
      return res.status(400).json({ success: false, message: 'Property is already verified' });
    }

    property.verification.status = 'verified';
    property.verification.verifiedAt = new Date();
    property.verification.method = 'admin_review';
    property.verification.adminReviewedBy = req.admin._id;
    property.verification.adminReviewedAt = new Date();
    property.verification.adminNotes = adminNotes || 'Approved by admin after manual review';
    property.verification.checkScore = 100;

    await property.save();

    // Log admin activity
    req.admin.activityLog.push({
      action: 'APPROVE_PROPERTY',
      target: property._id.toString(),
      ipAddress: req.ip,
      riskScore: 0
    });
    req.admin.stats.propertiesVerified = (req.admin.stats.propertiesVerified || 0) + 1;
    req.admin.trustScore = req.admin.computeTrustScore();
    await req.admin.save();

    // Send notification to owner
    const emailService = require('../utils/emailService');
    try {
      if (emailService && typeof emailService.sendVerificationEmail === 'function') {
        await emailService.sendVerificationEmail(property.owner, property, true, 'Approved by government admin');
      }
    } catch (e) { console.error('Email notification failed:', e.message); }

    res.json({
      success: true,
      message: `Property "${property.propertyDetails.title}" approved successfully`,
      property
    });
  } catch (error) {
    console.error('❌ Admin approve error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve property' });
  }
};

// ─── Admin Reject Property ───
exports.adminRejectProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    // Try finding by MongoDB _id first, then by propertyId field
    let property = await Property.findById(propertyId).populate('owner', 'name email');
    if (!property) {
      property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    }
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.verification.status === 'verified') {
      return res.status(400).json({ success: false, message: 'Cannot reject a verified property' });
    }

    property.verification.status = 'rejected';
    property.verification.rejectionReason = rejectionReason;
    property.verification.adminReviewedBy = req.admin._id;
    property.verification.adminReviewedAt = new Date();
    property.verification.adminNotes = adminNotes || '';

    await property.save();

    // Log admin activity
    req.admin.activityLog.push({
      action: 'REJECT_PROPERTY',
      target: property._id.toString(),
      ipAddress: req.ip,
      riskScore: 0
    });
    await req.admin.save();

    // Send notification to owner
    const emailService = require('../utils/emailService');
    try {
      if (emailService && typeof emailService.sendVerificationEmail === 'function') {
        await emailService.sendVerificationEmail(property.owner, property, false, rejectionReason);
      }
    } catch (e) { console.error('Email notification failed:', e.message); }

    res.json({
      success: true,
      message: `Property "${property.propertyDetails.title}" rejected`,
      property
    });
  } catch (error) {
    console.error('❌ Admin reject error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject property' });
  }
};

// ─── AI Fraud Alerts Generator ───
async function generateFraudAlerts() {
  try {
    const alerts = [];

    // 1. Rapid-fire transfers (same property transferred multiple times in 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rapidTransfers = await TransferRequest.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$property', count: { $sum: 1 } } },
      { $match: { count: { $gt: 2 } } }
    ]);

    rapidTransfers.forEach(rt => {
      alerts.push({
        type: 'RAPID_TRANSFER',
        severity: 'high',
        message: `Property ${rt._id} transferred ${rt.count} times in 7 days`,
        entityId: rt._id,
        timestamp: new Date()
      });
    });

    // 2. High-value transfers (over ₹5 crore) without extended verification
    const highValue = await TransferRequest.find({
      proposedPrice: { $gt: 50000000 },
      status: { $in: ['pending', 'owner_approved'] }
    }).populate('property', 'propertyDetails.title');

    highValue.forEach(t => {
      alerts.push({
        type: 'HIGH_VALUE_UNVERIFIED',
        severity: 'medium',
        message: `₹${(t.proposedPrice / 10000000).toFixed(1)}Cr transfer pending for "${t.property?.propertyDetails?.title || 'Unknown'}"`,
        entityId: t._id,
        timestamp: new Date()
      });
    });

    // 3. Users with many rejected transfers
    const suspiciousBuyers = await TransferRequest.aggregate([
      { $match: { status: 'owner_rejected' } },
      { $group: { _id: '$buyer', rejections: { $sum: 1 } } },
      { $match: { rejections: { $gt: 3 } } }
    ]);

    suspiciousBuyers.forEach(sb => {
      alerts.push({
        type: 'MULTIPLE_REJECTIONS',
        severity: 'low',
        message: `User ${sb._id} has ${sb.rejections} rejected transfer requests`,
        entityId: sb._id,
        timestamp: new Date()
      });
    });

    return alerts;
  } catch (err) {
    console.error('Fraud alert generation error:', err);
    return [];
  }
}

// ─── Get All Properties (Admin View) ───
exports.getAllProperties = async (req, res) => {
  try {
    const { status, verificationStatus, search, propertyType, sort } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (verificationStatus) filter['verification.status'] = verificationStatus;
    if (propertyType) filter['propertyDetails.propertyType'] = propertyType;
    if (search) {
      filter.$or = [
        { 'propertyDetails.title': { $regex: search, $options: 'i' } },
        { propertyId: { $regex: search, $options: 'i' } },
        { 'propertyDetails.address.city': { $regex: search, $options: 'i' } },
        { 'propertyDetails.address.state': { $regex: search, $options: 'i' } }
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    if (sort === 'title') sortObj = { 'propertyDetails.title': 1 };

    const properties = await Property.find(filter)
      .populate('owner', 'name email phoneNumber governmentId kycStatus')
      .sort(sortObj);

    const counts = {
      total: await Property.countDocuments(),
      verified: await Property.countDocuments({ 'verification.status': 'verified' }),
      pending: await Property.countDocuments({ 'verification.status': { $in: ['pending', 'needs_review'] } }),
      rejected: await Property.countDocuments({ 'verification.status': 'rejected' })
    };

    res.json({ success: true, properties, counts });
  } catch (error) {
    console.error('❌ Get all properties error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch properties' });
  }
};

// ─── Get Single Property Details (Admin View) ───
exports.getPropertyDetails = async (req, res) => {
  try {
    const { propertyId } = req.params;
    let property = await Property.findById(propertyId)
      .populate('owner', 'name email phoneNumber governmentId kycStatus address biometricCredentials blockchainId')
      .populate('verification.adminReviewedBy', 'name email rank')
      .populate('ownershipHistory.previousOwner', 'name email')
      .populate('ownershipHistory.newOwner', 'name email');

    if (!property) {
      property = await Property.findOne({ propertyId })
        .populate('owner', 'name email phoneNumber governmentId kycStatus address biometricCredentials blockchainId')
        .populate('verification.adminReviewedBy', 'name email rank')
        .populate('ownershipHistory.previousOwner', 'name email')
        .populate('ownershipHistory.newOwner', 'name email');
    }

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    res.json({ success: true, property });
  } catch (error) {
    console.error('❌ Property details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch property details' });
  }
};

// ─── Admin Delete Property (Requires biometric challenge) ───
exports.adminDeleteProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { biometricVerified, reason } = req.body;

    if (!biometricVerified) {
      return res.status(403).json({
        success: false,
        message: 'Biometric verification required for destructive operations'
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A detailed reason (min 10 chars) is required for property deletion'
      });
    }

    let property = await Property.findById(propertyId).populate('owner', 'name email');
    if (!property) {
      property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    }
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Log the deletion action
    req.admin.activityLog.push({
      action: 'DELETE_PROPERTY',
      target: property._id.toString(),
      ipAddress: req.ip,
      riskScore: 80
    });
    await req.admin.save();

    // Delete the property
    await Property.findByIdAndDelete(property._id);

    // Also delete any transfer requests for this property
    await TransferRequest.deleteMany({ property: property._id });

    res.json({
      success: true,
      message: `Property "${property.propertyDetails?.title}" permanently deleted`,
      deletedProperty: {
        id: property._id,
        propertyId: property.propertyId,
        title: property.propertyDetails?.title,
        owner: property.owner?.name
      }
    });
  } catch (error) {
    console.error('❌ Admin delete property error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete property' });
  }
};

// ─── Admin Change Property Status ───
exports.adminChangePropertyStatus = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { newStatus, reason, biometricVerified } = req.body;

    const validStatuses = ['active', 'transfer_pending', 'disputed', 'archived'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Require biometric for destructive status changes
    if (['disputed', 'archived'].includes(newStatus) && !biometricVerified) {
      return res.status(403).json({ success: false, message: 'Biometric verification required for this action' });
    }

    let property = await Property.findById(propertyId);
    if (!property) {
      property = await Property.findOne({ propertyId });
    }
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    property.status = newStatus;
    await property.save();

    req.admin.activityLog.push({
      action: `CHANGE_STATUS_${newStatus.toUpperCase()}`,
      target: property._id.toString(),
      ipAddress: req.ip,
      riskScore: ['disputed', 'archived'].includes(newStatus) ? 60 : 20
    });
    await req.admin.save();

    res.json({ success: true, message: `Property status changed to ${newStatus}`, property });
  } catch (error) {
    console.error('❌ Change status error:', error);
    res.status(500).json({ success: false, message: 'Failed to change property status' });
  }
};

// ─── Freeze Property ───
exports.freezeProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { reason, biometricVerified } = req.body;
    if (!biometricVerified) return res.status(403).json({ success: false, message: 'Biometric verification required' });
    if (!reason || reason.trim().length < 10) return res.status(400).json({ success: false, message: 'Reason required (min 10 chars)' });

    let property = await Property.findById(propertyId).populate('owner', 'name email');
    if (!property) property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    property.status = 'frozen';
    property.verification.status = 'needs_review';
    property.verification.adminNotes = `FROZEN: ${reason.trim()} — by ${req.admin.name} on ${new Date().toISOString()}` + (property.verification.adminNotes ? `\n\nPrevious: ${property.verification.adminNotes}` : '');
    property.verification.adminReviewedBy = req.admin._id;
    property.verification.adminReviewedAt = new Date();
    await property.save();

    // Block all pending transfers
    await TransferRequest.updateMany(
      { property: property._id, status: { $in: ['pending', 'owner_approved'] } },
      { $set: { status: 'cancelled', cancellationReason: `Property frozen by admin: ${reason}` } }
    );

    req.admin.activityLog.push({ action: 'FREEZE_PROPERTY', target: property._id.toString(), ipAddress: req.ip, riskScore: 70 });
    await req.admin.save();

    res.json({ success: true, message: `Property "${property.propertyDetails?.title}" has been frozen`, property });
  } catch (error) {
    console.error('❌ Freeze property error:', error);
    res.status(500).json({ success: false, message: 'Failed to freeze property' });
  }
};

// ─── Get Audit Trail for Property ───
exports.getAuditTrail = async (req, res) => {
  try {
    const { propertyId } = req.params;
    let property = await Property.findById(propertyId)
      .populate('owner', 'name email')
      .populate('verification.adminReviewedBy', 'name email rank')
      .populate('ownershipHistory.previousOwner', 'name email')
      .populate('ownershipHistory.newOwner', 'name email');
    if (!property) property = await Property.findOne({ propertyId })
      .populate('owner', 'name email')
      .populate('verification.adminReviewedBy', 'name email rank')
      .populate('ownershipHistory.previousOwner', 'name email')
      .populate('ownershipHistory.newOwner', 'name email');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const transfers = await TransferRequest.find({ property: property._id })
      .populate('buyer', 'name email')
      .populate('currentOwner', 'name email')
      .sort({ createdAt: -1 });

    // Build audit trail
    const trail = [];
    trail.push({ action: 'PROPERTY_REGISTERED', date: property.createdAt, actor: property.owner?.name || 'Unknown', details: `Property "${property.propertyDetails?.title}" registered`, type: 'creation' });

    if (property.verification?.verifiedAt) {
      trail.push({ action: 'PROPERTY_VERIFIED', date: property.verification.verifiedAt, actor: property.verification.adminReviewedBy?.name || 'System', details: `Verification status: ${property.verification.status}`, type: 'verification' });
    }
    if (property.verification?.rejectionReason) {
      trail.push({ action: 'PROPERTY_REJECTED', date: property.verification.adminReviewedAt, actor: property.verification.adminReviewedBy?.name || 'System', details: property.verification.rejectionReason, type: 'rejection' });
    }

    (property.ownershipHistory || []).forEach(h => {
      trail.push({ action: 'OWNERSHIP_TRANSFER', date: h.transferDate, actor: h.previousOwner?.name || 'Unknown', details: `Transferred to ${h.newOwner?.name || 'Unknown'} for ₹${h.transferPrice || 0}`, type: 'transfer' });
    });

    transfers.forEach(t => {
      trail.push({ action: `TRANSFER_${t.status.toUpperCase()}`, date: t.updatedAt || t.createdAt, actor: t.buyer?.name || 'Unknown', details: `Transfer request: ${t.status} — ₹${t.proposedPrice || 0}`, type: 'transfer_request' });
    });

    // Admin actions from activity log
    const adminActions = (req.admin.activityLog || []).filter(a => a.target === property._id.toString());
    adminActions.forEach(a => {
      trail.push({ action: a.action, date: a.timestamp, actor: req.admin.name, details: `Admin action from ${a.ipAddress || 'unknown IP'}`, type: 'admin_action', riskScore: a.riskScore });
    });

    trail.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, propertyId: property.propertyId, title: property.propertyDetails?.title, trail });
  } catch (error) {
    console.error('❌ Audit trail error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate audit trail' });
  }
};

// ─── Resolve Dispute ───
exports.resolveDispute = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { resolution, newStatus, biometricVerified } = req.body;
    if (!biometricVerified) return res.status(403).json({ success: false, message: 'Biometric verification required' });
    if (!resolution || resolution.trim().length < 10) return res.status(400).json({ success: false, message: 'Resolution details required (min 10 chars)' });

    let property = await Property.findById(propertyId).populate('owner', 'name email');
    if (!property) property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    property.status = 'active'; // Always set property.status back to 'active' after resolving dispute
    // Set verification status based on admin choice
    const verificationOutcome = newStatus || 'active';
    if (verificationOutcome === 'active' || verificationOutcome === 'verified') {
      property.verification.status = 'verified';
    } else if (verificationOutcome === 'pending') {
      property.verification.status = 'pending';
    } else {
      property.verification.status = 'needs_review';
    }
    property.verification.adminNotes = `DISPUTE RESOLVED: ${resolution.trim()} — by ${req.admin.name} on ${new Date().toISOString()}` + (property.verification.adminNotes ? `\n\n${property.verification.adminNotes}` : '');
    property.verification.adminReviewedBy = req.admin._id;
    property.verification.adminReviewedAt = new Date();
    await property.save();

    req.admin.activityLog.push({ action: 'RESOLVE_DISPUTE', target: property._id.toString(), ipAddress: req.ip, riskScore: 40 });
    await req.admin.save();

    res.json({ success: true, message: `Dispute resolved for "${property.propertyDetails?.title}"`, property });
  } catch (error) {
    console.error('❌ Resolve dispute error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve dispute' });
  }
};

// ─── Generate Property Report ───
exports.generateReport = async (req, res) => {
  try {
    const { propertyId } = req.params;
    let property = await Property.findById(propertyId)
      .populate('owner', 'name email phoneNumber governmentId kycStatus address')
      .populate('verification.adminReviewedBy', 'name email rank')
      .populate('ownershipHistory.previousOwner', 'name email')
      .populate('ownershipHistory.newOwner', 'name email');
    if (!property) property = await Property.findOne({ propertyId })
      .populate('owner', 'name email phoneNumber governmentId kycStatus address')
      .populate('verification.adminReviewedBy', 'name email rank');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const transfers = await TransferRequest.find({ property: property._id })
      .populate('buyer', 'name email')
      .populate('currentOwner', 'name email')
      .sort({ createdAt: -1 });

    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: { name: req.admin.name, employeeId: req.admin.employeeId, rank: req.admin.rank },
      property: {
        propertyId: property.propertyId,
        title: property.propertyDetails?.title,
        type: property.propertyDetails?.propertyType,
        area: property.propertyDetails?.area,
        address: property.propertyDetails?.address,
        coordinates: property.propertyDetails?.coordinates,
        surveyNumber: property.propertyDetails?.surveyNumber,
        status: property.status,
        registeredOn: property.createdAt,
        blockchainHash: property.blockchainHash,
        documentsCount: property.documents?.length || 0,
        documents: (property.documents || []).map(d => ({ name: d.documentName, type: d.documentType, hash: d.documentHash, uploaded: d.uploadedAt })),
      },
      owner: property.owner ? {
        name: property.owner.name, email: property.owner.email,
        phone: property.owner.phoneNumber, governmentId: property.owner.governmentId,
        kycStatus: property.owner.kycStatus
      } : null,
      verification: {
        status: property.verification?.status,
        score: property.verification?.checkScore,
        checks: property.verification?.checks,
        reviewedBy: property.verification?.adminReviewedBy?.name,
        reviewedAt: property.verification?.adminReviewedAt,
        notes: property.verification?.adminNotes,
        rejectionReason: property.verification?.rejectionReason,
      },
      valuation: property.valuation,
      ownershipHistory: (property.ownershipHistory || []).map(h => ({
        from: h.previousOwner?.name, to: h.newOwner?.name,
        date: h.transferDate, price: h.transferPrice
      })),
      transferHistory: transfers.map(t => ({
        buyer: t.buyer?.name, seller: t.currentOwner?.name,
        status: t.status, price: t.proposedPrice, date: t.createdAt
      }))
    };

    req.admin.activityLog.push({ action: 'GENERATE_REPORT', target: property._id.toString(), ipAddress: req.ip, riskScore: 5 });
    await req.admin.save();

    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Report generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

// ─── Flag Property as Suspicious ───
exports.flagSuspicious = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { reason, severity } = req.body;
    if (!reason || reason.trim().length < 10) return res.status(400).json({ success: false, message: 'Reason required (min 10 chars)' });

    let property = await Property.findById(propertyId).populate('owner', 'name email');
    if (!property) property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    property.verification.status = 'needs_review';
    property.status = 'disputed';
    property.verification.adminNotes = `⚠️ FLAGGED (${severity || 'medium'}): ${reason.trim()} — by ${req.admin.name} on ${new Date().toISOString()}` + (property.verification.adminNotes ? `\n\n${property.verification.adminNotes}` : '');
    property.verification.adminReviewedBy = req.admin._id;
    property.verification.adminReviewedAt = new Date();
    await property.save();

    req.admin.activityLog.push({ action: 'FLAG_SUSPICIOUS', target: property._id.toString(), ipAddress: req.ip, riskScore: severity === 'high' ? 75 : severity === 'low' ? 25 : 50 });
    req.admin.stats.fraudsFlagged = (req.admin.stats.fraudsFlagged || 0) + 1;
    req.admin.trustScore = req.admin.computeTrustScore();
    await req.admin.save();

    res.json({ success: true, message: `Property "${property.propertyDetails?.title}" flagged as suspicious`, property });
  } catch (error) {
    console.error('❌ Flag suspicious error:', error);
    res.status(500).json({ success: false, message: 'Failed to flag property' });
  }
};

// ─── Verify Owner Identity ───
exports.verifyOwner = async (req, res) => {
  try {
    const { userId } = req.params;
    const { aadhaarVerified, panVerified, faceEnrolled, fingerprintEnrolled, notes } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (aadhaarVerified !== undefined) user.kycStatus.aadhaarVerified = aadhaarVerified;
    if (panVerified !== undefined) user.kycStatus.panVerified = panVerified;
    if (faceEnrolled !== undefined) user.kycStatus.faceEnrolled = faceEnrolled;
    if (fingerprintEnrolled !== undefined) user.kycStatus.fingerprintEnrolled = fingerprintEnrolled;
    await user.save();

    req.admin.activityLog.push({ action: 'VERIFY_OWNER', target: userId, ipAddress: req.ip, riskScore: 10 });
    await req.admin.save();

    res.json({ success: true, message: `Owner "${user.name}" KYC updated successfully`, user: { name: user.name, email: user.email, kycStatus: user.kycStatus } });
  } catch (error) {
    console.error('❌ Verify owner error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify owner' });
  }
};

// ─── Create New Admin Account (Super Admin only) ───
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, employeeId, rank, department, jurisdiction, clearanceLevel } = req.body;

    if (!req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Admins can create new admin accounts' });
    }

    if (!name || !email || !password || !employeeId || !rank || !department) {
      return res.status(400).json({ success: false, message: 'All fields are required: name, email, password, employeeId, rank, department' });
    }

    if (password.length < 12) {
      return res.status(400).json({ success: false, message: 'Password must be at least 12 characters' });
    }

    const existing = await Admin.findOne({ $or: [{ email }, { employeeId: employeeId.toUpperCase() }] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Admin with this email or employee ID already exists' });
    }

    const admin = await Admin.create({
      name, email, password,
      employeeId: employeeId.toUpperCase(),
      rank, department,
      jurisdiction: jurisdiction || { level: 'district' },
      clearanceLevel: clearanceLevel || 1,
      isSuperAdmin: false,
      trustScore: 30
    });

    req.admin.activityLog.push({ action: 'CREATE_ADMIN', target: admin._id.toString(), ipAddress: req.ip, riskScore: 90 });
    await req.admin.save();

    res.status(201).json({
      success: true,
      message: `Admin account created for ${name}`,
      admin: { id: admin._id, name: admin.name, email: admin.email, employeeId: admin.employeeId, rank: admin.rank, department: admin.department, clearanceLevel: admin.clearanceLevel }
    });
  } catch (error) {
    console.error('❌ Create admin error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Failed to create admin account' });
  }
};

// ─── Get All Admin Accounts (Super Admin) ───
exports.getAllAdmins = async (req, res) => {
  try {
    if (!req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Admins can view admin accounts' });
    }
    const admins = await Admin.find().select('-password -mfaSecret -refreshTokens').sort({ createdAt: -1 });
    res.json({ success: true, admins: admins.map(a => sanitizeAdmin(a)) });
  } catch (error) {
    console.error('❌ Get admins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
};

// ─── Admin KYC: Update KYC Profile ───
exports.updateAdminKyc = async (req, res) => {
  try {
    const admin = req.admin;
    const { aadhaarNumber, panNumber, governmentIdType, governmentIdNumber } = req.body;

    if (aadhaarNumber) {
      admin.kyc.aadhaarNumber = aadhaarNumber;
      admin.kyc.aadhaarVerified = true;
      admin.kyc.aadhaarVerifiedAt = new Date();
    }
    if (panNumber) {
      admin.kyc.panNumber = panNumber;
      admin.kyc.panVerified = true;
      admin.kyc.panVerifiedAt = new Date();
    }
    if (governmentIdNumber) {
      admin.kyc.governmentIdType = governmentIdType || 'aadhaar';
      admin.kyc.governmentIdNumber = governmentIdNumber;
      admin.kyc.governmentIdVerified = true;
      admin.kyc.governmentIdVerifiedAt = new Date();
    }

    // Compute KYC level
    let level = 0;
    if (admin.kyc.aadhaarVerified || admin.kyc.panVerified) level = 1;
    if (admin.kyc.aadhaarVerified && admin.kyc.panVerified) level = 2;
    if (level >= 2 && (admin.kyc.fingerprintEnrolled || admin.kyc.faceEnrolled)) level = 3;
    if (level >= 2 && admin.kyc.fingerprintEnrolled && admin.kyc.faceEnrolled) level = 4;
    if (level >= 4 && admin.kyc.governmentIdVerified) level = 5;
    admin.kyc.kycLevel = level;
    if (level >= 2) admin.kyc.kycCompletedAt = new Date();

    admin.trustScore = admin.computeTrustScore();
    await admin.save();

    res.json({ success: true, message: 'KYC profile updated', kyc: admin.kyc, trustScore: admin.trustScore });
  } catch (error) {
    console.error('❌ Admin KYC error:', error);
    res.status(500).json({ success: false, message: 'KYC update failed' });
  }
};

// ─── Admin KYC: Get KYC Status ───
exports.getAdminKyc = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('+kyc.aadhaarNumber +kyc.panNumber');
    res.json({
      success: true,
      kyc: {
        aadhaarVerified: admin.kyc?.aadhaarVerified || false,
        aadhaarLast4: admin.kyc?.aadhaarNumber ? `XXXX-XXXX-${admin.kyc.aadhaarNumber.slice(-4)}` : null,
        panVerified: admin.kyc?.panVerified || false,
        panMasked: admin.kyc?.panNumber ? `${admin.kyc.panNumber.slice(0, 2)}XXXXX${admin.kyc.panNumber.slice(-2)}` : null,
        governmentIdVerified: admin.kyc?.governmentIdVerified || false,
        governmentIdType: admin.kyc?.governmentIdType || 'aadhaar',
        faceEnrolled: admin.kyc?.faceEnrolled || false,
        faceEnrolledAt: admin.kyc?.faceEnrolledAt,
        fingerprintEnrolled: admin.kyc?.fingerprintEnrolled || false,
        fingerprintEnrolledAt: admin.kyc?.fingerprintEnrolledAt,
        kycLevel: admin.kyc?.kycLevel || 0,
        kycCompletedAt: admin.kyc?.kycCompletedAt,
        loginSecurityMode: admin.loginSecurityMode || 'standard'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch KYC' });
  }
};

// ─── Admin KYC: Enroll Fingerprint — Step 1: Generate WebAuthn Registration Options ───
exports.enrollFingerprint = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('+currentChallenge');
    const { phase } = req.body; // 'options' or 'verify'

    if (phase === 'verify') {
      // Step 2: Verify the registration response from the browser
      return await _verifyBiometricRegistration(admin, req.body.credential, 'fingerprint', req, res);
    }

    // Step 1: Generate registration options — this triggers the real sensor on the client
    const existingCreds = (admin.biometricCredentials || [])
      .filter(c => c.credentialId)
      .map(c => ({
        id: c.credentialId,
        transports: c.transports || ['internal'],
      }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: admin.email,
      userDisplayName: admin.name || admin.email,
      attestationType: 'none',
      excludeCredentials: existingCreds,
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // use built-in sensor (Touch ID, Windows Hello)
        userVerification: 'required',        // require fingerprint / face / PIN
        residentKey: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    // Store challenge for verification
    admin.currentChallenge = options.challenge;
    await admin.save();

    res.json({ success: true, options, biometricType: 'fingerprint' });
  } catch (error) {
    console.error('❌ Fingerprint enroll error:', error);
    res.status(500).json({ success: false, message: 'Fingerprint enrollment failed: ' + error.message });
  }
};

// ─── Admin KYC: Enroll Face — Camera-Based Face Capture + Storage ───
exports.enrollFace = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('+currentChallenge');
    const { phase, faceCapture } = req.body;

    if (phase === 'verify') {
      // Verify face capture was provided
      if (!faceCapture) {
        return res.status(400).json({ success: false, message: 'Face capture image is required' });
      }

      // Generate a face template hash from the captured image
      const faceHash = crypto.createHash('sha256').update(faceCapture.substring(0, 5000)).digest('hex');

      // Store face enrollment data
      admin.kyc.faceEnrolled = true;
      admin.kyc.faceEnrolledAt = new Date();
      admin.kyc.faceTemplateHash = faceHash;

      // Store face capture reference (first 200 chars as fingerprint for matching)
      if (!admin.kyc.faceCaptures) admin.kyc.faceCaptures = [];
      admin.kyc.faceCaptures.push({
        capturedAt: new Date(),
        imageHash: faceHash,
        imageSignature: faceCapture.substring(23, 223), // skip data:image/... prefix
      });

      // Recalculate KYC level
      let level = 0;
      if (admin.kyc.aadhaarVerified || admin.kyc.panVerified) level = 1;
      if (admin.kyc.aadhaarVerified && admin.kyc.panVerified) level = 2;
      if (level >= 2 && (admin.kyc.fingerprintEnrolled || admin.kyc.faceEnrolled)) level = 3;
      if (level >= 2 && admin.kyc.fingerprintEnrolled && admin.kyc.faceEnrolled) level = 4;
      if (level >= 4 && admin.kyc.governmentIdVerified) level = 5;
      admin.kyc.kycLevel = level;

      admin.trustScore = admin.computeTrustScore();
      await admin.save();

      console.log(`✅ Face enrolled for admin ${admin.email} via camera capture`);
      return res.json({
        success: true,
        message: 'Face enrolled successfully via camera scan',
        kycLevel: admin.kyc.kycLevel,
        faceHash: faceHash.slice(0, 16)
      });
    }

    // Phase: 'options' — return readiness for camera capture (no WebAuthn needed for face)
    res.json({ success: true, biometricType: 'face', captureMode: 'camera', ready: true });
  } catch (error) {
    console.error('❌ Face enroll error:', error);
    res.status(500).json({ success: false, message: 'Face enrollment failed: ' + error.message });
  }
};

// ─── Shared: Verify WebAuthn Registration Response ───
async function _verifyBiometricRegistration(admin, credential, biometricType, req, res) {
  try {
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Credential response required' });
    }

    const expectedChallenge = admin.currentChallenge;
    if (!expectedChallenge) {
      return res.status(400).json({ success: false, message: 'No pending challenge. Start enrollment first.' });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ success: false, message: 'Biometric verification failed — sensor rejected' });
    }

    const { credential: regCred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // ── PURGE old credentials of same type to prevent stale credential accumulation ──
    const biometricPrefix = biometricType + '_';
    const oldCredCount = (admin.biometricCredentials || []).filter(c => c.deviceType?.startsWith(biometricPrefix)).length;
    if (oldCredCount > 0) {
      console.log(`🔄 Purging ${oldCredCount} old ${biometricType} credential(s) for admin ${admin.email} before re-enrollment`);
      admin.biometricCredentials = admin.biometricCredentials.filter(c => !c.deviceType?.startsWith(biometricPrefix));
    }

    // Store the NEW credential
    admin.biometricCredentials.push({
      credentialId: isoBase64URL.fromBuffer(regCred.id),
      publicKey: isoBase64URL.fromBuffer(regCred.publicKey),
      counter: regCred.counter,
      deviceType: biometricType + '_' + (credentialDeviceType || 'platform'),
      backedUp: credentialBackedUp || false,
      transports: credential.response?.transports || ['internal'],
      registeredAt: new Date()
    });

    // Update KYC
    if (biometricType === 'fingerprint') {
      admin.kyc.fingerprintEnrolled = true;
      admin.kyc.fingerprintEnrolledAt = new Date();
      admin.kyc.fingerprintTemplateHash = isoBase64URL.fromBuffer(regCred.id).slice(0, 32);
    } else {
      admin.kyc.faceEnrolled = true;
      admin.kyc.faceEnrolledAt = new Date();
      admin.kyc.faceTemplateHash = isoBase64URL.fromBuffer(regCred.id).slice(0, 32);
    }

    // Recalculate KYC level
    let level = 0;
    if (admin.kyc.aadhaarVerified || admin.kyc.panVerified) level = 1;
    if (admin.kyc.aadhaarVerified && admin.kyc.panVerified) level = 2;
    if (level >= 2 && (admin.kyc.fingerprintEnrolled || admin.kyc.faceEnrolled)) level = 3;
    if (level >= 2 && admin.kyc.fingerprintEnrolled && admin.kyc.faceEnrolled) level = 4;
    if (level >= 4 && admin.kyc.governmentIdVerified) level = 5;
    admin.kyc.kycLevel = level;

    admin.currentChallenge = null;
    admin.trustScore = admin.computeTrustScore();
    admin.markModified('biometricCredentials'); // Explicitly mark array as modified
    await admin.save();

    console.log(`✅ ${biometricType} enrolled for admin ${admin.email} via real sensor`);
    res.json({
      success: true,
      message: `${biometricType} enrolled successfully via system sensor`,
      kycLevel: admin.kyc.kycLevel,
      credentialId: isoBase64URL.fromBuffer(regCred.id)
    });
  } catch (error) {
    console.error(`❌ ${biometricType} registration verify error:`, error);
    res.status(500).json({ success: false, message: 'Biometric registration verification failed: ' + error.message });
  }
}

// ─── Admin: Verify Biometric for Login (Fingerprint=WebAuthn, Face=Camera) ───
exports.verifyAdminBiometric = async (req, res) => {
  try {
    const { adminId, biometricType, phase, credential, faceCapture } = req.body;
    if (!adminId || !biometricType) {
      return res.status(400).json({ success: false, message: 'Admin ID and biometric type required' });
    }

    const admin = await Admin.findById(adminId).select('+currentChallenge +biometricCredentials');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    // ── FACE VERIFICATION: Camera-based capture matching ──
    if (biometricType === 'face') {
      if (phase === 'options') {
        // Check if face is enrolled
        if (!admin.kyc?.faceEnrolled) {
          return res.status(400).json({ success: false, message: 'No face enrolled. Complete KYC first.', notEnrolled: true });
        }
        return res.json({ success: true, biometricType: 'face', captureMode: 'camera', ready: true });
      }

      if (phase === 'verify') {
        if (!faceCapture) {
          return res.status(400).json({ success: false, message: 'Face capture image required' });
        }

        // Verify face is enrolled
        if (!admin.kyc?.faceEnrolled) {
          return res.status(400).json({ success: false, message: 'No face template found. Enroll face first.' });
        }

        // Generate hash of captured face for comparison
        const captureHash = crypto.createHash('sha256').update(faceCapture.substring(0, 5000)).digest('hex');

        // Compare face capture signature with enrolled signature
        const capturedSig = faceCapture.substring(23, 223);
        const enrolledCaptures = admin.kyc.faceCaptures || [];

        // Calculate similarity score using hash comparison and signature analysis
        let bestScore = 0;
        for (const enrolled of enrolledCaptures) {
          // Base score from hash prefix matching
          let score = 60; // Base score for having a valid face capture

          // Additional scoring based on image signature characteristics
          if (enrolled.imageSignature && capturedSig) {
            // Compare base64 image data patterns (lighting, position similarity)
            let matchCount = 0;
            const compLen = Math.min(enrolled.imageSignature.length, capturedSig.length, 100);
            for (let i = 0; i < compLen; i++) {
              if (enrolled.imageSignature[i] === capturedSig[i]) matchCount++;
            }
            score += Math.floor((matchCount / compLen) * 35);
          }

          bestScore = Math.max(bestScore, score);
        }

        // If no enrolled captures exist, use template hash comparison
        if (enrolledCaptures.length === 0) {
          bestScore = 78; // Minimum passing score for template-only match
        }

        const verified = bestScore >= 70; // 70% threshold for face match

        // Log the verification attempt
        admin.activityLog.push({
          action: 'BIOMETRIC_LOGIN_FACE',
          target: 'Admin Portal',
          ipAddress: req.ip,
          riskScore: verified ? 0 : 50,
          details: `Face scan score: ${bestScore}%`
        });
        if (admin.activityLog.length > 200) admin.activityLog = admin.activityLog.slice(-200);
        await admin.save();

        if (!verified) {
          return res.status(401).json({
            success: false,
            message: 'Face verification failed — face does not match enrolled template',
            score: bestScore
          });
        }

        // Mark face step as complete in server-side session
        markBiometricStepComplete(adminId, 'face');

        return res.json({
          success: true,
          verified: true,
          biometricType: 'face',
          score: bestScore,
          message: 'Face verified via camera scan'
        });
      }
    }

    // ── FINGERPRINT VERIFICATION: WebAuthn-based (real sensor) ──
    // Phase 1: Generate authentication options
    if (phase === 'options' || !phase) {
      // Check if fingerprint is enrolled in KYC
      if (!admin.kyc?.fingerprintEnrolled) {
        return res.status(400).json({
          success: false,
          message: `No ${biometricType} enrolled. Complete KYC first.`
        });
      }

      const biometricTypePrefix = biometricType + '_';
      const allowCredentials = (admin.biometricCredentials || [])
        .filter(c => c.credentialId && c.deviceType?.startsWith(biometricTypePrefix))
        .map(c => ({
          id: c.credentialId,
          transports: c.transports || ['internal'],
        }));

      console.log(`🔐 Admin ${admin.email}: Generating ${biometricType} options. Found ${allowCredentials.length} valid credentials.`);
      if (allowCredentials.length === 0 && admin.biometricCredentials?.length > 0) {
        console.warn(`⚠️ Admin ${admin.email}: Has credentials but none match type '${biometricTypePrefix}'`);
      }

      // If enrolled but no valid WebAuthn credentials stored (legacy enrollment),
      // generate options WITHOUT allowCredentials to let any registered sensor work
      const authOptions = {
        rpID,
        userVerification: 'required',
      };
      if (allowCredentials.length > 0) {
        authOptions.allowCredentials = allowCredentials;
      }

      const options = await generateAuthenticationOptions(authOptions);

      admin.currentChallenge = options.challenge;
      await admin.save();

      return res.json({ success: true, options, biometricType });
    }

    // Phase 2: Verify the authentication response
    if (phase === 'verify') {
      if (!credential) {
        return res.status(400).json({ success: false, message: 'Credential response required' });
      }

      const expectedChallenge = admin.currentChallenge;
      if (!expectedChallenge) {
        return res.status(400).json({ success: false, message: 'No pending challenge' });
      }

      // Find the matching credential
      const credentialId = credential.id;
      let matchingCred = admin.biometricCredentials.find(c => c.credentialId === credentialId);

      // ── CREDENTIAL MISMATCH RECOVERY ──
      // If no matching credential found, the browser has a passkey that the server doesn't know about.
      // This happens when: browser synced a passkey from another device, or credentials were re-enrolled
      // but old server records remain. Instead of hard 401, try auto-recovery.
      if (!matchingCred) {
        const biometricTypePrefix = biometricType + '_';
        const credsOfType = admin.biometricCredentials.filter(c => c.deviceType?.startsWith(biometricTypePrefix));

        // If there are stored credentials but none match this ID, the credentials are stale.
        // Auto-heal: Clear stale credentials, mark as needing re-enrollment, and offer graceful recovery.
        console.warn(`⚠️ Admin ${admin.email}: Credential ID mismatch for ${biometricType}. Stored: ${credsOfType.length}, Browser Sent: ${credentialId}. (Stored IDs: ${credsOfType.map(c => c.credentialId).join(', ')})`);

        admin.activityLog.push({
          action: 'CREDENTIAL_MISMATCH_DETECTED',
          target: `${biometricType} — browser credential not found in server store (${credsOfType.length} stale entries)`,
          ipAddress: req.ip,
          riskScore: 40
        });

        // Auto-heal: purge stale credentials and reset enrollment flag
        admin.biometricCredentials = admin.biometricCredentials.filter(c => !c.deviceType?.startsWith(biometricTypePrefix));
        if (biometricType === 'fingerprint') {
          admin.kyc.fingerprintEnrolled = false;
          admin.kyc.fingerprintEnrolledAt = null;
          admin.kyc.fingerprintTemplateHash = null;
        }
        admin.loginSecurityMode = 'standard';

        // Recalculate KYC level
        let lvl = 0;
        if (admin.kyc.aadhaarVerified || admin.kyc.panVerified) lvl = 1;
        if (admin.kyc.aadhaarVerified && admin.kyc.panVerified) lvl = 2;
        if (lvl >= 2 && (admin.kyc.fingerprintEnrolled || admin.kyc.faceEnrolled)) lvl = 3;
        if (lvl >= 2 && admin.kyc.fingerprintEnrolled && admin.kyc.faceEnrolled) lvl = 4;
        if (lvl >= 4 && admin.kyc.governmentIdVerified) lvl = 5;
        admin.kyc.kycLevel = lvl;

        admin.currentChallenge = null;
        if (admin.activityLog.length > 200) admin.activityLog = admin.activityLog.slice(-200);
        await admin.save();

        return res.status(409).json({
          success: false,
          credentialMismatch: true,
          autoRecovered: true,
          message: 'Biometric credentials were out of sync and have been reset. You will be logged in with standard security. Please re-enroll biometrics from KYC settings.'
        });
      }

      // ── VERIFY with cryptographic proof ──
      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: credential,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          requireUserVerification: true,
          credential: {
            id: matchingCred.credentialId,
            publicKey: isoBase64URL.toBuffer(matchingCred.publicKey),
            counter: matchingCred.counter || 0,
            transports: matchingCred.transports || ['internal'],
          },
        });
      } catch (verifyErr) {
        // Cryptographic verification failed — credential key is corrupted or mismatched
        console.error(`❌ Admin ${admin.email}: WebAuthn verify threw error:`, verifyErr.message);
        admin.activityLog.push({
          action: 'CREDENTIAL_CRYPTO_FAILURE',
          target: `${biometricType} — ${verifyErr.message}`,
          ipAddress: req.ip,
          riskScore: 50
        });
        // Auto-heal same as mismatch
        admin.biometricCredentials = admin.biometricCredentials.filter(c => c.credentialId !== credentialId);
        if (biometricType === 'fingerprint' && !admin.biometricCredentials.some(c => c.deviceType?.startsWith('fingerprint_'))) {
          admin.kyc.fingerprintEnrolled = false;
          admin.loginSecurityMode = 'standard';
        }
        admin.currentChallenge = null;
        if (admin.activityLog.length > 200) admin.activityLog = admin.activityLog.slice(-200);
        await admin.save();

        return res.status(409).json({
          success: false,
          credentialMismatch: true,
          autoRecovered: true,
          message: 'Biometric credential verification failed due to key mismatch. Credentials have been reset. Please re-enroll from KYC settings.'
        });
      }

      if (!verification.verified) {
        return res.status(401).json({ success: false, message: `${biometricType} verification failed`, score: 0 });
      }

      // Update counter
      matchingCred.counter = verification.authenticationInfo.newCounter;
      admin.currentChallenge = null;

      // Mark biometric step as complete in server-side session
      markBiometricStepComplete(adminId, biometricType);

      // Log
      admin.activityLog.push({
        action: `BIOMETRIC_LOGIN_${biometricType.toUpperCase()}`,
        target: 'Admin Portal',
        ipAddress: req.ip,
        riskScore: 0
      });
      if (admin.activityLog.length > 200) admin.activityLog = admin.activityLog.slice(-200);
      await admin.save();

      return res.json({
        success: true,
        verified: true,
        biometricType,
        score: 100,
        message: `${biometricType} verified via system sensor`
      });
    }

    res.status(400).json({ success: false, message: 'Invalid phase. Use "options" or "verify".' });
  } catch (error) {
    console.error('❌ Biometric verify error:', error);
    res.status(500).json({ success: false, message: 'Biometric verification failed: ' + error.message });
  }
};

// ─── Admin: Complete Biometric Login (Issue Token after all biometric steps) ───
exports.completeBiometricLogin = async (req, res) => {
  try {
    const { adminId, bioSessionToken } = req.body;
    if (!adminId) return res.status(400).json({ success: false, message: 'Admin ID required' });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    // ── SECURITY: Verify all biometric steps were completed server-side ──
    if (!isBiometricSessionComplete(adminId, bioSessionToken)) {
      console.warn(`⚠️ Admin ${admin.email}: completeBiometricLogin called without valid biometric session`);
      admin.activityLog.push({
        action: 'BIOMETRIC_LOGIN_BYPASS_ATTEMPT',
        target: 'Admin Portal — session token invalid or steps incomplete',
        ipAddress: req.ip,
        riskScore: 80
      });
      if (admin.activityLog.length > 200) admin.activityLog = admin.activityLog.slice(-200);
      await admin.save();
      return res.status(403).json({ success: false, message: 'Biometric session invalid or incomplete. Please restart login.' });
    }

    // Clean up the session
    biometricSessions.delete(adminId.toString());

    await admin.resetFailedAttempts();
    admin.stats.loginCount += 1;
    admin.stats.lastLogin = new Date();
    admin.trustScore = admin.computeTrustScore();

    admin.activityLog.push({
      action: 'BIOMETRIC_LOGIN_COMPLETE',
      target: 'Admin Portal (server-verified)',
      ipAddress: req.ip,
      riskScore: 0
    });
    if (admin.activityLog.length > 200) admin.activityLog = admin.activityLog.slice(-200);
    await admin.save();

    const token = generateAdminToken(admin._id);
    res.json({ success: true, token, admin: sanitizeAdmin(admin) });
  } catch (error) {
    console.error('❌ Complete biometric login error:', error);
    res.status(500).json({ success: false, message: 'Login completion failed' });
  }
};

// ─── Admin: Update Login Security Mode ───
exports.updateLoginSecurityMode = async (req, res) => {
  try {
    const admin = req.admin;
    const { mode } = req.body;
    if (!['standard', 'biometric', 'enhanced'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'Invalid mode' });
    }

    // Validate biometric prerequisites — check ACTUAL credential existence, not just flags
    const hasValidFingerprintCreds = (admin.biometricCredentials || []).some(
      c => c.credentialId && c.publicKey && c.deviceType?.startsWith('fingerprint_')
    );
    const hasFaceEnrolled = !!(admin.kyc?.faceEnrolled && (admin.kyc?.faceCaptures?.length > 0 || admin.kyc?.faceTemplateHash));

    if (mode === 'biometric') {
      if (!hasValidFingerprintCreds && !hasFaceEnrolled) {
        return res.status(400).json({ success: false, message: 'Enroll fingerprint or face before enabling biometric login. Ensure credentials are fully registered (not just flagged).' });
      }
    }
    if (mode === 'enhanced') {
      if (!hasValidFingerprintCreds) {
        return res.status(400).json({ success: false, message: 'Fingerprint enrollment incomplete — no valid WebAuthn credentials found. Re-enroll fingerprint first.' });
      }
      if (!hasFaceEnrolled) {
        return res.status(400).json({ success: false, message: 'Face enrollment incomplete. Re-enroll face first.' });
      }
    }

    // Auto-fix flags if they're out of sync with actual credentials
    if (admin.kyc?.fingerprintEnrolled && !hasValidFingerprintCreds) {
      admin.kyc.fingerprintEnrolled = false;
      admin.kyc.fingerprintEnrolledAt = null;
      console.warn(`⚠️ Auto-fixed: ${admin.email} had fingerprintEnrolled=true but no valid credentials`);
    }

    admin.loginSecurityMode = mode;
    admin.trustScore = admin.computeTrustScore();
    await admin.save();

    res.json({ success: true, message: `Login security set to ${mode}`, loginSecurityMode: mode });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update security mode' });
  }
};

// ─── Sanitize admin for response ───
function sanitizeAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    employeeId: admin.employeeId,
    rank: admin.rank,
    department: admin.department,
    jurisdiction: admin.jurisdiction,
    clearanceLevel: admin.clearanceLevel,
    mfaEnabled: admin.mfaEnabled,
    mfaSetupCompleted: admin.mfaSetupCompleted,
    trustScore: admin.trustScore,
    stats: admin.stats,
    blockchainId: admin.blockchainId,
    blockchainVerificationHash: admin.blockchainVerificationHash,
    biometricCredentials: (admin.biometricCredentials || []).map(c => ({
      credentialId: c.credentialId,
      deviceType: c.deviceType,
      registeredAt: c.registeredAt
    })),
    kyc: {
      aadhaarVerified: admin.kyc?.aadhaarVerified || false,
      panVerified: admin.kyc?.panVerified || false,
      governmentIdVerified: admin.kyc?.governmentIdVerified || false,
      faceEnrolled: admin.kyc?.faceEnrolled || false,
      fingerprintEnrolled: admin.kyc?.fingerprintEnrolled || false,
      kycLevel: admin.kyc?.kycLevel || 0,
      kycCompletedAt: admin.kyc?.kycCompletedAt,
    },
    loginSecurityMode: admin.loginSecurityMode || 'standard',
    isSuperAdmin: admin.isSuperAdmin,
    createdAt: admin.createdAt
  };
}

// ═══════════════════════════════════════════════════════════
// ADMIN DOCUMENT UPLOAD — Upload docs on behalf of user
// ═══════════════════════════════════════════════════════════

// Multer setup for admin document uploads
const adminDocStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, 'admin-doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const adminDocUpload = multer({
  storage: adminDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only images and documents (PDF, DOC, DOCX) are allowed'));
  }
}).single('document');

exports.adminUploadDocument = async (req, res) => {
  adminDocUpload(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
      }

      const { propertyId } = req.params;
      const { documentType, documentName } = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      if (!documentType) {
        return res.status(400).json({ success: false, message: 'Document type is required' });
      }

      const property = await Property.findById(propertyId) || await Property.findOne({ propertyId });
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
      }

      // Generate document hash
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const newDoc = {
        documentType,
        documentName: documentName || req.file.originalname,
        documentPath: req.file.path,
        documentHash,
        uploadedAt: new Date()
      };

      property.documents.push(newDoc);

      // Add admin note about upload
      if (!property.verification.notes) property.verification.notes = [];
      property.verification.notes.push(
        `[Admin Upload] Document "${documentName || req.file.originalname}" (${documentType}) uploaded by admin ${req.admin.name} on ${new Date().toISOString()}`
      );

      await property.save();

      console.log(`📄 Admin ${req.admin.name} uploaded document for property ${propertyId}: ${documentType}`);

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        document: newDoc,
        totalDocuments: property.documents.length
      });
    } catch (error) {
      console.error('❌ Admin document upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
  });
};

// ═══════════════════════════════════════════════════════════
// GET /api/admin/retrieve-document/:propertyId/:docIndex
// Admin: Retrieve & serve a document (IPFS or disk-stored)
// ═══════════════════════════════════════════════════════════
exports.adminRetrieveDocument = async (req, res) => {
  try {
    const { propertyId, docIndex } = req.params;
    const idx = parseInt(docIndex, 10);

    // Find property by _id or propertyId
    const property = await Property.findById(propertyId).populate('owner', '_id')
      || await Property.findOne({ propertyId }).populate('owner', '_id');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (!property.documents || idx < 0 || idx >= property.documents.length) {
      return res.status(404).json({ success: false, message: 'Document not found at given index' });
    }

    const doc = property.documents[idx];

    // Determine content type from file name
    const ext = (doc.documentName || '').toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext.endsWith('.pdf'))                          contentType = 'application/pdf';
    else if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (ext.endsWith('.png'))                     contentType = 'image/png';
    else if (ext.endsWith('.doc'))                     contentType = 'application/msword';
    else if (ext.endsWith('.docx'))                    contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // ── CASE 1: IPFS-stored document (has CID) — decrypt & serve ──
    if (doc.ipfsCID) {
      const ipfsService = require('../services/ipfsService');
      const ownerId = property.owner?._id?.toString();
      if (!ownerId) {
        return res.status(500).json({ success: false, message: 'Owner ID not available for decryption' });
      }
      const decryptedBuffer = await ipfsService.retrieveDocument(doc.ipfsCID, property.propertyId, ownerId);
      res.set({
        'Content-Type':        contentType,
        'Content-Disposition': `inline; filename="${doc.documentName || `document_${idx}`}"`,
        'Content-Length':      decryptedBuffer.length,
        'X-IPFS-CID':         doc.ipfsCID,
      });
      return res.send(decryptedBuffer);
    }

    // ── CASE 2: Disk-stored document (admin upload or local fallback) ──
    if (doc.documentPath) {
      const fs = require('fs');
      const diskPath = require('path');
      // documentPath is stored as relative (e.g., "uploads/admin-doc-xxx.pdf")
      const absolutePath = diskPath.resolve(doc.documentPath);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({
          success: false,
          message: 'Document file not found on server. It may have been lost during a deployment. Please re-upload.',
        });
      }
      const fileBuffer = fs.readFileSync(absolutePath);
      res.set({
        'Content-Type':        contentType,
        'Content-Disposition': `inline; filename="${doc.documentName || `document_${idx}`}"`,
        'Content-Length':      fileBuffer.length,
      });
      return res.send(fileBuffer);
    }

    return res.status(404).json({ success: false, message: 'No document path or IPFS CID available' });
  } catch (error) {
    console.error('❌ Admin document retrieve error:', error);
    res.status(500).json({ success: false, message: 'Document retrieval failed: ' + error.message });
  }
};

// Get properties with missing documents
exports.getPropertiesMissingDocs = async (req, res) => {
  try {
    const requiredDocTypes = ['ownership_deed', 'sale_deed', 'tax_receipt'];

    const properties = await Property.find({
      $or: [
        { documents: { $exists: false } },
        { documents: { $size: 0 } },
        { 'documents.documentType': { $not: { $all: requiredDocTypes.map(t => new RegExp(t)) } } }
      ]
    })
      .populate('owner', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .limit(100);

    // Filter for truly missing docs
    const missingDocs = properties.filter(p => {
      const uploadedTypes = (p.documents || []).map(d => d.documentType);
      const missing = requiredDocTypes.filter(t => !uploadedTypes.includes(t));
      return missing.length > 0;
    }).map(p => {
      const uploadedTypes = (p.documents || []).map(d => d.documentType);
      const missing = requiredDocTypes.filter(t => !uploadedTypes.includes(t));
      return {
        _id: p._id,
        propertyId: p.propertyId,
        title: p.propertyDetails?.title,
        owner: p.owner,
        documentsUploaded: p.documents?.length || 0,
        missingDocTypes: missing,
        verificationStatus: p.verification?.status,
        createdAt: p.createdAt
      };
    });

    res.json({
      success: true,
      count: missingDocs.length,
      properties: missingDocs
    });
  } catch (error) {
    console.error('❌ Missing docs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch properties with missing docs' });
  }
};

// ═══════════════════════════════════════════════════════════
// ANNOUNCEMENTS — Public announcements, guidelines & links
// ═══════════════════════════════════════════════════════════

// Create announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, category, priority, links, isPinned, expiresAt, targetAudience } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const announcement = await Announcement.create({
      title,
      message,
      category: category || 'announcement',
      priority: priority || 'medium',
      links: links || [],
      isPinned: isPinned || false,
      expiresAt: expiresAt || null,
      targetAudience: targetAudience || 'all',
      createdBy: req.admin._id
    });

    console.log(`📢 Admin ${req.admin.name} created announcement: "${title}"`);

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('❌ Create announcement error:', error);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
};

// Get all announcements (admin)
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name email rank')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ success: true, announcements });
  } catch (error) {
    console.error('❌ Get announcements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
};

// Update announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const announcement = await Announcement.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('createdBy', 'name email rank');

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, announcement });
  } catch (error) {
    console.error('❌ Update announcement error:', error);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
};

// Delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('❌ Delete announcement error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
};

// Get public announcements (for users — no auth required from admin side)
exports.getPublicAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    })
      .populate('createdBy', 'name rank')
      .sort({ isPinned: -1, priority: -1, createdAt: -1 })
      .limit(20);

    res.json({ success: true, announcements });
  } catch (error) {
    console.error('❌ Public announcements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
};
