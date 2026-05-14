const AuditLog = require('../models/AuditLog');

/**
 * Audit Service — Manages the cryptographic audit chain
 * 
 * Provides convenience methods for logging each transfer step
 * and verifying chain integrity. Every action in the P2P flow
 * is recorded as an immutable, hash-chained entry.
 */
class AuditService {
  
  /**
   * Log transfer initiation
   */
  async logTransferInitiated(transferId, buyerId, data = {}) {
    return AuditLog.appendEntry(transferId, 'transfer_initiated', buyerId, 'buyer', {
      propertyId: data.propertyId,
      proposedPrice: data.proposedPrice,
      metadata: { currentOwner: data.currentOwner }
    });
  }

  /**
   * Log property locked for transfer
   */
  async logPropertyLocked(transferId, ownerId, data = {}) {
    return AuditLog.appendEntry(transferId, 'property_locked', ownerId, 'owner', {
      propertyId: data.propertyId,
      reason: 'Property locked for pending transfer'
    });
  }

  /**
   * Log buyer KYC verification
   */
  async logBuyerKYCVerified(transferId, buyerId, data = {}) {
    return AuditLog.appendEntry(transferId, 'buyer_kyc_verified', buyerId, 'buyer', {
      kycType: data.kycType,
      kycVerified: data.kycVerified,
      kycReferenceId: data.kycReferenceId,
      metadata: { level: data.kycLevel }
    });
  }

  /**
   * Log biometric challenge issued
   */
  async logBiometricChallenge(transferId, userId, role, data = {}) {
    const step = role === 'buyer' ? 'buyer_biometric_challenge' : 'seller_biometric_challenge';
    return AuditLog.appendEntry(transferId, step, userId, role, {
      biometricMethod: data.method,
      challengeId: data.challengeId,
      metadata: { issuedAt: new Date().toISOString() }
    });
  }

  /**
   * Log buyer biometric verification result
   */
  async logBuyerBiometricVerified(transferId, buyerId, data = {}) {
    return AuditLog.appendEntry(transferId, 'buyer_biometric_verified', buyerId, 'buyer', {
      biometricMethod: data.method,
      biometricScore: data.biometricScore,
      livenessScore: data.livenessScore,
      challengeId: data.challengeId
    });
  }

  /**
   * Log seller biometric confirmation result
   */
  async logSellerBiometricConfirmed(transferId, sellerId, data = {}) {
    return AuditLog.appendEntry(transferId, 'seller_biometric_confirmed', sellerId, 'seller', {
      biometricMethod: data.method,
      biometricScore: data.biometricScore,
      livenessScore: data.livenessScore,
      challengeId: data.challengeId
    });
  }

  /**
   * Log payment events
   */
  async logPaymentInitiated(transferId, buyerId, data = {}) {
    return AuditLog.appendEntry(transferId, 'payment_initiated', buyerId, 'buyer', {
      paymentId: data.paymentId,
      paymentAmount: data.amount,
      paymentMethod: data.method
    });
  }

  async logPaymentCompleted(transferId, buyerId, data = {}) {
    return AuditLog.appendEntry(transferId, 'payment_completed', buyerId, 'buyer', {
      paymentId: data.paymentId,
      paymentAmount: data.amount,
      paymentMethod: data.method,
      metadata: { transactionId: data.transactionId }
    });
  }

  /**
   * Log ownership transfer execution
   */
  async logOwnershipTransferred(transferId, actorId, data = {}) {
    return AuditLog.appendEntry(transferId, 'ownership_transferred', actorId, 'system', {
      propertyId: data.propertyId,
      blockchainHash: data.blockchainHash,
      metadata: { 
        previousOwner: data.previousOwner,
        newOwner: data.newOwner,
        transferPrice: data.transferPrice
      }
    });
  }

  /**
   * Log blockchain recording
   */
  async logBlockchainRecorded(transferId, actorId, data = {}) {
    return AuditLog.appendEntry(transferId, 'blockchain_recorded', actorId, 'system', {
      blockchainHash: data.blockchainHash,
      metadata: { transactionId: data.transactionId }
    });
  }

  /**
   * Log transfer completion
   */
  async logTransferCompleted(transferId, actorId, data = {}) {
    return AuditLog.appendEntry(transferId, 'transfer_completed', actorId, 'system', {
      propertyId: data.propertyId,
      metadata: { completedAt: new Date().toISOString() }
    });
  }

  /**
   * Log transfer rejection
   */
  async logTransferRejected(transferId, actorId, role, data = {}) {
    return AuditLog.appendEntry(transferId, 'transfer_rejected', actorId, role, {
      reason: data.reason,
      metadata: { step: data.step }
    });
  }

  /**
   * Log transfer cancellation
   */
  async logTransferCancelled(transferId, actorId, role, data = {}) {
    return AuditLog.appendEntry(transferId, 'transfer_cancelled', actorId, role, {
      reason: data.reason
    });
  }

  /**
   * Log anomaly detection
   */
  async logAnomaly(transferId, actorId, data = {}) {
    return AuditLog.appendEntry(transferId, 'anomaly_detected', actorId, 'system', {
      reason: data.reason,
      metadata: data.metadata
    });
  }

  /**
   * Verify the integrity of a transfer's audit chain
   */
  async verifyChain(transferId) {
    return AuditLog.verifyChain(transferId);
  }

  /**
   * Get full audit trail for a transfer
   */
  async getAuditTrail(transferId) {
    const entries = await AuditLog.find({ transferId })
      .sort({ timestamp: 1 })
      .populate('actorId', 'name email role');
    
    const chainVerification = await this.verifyChain(transferId);

    return {
      transferId,
      entries,
      totalEntries: entries.length,
      chainIntegrity: chainVerification,
      firstEntry: entries[0]?.timestamp,
      lastEntry: entries[entries.length - 1]?.timestamp
    };
  }

  /**
   * Get audit entries for a specific user across all transfers
   */
  async getUserAuditHistory(userId, limit = 50) {
    return AuditLog.find({ actorId: userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('actorId', 'name email role');
  }
}

module.exports = new AuditService();
