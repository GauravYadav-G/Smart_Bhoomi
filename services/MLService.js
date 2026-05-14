/**
 * MLService.js
 * ─────────────────────────────────────────────────────────────────────
 * Node.js client for the SmartBhoomi ML fraud-risk classification
 * microservice (Flask server on port 5050).
 *
 * Usage in controllers:
 *   const mlService = require('../services/MLService');
 *   const result = await mlService.classifyProperty(property, owner);
 *   // { fraud_probability, risk_label, confidence, ... }
 *
 * Falls back gracefully if ML server is not running — returns a
 * default "unknown" risk label so the main application is not blocked.
 *
 * @module services/MLService
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:5050';
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS, 10) || 3000;

/**
 * Classify a property registration for fraud risk.
 *
 * @param {Object} property  - Mongoose Property document
 * @param {Object} owner     - Mongoose User document (with kycStatus)
 * @param {boolean} coordConflict - Whether a coordinate conflict was detected
 * @returns {Promise<Object>} ML classification result
 */
async function classifyProperty(property, owner, coordConflict = false) {
  try {
    // Build the payload expected by ml_server.py
    const payload = {
      documents: (property.documents || []).map(d => ({
        documentType: d.documentType
      })),
      kyc_level: _mapKycLevel(owner),
      coord_conflict: coordConflict,
      registration_ts: new Date().toISOString(),
      valuation_inr: property.valuation?.currentValue || 0
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

    const response = await fetch(`${ML_SERVER_URL}/api/ml/classify-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ML server responded with ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      ...result
    };
  } catch (error) {
    // Graceful degradation — don't block registration if ML server is down
    console.warn(`⚠️  ML classification unavailable: ${error.message}`);
    return {
      success: false,
      fraud_probability: null,
      risk_label: 'unknown',
      confidence: null,
      error: error.message,
      model_version: 'unavailable'
    };
  }
}

/**
 * Health check for the ML microservice.
 * @returns {Promise<Object>}
 */
async function healthCheck() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${ML_SERVER_URL}/api/ml/health`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Status ${response.status}`);
    return { available: true, ...(await response.json()) };
  } catch {
    return { available: false };
  }
}

/**
 * Map Mongoose user KYC status to the string expected by the ML model.
 */
function _mapKycLevel(owner) {
  if (!owner || !owner.kycStatus) return 'none';
  const status = owner.kycStatus;
  if (status.aadhaarVerified && status.panVerified && status.biometricVerified) return 'full';
  if (status.aadhaarVerified && status.panVerified) return 'standard';
  if (status.aadhaarVerified || status.panVerified) return 'basic';
  return 'none';
}

module.exports = { classifyProperty, healthCheck };
