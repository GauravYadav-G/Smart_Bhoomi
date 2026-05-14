const express = require('express');
const router = express.Router();
const { protectDual } = require('../middleware/adminAuth');
const {
  getSystemAnalytics,
  getRiskAlerts,
  getWorkflowSuggestions,
  getPriorityTasks,
  getPropertyRiskScore,
  predictApprovalTime,
  investigateAlert,
  getPropertyAnalysis
} = require('../controllers/intelligenceController');

// All routes require authentication — accepts both citizen JWT and admin JWT
router.use(protectDual);

// Intelligence & analytics — accessible to all authenticated users
router.get('/suggestions', getWorkflowSuggestions);
router.get('/predict-approval/:propertyId', predictApprovalTime);
router.get('/risk-score/:propertyId', getPropertyRiskScore);
router.get('/property-analysis/:propertyId', getPropertyAnalysis);
router.get('/analytics', getSystemAnalytics);
router.get('/risk-alerts', getRiskAlerts);
router.get('/priority-tasks', getPriorityTasks);
router.get('/investigate/:alertType/:entityId', investigateAlert);

module.exports = router;
