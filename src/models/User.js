const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  startTime: {
    type: String,
    default: '09:00' // 9 AM
  },
  endTime: {
    type: String,
    default: '17:00' // 5 PM
  }
});

// Calendar provider schema
const calendarProviderSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['google', 'microsoft', 'apple', 'ical', 'caldav', 'exchange', 'calendly', 'office365'],
    required: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  accessToken: {
    type: String
  },
  refreshToken: {
    type: String
  },
  calendarId: {
    type: String
  },
  icalUrl: {
    type: String
  },
  username: {
    type: String
  },
  password: {
    type: String
  },
  tokenExpiry: {
    type: Date
  },
  apiKey: {
    type: String
  },
  caldavUrl: {
    type: String
  },
  exchangeUrl: {
    type: String
  },
  lastSynced: {
    type: Date
  }
});

// Calendar event schema to store cached events
const calendarEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true
  },
  title: {
    type: String
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  recurrence: {
    type: String
  },
  status: {
    type: String,
    enum: ['confirmed', 'tentative', 'cancelled'],
    default: 'confirmed'
  },
  makeUnavailable: {
    type: Boolean,
    default: true
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  emailPassword: {
    type: String,
    match: /^\d{6}$/,
    required: false,
    default: null
  },
  phoneNumber: {
    type: String,
    sparse: true
  },
  telnyxPhoneId: {
    type: String,
    sparse: true
  },
  telnyxPhoneNumber: {
    type: String,
    sparse: true
  },
  // SIP and WebRTC fields
  sipCredentialId: {
    type: String,
    sparse: true
  },
  sipUsername: {
    type: String,
    sparse: true
  },
  webrtcEnabled: {
    type: Boolean,
    default: false
  },
  deviceToken: {
    type: String,
    sparse: true
  },
  availability: {
    type: [availabilitySchema],
    default: [
      { day: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'thursday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'friday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'saturday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
      { day: 'sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' }
    ]
  },
  // Calendar integration settings
  calendarIntegration: {
    enabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: calendarProviderSchema
    },
    syncFrequency: {
      type: Number,
      default: 15, // minutes
      min: 5,
      max: 1440 // 24 hours
    },
    events: {
      type: [calendarEventSchema],
      default: []
    },
    makeUnavailableDuringEvents: {
      type: Boolean,
      default: true
    },
    excludeEventTypes: {
      type: [String],
      default: []
    },
    lastSyncTime: {
      type: Date
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  voicemailGreeting: {
    type: String,
    default: 'Hello, you have reached my voicemail. Please leave a message after the tone.'
  },
  voicemailGreetingUrl: {
    type: String,
    default: ''
  },
  routeToLiveAgent: {
    type: Boolean,
    default: false
  },
  liveAgentNumber: {
    type: String,
    default: ''
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema); 