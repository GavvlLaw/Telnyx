const mongoose = require('mongoose');

const smsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telnyxMessageId: {
    type: String,
    required: true,
    unique: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'received'],
    default: 'sent'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: {
    type: Date
  },
  mediaUrls: {
    type: [String],
    default: []
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
});

// Index for faster queries
smsSchema.index({ userId: 1, sentAt: -1 });
smsSchema.index({ telnyxMessageId: 1 });

module.exports = mongoose.model('SMS', smsSchema); 