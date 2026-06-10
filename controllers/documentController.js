/**
 * ═══════════════════════════════════════════════════════════════
 * SMARTBHOOMI — Document Controller (IPFS Integration)
 * ═══════════════════════════════════════════════════════════════
 *
 * POST   /api/documents/upload/:propertyId   — Upload document to IPFS
 * GET    /api/documents/retrieve/:propertyId/:docType — Retrieve & decrypt
 * GET    /api/documents/verify/:propertyId    — Verify all docs' integrity
 * GET    /api/documents/stats                 — IPFS storage statistics
 * POST   /api/documents/retry-pending         — Retry failed IPFS uploads
 * POST   /api/documents/batch-verify          — Batch integrity check
 * ═══════════════════════════════════════════════════════════════
 */

const Property = require('../models/Property');
const ipfsService = require('../services/ipfsService');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// ─── Allowed MIME types and max file size ───────────────────
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);
const MAX_SIZE = parseInt(process.env.IPFS_MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024;

// ═══════════════════════════════════════════════════════════
// POST /api/documents/upload/:propertyId
// Upload a document to IPFS and link CID to property record
// ═══════════════════════════════════════════════════════════
exports.uploadDocument = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { documentType } = req.body;

    // 1. Validate document type
    const validTypes = ['ownership_deed', 'sale_deed', 'tax_receipt', 'survey_document', 'legal_clearance', 'other'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid documentType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // 2. Validate file from multer
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Send file as multipart form field "document".',
      });
    }

    // 3. Validate MIME type
    if (!ALLOWED_MIMES.has(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type "${req.file.mimetype}" not allowed. Accepted: PDF, JPG, PNG.`,
      });
    }

    // 4. Validate file size
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        message: `File exceeds ${MAX_SIZE / (1024 * 1024)}MB limit.`,
      });
    }

    // 5. Verify property exists and caller is owner or admin
    const property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const isOwner = property.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorised to upload documents for this property' });
    }

    // 6. Upload to IPFS (with local fallback on failure)
    const fileBuffer = req.file.buffer;
    const ownerId    = property.owner._id.toString();

    const ipfsResult = await ipfsService.uploadWithFallback(
      fileBuffer,
      documentType,
      propertyId,
      ownerId,
    );

    // 7. Build document record
    const docRecord = {
      documentType,
      documentName:      req.file.originalname,
      documentPath:      ipfsResult.tempPath || `ipfs://${ipfsResult.cid}`,
      documentHash:      ipfsResult.documentHash,
      ipfsCID:           ipfsResult.cid,
      ipfsIV:            ipfsResult.iv,
      ipfsAuthTag:       ipfsResult.authTag,
      ipfsProvider:      ipfsResult.provider,
      ipfsStatus:        ipfsResult.ipfsStatus || 'uploaded',
      ipfsEncryptedSize: ipfsResult.encryptedSize,
      ipfsUploadedAt:    new Date(),
      ipfsIntegrityStatus: ipfsResult.cid ? 'intact' : 'unverified',
      uploadedAt:        new Date(),
    };

    // 8. Push/Update property.documents array
    const existingDocIdx = property.documents.findIndex(d => d.documentType === documentType);
    if (existingDocIdx !== -1) {
      property.documents[existingDocIdx] = docRecord;
      property.markModified('documents');
    } else {
      property.documents.push(docRecord);
    }
    await property.save();

    // 9. Record CID on blockchain (if CID available)
    let blockchainResult = null;
    if (ipfsResult.cid) {
      try {
        const blockchainService = require('../blockchain/BlockchainService');
        blockchainResult = await blockchainService.recordTransaction({
          type: 'DOCUMENT_UPLOAD',
          data: {
            propertyId,
            documentType,
            ipfsCID: ipfsResult.cid,
            documentHash: ipfsResult.documentHash,
            timestamp: Date.now(),
          },
        });
      } catch (bcErr) {
        console.warn('⚠️  Blockchain CID anchoring failed (non-fatal):', bcErr.message);
      }
    }

    // 10. Audit log (direct AuditLog model — non-fatal)
    try {
      await AuditLog.create({
        transferId: propertyId,
        step: 'document_upload_ipfs',
        actorId: req.user._id,
        actorRole: isAdmin ? 'admin' : 'owner',
        data: {
          documentType,
          cid: ipfsResult.cid,
          provider: ipfsResult.provider,
          ipfsStatus: ipfsResult.ipfsStatus || 'uploaded',
        },
        entryHash: crypto.createHash('sha256')
          .update(`${propertyId}-${documentType}-${ipfsResult.cid || 'pending'}-${Date.now()}`)
          .digest('hex'),
        timestamp: new Date(),
      });
    } catch (_) { /* non-fatal */ }

    res.status(201).json({
      success: true,
      message: ipfsResult.cid
        ? `✅ Document uploaded to IPFS. CID: ${ipfsResult.cid}`
        : '⚠️ Document saved locally — IPFS upload pending retry.',
      document: {
        documentType,
        documentName: req.file.originalname,
        cid:          ipfsResult.cid,
        documentHash: ipfsResult.documentHash,
        size:         ipfsResult.size,
        encryptedSize: ipfsResult.encryptedSize,
        provider:     ipfsResult.provider,
        ipfsStatus:   ipfsResult.ipfsStatus || 'uploaded',
      },
      blockchain: blockchainResult,
    });
  } catch (err) {
    console.error('❌ Document upload error:', err);
    res.status(500).json({ success: false, message: 'Document upload failed', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/documents/retrieve/:propertyId/:docType
// Retrieve & decrypt a document from IPFS
// ═══════════════════════════════════════════════════════════
exports.retrieveDocument = async (req, res) => {
  try {
    const { propertyId, docType } = req.params;

    // 1. Find property & verify access
    const property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const isOwner = property.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorised to access these documents' });
    }

    // 2. Find the specific document
    const doc = property.documents.find(d => d.documentType === docType && d.ipfsCID);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: `No IPFS-stored document of type "${docType}" found for this property`,
      });
    }

    // 3. Retrieve & decrypt from IPFS
    const ownerId = property.owner._id.toString();
    const decryptedBuffer = await ipfsService.retrieveDocument(doc.ipfsCID, propertyId, ownerId);

    // 4. Audit the retrieval
    try {
      await AuditLog.create({
        transferId: propertyId,
        step: 'document_retrieve_ipfs',
        actorId: req.user._id,
        actorRole: isAdmin ? 'admin' : 'owner',
        data: { documentType: docType, cid: doc.ipfsCID },
        entryHash: crypto.createHash('sha256')
          .update(`${propertyId}-retrieve-${doc.ipfsCID}-${Date.now()}`)
          .digest('hex'),
        timestamp: new Date(),
      });
    } catch (_) { /* non-fatal */ }

    // 5. Determine content type
    const ext = (doc.documentName || '').toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext.endsWith('.pdf'))       contentType = 'application/pdf';
    else if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (ext.endsWith('.png'))  contentType = 'image/png';

    // 6. Stream file back
    res.set({
      'Content-Type':        contentType,
      'Content-Disposition': `attachment; filename="${doc.documentName || `${docType}.bin`}"`,
      'Content-Length':      decryptedBuffer.length,
      'X-IPFS-CID':         doc.ipfsCID,
    });
    res.send(decryptedBuffer);
  } catch (err) {
    console.error('❌ Document retrieval error:', err);
    res.status(500).json({ success: false, message: 'Document retrieval failed', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/documents/verify/:propertyId
// Verify integrity of all IPFS documents for a property
// ═══════════════════════════════════════════════════════════
exports.verifyDocuments = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const property = await Property.findOne({ propertyId }).populate('owner', 'name email');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const ownerId = property.owner._id.toString();
    const results = [];

    for (const doc of property.documents) {
      if (!doc.ipfsCID) {
        results.push({
          documentType:    doc.documentType,
          cid:             null,
          status:          'no_ipfs_cid',
          intact:          null,
          tamperDetected:  null,
        });
        continue;
      }

      const verification = await ipfsService.verifyDocumentIntegrity(
        doc.ipfsCID,
        doc.documentHash,
        propertyId,
        ownerId,
      );

      // Update doc integrity status in DB
      doc.ipfsLastVerified     = new Date();
      doc.ipfsIntegrityStatus  = verification.intact ? 'intact' : 'tampered';

      results.push({
        documentType:   doc.documentType,
        documentName:   doc.documentName,
        cid:            doc.ipfsCID,
        status:         verification.intact ? 'intact' : 'TAMPERED',
        intact:         verification.intact,
        tamperDetected: verification.tamperDetected,
        expectedHash:   verification.expectedHash,
        computedHash:   verification.computedHash,
        verifiedAt:     verification.verifiedAt,
      });
    }

    await property.save();

    const tampered = results.filter(r => r.tamperDetected === true).length;

    res.json({
      success: true,
      propertyId,
      totalDocuments:   results.length,
      intactDocuments:  results.filter(r => r.intact === true).length,
      tamperedDocuments: tampered,
      unverified:       results.filter(r => r.intact === null).length,
      overallIntegrity: tampered === 0 ? 'PASS' : 'FAIL',
      results,
    });
  } catch (err) {
    console.error('❌ Document verification error:', err);
    res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/documents/stats
// IPFS storage statistics for Command Center dashboard
// ═══════════════════════════════════════════════════════════
exports.getIPFSStats = async (req, res) => {
  try {
    // Node/pinning service stats
    const serviceStats = await ipfsService.getIPFSStats();

    // Database-level document stats
    const pipeline = await Property.aggregate([
      { $unwind: '$documents' },
      { $match: { 'documents.ipfsCID': { $ne: null } } },
      {
        $group: {
          _id: '$documents.documentType',
          count: { $sum: 1 },
          totalSize: { $sum: '$documents.ipfsEncryptedSize' },
        },
      },
    ]);

    const totalStored = pipeline.reduce((sum, g) => sum + g.count, 0);
    const totalSize   = pipeline.reduce((sum, g) => sum + g.totalSize, 0);

    // Pending uploads
    const pendingCount = await Property.countDocuments({
      'documents.ipfsStatus': 'pending_ipfs_upload',
    });

    // Integrity summary
    const integrityPipeline = await Property.aggregate([
      { $unwind: '$documents' },
      { $match: { 'documents.ipfsCID': { $ne: null } } },
      {
        $group: {
          _id: '$documents.ipfsIntegrityStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const integrityMap = {};
    integrityPipeline.forEach(g => { integrityMap[g._id || 'unverified'] = g.count; });

    res.json({
      success: true,
      ipfsService: serviceStats,
      storage: {
        totalDocumentsOnIPFS: totalStored,
        totalSizeBytes:       totalSize,
        totalSizeMB:          (totalSize / (1024 * 1024)).toFixed(2),
        byDocumentType:       pipeline,
        pendingUploads:       pendingCount,
      },
      integrity: {
        intact:     integrityMap.intact     || 0,
        tampered:   integrityMap.tampered   || 0,
        unverified: integrityMap.unverified || 0,
      },
    });
  } catch (err) {
    console.error('❌ IPFS stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch IPFS stats', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/documents/retry-pending
// Retry all pending IPFS uploads (admin only)
// ═══════════════════════════════════════════════════════════
exports.retryPendingUploads = async (req, res) => {
  try {
    const result = await ipfsService.retryPendingUploads();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ Retry pending uploads error:', err);
    res.status(500).json({ success: false, message: 'Retry failed', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/documents/batch-verify
// Verify integrity of ALL IPFS documents (admin governance)
// ═══════════════════════════════════════════════════════════
exports.batchVerifyIntegrity = async (req, res) => {
  try {
    const properties = await Property.find({
      'documents.ipfsCID': { $ne: null },
    }).populate('owner', '_id');

    let totalChecked = 0, totalIntact = 0, totalTampered = 0, totalErrors = 0;
    const tamperedList = [];

    for (const property of properties) {
      const ownerId = property.owner?._id?.toString();
      if (!ownerId) continue;

      for (const doc of property.documents) {
        if (!doc.ipfsCID) continue;
        totalChecked++;

        try {
          const result = await ipfsService.verifyDocumentIntegrity(
            doc.ipfsCID,
            doc.documentHash,
            property.propertyId,
            ownerId,
          );

          doc.ipfsLastVerified    = new Date();
          doc.ipfsIntegrityStatus = result.intact ? 'intact' : 'tampered';

          if (result.intact) {
            totalIntact++;
          } else {
            totalTampered++;
            tamperedList.push({
              propertyId:   property.propertyId,
              documentType: doc.documentType,
              cid:          doc.ipfsCID,
              expectedHash: result.expectedHash,
              computedHash: result.computedHash,
            });
          }
        } catch (err) {
          totalErrors++;
        }
      }

      await property.save();
    }

    res.json({
      success: true,
      totalChecked,
      totalIntact,
      totalTampered,
      totalErrors,
      tamperedDocuments: tamperedList,
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('❌ Batch verify error:', err);
    res.status(500).json({ success: false, message: 'Batch verification failed', error: err.message });
  }
};
