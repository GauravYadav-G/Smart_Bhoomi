const Property = require('../models/Property');
const User = require('../models/User');
const blockchainService = require('../blockchain/BlockchainService');
const emailService = require('../utils/emailService');
const smsService = require('../services/SMSService'); // ✅ Fixed path
const crypto = require('crypto');
const { checkSpatialConflict } = require('../utils/spatialConflict');
const mlService = require('../services/MLService');

// Register new property
exports.registerProperty = async (req, res) => {
  try {
    const { propertyDetails, documents, images, valuation } = req.body;
    
    // Validate required fields
    if (!propertyDetails || !propertyDetails.title || !propertyDetails.address) {
      return res.status(400).json({
        success: false,
        message: 'Property details (title and address) are required'
      });
    }
    
    // Generate unique property ID
    const propertyId = `PROP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    // Get owner with full details
    const owner = await User.findById(req.user._id);
    
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ─── HAVERSINE GEODESIC COORDINATE CONFLICT CHECK ───
    let coordinateConflict = null;
    let conflictDistanceMetres = null;
    const coords = propertyDetails.coordinates;
    if (coords && coords.latitude && coords.longitude) {
      const spatialResult = await checkSpatialConflict(
        coords.latitude,
        coords.longitude,
        { radiusMetres: 100, statuses: ['verified', 'pending', 'needs_review'] }
      );
      if (spatialResult.conflict) {
        coordinateConflict = spatialResult.conflictingProperty;
        conflictDistanceMetres = spatialResult.distanceMetres;
      }
    }

    // ─── DOCUMENT COMPLETENESS CHECK ───
    const requiredDocTypes = ['ownership_deed', 'sale_deed', 'tax_receipt'];
    const uploadedDocTypes = (documents || []).map(d => d.documentType);
    const hasAllDocs = requiredDocTypes.every(t => uploadedDocTypes.includes(t));
    const docCount = (documents || []).length;
    const isDocComplete = hasAllDocs && docCount >= 3;

    // ─── ML FRAUD-RISK CLASSIFICATION ───
    let mlRiskResult = { success: false, risk_label: 'unknown' };
    try {
      mlRiskResult = await mlService.classifyProperty(
        { documents, valuation },
        owner,
        !!coordinateConflict
      );
    } catch (e) {
      console.warn('⚠️  ML risk classification skipped:', e.message);
    }
    
    // Create property hash for blockchain
    const propertyData = {
      propertyId,
      owner: owner._id,
      propertyDetails,
      timestamp: Date.now()
    };
    
    const propertyHash = blockchainService.generatePropertyHash(propertyData);
    
    // Register on blockchain
    const blockchainResult = await blockchainService.registerProperty(propertyData);
    
    if (!blockchainResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to register property on blockchain',
        error: blockchainResult.error
      });
    }

    // ─── DECIDE VERIFICATION STATUS ───
    // Documents complete + no coordinate conflict + ML low risk → auto-verify
    // Otherwise → needs_review (goes to admin dashboard)
    let verificationStatus = 'pending';
    let verificationNotes = [];
    const mlHighRisk = mlRiskResult.success && mlRiskResult.risk_label === 'high';

    if (isDocComplete && !coordinateConflict && !mlHighRisk) {
      verificationStatus = 'verified';
      verificationNotes.push('✅ All required documents uploaded');
      verificationNotes.push('✅ No coordinate conflicts found');
      verificationNotes.push('✅ Auto-verified at registration');
    } else {
      verificationStatus = 'needs_review';
      if (!isDocComplete) {
        const missing = requiredDocTypes.filter(t => !uploadedDocTypes.includes(t));
        verificationNotes.push(`⚠️ Missing documents: ${missing.join(', ')}`);
      }
      if (coordinateConflict) {
        verificationNotes.push(`🚨 Coordinate conflict: Another property "${coordinateConflict.propertyDetails?.title || coordinateConflict.propertyId}" exists ${conflictDistanceMetres ? conflictDistanceMetres + 'm' : '< 100m'} away (owned by ${coordinateConflict.owner?.name || 'Unknown'})`);
      }
      if (mlHighRisk) {
        verificationNotes.push(`🤖 ML fraud risk: ${mlRiskResult.risk_label} (probability: ${(mlRiskResult.fraud_probability * 100).toFixed(1)}%)`);
      }
      verificationNotes.push('📋 Sent to admin dashboard for manual review');
    }

    // Add ML classification result to notes regardless
    if (mlRiskResult.success) {
      verificationNotes.push(`🤖 ML classification: ${mlRiskResult.risk_label} risk (${(mlRiskResult.fraud_probability * 100).toFixed(1)}% fraud probability, model: ${mlRiskResult.model_version})`);
    }
    
    // Create property in database
    const property = await Property.create({
      propertyId,
      blockchainHash: propertyHash,
      blockchainTransactionId: blockchainResult.transactionHash,
      owner: owner._id,
      propertyDetails,
      documents,
      images,
      valuation,
      verification: {
        status: verificationStatus,
        verifiedAt: verificationStatus === 'verified' ? new Date() : undefined,
        method: verificationStatus === 'verified' ? 'auto' : undefined,
        requestedAt: new Date(),
        notes: verificationNotes,
        autoVerificationNotes: verificationNotes.join('\n'),
        checks: {
          documentHashValid: isDocComplete,
          ownerKycVerified: true,
          duplicateCheck: !coordinateConflict,
          surveyNumberValid: !!(propertyDetails.surveyNumber || propertyDetails.plotNumber),
          geoFenceValid: !!(coords?.latitude && coords?.longitude)
        },
        checkScore: verificationStatus === 'verified' ? 100 : (isDocComplete ? 60 : 40),
        coordinateConflictWith: coordinateConflict ? coordinateConflict.propertyId : undefined
      }
    });

    // 🔔 Send email notification (non-blocking)
    let emailResult = { success: false };
    let smsResult = { success: false };
    
    try {
      if (emailService && typeof emailService.sendPropertyRegistrationEmail === 'function') {
        emailResult = await emailService.sendPropertyRegistrationEmail(owner, property);
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError.message);
    }
    
    // 🔔 Send SMS notification (non-blocking)
    try {
      if (owner.phoneNumber && smsService && typeof smsService.sendPropertyRegistrationSMS === 'function') {
        smsResult = await smsService.sendPropertyRegistrationSMS(owner, property);
        console.log('📱 SMS notification result:', smsResult);
      } else {
        console.log('⚠️ SMS skipped: No phone number or SMS service unavailable');
      }
    } catch (smsError) {
      console.error('SMS notification failed:', smsError.message);
    }

    const statusMessage = verificationStatus === 'verified'
      ? '🎉 Property registered and auto-verified successfully!'
      : '📋 Property registered. Sent to admin for review due to: ' + 
        (!isDocComplete ? 'incomplete documents' : '') + 
        (coordinateConflict ? (isDocComplete ? '' : ' & ') + 'coordinate conflict with existing property' : '');
    
    res.status(201).json({
      success: true,
      message: statusMessage,
      property,
      verification: {
        status: verificationStatus,
        autoVerified: verificationStatus === 'verified',
        notes: verificationNotes,
        coordinateConflict: coordinateConflict ? {
          propertyId: coordinateConflict.propertyId,
          title: coordinateConflict.propertyDetails?.title,
          owner: coordinateConflict.owner?.name
        } : null
      },
      blockchain: {
        transactionHash: blockchainResult.transactionHash,
        propertyHash: propertyHash,
        blockNumber: blockchainResult.blockNumber
      },
      notifications: {
        email: emailResult.success,
        sms: smsResult.success
      }
    });
  } catch (error) {
    console.error('❌ Property registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Property registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all properties (with filters)
exports.getProperties = async (req, res) => {
  try {
    const { status, propertyType, city, state, verificationStatus } = req.query;
    
    let filter = {};
    
    // Apply filters
    if (status) filter.status = status;
    if (propertyType) filter['propertyDetails.propertyType'] = propertyType;
    if (city) filter['propertyDetails.address.city'] = new RegExp(city, 'i'); // Case-insensitive
    if (state) filter['propertyDetails.address.state'] = new RegExp(state, 'i');
    
    // Handle verification status filter
    if (verificationStatus) {
      const statuses = verificationStatus.split(',').map(s => s.trim());
      filter['verification.status'] = { $in: statuses };
    }
    
    // P2P visibility: users see all verified properties + their own
    if (verificationStatus) {
      const statuses = verificationStatus.split(',').map(s => s.trim());
      const hasNonVerified = statuses.some(s => s !== 'verified');
      
      if (hasNonVerified) {
        filter.$or = [
          { 'verification.status': 'verified', isPublic: true },
          { owner: req.user._id, 'verification.status': { $in: statuses } }
        ];
      }
    } else {
      filter.$or = [
        { 'verification.status': 'verified', isPublic: true },
        { owner: req.user._id }
      ];
    }
    
    const properties = await Property.find(filter)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: properties.length,
      properties
    });
  } catch (error) {
    console.error('❌ Error fetching properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get single property by ID
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findOne({ propertyId: req.params.id })
      .populate('owner', 'name email phoneNumber')
      .populate('ownershipHistory.previousOwner', 'name email')
      .populate('ownershipHistory.newOwner', 'name email');
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // P2P access: owner or public verified
    const isOwner = property.owner._id.toString() === req.user._id.toString();
    const isPublicVerified = property.isPublic && property.verification.status === 'verified';
    
    if (!isPublicVerified && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this property'
      });
    }
    
    // Verify blockchain record
    let blockchainVerification = { verified: false };
    try {
      blockchainVerification = await blockchainService.verifyProperty(
        property.blockchainHash,
        property.propertyId
      );
    } catch (error) {
      console.error('Blockchain verification failed:', error.message);
    }
    
    res.status(200).json({
      success: true,
      property,
      blockchainVerification
    });
  } catch (error) {
    console.error('❌ Error fetching property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Auto-verify property (replaces manual inspector verification)
exports.verifyProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const property = await Property.findOne({ propertyId }).populate('owner');
    
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Only property owner can trigger auto-verification
    if (property.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the property owner can trigger verification' });
    }

    if (property.verification.status === 'verified') {
      return res.status(400).json({ success: false, message: 'Property is already verified' });
    }

    // ─── Auto-Verification Checks ───
    const checks = {
      documentHashValid: false,
      ownerKycVerified: false,
      duplicateCheck: false,
      surveyNumberValid: false,
      geoFenceValid: false
    };
    const notes = [];

    // 1. Document hash check
    if (property.documents && property.documents.length > 0) {
      const hasHashes = property.documents.every(d => d.documentHash);
      checks.documentHashValid = hasHashes;
      notes.push(hasHashes ? '✅ Document hashes valid' : '⚠️ Missing document hashes');
    } else {
      notes.push('⚠️ No documents uploaded');
    }

    // 2. Owner KYC check
    const eKYCService = require('../services/eKYCService');
    const owner = await User.findById(property.owner._id);
    const kycLevel = eKYCService.calculateKYCLevel(owner.kycStatus);
    checks.ownerKycVerified = kycLevel === 'standard' || kycLevel === 'full';
    notes.push(checks.ownerKycVerified ? `✅ Owner KYC: ${kycLevel}` : `⚠️ Owner KYC insufficient: ${kycLevel}`);

    // 3. Duplicate survey number check
    if (property.propertyDetails.surveyNumber) {
      const duplicate = await Property.findOne({
        'propertyDetails.surveyNumber': property.propertyDetails.surveyNumber,
        _id: { $ne: property._id },
        'verification.status': 'verified'
      });
      checks.duplicateCheck = !duplicate;
      notes.push(!duplicate ? '✅ No duplicate survey number' : '❌ Duplicate survey number found');
    } else {
      checks.duplicateCheck = true;
      notes.push('⚠️ No survey number to check');
    }

    // 4. Survey number format validation
    checks.surveyNumberValid = !!(property.propertyDetails.surveyNumber || property.propertyDetails.plotNumber);
    notes.push(checks.surveyNumberValid ? '✅ Survey/plot number present' : '⚠️ No survey/plot number');

    // 5. Geo-fence / boundary validation
    checks.geoFenceValid = property.hasValidBoundary() || !!(property.propertyDetails.coordinates?.latitude);
    notes.push(checks.geoFenceValid ? '✅ Geographic data valid' : '⚠️ No geographic data');

    // Calculate score (each check = 20 points)
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const checkScore = (passedChecks / Object.keys(checks).length) * 100;

    // Auto-verify if score >= 60 (3/5 checks pass)
    const autoVerified = checkScore >= 60;
    const status = autoVerified ? 'verified' : 'needs_review';

    // Generate audit hash
    const crypto = require('crypto');
    const auditHash = crypto.createHash('sha256').update(
      JSON.stringify({ propertyId, checks, checkScore, timestamp: new Date().toISOString() })
    ).digest('hex');

    property.verification = {
      status,
      verifiedAt: autoVerified ? Date.now() : undefined,
      method: 'auto',
      rejectionReason: autoVerified ? '' : 'Automated checks did not pass minimum threshold (60%)',
      autoVerificationNotes: notes.join('\n'),
      checks,
      checkScore,
      auditHash
    };
    
    await property.save();

    // 🔔 Send notification
    let emailResult = { success: false };
    try {
      if (emailService && typeof emailService.sendVerificationEmail === 'function') {
        emailResult = await emailService.sendVerificationEmail(property.owner, property, autoVerified, notes.join(', '));
      }
    } catch (e) { console.error('Email notification failed:', e.message); }

    let smsResult = { success: false };
    try {
      if (property.owner.phoneNumber && smsService && typeof smsService.sendVerificationSMS === 'function') {
        smsResult = await smsService.sendVerificationSMS(property.owner, property, autoVerified);
      }
    } catch (e) { console.error('SMS notification failed:', e.message); }
    
    res.status(200).json({
      success: true,
      message: autoVerified 
        ? `Property auto-verified successfully (Score: ${checkScore}%)` 
        : `Property needs review (Score: ${checkScore}%). Some checks did not pass.`,
      property,
      verification: { checks, checkScore, autoVerified, notes, auditHash },
      notifications: { email: emailResult.success, sms: smsResult.success }
    });
  } catch (error) {
    console.error('❌ Auto-verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

// Get user's properties
exports.getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: properties.length,
      properties
    });
  } catch (error) {
    console.error('❌ Error fetching user properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update property details
exports.updateProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const updates = req.body;
    
    const property = await Property.findOne({ propertyId });
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // Check ownership
    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }
    
    // Cannot update verified properties (prevents fraud)
    if (property.verification.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update verified properties. Contact support if changes are needed.'
      });
    }
    
    // Update allowed fields
    if (updates.propertyDetails) {
      property.propertyDetails = { ...property.propertyDetails, ...updates.propertyDetails };
    }
    if (updates.valuation) {
      property.valuation = updates.valuation;
    }
    if (updates.images) {
      property.images = updates.images;
    }
    if (updates.documents) {
      property.documents = updates.documents;
    }
    
    await property.save();
    
    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      property
    });
  } catch (error) {
    console.error('❌ Property update error:', error);
    res.status(500).json({
      success: false,
      message: 'Update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get property ownership history
exports.getPropertyHistory = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const property = await Property.findOne({ propertyId })
      .populate('ownershipHistory.previousOwner', 'name email')
      .populate('ownershipHistory.newOwner', 'name email');
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // Get blockchain history
    let blockchainHistory = { history: [] };
    try {
      blockchainHistory = await blockchainService.getPropertyHistory(propertyId);
    } catch (error) {
      console.error('Blockchain history fetch failed:', error.message);
    }
    
    res.status(200).json({
      success: true,
      ownershipHistory: property.ownershipHistory,
      blockchainHistory: blockchainHistory.history
    });
  } catch (error) {
    console.error('❌ Error fetching property history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete property (only if not verified and owner)
exports.deleteProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const property = await Property.findOne({ propertyId });
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // Check ownership
    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }
    
    // Cannot delete verified properties
    if (property.verification.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete verified properties. Contact support.'
      });
    }
    
    await Property.deleteOne({ propertyId });
    
    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('❌ Property deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
