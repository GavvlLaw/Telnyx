const mongoose = require('mongoose');

const voicemailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call'
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  recordingUrl: {
    type: String,
    required: true
  },
  transcription: {
    type: String
  },
  isNew: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
});

// Index for faster queries
voicemailSchema.index({ userId: 1, createdAt: -1 });
voicemailSchema.index({ callId: 1 });

module.exports = mongoose.model('Voicemail', voicemailSchema); 