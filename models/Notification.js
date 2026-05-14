const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'sms'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'registration',
      'property_registered',
      'property_auto_verified',
      'property_rejected',
      'transfer_request',
      'transfer_approved',
      'transfer_completed',
      'payment_received',
      'payment_failed',
      'kyc_verified',
      'kyc_failed',
      'biometric_verified',
      'biometric_failed',
      'biometric_challenge',
      'seller_confirmation_required',
      'transfer_disputed',
      'audit_alert'
    ],
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  subject: String,
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    default: 'pending'
  },
  messageId: String,
  errorMessage: String,
  metadata: {
    propertyId: String,
    transferRequestId: String,
    paymentId: String
  },
  sentAt: Date,
  deliveredAt: Date,
  retryCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ category: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
