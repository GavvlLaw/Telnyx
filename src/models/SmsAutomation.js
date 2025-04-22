const mongoose = require('mongoose');

// Schema for condition that triggers an automation
const conditionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'incomingCall', 
      'missedCall', 
      'voicemail', 
      'scheduledTime', 
      'incomingSms', 
      'keywordSms', 
      'availability'
    ],
    required: true
  },
  parameters: {
    // For keyword triggers
    keywords: [String],
    // For scheduled time triggers
    time: String,
    daysOfWeek: [String],
    // For availability-based triggers
    availabilityStatus: {
      type: String,
      enum: ['available', 'unavailable', 'any']
    }
  }
});

// Schema for actions to take when a condition is met
const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['sendSms', 'notify', 'tag', 'addToGroup'],
    required: true
  },
  parameters: {
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmsTemplate'
    },
    // Custom message when not using a template
    message: String,
    // For delayed actions
    delay: {
      value: Number,
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days'],
        default: 'minutes'
      }
    },
    // For notification actions
    notifyMethod: {
      type: String,
      enum: ['email', 'app', 'sms']
    },
    notifyUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
});

// Main schema for SMS automations
const smsAutomationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  conditions: [conditionSchema],
  actions: [actionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // For metrics and debugging
  statistics: {
    timesTriggered: {
      type: Number,
      default: 0
    },
    lastTriggered: Date,
    successCount: {
      type: Number,
      default: 0
    },
    errorCount: {
      type: Number,
      default: 0
    }
  }
});

// Update the updatedAt field before saving
smsAutomationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SmsAutomation = mongoose.model('SmsAutomation', smsAutomationSchema);

module.exports = SmsAutomation; 