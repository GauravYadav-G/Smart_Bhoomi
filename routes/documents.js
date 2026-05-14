/**
 * ═══════════════════════════════════════════════════════════════
 * SMARTBHOOMI — Document Routes (IPFS Integration)
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect, authorize } = require('../middleware/auth');
const { protectAdmin, protectDual } = require('../middleware/adminAuth');

const {
  uploadDocument,
  retrieveDocument,
  verifyDocuments,
  getIPFSStats,
  retryPendingUploads,
  batchVerifyIntegrity,
} = require('../controllers/documentController');

// ─── Multer: memory storage (buffer → IPFS, not disk) ──────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.IPFS_MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" not allowed. Accepted: PDF, JPG, PNG.`), false);
    }
  },
});

// ─── Citizen (JWT auth) routes ──────────────────────────────
router.post('/upload/:propertyId', protect, upload.single('document'), uploadDocument);
router.get('/retrieve/:propertyId/:docType', protect, retrieveDocument);
router.get('/verify/:propertyId', protect, verifyDocuments);

// ─── IPFS overview (accessible to both citizens and admins) ───
router.get('/stats', protectDual, getIPFSStats);

// ─── Admin Command Center routes (separate admin JWT) ───────
router.post('/retry-pending', protectAdmin, retryPendingUploads);
router.post('/batch-verify', protectAdmin, batchVerifyIntegrity);

module.exports = router;
