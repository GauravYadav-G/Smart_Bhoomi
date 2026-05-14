import axios from 'axios';

// Use relative URL in production, hardcoded URL for local development
const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only force logout on auth endpoints (login check / profile)
      // Don't redirect on admin-protected endpoints that regular users can't access
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/') || url.includes('/profile');
      if (isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  toggleBiometricAuth: (data) => api.put('/auth/biometric-auth-toggle', data),
  // Biometric login (2-phase: Password → Biometric)
  verifyBiometric: (data) => api.post('/auth/verify-biometric', data),
  completeBiometricLogin: (data) => api.post('/auth/complete-biometric-login', data),
  // Biometric fallback (when face/fingerprint fails)
  skipBiometricStep: (data) => api.post('/auth/skip-biometric-step', data),
  verifyBiometricFallback: (data) => api.post('/auth/verify-biometric-fallback', data),
  // Email OTP login
  sendEmailOtp: (data) => api.post('/auth/send-email-otp', data),
  verifyEmailOtp: (data) => api.post('/auth/verify-email-otp', data),
  // Nominee system
  setupNominee: (data) => api.post('/auth/setup-nominee', data),
  activateNominee: (data) => api.post('/auth/activate-nominee', data),
  nomineeLogin: (data) => api.post('/auth/nominee-login', data),
  // Transfer face verification
  verifyTransferFace: (data) => api.post('/auth/verify-transfer-face', data),
  // Biometric re-enrollment
  requestBiometricReEnrollOtp: (data) => api.post('/auth/biometric/re-enroll/request-otp', data),
  verifyBiometricReEnrollOtp: (data) => api.post('/auth/biometric/re-enroll/verify-otp', data),
  completeFaceReEnroll: (data) => api.post('/auth/biometric/re-enroll/face', data),
  completeFingerprintReEnroll: (data) => api.post('/auth/biometric/re-enroll/fingerprint', data),
  getBiometricHistory: () => api.get('/auth/biometric/history')
};

// Property APIs
export const propertyAPI = {
  registerProperty: (data) => api.post('/properties/register', data),
  getAllProperties: (params) => api.get('/properties', { params }),
  getMyProperties: () => api.get('/properties/my-properties'),
  getPropertyById: (id) => api.get(`/properties/${id}`),
  updateProperty: (id, data) => api.put(`/properties/${id}`, data),
  verifyProperty: (id, data) => api.put(`/properties/${id}/verify`, data),
  getPropertyHistory: (id) => api.get(`/properties/${id}/history`),
  checkConflict: (lat, lng) => api.get(`/properties/check-conflict?lat=${lat}&lng=${lng}`),
  getAllWithCoords: () => api.get('/properties/all-with-coords'),
  uploadImage: (propertyId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/properties/${propertyId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// IPFS Document APIs
export const documentAPI = {
  uploadDocument: (propertyId, file, documentType, onProgress) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    return api.post(`/documents/upload/${propertyId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min timeout for large files
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },
  retrieveDocument: (propertyId, docType) =>
    api.get(`/documents/retrieve/${propertyId}/${docType}`, { responseType: 'blob' }),
  verifyDocuments: (propertyId) =>
    api.get(`/documents/verify/${propertyId}`),
  getStats: () => api.get('/documents/stats'),
  retryPending: () => api.post('/documents/retry-pending'),
  batchVerify: () => api.post('/documents/batch-verify'),
};

// Transfer APIs
export const transferAPI = {
  createTransfer: (data) => api.post('/transfers', data),
  getAllTransfers: () => api.get('/transfers'),
  getTransferById: (id) => api.get(`/transfers/${id}`),
  ownerApprove: (id, data) => api.put(`/transfers/${id}/owner-approve`, data),
  getAuthOptions: (id) => api.post(`/transfers/${id}/auth-options`),
  buyerBiometric: (id, data) => api.post(`/transfers/${id}/buyer-biometric`, data),
  sellerConfirm: (id, data) => api.post(`/transfers/${id}/seller-confirm`, data),
  processPayment: (id, data) => api.post(`/transfers/${id}/process-payment`, data),
  getAuditTrail: (id) => api.get(`/transfers/${id}/audit-trail`),
  verifyAuditChain: (id) => api.get(`/transfers/${id}/verify-audit`)
};

// KYC & Biometric APIs
export const kycAPI = {
  getStatus: () => api.get('/kyc/status'),
  getKYCStatus: () => api.get('/kyc/status'),
  requestAadhaarOTP: (data) => api.post('/kyc/aadhaar/request-otp', data),
  verifyAadhaar: (data) => api.post('/kyc/aadhaar/verify', data),
  verifyPAN: (data) => api.post('/kyc/pan/verify', data),
  biometricRegisterOptions: () => api.post('/kyc/biometric/register-options'),
  biometricRegisterVerify: (data) => api.post('/kyc/biometric/register-verify', data),
  faceLivenessChallenge: () => api.post('/kyc/face/challenge'),
  faceLivenessVerify: (data) => api.post('/kyc/face/verify', data)
};

// Intelligence APIs
export const intelligenceAPI = {
  getSystemAnalytics: () => api.get('/intelligence/analytics'),
  getRiskAlerts: () => api.get('/intelligence/risk-alerts'),
  getWorkflowSuggestions: () => api.get('/intelligence/suggestions'),
  getPriorityTasks: () => api.get('/intelligence/priority-tasks'),
  getPropertyRiskScore: (propertyId) => api.get(`/intelligence/risk-score/${propertyId}`),
  predictApprovalTime: (propertyId) => api.get(`/intelligence/predict-approval/${propertyId}`),
  investigateAlert: (alertType, entityId) => api.get(`/intelligence/investigate/${alertType}/${entityId}`),
  getPropertyAnalysis: (propertyId) => api.get(`/intelligence/property-analysis/${propertyId}`)
};

// Blockchain APIs — Sovereign Chain
export const blockchainAPI = {
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

// Announcements API — Public announcements from admin
export const announcementAPI = {
  getPublicAnnouncements: () => api.get('/admin/public-announcements'),
};

export default api;
