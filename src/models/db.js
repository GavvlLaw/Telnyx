const { Sequelize, DataTypes } = require('sequelize');

// Get connection string from environment variable (added by Replit)
const connectionString = process.env.DATABASE_URL;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

// Define User model
const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  emailPassword: {
    type: DataTypes.STRING,
    validate: {
      is: /^\d{6}$/
    }
  },
  phoneNumber: DataTypes.STRING,
  telnyxPhoneId: DataTypes.STRING,
  telnyxPhoneNumber: DataTypes.STRING,
  sipCredentialId: DataTypes.STRING,
  sipUsername: DataTypes.STRING,
  webrtcEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deviceToken: DataTypes.STRING,
  availability: {
    type: DataTypes.JSONB, // Store availability as JSON
    defaultValue: [
      { day: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'thursday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'friday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { day: 'saturday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
      { day: 'sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' }
    ]
  },
  calendarIntegration: {
    type: DataTypes.JSONB, // Store calendar integration details as JSON
    defaultValue: {
      enabled: false,
      syncFrequency: 15,
      makeUnavailableDuringEvents: true,
      excludeEventTypes: [],
      events: []
    }
  },
  voicemailGreeting: {
    type: DataTypes.TEXT,
    defaultValue: 'Hello, you have reached my voicemail. Please leave a message after the tone.'
  },
  voicemailGreetingUrl: DataTypes.STRING,
  routeToLiveAgent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  liveAgentNumber: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
});

// Define SmsTemplate model
const SmsTemplate = sequelize.define('SmsTemplate', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'General'
  },
  description: DataTypes.TEXT,
  variables: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  isGlobal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
});

// User association
SmsTemplate.belongsTo(User, { as: 'user' });

// Define SmsAutomation model
const SmsAutomation = sequelize.define('SmsAutomation', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  triggerType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  triggerConditions: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'inactive'
  },
  delay: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'normal'
  },
  phoneNumbers: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  useCustomTemplate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  templateContent: DataTypes.TEXT,
  statistics: {
    type: DataTypes.JSONB,
    defaultValue: {
      timesTriggered: 0,
      successCount: 0,
      errorCount: 0
    }
  }
});

// Associations
SmsAutomation.belongsTo(User, { as: 'user' });
SmsAutomation.belongsTo(SmsTemplate, { as: 'template' });

// Define Call model
const Call = sequelize.define('Call', {
  callId: {
    type: DataTypes.STRING,
    unique: true
  },
  from: DataTypes.STRING,
  to: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'initiated'
  },
  direction: {
    type: DataTypes.STRING,
    defaultValue: 'inbound'
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  recordingUrl: DataTypes.STRING,
  telnyxCallControlId: DataTypes.STRING,
  notes: DataTypes.TEXT,
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
});

Call.belongsTo(User, { as: 'user' });

// Define SMS model
const Sms = sequelize.define('Sms', {
  messageId: {
    type: DataTypes.STRING,
    unique: true
  },
  from: DataTypes.STRING,
  to: DataTypes.STRING,
  text: DataTypes.TEXT,
  direction: {
    type: DataTypes.STRING,
    defaultValue: 'inbound'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'received'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
});

Sms.belongsTo(User, { as: 'user' });

// Define Voicemail model
const Voicemail = sequelize.define('Voicemail', {
  callId: DataTypes.STRING,
  from: DataTypes.STRING,
  to: DataTypes.STRING,
  duration: DataTypes.INTEGER,
  recordingUrl: DataTypes.STRING,
  transcription: DataTypes.TEXT,
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notes: DataTypes.TEXT
});

Voicemail.belongsTo(User, { as: 'user' });

// Define Config model for system settings
const Config = sequelize.define('Config', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  value: DataTypes.TEXT,
  description: DataTypes.TEXT
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  SmsTemplate,
  SmsAutomation,
  Call,
  Sms,
  Voicemail,
  Config
}; 