const TransferRequest = require('../models/TransferRequest');
const Property = require('../models/Property');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const blockchainService = require('../blockchain/BlockchainService');
const emailService = require('../utils/emailService');
const smsService = require('../services/SMSService');
const paymentService = require('../utils/paymentService');
const biometricService = require('../services/BiometricService');
const eKYCService = require('../services/eKYCService');
const auditService = require('../services/AuditService');
const crypto = require('crypto');

// Helper function to save notification
const saveNotification = async (userId, type, category, recipient, message, subject = null) => {
  try {
    await Notification.create({
      user: userId,
      type,
      category,
      recipient,
      subject,
      message,
      status: 'sent'
    });
  } catch (error) {
    console.error('Failed to save notification:', error);
  }
};

// ──────────────────────────────────────────────────────────
// P2P TRANSFER FLOW:
//   1. Buyer creates request          → 'pending'
//   2. Owner approves                  → 'owner_approved'
//   3. Buyer biometric + KYC verify    → 'buyer_biometric_verified'
//   4. Payment                         → 'payment_completed'
//   5. Seller biometric confirmation   → 'seller_biometric_confirmed'
//   6. Auto-execute (blockchain + ownership) → 'completed'
// ──────────────────────────────────────────────────────────

// Create transfer request
exports.createTransferRequest = async (req, res) => {
  try {
    const { propertyId, proposedPrice } = req.body;
    const buyerId = req.user._id;

    const property = await Property.findOne({ propertyId }).populate('owner');
    
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.owner._id.toString() === buyerId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot request transfer of your own property' });
    }

    if (property.verification.status !== 'verified') {
      return res.status(400).json({ success: false, message: 'Property must be verified before transfer' });
    }

    // Check buyer KYC eligibility
    const buyer = await User.findById(buyerId);
    const kycCheck = eKYCService.checkTransferEligibility(buyer);
    if (!kycCheck.eligible) {
      return res.status(400).json({ success: false, message: kycCheck.reason, kycLevel: kycCheck.level });
    }

    const requestId = `TR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const transferRequest = await TransferRequest.create({
      requestId,
      property: property._id,
      currentOwner: property.owner._id,
      buyer: buyerId,
      proposedPrice,
      status: 'pending'
    });

    // 📝 Audit: Transfer initiated
    await auditService.logTransferInitiated(requestId, buyerId, {
      propertyId: property.propertyId,
      proposedPrice,
      currentOwner: property.owner._id.toString()
    });

    // Send notifications
    const emailResult = await emailService.sendTransferRequestEmail(property.owner, buyer, property, transferRequest);
    const smsResult = await smsService.sendTransferRequestSMS(property.owner, buyer, property, transferRequest);

    if (emailResult.success) {
      await saveNotification(property.owner._id, 'email', 'transfer_request', property.owner.email, `New transfer request for property ${property.propertyId}`, 'New Property Transfer Request');
    }
    if (smsResult.success) {
      await saveNotification(property.owner._id, 'sms', 'transfer_request', property.owner.phoneNumber, `Transfer request for ${property.propertyDetails.title}`);
    }

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully. Owner has been notified.',
      transferRequest,
      notifications: { email: emailResult, sms: smsResult }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create transfer request', error: error.message });
  }
};

// Get all transfer requests (P2P — only parties involved)
exports.getTransferRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // P2P: Users only see their own transfers (no government override)
    const filter = {
      $or: [
        { currentOwner: userId },
        { buyer: userId }
      ]
    };

    const transfers = await TransferRequest.find(filter)
      .populate('property')
      .populate('currentOwner', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash')
      .populate('buyer', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: transfers.length, transfers });
  } catch (error) {
    console.error('❌ Error fetching transfer requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transfer requests', error: error.message });
  }
};

// Get single transfer by ID
exports.getTransferById = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const transfer = await TransferRequest.findOne({ requestId })
      .populate('property')
      .populate('currentOwner', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash')
      .populate('buyer', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash');

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer request not found' });
    }

    // Get audit trail
    let auditTrail = null;
    try {
      auditTrail = await auditService.getAuditTrail(requestId);
    } catch (e) {
      console.error('Audit trail fetch failed:', e.message);
    }

    res.status(200).json({ success: true, transfer, auditTrail });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transfer request', error: error.message });
  }
};

// Owner approve/reject transfer
exports.ownerApproveTransfer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approved, rejectionReason, paymentReceived } = req.body;

    const transfer = await TransferRequest.findOne({ requestId })
      .populate('property')
      .populate('currentOwner', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash')
      .populate('buyer', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash');

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer request not found' });
    }

    if (transfer.currentOwner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    transfer.ownerApproval = {
      approved,
      approvedAt: Date.now(),
      rejectionReason: approved ? null : rejectionReason,
      paymentReceived: approved ? paymentReceived : false
    };
    
    if (approved && paymentReceived) {
      transfer.payment = {
        ...transfer.payment,
        status: 'completed',
        method: 'manual',
        paymentDate: Date.now(),
        transactionId: `MANUAL-${Date.now()}`
      };
      transfer.status = 'payment_completed';
    } else {
      transfer.status = approved ? 'owner_approved' : 'owner_rejected';
    }
    
    await transfer.save();

    // 📝 Audit: Owner decision
    if (approved) {
      await auditService.logPropertyLocked(requestId, req.user._id, { propertyId: transfer.property.propertyId });
    } else {
      await auditService.logTransferRejected(requestId, req.user._id, 'owner', { reason: rejectionReason, step: 'owner_approval' });
    }

    if (approved && !paymentReceived) {
      const paymentOrder = await paymentService.createPaymentOrder(transfer, transfer.buyer);
      if (paymentOrder.success) {
        transfer.payment.orderId = paymentOrder.orderId;
        transfer.payment.amount = paymentOrder.amount;
        transfer.payment.currency = paymentOrder.currency;
        transfer.payment.status = 'initiated';
        transfer.status = 'payment_pending';
        await transfer.save();
      }
      await emailService.sendTransferRequestEmail(transfer.buyer, transfer.currentOwner, transfer.property, transfer);
      await smsService.sendTransferApprovalSMS(transfer.buyer, transfer.property, transfer);
    } else if (approved && paymentReceived) {
      await emailService.sendTransferRequestEmail(transfer.buyer, transfer.currentOwner, transfer.property, transfer);
    }

    res.status(200).json({
      success: true,
      message: `Transfer ${approved ? 'approved' : 'rejected'} successfully${paymentReceived ? '. Payment confirmed. Buyer must complete biometric verification next.' : ''}`,
      transfer,
      nextStep: approved ? 'buyer_biometric_verification' : null,
      paymentOrder: (approved && !paymentReceived) ? { orderId: transfer.payment.orderId, amount: transfer.payment.amount, currency: transfer.payment.currency } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process transfer approval', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────
// BIOMETRIC AUTH OPTIONS (get WebAuthn challenge for transfer signing)
// ──────────────────────────────────────────────────────────

exports.getTransferAuthOptions = async (req, res) => {
  try {
    const { requestId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user.biometricCredentials || user.biometricCredentials.length === 0) {
      return res.status(400).json({ success: false, message: 'No biometric credentials enrolled. Complete KYC first.' });
    }

    const options = await biometricService.generateAuthenticationOptions(user, requestId);

    if (options.error) {
      return res.status(400).json({ success: false, message: options.error });
    }

    res.status(200).json({ success: true, options });
  } catch (error) {
    console.error('❌ Auth options error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate auth options', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────
// BUYER BIOMETRIC VERIFICATION (replaces government approve)
// ──────────────────────────────────────────────────────────

exports.buyerBiometricVerify = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { biometricData } = req.body;
    // biometricData = { method: 'fingerprint'|'face'|'both', challengeId, credential, livenessData }

    const transfer = await TransferRequest.findOne({ requestId })
      .populate('property')
      .populate('buyer', 'name email phoneNumber role blockchainId kycStatus biometricCredentials createdAt blockchainVerificationHash');

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer request not found' });
    }

    // Only buyer can do this step
    if (transfer.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the buyer can perform biometric verification' });
    }

    // Must be at owner_approved or later
    if (!['owner_approved', 'payment_pending'].includes(transfer.status)) {
      return res.status(400).json({ success: false, message: `Cannot perform biometric verification at status: ${transfer.status}. Owner must approve first.` });
    }

    // ── Check if user has biometric auth disabled → KYC-only mode ──
    const fullUser = await User.findById(req.user._id);
    const biometricDisabled = fullUser.biometricAuthEnabled === false;

    // Check buyer KYC — use relaxed check (Aadhaar + PAN only) when biometric disabled
    const kycCheck = biometricDisabled
      ? eKYCService.checkTransferEligibilityKycOnly(req.user)
      : eKYCService.checkTransferEligibility(req.user);
    if (!kycCheck.eligible) {
      return res.status(400).json({ success: false, message: kycCheck.reason, kycLevel: kycCheck.level });
    }

    let biometricResult;

    if (biometricDisabled) {
      // Biometric auth disabled — KYC verification only (no fingerprint/face required)
      console.log(`🔓 Buyer ${req.user._id} has biometric auth disabled — KYC-only transfer verification`);

      await auditService.logBiometricChallenge(requestId, req.user._id, 'buyer', {
        method: 'kyc_only',
        biometricDisabled: true
      });

      biometricResult = {
        verified: true,
        method: 'kyc_only',
        biometricScore: 100,
        livenessScore: 100,
        challengeId: `kyc_only_${Date.now()}`
      };
    } else {
      // 📝 Audit: Biometric challenge issued
      await auditService.logBiometricChallenge(requestId, req.user._id, 'buyer', {
        method: biometricData?.method || 'fingerprint',
        challengeId: biometricData?.challengeId
      });

      // Verify biometrics
      biometricResult = await biometricService.verifyForTransfer(
        req.user, biometricData || {}, requestId
      );

      if (!biometricResult.verified) {
        await saveNotification(req.user._id, 'email', 'biometric_failed', req.user.email, 'Biometric verification failed for transfer ' + requestId);
        return res.status(400).json({
          success: false,
          message: 'Biometric verification failed: ' + (biometricResult.error || 'Unknown error'),
          biometricScore: biometricResult.biometricScore,
          livenessScore: biometricResult.livenessScore
        });
      }
    }

    // Update transfer with buyer biometric data
    transfer.buyerBiometric = {
      verified: true,
      method: biometricResult.method,
      biometricScore: biometricResult.biometricScore,
      livenessScore: biometricResult.livenessScore,
      challengeId: biometricResult.challengeId,
      kycVerified: true,
      kycReferenceId: kycCheck.level,
      biometricDisabled: biometricDisabled,
      verifiedAt: new Date()
    };
    transfer.status = 'buyer_biometric_verified';
    await transfer.save();

    // 📝 Audit: Buyer biometric verified
    await auditService.logBuyerBiometricVerified(requestId, req.user._id, {
      method: biometricResult.method,
      biometricScore: biometricResult.biometricScore,
      livenessScore: biometricResult.livenessScore,
      challengeId: biometricResult.challengeId
    });

    await saveNotification(req.user._id, 'email', 'biometric_verified', req.user.email, 'Biometric verification successful for transfer ' + requestId);

    res.status(200).json({
      success: true,
      message: 'Buyer biometric verification successful. Proceed to payment.',
      transfer,
      nextStep: 'payment',
      biometricScore: biometricResult.biometricScore,
      livenessScore: biometricResult.livenessScore
    });
  } catch (error) {
    console.error('❌ Buyer biometric error:', error);
    res.status(500).json({ success: false, message: 'Biometric verification failed', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────
// SELLER BIOMETRIC CONFIRMATION (final step → auto-execute)
// ──────────────────────────────────────────────────────────

exports.sellerBiometricConfirm = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { biometricData } = req.body;

    const transfer = await TransferRequest.findOne({ requestId })
      .populate('property')
      .populate('currentOwner', 'name email phoneNumber role blockchainId kycStatus biometricCredentials createdAt blockchainVerificationHash')
      .populate('buyer', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash');

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer request not found' });
    }

    // Only seller/owner can confirm
    if (transfer.currentOwner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the property owner can confirm transfer' });
    }

    // Must be at payment_completed
    if (transfer.status !== 'payment_completed') {
      return res.status(400).json({ success: false, message: `Cannot confirm at status: ${transfer.status}. Payment must be completed first.` });
    }

    // ── Check if seller has biometric auth disabled → KYC-only mode ──
    const sellerUser = await User.findById(req.user._id);
    const sellerBiometricDisabled = sellerUser.biometricAuthEnabled === false;

    // Check seller KYC — use relaxed check (Aadhaar + PAN only) when biometric disabled
    const sellerKycCheck = sellerBiometricDisabled
      ? eKYCService.checkTransferEligibilityKycOnly(req.user)
      : eKYCService.checkTransferEligibility(req.user);
    if (!sellerKycCheck.eligible) {
      return res.status(400).json({ success: false, message: sellerKycCheck.reason, kycLevel: sellerKycCheck.level });
    }

    let biometricResult;

    if (sellerBiometricDisabled) {
      // Biometric auth disabled — KYC-only confirmation
      console.log(`🔓 Seller ${req.user._id} has biometric auth disabled — KYC-only transfer confirmation`);

      await auditService.logBiometricChallenge(requestId, req.user._id, 'seller', {
        method: 'kyc_only',
        biometricDisabled: true
      });

      biometricResult = {
        verified: true,
        method: 'kyc_only',
        biometricScore: 100,
        livenessScore: 100,
        challengeId: `kyc_only_${Date.now()}`
      };
    } else {
      // 📝 Audit: Seller biometric challenge
      await auditService.logBiometricChallenge(requestId, req.user._id, 'seller', {
        method: biometricData?.method || 'fingerprint',
        challengeId: biometricData?.challengeId
      });

      // Verify seller biometrics
      biometricResult = await biometricService.verifyForTransfer(
        req.user, biometricData || {}, requestId
      );

      if (!biometricResult.verified) {
        await saveNotification(req.user._id, 'email', 'biometric_failed', req.user.email, 'Seller biometric confirmation failed for transfer ' + requestId);
        return res.status(400).json({
          success: false,
          message: 'Seller biometric confirmation failed: ' + (biometricResult.error || 'Unknown error'),
          biometricScore: biometricResult.biometricScore
        });
      }
    }

    // Update seller biometric
    transfer.sellerBiometric = {
      confirmed: true,
      method: biometricResult.method,
      biometricScore: biometricResult.biometricScore,
      livenessScore: biometricResult.livenessScore,
      challengeId: biometricResult.challengeId,
      biometricDisabled: sellerBiometricDisabled,
      confirmedAt: new Date()
    };
    transfer.status = 'seller_biometric_confirmed';
    await transfer.save();

    // 📝 Audit: Seller biometric confirmed
    await auditService.logSellerBiometricConfirmed(requestId, req.user._id, {
      method: biometricResult.method,
      biometricScore: biometricResult.biometricScore,
      livenessScore: biometricResult.livenessScore,
      challengeId: biometricResult.challengeId
    });

    // ──────────────────────────────────────────────────────
    // AUTO-EXECUTE: Atomic ownership transfer
    // Both parties verified → execute on blockchain
    // ──────────────────────────────────────────────────────
    
    const blockchainResult = await blockchainService.transferOwnership(
      transfer.property.propertyId,
      transfer.currentOwner.email,
      transfer.buyer.email,
      {
        proposedPrice: transfer.proposedPrice,
        requestId: transfer.requestId,
        transactionId: transfer.payment.transactionId,
        buyerBiometricScore: transfer.buyerBiometric.biometricScore,
        sellerBiometricScore: transfer.sellerBiometric.biometricScore
      }
    );

    if (blockchainResult.success) {
      transfer.blockchainTransactionHash = blockchainResult.transactionHash;
      transfer.status = 'completed';

      // Update property ownership
      const property = await Property.findById(transfer.property._id);
      property.ownershipHistory.push({
        previousOwner: transfer.currentOwner._id,
        newOwner: transfer.buyer._id,
        transferDate: Date.now(),
        transferHash: blockchainResult.transferHash,
        transferPrice: transfer.proposedPrice,
        transactionId: transfer.payment.transactionId
      });
      property.owner = transfer.buyer._id;
      property.status = 'active';
      await property.save();

      // Update audit chain head
      const completionAudit = await auditService.logOwnershipTransferred(requestId, req.user._id, {
        propertyId: property.propertyId,
        blockchainHash: blockchainResult.transactionHash,
        previousOwner: transfer.currentOwner._id.toString(),
        newOwner: transfer.buyer._id.toString(),
        transferPrice: transfer.proposedPrice
      });
      
      await auditService.logBlockchainRecorded(requestId, req.user._id, {
        blockchainHash: blockchainResult.transactionHash,
        transactionId: blockchainResult.transactionHash
      });

      await auditService.logTransferCompleted(requestId, req.user._id, { propertyId: property.propertyId });

      transfer.auditChainHead = completionAudit.hash;
      transfer.auditEntryCount = (await AuditLog.countDocuments({ transferId: requestId }));
      await transfer.save();

      // Send completion notifications to both parties
      try {
        await emailService.sendTransferCompletionEmail(transfer.buyer, property, transfer, { paymentId: transfer.payment.transactionId });
        await emailService.sendTransferCompletionEmail(transfer.currentOwner, property, transfer, { paymentId: transfer.payment.transactionId });
        await smsService.sendTransferCompletionSMS(transfer.buyer, property, transfer);
        await smsService.sendTransferCompletionSMS(transfer.currentOwner, property, transfer);
      } catch (notifErr) {
        console.error('Completion notification error:', notifErr.message);
      }

      await saveNotification(transfer.buyer._id, 'email', 'transfer_completed', transfer.buyer.email, `Property ${property.propertyId} transfer completed!`);
      await saveNotification(transfer.currentOwner._id, 'email', 'transfer_completed', transfer.currentOwner.email, `Property ${property.propertyId} has been transferred.`);
    }

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully! Ownership recorded on blockchain.',
      transfer,
      blockchain: {
        transactionHash: blockchainResult.transactionHash,
        success: blockchainResult.success
      },
      auditEntries: transfer.auditEntryCount
    });
  } catch (error) {
    console.error('❌ Seller confirmation / auto-execute error:', error);
    res.status(500).json({ success: false, message: 'Transfer execution failed', error: error.message });
  }
};

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { paymentId, orderId, signature, method, amount, simulated } = req.body;

    console.log('📥 Processing payment for transfer:', requestId);

    const transfer = await TransferRequest.findOne({ requestId })
      .populate('property')
      .populate('buyer', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash')
      .populate('currentOwner', 'name email phoneNumber role blockchainId kycStatus createdAt blockchainVerificationHash');

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer request not found' });
    }

    if (transfer.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to make payment for this transfer' });
    }

    // Must have buyer biometric verified first
    if (transfer.status !== 'buyer_biometric_verified' && transfer.status !== 'payment_pending' && transfer.status !== 'owner_approved') {
      return res.status(400).json({ success: false, message: `Payment not allowed at status: ${transfer.status}` });
    }

    // 📝 Audit: Payment initiated
    await auditService.logPaymentInitiated(requestId, req.user._id, {
      amount: amount || transfer.proposedPrice,
      method: method || 'simulated',
      paymentId
    });

    // For simulated/demo payments
    if (simulated || method === 'cash') {
      transfer.payment = {
        ...transfer.payment,
        paymentId,
        orderId: orderId || `order_${Date.now()}`,
        transactionId: paymentId,
        method: method || 'simulated',
        status: 'completed',
        paymentDate: new Date(),
        amount: amount || transfer.proposedPrice
      };
      transfer.status = 'payment_completed';
      await transfer.save();

      // 📝 Audit: Payment completed
      await auditService.logPaymentCompleted(requestId, req.user._id, {
        paymentId,
        amount: amount || transfer.proposedPrice,
        method: method || 'simulated',
        transactionId: paymentId
      });

      try {
        await emailService.sendPaymentConfirmationEmail(transfer.buyer, { transactionId: paymentId, amount: amount || transfer.proposedPrice, method });
      } catch (e) { console.log('⚠️ Email notification failed:', e.message); }

      return res.status(200).json({
        success: true,
        message: 'Payment processed successfully. Seller must now confirm with biometric verification.',
        transfer,
        nextStep: 'seller_biometric_confirmation',
        paymentDetails: { transactionId: paymentId, amount: amount || transfer.proposedPrice, method, status: 'completed' }
      });
    }

    // Real payments (Razorpay)
    const paymentResult = await paymentService.processPayment({ orderId, paymentId, signature, transferRequestId: requestId, amount: amount || transfer.proposedPrice, method });

    if (!paymentResult.success) {
      transfer.payment = transfer.payment || {};
      transfer.payment.status = 'failed';
      await transfer.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    transfer.payment = {
      ...transfer.payment,
      paymentId: paymentResult.transactionId,
      transactionId: paymentResult.transactionId,
      method: paymentResult.method,
      status: 'completed',
      paymentDate: new Date(paymentResult.timestamp)
    };
    transfer.status = 'payment_completed';
    await transfer.save();

    await auditService.logPaymentCompleted(requestId, req.user._id, {
      paymentId: paymentResult.transactionId,
      amount: paymentResult.amount,
      method: paymentResult.method,
      transactionId: paymentResult.transactionId
    });

    await emailService.sendPaymentConfirmationEmail(transfer.buyer, paymentResult);
    await smsService.sendPaymentConfirmationSMS(transfer.buyer, paymentResult);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully. Seller must now confirm with biometric verification.',
      transfer,
      nextStep: 'seller_biometric_confirmation',
      paymentDetails: paymentResult
    });
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed', error: error.message });
  }
};

// Get audit trail for a transfer
exports.getAuditTrail = async (req, res) => {
  try {
    const { requestId } = req.params;
    const auditTrail = await auditService.getAuditTrail(requestId);
    res.status(200).json({ success: true, ...auditTrail });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit trail', error: error.message });
  }
};

// Verify audit chain integrity
exports.verifyAuditChain = async (req, res) => {
  try {
    const { requestId } = req.params;
    const verification = await auditService.verifyChain(requestId);
    res.status(200).json({ success: true, ...verification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify audit chain', error: error.message });
  }
};

// Get payment methods
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = paymentService.getPaymentMethods();
    res.status(200).json({ success: true, methods });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment methods', error: error.message });
  }
};

// Generate UPI QR Code
exports.generateUPIQR = async (req, res) => {
  try {
    const { requestId } = req.params;
    const transfer = await TransferRequest.findOne({ requestId }).populate('property');
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer request not found' });
    }
    const qrResult = await paymentService.generateUPIQRCode(transfer.proposedPrice, requestId, transfer.property.propertyId);
    res.status(200).json({ success: true, ...qrResult });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate UPI QR', error: error.message });
  }
};
