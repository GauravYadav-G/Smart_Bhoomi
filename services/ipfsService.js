/**
 * ═══════════════════════════════════════════════════════════════
 * SMARTBHOOMI — IPFS Decentralised Document Storage Service
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies (exact versions pinned):
 *   pinata          2.5.5   — Managed IPFS pinning (dev / backup)
 *   kubo-rpc-client 6.1.0   — Private Kubo node RPC (production)
 *   Node.js crypto  built-in — AES-256-GCM encryption
 *
 * IPFS_MODE (env):
 *   "pinata"  → Pinata managed service (development)
 *   "private" → Self-hosted Kubo node  (government production)
 *
 * Every document is:
 *   1. Encrypted with AES-256-GCM  (privacy)
 *   2. Uploaded to IPFS             (decentralisation)
 *   3. Pinned for persistence       (no garbage-collection)
 *   4. CID stored on blockchain     (tamper evidence)
 * ═══════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');
const { Readable } = require('stream');

// ─── ENVIRONMENT DEFAULTS ───────────────────────────────────
const IPFS_MODE           = process.env.IPFS_MODE            || 'private';
const PINATA_JWT          = process.env.PINATA_JWT           || '';
const PINATA_GATEWAY      = process.env.PINATA_GATEWAY_URL   || 'https://gateway.pinata.cloud/ipfs/';
const PRIVATE_NODE_URL    = process.env.IPFS_PRIVATE_NODE_URL || 'http://127.0.0.1:5002';
const ENCRYPTION_SALT     = process.env.IPFS_ENCRYPTION_SALT || 'SmartBhoomi_Gov_Salt_2026_SECURE';
const UPLOAD_TIMEOUT_MS   = parseInt(process.env.IPFS_UPLOAD_TIMEOUT_MS || '30000', 10);
const MAX_FILE_SIZE_BYTES = parseInt(process.env.IPFS_MAX_FILE_SIZE_MB  || '50', 10) * 1024 * 1024;
const RETRY_ATTEMPTS      = parseInt(process.env.IPFS_RETRY_ATTEMPTS    || '3', 10);

// ─── LAZY-LOADED CLIENTS (ESM modules imported on first call) ─
let _pinata = null;
let _kubo   = null;

async function getPinataClient() {
  if (_pinata) return _pinata;
  // pinata@2.5.5 is ESM — dynamic import required
  const { PinataSDK } = await import('pinata');
  _pinata = new PinataSDK({
    pinataJwt: PINATA_JWT,
    pinataGateway: PINATA_GATEWAY.replace('https://', '').replace('/ipfs/', ''),
  });
  return _pinata;
}

async function getKuboClient() {
  if (_kubo) return _kubo;
  // kubo-rpc-client@6.1.0 is ESM
  const { create } = await import('kubo-rpc-client');
  _kubo = create({ url: PRIVATE_NODE_URL, timeout: UPLOAD_TIMEOUT_MS });
  return _kubo;
}

// ═══════════════════════════════════════════════════════════════
// IPFSService class
// ═══════════════════════════════════════════════════════════════

class IPFSService {

  // ─────────────────────────────────────────────────────────
  // METHOD 1: Derive a deterministic AES-256 key via HKDF
  // ─────────────────────────────────────────────────────────
  deriveEncryptionKey(propertyId, ownerId) {
    // HKDF: extract → expand (RFC 5869)
    // ikm  = propertyId + ownerId
    // salt = env IPFS_ENCRYPTION_SALT
    // info = "SmartBhoomi-IPFS-Doc-Encryption"
    const ikm  = Buffer.from(`${propertyId}:${ownerId}`, 'utf8');
    const salt = Buffer.from(ENCRYPTION_SALT, 'utf8');
    const info = Buffer.from('SmartBhoomi-IPFS-Doc-Encryption', 'utf8');
    const keyLength = 32; // 256 bits

    // Extract step — PRK = HMAC-SHA256(salt, ikm)
    const prk = crypto.createHmac('sha256', salt).update(ikm).digest();

    // Expand step — OKM = HMAC-SHA256(PRK, info || 0x01) truncated to 32 bytes
    const okm = crypto.createHmac('sha256', prk)
      .update(Buffer.concat([info, Buffer.from([0x01])]))
      .digest();

    return okm.slice(0, keyLength);
  }

  // ─────────────────────────────────────────────────────────
  // METHOD 2: Encrypt document with AES-256-GCM
  // ─────────────────────────────────────────────────────────
  encryptDocument(fileBuffer, secretKey) {
    if (!Buffer.isBuffer(fileBuffer)) {
      throw new Error('encryptDocument: fileBuffer must be a Buffer');
    }
    if (!Buffer.isBuffer(secretKey) || secretKey.length !== 32) {
      throw new Error('encryptDocument: secretKey must be a 32-byte Buffer');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag(); // 16 bytes

    // Packed format: IV (16) || authTag (16) || ciphertext
    const encryptedBuffer = Buffer.concat([iv, authTag, encrypted]);

    return {
      encryptedBuffer,
      iv:      iv.toString('hex'),
      authTag: authTag.toString('hex'),
      originalSize: fileBuffer.length,
      encryptedSize: encryptedBuffer.length,
    };
  }

  // ─────────────────────────────────────────────────────────
  // METHOD 3: Decrypt document with AES-256-GCM
  // ─────────────────────────────────────────────────────────
  decryptDocument(encryptedBuffer, secretKey) {
    if (!Buffer.isBuffer(encryptedBuffer) || encryptedBuffer.length < 33) {
      throw new Error('decryptDocument: invalid encryptedBuffer');
    }
    if (!Buffer.isBuffer(secretKey) || secretKey.length !== 32) {
      throw new Error('decryptDocument: secretKey must be a 32-byte Buffer');
    }

    // Unpack: IV (16) || authTag (16) || ciphertext
    const iv         = encryptedBuffer.slice(0, 16);
    const authTag    = encryptedBuffer.slice(16, 32);
    const ciphertext = encryptedBuffer.slice(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted;
  }

  // ─────────────────────────────────────────────────────────
  // METHOD 4: Upload encrypted buffer to IPFS with retry
  // ─────────────────────────────────────────────────────────
  async uploadToIPFS(encryptedBuffer, filename, metadata = {}) {
    let lastError;

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        if (IPFS_MODE === 'pinata') {
          return await this._uploadPinata(encryptedBuffer, filename, metadata);
        } else {
          return await this._uploadKubo(encryptedBuffer, filename, metadata);
        }
      } catch (err) {
        lastError = err;
        console.warn(`⚠️  IPFS upload attempt ${attempt}/${RETRY_ATTEMPTS} failed:`, err.message);
        if (attempt < RETRY_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1000 * attempt)); // backoff
        }
      }
    }

    throw new Error(`IPFS upload failed after ${RETRY_ATTEMPTS} attempts: ${lastError.message}`);
  }

  /* ── Pinata upload (dev / backup) ── */
  async _uploadPinata(encryptedBuffer, filename, metadata) {
    const pinata = await getPinataClient();
    const file   = new File([encryptedBuffer], filename, { type: 'application/octet-stream' });

    const result = await pinata.upload.public
      .file(file)
      .name(filename)
      .keyvalues({
        documentType: metadata.documentType || 'unknown',
        propertyId:   metadata.propertyId   || '',
        ownerId:      metadata.ownerId      || '',
        encrypted:    'true',
      });

    return {
      cid:             result.cid,
      size:            result.size || encryptedBuffer.length,
      pinStatus:       'pinned',
      uploadTimestamp: new Date().toISOString(),
      provider:        'pinata',
    };
  }

  /* ── Kubo private node upload (production) ── */
  async _uploadKubo(encryptedBuffer, filename, metadata) {
    const kubo = await getKuboClient();

    // Upload + pin in one call (pin defaults to true in kubo add)
    const result = await kubo.add(encryptedBuffer, {
      pin: true,
      cidVersion: 1,
      timeout: UPLOAD_TIMEOUT_MS,
    });

    return {
      cid:             result.cid.toString(),
      size:            parseInt(result.size, 10) || encryptedBuffer.length,
      pinStatus:       'pinned',
      uploadTimestamp: new Date().toISOString(),
      provider:        'private-kubo',
    };
  }

  // ─────────────────────────────────────────────────────────
  // METHOD 5: Public — upload document (encrypt → IPFS → CID)
  // ─────────────────────────────────────────────────────────
  async uploadDocument(fileBuffer, documentType, propertyId, ownerId) {
    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
    }

    // Step 1 — SHA-256 of original unencrypted file (for blockchain anchoring)
    const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Step 2 — Derive deterministic AES key via HKDF
    const encryptionKey = this.deriveEncryptionKey(propertyId, ownerId);

    // Step 3 — Encrypt
    const { encryptedBuffer, iv, authTag } = this.encryptDocument(fileBuffer, encryptionKey);

    // Step 4 — Upload to IPFS
    const filename = `${propertyId}_${documentType}_${Date.now()}.enc`;
    const ipfsResult = await this.uploadToIPFS(encryptedBuffer, filename, {
      documentType,
      propertyId,
      ownerId,
      uploadTimestamp: new Date().toISOString(),
    });

    return {
      cid:             ipfsResult.cid,
      documentHash,                        // SHA-256 of plaintext
      documentType,
      iv,
      authTag,
      size:            fileBuffer.length,
      encryptedSize:   encryptedBuffer.length,
      pinStatus:       ipfsResult.pinStatus,
      provider:        ipfsResult.provider,
      uploadTimestamp: ipfsResult.uploadTimestamp,
    };
  }

  // ─────────────────────────────────────────────────────────
  // METHOD 6: Retrieve & decrypt document from IPFS
  // ─────────────────────────────────────────────────────────
  async retrieveDocument(cid, propertyId, ownerId) {
    // Step 1 — Derive key (deterministic — same inputs → same key)
    const encryptionKey = this.deriveEncryptionKey(propertyId, ownerId);

    // Step 2 — Fetch encrypted bytes from IPFS
    const encryptedBuffer = await this._fetchFromIPFS(cid);

    // Step 3 — Decrypt
    const decrypted = this.decryptDocument(encryptedBuffer, encryptionKey);

    return decrypted;
  }

  /* ── Fetch raw bytes by CID ── */
  async _fetchFromIPFS(cid) {
    if (IPFS_MODE === 'pinata') {
      return this._fetchPinata(cid);
    } else {
      return this._fetchKubo(cid);
    }
  }

  async _fetchPinata(cid) {
    const pinata = await getPinataClient();
    const response = await pinata.gateways.public.get(cid);

    // response.data may be a Blob, ArrayBuffer, or string depending on SDK version
    if (response.data instanceof ArrayBuffer) {
      return Buffer.from(response.data);
    }
    if (typeof response.data === 'string') {
      return Buffer.from(response.data, 'binary');
    }
    // Blob-like
    if (response.data && typeof response.data.arrayBuffer === 'function') {
      return Buffer.from(await response.data.arrayBuffer());
    }
    // Fallback — response itself may be the data
    if (Buffer.isBuffer(response)) return response;
    if (response instanceof ArrayBuffer) return Buffer.from(response);
    if (typeof response.arrayBuffer === 'function') {
      return Buffer.from(await response.arrayBuffer());
    }

    throw new Error('IPFS Pinata: Unable to parse gateway response');
  }

  async _fetchKubo(cid) {
    const kubo = await getKuboClient();
    const chunks = [];

    for await (const chunk of kubo.cat(cid, { timeout: UPLOAD_TIMEOUT_MS })) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  // ─────────────────────────────────────────────────────────
  // METHOD 7: Verify document integrity via CID comparison
  // ─────────────────────────────────────────────────────────
  async verifyDocumentIntegrity(cid, originalDocumentHash, propertyId, ownerId) {
    try {
      // Retrieve & decrypt
      const decrypted = await this.retrieveDocument(cid, propertyId, ownerId);

      // Re-compute SHA-256 of decrypted content
      const computedHash = crypto.createHash('sha256').update(decrypted).digest('hex');

      const intact = computedHash === originalDocumentHash;

      return {
        intact,
        tamperDetected: !intact,
        expectedHash:   originalDocumentHash,
        computedHash,
        cid,
        verifiedAt:     new Date().toISOString(),
      };
    } catch (err) {
      return {
        intact:         false,
        tamperDetected: true,
        error:          err.message,
        expectedHash:   originalDocumentHash,
        computedHash:   null,
        cid,
        verifiedAt:     new Date().toISOString(),
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  // METHOD 8: IPFS node / pinning service statistics
  // ─────────────────────────────────────────────────────────
  async getIPFSStats() {
    try {
      if (IPFS_MODE === 'pinata') {
        const pinata = await getPinataClient();
        // List pinned files to count
        const files = await pinata.files.public.list();
        const fileList = files.files || files || [];
        const totalFiles = Array.isArray(fileList) ? fileList.length : 0;
        const totalSize  = Array.isArray(fileList)
          ? fileList.reduce((sum, f) => sum + (f.size || 0), 0)
          : 0;

        return {
          connected:  true,
          mode:       'pinata',
          totalFiles,
          totalSizeBytes: totalSize,
          totalSizeMB:    (totalSize / (1024 * 1024)).toFixed(2),
          status:         'connected',
        };
      } else {
        const kubo = await getKuboClient();
        const id   = await kubo.id();
        const pins = [];
        for await (const pin of kubo.pin.ls({ type: 'recursive' })) {
          pins.push(pin);
        }

        return {
          connected:      true,
          mode:           'private-kubo',
          peerId:         id.id.toString(),
          totalFiles:     pins.length,
          totalSizeBytes: 0, // kubo pin.ls doesn't include size; use repo stat below
          totalSizeMB:    '—',
          agentVersion:   id.agentVersion,
          status:         'connected',
        };
      }
    } catch (err) {
      return {
        connected:  false,
        mode:       IPFS_MODE,
        error:      err.message,
        status:     'disconnected',
        totalFiles: 0,
        totalSizeMB: '0',
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  // FALLBACK: Upload to local temp if IPFS fails
  // ─────────────────────────────────────────────────────────
  async uploadWithFallback(fileBuffer, documentType, propertyId, ownerId) {
    try {
      const result = await this.uploadDocument(fileBuffer, documentType, propertyId, ownerId);
      return { ...result, ipfsStatus: 'uploaded' };
    } catch (ipfsErr) {
      console.error('❌ IPFS upload failed, falling back to local temp storage:', ipfsErr.message);

      // Compute SHA-256 even when IPFS fails
      const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Write to local temp directory
      const fs  = require('fs');
      const path = require('path');
      const tempDir = path.join(__dirname, '..', 'uploads', 'ipfs_pending');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempFilename = `${propertyId}_${documentType}_${Date.now()}.pending`;
      const tempPath     = path.join(tempDir, tempFilename);
      fs.writeFileSync(tempPath, fileBuffer);

      return {
        cid:             null,
        documentHash,
        documentType,
        iv:              null,
        authTag:         null,
        size:            fileBuffer.length,
        encryptedSize:   0,
        pinStatus:       'pending_ipfs_upload',
        provider:        'local_fallback',
        uploadTimestamp: new Date().toISOString(),
        ipfsStatus:      'pending_ipfs_upload',
        tempPath,
        ipfsError:       ipfsErr.message,
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  // BACKGROUND: Retry pending IPFS uploads
  // ─────────────────────────────────────────────────────────
  async retryPendingUploads() {
    const fs   = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '..', 'uploads', 'ipfs_pending');
    if (!fs.existsSync(tempDir)) return { retried: 0, succeeded: 0, failed: 0, errors: [] };

    const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.pending'));
    let succeeded = 0, failed = 0;
    const errors = [];

    // Known document types (same list as documentController validation)
    const KNOWN_DOC_TYPES = [
      'ownership_deed', 'sale_deed', 'tax_receipt',
      'survey_document', 'legal_clearance', 'other',
    ];

    for (const file of files) {
      try {
        // Filename format: {propertyId}_{documentType}_{timestamp}.pending
        // propertyId  = e.g. "PROP-1772476424007-3BC1CA06" (hyphens, no underscores)
        // documentType = e.g. "ownership_deed" (may contain underscores!)
        // timestamp   = purely numeric e.g. "1772476432262"
        //
        // Strategy: strip ".pending", strip the trailing _timestamp (numeric),
        // then match a known documentType suffix from the remainder.
        const base = file.replace('.pending', '');

        // 1) Strip trailing _<timestamp>  (last segment is always numeric)
        const lastUnderscore = base.lastIndexOf('_');
        if (lastUnderscore === -1) {
          errors.push({ file, error: 'Cannot parse filename — no underscore found' });
          failed++;
          continue;
        }
        const withoutTimestamp = base.substring(0, lastUnderscore);

        // 2) Match known document type at the end of withoutTimestamp
        let propertyId = null;
        let documentType = null;
        for (const dt of KNOWN_DOC_TYPES) {
          const suffix = '_' + dt;
          if (withoutTimestamp.endsWith(suffix)) {
            propertyId   = withoutTimestamp.substring(0, withoutTimestamp.length - suffix.length);
            documentType = dt;
            break;
          }
        }

        if (!propertyId || !documentType) {
          // Fallback: assume documentType is single word (no underscore)
          const fallbackIdx = withoutTimestamp.lastIndexOf('_');
          if (fallbackIdx === -1) {
            errors.push({ file, error: 'Cannot parse filename — unable to extract document type' });
            failed++;
            continue;
          }
          propertyId   = withoutTimestamp.substring(0, fallbackIdx);
          documentType = withoutTimestamp.substring(fallbackIdx + 1);
        }
        const filePath     = path.join(tempDir, file);
        const fileBuffer   = fs.readFileSync(filePath);

        // Need ownerId — look up from DB
        const Property = require('../models/Property');
        const prop = await Property.findOne({ propertyId }).select('owner');
        if (!prop) { 
          errors.push({ file, error: `Property ${propertyId} not found in DB` });
          failed++; 
          continue; 
        }

        const result = await this.uploadDocument(fileBuffer, documentType, propertyId, prop.owner.toString());

        // Update the property document with the real CID
        await Property.updateOne(
          { propertyId, 'documents.documentType': documentType, 'documents.ipfsStatus': { $in: ['pending_ipfs_upload', null, undefined] } },
          {
            $set: {
              'documents.$.ipfsCID': result.cid,
              'documents.$.ipfsIV': result.iv,
              'documents.$.ipfsAuthTag': result.authTag,
              'documents.$.documentHash': result.documentHash,
              'documents.$.ipfsStatus': 'uploaded',
              'documents.$.ipfsProvider': result.provider,
              'documents.$.ipfsIntegrityStatus': 'intact',
              'documents.$.ipfsUploadedAt': new Date(),
            },
          }
        );

        // Clean up temp file
        fs.unlinkSync(filePath);
        succeeded++;
        console.log(`✅ IPFS retry succeeded for ${file} → CID: ${result.cid}`);
      } catch (err) {
        console.error(`❌ Retry failed for ${file}:`, err.message);
        errors.push({ file, error: err.message });
        failed++;
      }
    }

    return { retried: files.length, succeeded, failed, errors };
  }
}

module.exports = new IPFSService();
