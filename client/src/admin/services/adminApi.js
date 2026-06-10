import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Admin uses separate localStorage key to avoid conflicts with user app
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect on auth-related 401s, not data API failures
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/admin/login') || url.includes('/admin/profile') ||
                          url.includes('/admin/verify-mfa') || url.includes('/admin/biometric-verify') ||
                          url.includes('/admin/dashboard-stats');
      const msg = (error.response?.data?.message || '').toLowerCase();
      const isSessionError = msg.includes('expired') || msg.includes('invalid admin token') ||
                             msg.includes('admin authentication required') || msg.includes('admin not found');

      if (isAuthRoute || isSessionError) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        if (!window.location.pathname.startsWith('/admin/login')) {
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Admin Auth APIs ───
export const adminAuthAPI = {
  login: (data) => adminApi.post('/admin/login', data),
  verifyMFA: (data) => adminApi.post('/admin/verify-mfa', data),
  // Biometric login: phase 'options' → get challenge, phase 'verify' → send credential
  verifyBiometric: (data) => adminApi.post('/admin/biometric-verify', data),
  completeBiometricLogin: (data) => adminApi.post('/admin/complete-biometric-login', data),
  getProfile: () => adminApi.get('/admin/profile'),
};

// ─── Admin KYC APIs ───
export const adminKycAPI = {
  getKyc: () => adminApi.get('/admin/kyc'),
  updateKyc: (data) => adminApi.put('/admin/update-kyc', data),
  // Enrollment: phase 'options' → get WebAuthn options, phase 'verify' → send credential
  enrollFingerprint: (data) => adminApi.post('/admin/enroll-fingerprint', data),
  enrollFace: (data) => adminApi.post('/admin/enroll-face', data),
  updateLoginSecurityMode: (data) => adminApi.put('/admin/login-security-mode', data),
};

// ─── WebAuthn Helpers (uses real system biometric sensor) ───
export const webAuthnHelpers = {
  /**
   * Start WebAuthn registration — triggers real fingerprint/face sensor
   * Uses navigator.credentials.create() which activates Touch ID / Windows Hello / etc.
   */
  startRegistration: async (options) => {
    const { startRegistration } = await import('@simplewebauthn/browser');
    return startRegistration({ optionsJSON: options });
  },

  /**
   * Start WebAuthn authentication — triggers real sensor for login verification
   * Uses navigator.credentials.get()
   */
  startAuthentication: async (options) => {
    const { startAuthentication } = await import('@simplewebauthn/browser');
    return startAuthentication({ optionsJSON: options });
  },

  /**
   * Check if platform authenticator (built-in sensor) is available
   */
  isPlatformAvailable: async () => {
    if (!window.PublicKeyCredential) return false;
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch { return false; }
  }
};

// ─── Admin Dashboard APIs ───
export const adminDashboardAPI = {
  getStats: () => adminApi.get('/admin/dashboard-stats'),
  getHeatmap: () => adminApi.get('/admin/heatmap'),
  getGovProperties: () => adminApi.get('/admin/gov-properties'),
  pinProperty: (data) => adminApi.post('/admin/pin-property', data),
  getPendingProperties: () => adminApi.get('/admin/pending-properties'),
  approveProperty: (propertyId, data) => adminApi.put(`/admin/approve-property/${propertyId}`, data),
  rejectProperty: (propertyId, data) => adminApi.put(`/admin/reject-property/${propertyId}`, data),
  // Property Management
  getAllProperties: (params) => adminApi.get('/admin/all-properties', { params }),
  getPropertyDetails: (propertyId) => adminApi.get(`/admin/property/${propertyId}`),
  deleteProperty: (propertyId, data) => adminApi.delete(`/admin/property/${propertyId}`, { data }),
  changePropertyStatus: (propertyId, data) => adminApi.put(`/admin/property-status/${propertyId}`, data),
  // Authority Quick Actions
  freezeProperty: (propertyId, data) => adminApi.put(`/admin/freeze-property/${propertyId}`, data),
  getAuditTrail: (propertyId) => adminApi.get(`/admin/audit-trail/${propertyId}`),
  resolveDispute: (propertyId, data) => adminApi.put(`/admin/resolve-dispute/${propertyId}`, data),
  generateReport: (propertyId) => adminApi.get(`/admin/generate-report/${propertyId}`),
  flagSuspicious: (propertyId, data) => adminApi.put(`/admin/flag-suspicious/${propertyId}`, data),
  verifyOwner: (userId, data) => adminApi.put(`/admin/verify-owner/${userId}`, data),
  // Admin Management
  createAdmin: (data) => adminApi.post('/admin/create-admin', data),
  getAllAdmins: () => adminApi.get('/admin/all-admins'),
  // Admin Document Upload
  uploadDocument: (propertyId, formData) => adminApi.post(`/admin/upload-document/${propertyId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  retrieveDocument: (propertyId, docIndex) => adminApi.get(`/admin/retrieve-document/${propertyId}/${docIndex}`, {
    responseType: 'blob'
  }),
  getPropertiesMissingDocs: () => adminApi.get('/admin/missing-documents'),
  // Announcements & Guidelines
  createAnnouncement: (data) => adminApi.post('/admin/announcements', data),
  getAnnouncements: () => adminApi.get('/admin/announcements'),
  updateAnnouncement: (id, data) => adminApi.put(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id) => adminApi.delete(`/admin/announcements/${id}`),
};

// ─── Intelligence APIs (uses admin token) ───
export const adminIntelligenceAPI = {
  getSystemAnalytics: () => adminApi.get('/intelligence/analytics'),
  getRiskAlerts: () => adminApi.get('/intelligence/risk-alerts'),
  getWorkflowSuggestions: () => adminApi.get('/intelligence/suggestions'),
  getPriorityTasks: () => adminApi.get('/intelligence/priority-tasks'),
  getPropertyRiskScore: (propertyId) => adminApi.get(`/intelligence/risk-score/${propertyId}`),
  predictApprovalTime: (propertyId) => adminApi.get(`/intelligence/predict-approval/${propertyId}`),
  investigateAlert: (alertType, entityId) => adminApi.get(`/intelligence/investigate/${alertType}/${entityId}`),
  getPropertyAnalysis: (propertyId) => adminApi.get(`/intelligence/property-analysis/${propertyId}`),
};

// ─── Blockchain APIs (uses admin token) ───
export const adminBlockchainAPI = {
  getNetworkStatus: () => adminApi.get('/blockchain/network-status'),
  getRecentBlocks: (limit = 10) => adminApi.get(`/blockchain/recent-blocks?limit=${limit}`),
  getRecentTransactions: (limit = 20) => adminApi.get(`/blockchain/recent-transactions?limit=${limit}`),
  getChainIntegrity: () => adminApi.get('/blockchain/integrity'),
  getValidators: () => adminApi.get('/blockchain/validators'),
  getExplorerData: (page = 1, limit = 10) => adminApi.get(`/blockchain/explorer?page=${page}&limit=${limit}`),
};

// ─── IPFS Document APIs (uses admin token) ───
export const adminDocumentAPI = {
  getStats: () => adminApi.get('/documents/stats'),
  retryPending: () => adminApi.post('/documents/retry-pending'),
  batchVerify: () => adminApi.post('/documents/batch-verify'),
};

export default adminApi;
