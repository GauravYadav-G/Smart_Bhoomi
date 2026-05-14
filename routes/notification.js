const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMyNotifications,
  getNotificationStats,
  resendNotification,
  markAsRead
} = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// Get user's notifications
router.get('/', getMyNotifications);
router.get('/stats', getNotificationStats);

// Resend notification
router.post('/:notificationId/resend', resendNotification);

// Mark as read
router.put('/:notificationId/read', markAsRead);

module.exports = router;
