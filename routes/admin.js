const express = require('express');
const router = express.Router();
const { protectAdmin, requireClearance } = require('../middleware/adminAuth');
const {
  adminLogin,
  verifyAdminMFA,
  getAdminProfile,
  getDashboardStats,
  getHeatmapData,
  getGovernmentProperties,
  pinGovernmentProperty,
  getPendingProperties,
  adminApproveProperty,
  adminRejectProperty,
  getAllProperties,
  getPropertyDetails,
  adminDeleteProperty,
  adminChangePropertyStatus,
  freezeProperty,
  getAuditTrail,
  resolveDispute,
  generateReport,
  flagSuspicious,
  verifyOwner,
  createAdmin,
  getAllAdmins,
  updateAdminKyc,
  getAdminKyc,
  enrollFingerprint,
  enrollFace,
  verifyAdminBiometric,
  completeBiometricLogin,
  updateLoginSecurityMode,
  adminUploadDocument,
  getPropertiesMissingDocs,
  createAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getPublicAnnouncements
} = require('../controllers/adminController');

// ─── Public Admin Auth ───
router.post('/login', adminLogin);
router.post('/verify-mfa', verifyAdminMFA);
router.post('/biometric-verify', verifyAdminBiometric);
router.post('/complete-biometric-login', completeBiometricLogin);

// ─── Protected Admin Routes ───
router.get('/profile', protectAdmin, getAdminProfile);
router.get('/dashboard-stats', protectAdmin, getDashboardStats);
router.get('/heatmap', protectAdmin, getHeatmapData);
router.get('/gov-properties', protectAdmin, getGovernmentProperties);
router.post('/pin-property', protectAdmin, requireClearance(2), pinGovernmentProperty);

// ─── Property Approval Routes ───
router.get('/pending-properties', protectAdmin, getPendingProperties);
router.put('/approve-property/:propertyId', protectAdmin, adminApproveProperty);
router.put('/reject-property/:propertyId', protectAdmin, adminRejectProperty);

// ─── Property Management Routes ───
router.get('/all-properties', protectAdmin, getAllProperties);
router.get('/property/:propertyId', protectAdmin, getPropertyDetails);
router.delete('/property/:propertyId', protectAdmin, requireClearance(2), adminDeleteProperty);
router.put('/property-status/:propertyId', protectAdmin, adminChangePropertyStatus);

// ─── Authority Quick Actions ───
router.put('/freeze-property/:propertyId', protectAdmin, requireClearance(2), freezeProperty);
router.get('/audit-trail/:propertyId', protectAdmin, getAuditTrail);
router.put('/resolve-dispute/:propertyId', protectAdmin, resolveDispute);
router.get('/generate-report/:propertyId', protectAdmin, generateReport);
router.put('/flag-suspicious/:propertyId', protectAdmin, flagSuspicious);
router.put('/verify-owner/:userId', protectAdmin, verifyOwner);

// ─── Admin Management (Super Admin Only) ───
router.post('/create-admin', protectAdmin, requireClearance(5), createAdmin);
router.get('/all-admins', protectAdmin, requireClearance(5), getAllAdmins);

// ─── Admin KYC & Biometric ───
router.get('/kyc', protectAdmin, getAdminKyc);
router.put('/update-kyc', protectAdmin, updateAdminKyc);
router.post('/enroll-fingerprint', protectAdmin, enrollFingerprint);
router.post('/enroll-face', protectAdmin, enrollFace);
router.put('/login-security-mode', protectAdmin, updateLoginSecurityMode);

// ─── Admin Document Upload ───
router.post('/upload-document/:propertyId', protectAdmin, adminUploadDocument);
router.get('/missing-documents', protectAdmin, getPropertiesMissingDocs);

// ─── Announcements & Guidelines ───
router.post('/announcements', protectAdmin, createAnnouncement);
router.get('/announcements', protectAdmin, getAllAnnouncements);
router.put('/announcements/:id', protectAdmin, updateAnnouncement);
router.delete('/announcements/:id', protectAdmin, deleteAnnouncement);

// ─── Public Announcements (no admin auth, uses user auth or public) ───
router.get('/public-announcements', getPublicAnnouncements);

module.exports = router;
