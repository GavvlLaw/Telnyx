const mongoose = require('mongoose');

// Schema for SMS templates that users can configure
const smsTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1600 // SMS can be concatenated up to ~10 segments
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Schema for variables that can be used in templates
const templateVariableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  defaultValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['text', 'date', 'time', 'name', 'phone', 'custom'],
    default: 'text'
  }
});

// Update the updatedAt field before saving
smsTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SmsTemplate = mongoose.model('SmsTemplate', smsTemplateSchema);
const TemplateVariable = mongoose.model('TemplateVariable', templateVariableSchema);

module.exports = {
  SmsTemplate,
  TemplateVariable
}; 