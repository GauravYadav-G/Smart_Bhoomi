/**
 * Platform Service Layer
 * National Digital Land Infrastructure - Service Abstraction
 * Sovereign Blockchain Powered — Bharat Land Chain
 */

import api from './api';

/**
 * Platform Configuration Service
 */
export const platformConfig = {
  features: {
    aiPredictions: true,
    fraudDetection: true,
    blockchainTransparency: true,
    advancedAnalytics: true,
    automatedWorkflows: true,
    multiStateSupport: false,
    internationalSupport: false
  },

  // Sovereign Blockchain Configuration
  blockchain: {
    network: 'bharat-land-chain',
    chainId: 'BHARAT-LAND-CHAIN-001',
    consensus: 'PoA-PBFT',
    sovereign: true
  },

  region: {
    currentState: 'MAHARASHTRA',
    supportedStates: ['MAHARASHTRA', 'KARNATAKA', 'DELHI', 'GUJARAT'],
    multiStateEnabled: false
  },

  thresholds: {
    highValueProperty: 10000000,
    suspiciousActivityScore: 75,
    approvalTimeWarning: 72,
    duplicateMatchThreshold: 0.85
  }
};

/**
 * Blockchain Transparency Service — Sovereign Chain
 */
export const blockchainService = {
  getNetworkStatus: () => api.get('/blockchain/network-status'),
  getRecentBlocks: (limit = 10) => api.get(`/blockchain/recent-blocks?limit=${limit}`),
  getRecentTransactions: (limit = 20) => api.get(`/blockchain/recent-transactions?limit=${limit}`),
  getTransaction: (hash) => api.get(`/blockchain/transaction/${hash}`),
  getBlock: (index) => api.get(`/blockchain/block/${index}`),
  getExplorerData: (page = 1, limit = 10) => api.get(`/blockchain/explorer?page=${page}&limit=${limit}`),
  verifyProperty: (propertyId) => api.get(`/blockchain/verify-property/${propertyId}`),
  getChainIntegrity: () => api.get('/blockchain/integrity'),
  getValidators: () => api.get('/blockchain/validators')
};

/**
 * Intelligence Service
 */
export const intelligenceService = {
  getSystemAnalytics: () => api.get('/intelligence/analytics'),
  getRiskAlerts: () => api.get('/intelligence/risk-alerts'),
  getWorkflowSuggestions: () => api.get('/intelligence/suggestions'),
  getPriorityTasks: () => api.get('/intelligence/priority-tasks'),
  getRiskScore: (propertyId) => api.get(`/intelligence/risk-score/${propertyId}`),
  predictApprovalTime: (propertyId) => api.get(`/intelligence/predict-approval/${propertyId}`),
  investigateAlert: (alertType, entityId) => api.get(`/intelligence/investigate/${alertType}/${entityId}`)
};

/**
 * Governance Service
 */
export const governanceService = {
  getComplianceStatus: () => api.get('/governance/compliance-status'),
  getAuditTrail: (entityType, entityId, options = {}) => 
    api.get(`/governance/audit-trail/${entityType}/${entityId}`, { params: options }),
  getTrustMetrics: () => api.get('/governance/trust-metrics')
};

/**
 * Performance Service
 */
export const performanceService = {
  getSystemLoad: () => api.get('/performance/system-load'),
  getQueueStatus: () => api.get('/performance/queue-status')
};

export default {
  platformConfig,
  blockchainService,
  intelligenceService,
  governanceService,
  performanceService
};
