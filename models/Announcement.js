const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: [true, 'Announcement message is required'],
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['announcement', 'guideline', 'alert', 'update', 'policy', 'maintenance'],
    default: 'announcement'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  links: [{
    label: { type: String, required: true },
    url: { type: String, required: true }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'property_owners', 'buyers', 'verified_users'],
    default: 'all'
  }
}, {
  timestamps: true
});

announcementSchema.index({ isActive: 1, createdAt: -1 });
announcementSchema.index({ category: 1 });
announcementSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
