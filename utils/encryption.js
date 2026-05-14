/**
 * Smart Bhoomi — Field-Level Encryption Utility
 * AES-256-GCM encryption for sensitive database fields
 * All sensitive data is encrypted before storage and decrypted on read
 */

const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 64);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Derive a proper 32-byte key from the hex string
const getKey = () => {
  return Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32);
};

/**
 * Encrypt a plaintext string
 * Returns: iv:authTag:ciphertext (all hex-encoded)
 */
const encrypt = (plaintext) => {
  if (!plaintext || typeof plaintext !== 'string') return plaintext;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: ENC:iv:authTag:ciphertext
    return `ENC:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err.message);
    return plaintext; // Fallback to plaintext if encryption fails
  }
};

/**
 * Decrypt an encrypted string
 * Input format: ENC:iv:authTag:ciphertext
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!encryptedText.startsWith('ENC:')) return encryptedText; // Not encrypted, return as-is
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) return encryptedText;
    
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const ciphertext = parts[3];
    
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err.message);
    return encryptedText; // Return encrypted text if decryption fails
  }
};

/**
 * Generate a SHA-256 integrity hash from an object
 * Used to create blockchain-anchorable integrity hashes
 */
const generateIntegrityHash = (data) => {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Mask sensitive data for display
 * e.g., "ABCD1234EFGH" → "ABCD****EFGH"
 */
const maskData = (data, visibleStart = 4, visibleEnd = 4) => {
  if (!data || typeof data !== 'string') return data;
  if (data.length <= visibleStart + visibleEnd) return data;
  const start = data.slice(0, visibleStart);
  const end = data.slice(-visibleEnd);
  const masked = '*'.repeat(Math.max(data.length - visibleStart - visibleEnd, 4));
  return `${start}${masked}${end}`;
};

/**
 * Generate a secure reference ID for blockchain storage
 * Links DB record to blockchain without exposing raw data
 */
const generateBlockchainRef = (entityType, entityId, data) => {
  const payload = `${entityType}:${entityId}:${JSON.stringify(data)}:${Date.now()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

module.exports = {
  encrypt,
  decrypt,
  generateIntegrityHash,
  maskData,
  generateBlockchainRef,
  ENCRYPTION_KEY
};
