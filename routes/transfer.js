const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { transferValidation, validate } = require('../middleware/security');
const {
  createTransferRequest,
  getTransferRequests,
  ownerApproveTransfer,
  getTransferAuthOptions,
  buyerBiometricVerify,
  sellerBiometricConfirm,
  getTransferById,
  processPayment,
  getPaymentMethods,
  generateUPIQR,
  getAuditTrail,
  verifyAuditChain
} = require('../controllers/transferController');

// All routes require authentication
router.use(protect);

// Create transfer request
router.post('/', transferValidation, validate, createTransferRequest);

// Get transfer requests
router.get('/', getTransferRequests);
router.get('/:requestId', getTransferById);

// Owner approval
router.put('/:requestId/owner-approve', ownerApproveTransfer);

// P2P Biometric verification (replaces government approval)
router.post('/:requestId/auth-options', getTransferAuthOptions);
router.post('/:requestId/buyer-biometric', buyerBiometricVerify);
router.post('/:requestId/seller-confirm', sellerBiometricConfirm);

// Payment processing
router.post('/:requestId/process-payment', processPayment);
router.get('/payment-methods', getPaymentMethods);
router.get('/:requestId/upi-qr', generateUPIQR);

// Audit trail
router.get('/:requestId/audit-trail', getAuditTrail);
router.get('/:requestId/verify-audit', verifyAuditChain);

module.exports = router;
