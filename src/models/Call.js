const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telnyxCallControlId: {
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
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer', 'forwarded', 'voicemail'],
    default: 'initiated'
  },
  duration: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  recordingUrl: {
    type: String
  },
  voicemailUrl: {
    type: String
  },
  notes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
});

// Index for faster queries
callSchema.index({ userId: 1, startTime: -1 });
callSchema.index({ telnyxCallControlId: 1 });

module.exports = mongoose.model('Call', callSchema); 