const Notification = require('../models/Notification');
const emailService = require('../utils/emailService');
const smsService = require('../services/SMSService');

// Get user's notifications
exports.getMyNotifications = async (req, res) => {
  try {
    const { type, category, status } = req.query;
    
    let filter = { user: req.user._id };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const byType = await Notification.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        byStatus: stats,
        byType: byType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Resend notification
exports.resendNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId)
      .populate('user');
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    if (notification.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    let result;
    
    if (notification.type === 'email') {
      result = await emailService.sendEmail(
        notification.recipient,
        notification.subject,
        notification.message,
        notification.message
      );
    } else if (notification.type === 'sms') {
      result = await smsService.sendSMS(
        notification.recipient,
        notification.message
      );
    }
    
    if (result.success) {
      notification.status = 'sent';
      notification.sentAt = Date.now();
      notification.retryCount += 1;
      notification.messageId = result.messageId;
      await notification.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification resent successfully',
      notification,
      deliveryStatus: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend notification',
      error: error.message
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    notification.status = 'delivered';
    notification.deliveredAt = Date.now();
    await notification.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
};
