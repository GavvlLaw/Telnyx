const SmsAutomation = require('../models/SmsAutomation');
const { SmsTemplate, TemplateVariable } = require('../models/SmsTemplate');
const telnyxService = require('./telnyxService');
const User = require('../models/User');
const moment = require('moment');

/**
 * Service for handling SMS automations and templates
 */
class SmsAutomationService {
  /**
   * Process incoming SMS to check for automations
   * @param {Object} smsData - The SMS data from webhook
   * @returns {Promise<Object>} - Result of processing
   */
  async processIncomingSms(smsData) {
    try {
      const { to, from, text } = smsData;
      
      // Find automations for this phone number with incomingSms or keywordSms conditions
      const automations = await SmsAutomation.find({
        isActive: true,
        phoneNumber: to,
        'conditions.type': { $in: ['incomingSms', 'keywordSms'] }
      }).populate('actions.parameters.template');
      
      if (!automations || automations.length === 0) {
        return { processed: false, reason: 'No automations configured for this number' };
      }
      
      const triggeredAutomations = [];
      
      // Check each automation to see if it should be triggered
      for (const automation of automations) {
        const shouldTrigger = await this.checkTriggerConditions(automation, {
          messageText: text,
          from,
          to
        });
        
        if (shouldTrigger) {
          // Execute the automation's actions
          await this.executeAutomationActions(automation, {
            messageText: text,
            from,
            to,
            automationId: automation._id
          });
          
          triggeredAutomations.push(automation.name);
          
          // Update automation statistics
          await SmsAutomation.findByIdAndUpdate(automation._id, {
            $inc: { 'statistics.timesTriggered': 1, 'statistics.successCount': 1 },
            $set: { 'statistics.lastTriggered': new Date() }
          });
        }
      }
      
      return {
        processed: triggeredAutomations.length > 0,
        triggeredAutomations,
        total: triggeredAutomations.length
      };
    } catch (error) {
      console.error('Error processing incoming SMS for automations:', error);
      throw new Error(`Failed to process SMS automations: ${error.message}`);
    }
  }
  
  /**
   * Process incoming call events for SMS automations
   * @param {Object} callData - The call data from webhook
   * @returns {Promise<Object>} - Result of processing
   */
  async processCallEvent(callData) {
    try {
      const { to, from, eventType } = callData;
      
      // Determine what type of event this is
      let conditionType;
      if (eventType === 'call.initiated') {
        conditionType = 'incomingCall';
      } else if (eventType === 'call.hangup' && callData.hangupCause === 'unanswered') {
        conditionType = 'missedCall';
      } else if (eventType === 'call.recording.saved' && callData.isVoicemail) {
        conditionType = 'voicemail';
      } else {
        return { processed: false, reason: 'Event type does not match any automation conditions' };
      }
      
      // Find automations for this phone number with matching condition type
      const automations = await SmsAutomation.find({
        isActive: true,
        phoneNumber: to,
        'conditions.type': conditionType
      }).populate('actions.parameters.template');
      
      if (!automations || automations.length === 0) {
        return { processed: false, reason: `No automations configured for ${conditionType}` };
      }
      
      const triggeredAutomations = [];
      
      // Execute each matching automation
      for (const automation of automations) {
        await this.executeAutomationActions(automation, {
          callEventType: conditionType,
          from,
          to,
          automationId: automation._id,
          callData
        });
        
        triggeredAutomations.push(automation.name);
        
        // Update automation statistics
        await SmsAutomation.findByIdAndUpdate(automation._id, {
          $inc: { 'statistics.timesTriggered': 1, 'statistics.successCount': 1 },
          $set: { 'statistics.lastTriggered': new Date() }
        });
      }
      
      return {
        processed: triggeredAutomations.length > 0,
        triggeredAutomations,
        total: triggeredAutomations.length
      };
    } catch (error) {
      console.error('Error processing call event for SMS automations:', error);
      throw new Error(`Failed to process call event for SMS automations: ${error.message}`);
    }
  }
  
  /**
   * Process scheduled automations
   * @returns {Promise<Object>} - Result of processing
   */
  async processScheduledAutomations() {
    try {
      const now = new Date();
      const dayOfWeek = moment().format('dddd').toLowerCase();
      const timeNow = moment().format('HH:mm');
      
      // Find automations scheduled for this time
      const automations = await SmsAutomation.find({
        isActive: true,
        'conditions.type': 'scheduledTime',
        'conditions.parameters.time': timeNow,
        'conditions.parameters.daysOfWeek': dayOfWeek
      }).populate('actions.parameters.template').populate('user');
      
      if (!automations || automations.length === 0) {
        return { processed: false, reason: 'No scheduled automations for this time' };
      }
      
      const triggeredAutomations = [];
      
      // Execute each scheduled automation
      for (const automation of automations) {
        await this.executeAutomationActions(automation, {
          scheduledTime: timeNow,
          dayOfWeek,
          automationId: automation._id,
          user: automation.user
        });
        
        triggeredAutomations.push(automation.name);
        
        // Update automation statistics
        await SmsAutomation.findByIdAndUpdate(automation._id, {
          $inc: { 'statistics.timesTriggered': 1, 'statistics.successCount': 1 },
          $set: { 'statistics.lastTriggered': new Date() }
        });
      }
      
      return {
        processed: triggeredAutomations.length > 0,
        triggeredAutomations,
        total: triggeredAutomations.length
      };
    } catch (error) {
      console.error('Error processing scheduled SMS automations:', error);
      throw new Error(`Failed to process scheduled SMS automations: ${error.message}`);
    }
  }
  
  /**
   * Process availability-based automations when availability changes
   * @param {string} userId - The user ID whose availability changed
   * @param {boolean} isAvailable - Whether the user is now available
   * @returns {Promise<Object>} - Result of processing
   */
  async processAvailabilityChange(userId, isAvailable) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.telnyxPhoneNumber) {
        return { processed: false, reason: 'User not found or has no phone number' };
      }
      
      // Find automations for this user's availability
      const availabilityStatus = isAvailable ? 'available' : 'unavailable';
      const automations = await SmsAutomation.find({
        isActive: true,
        phoneNumber: user.telnyxPhoneNumber,
        'conditions.type': 'availability',
        $or: [
          { 'conditions.parameters.availabilityStatus': availabilityStatus },
          { 'conditions.parameters.availabilityStatus': 'any' }
        ]
      }).populate('actions.parameters.template');
      
      if (!automations || automations.length === 0) {
        return { 
          processed: false, 
          reason: `No automations configured for ${availabilityStatus} status` 
        };
      }
      
      const triggeredAutomations = [];
      
      // Execute each availability automation
      for (const automation of automations) {
        await this.executeAutomationActions(automation, {
          availabilityStatus,
          userId,
          user,
          automationId: automation._id
        });
        
        triggeredAutomations.push(automation.name);
        
        // Update automation statistics
        await SmsAutomation.findByIdAndUpdate(automation._id, {
          $inc: { 'statistics.timesTriggered': 1, 'statistics.successCount': 1 },
          $set: { 'statistics.lastTriggered': new Date() }
        });
      }
      
      return {
        processed: triggeredAutomations.length > 0,
        triggeredAutomations,
        total: triggeredAutomations.length
      };
    } catch (error) {
      console.error('Error processing availability-based SMS automations:', error);
      throw new Error(`Failed to process availability SMS automations: ${error.message}`);
    }
  }
  
  /**
   * Check if an automation's conditions are met
   * @param {Object} automation - The automation object
   * @param {Object} context - Context data for evaluation
   * @returns {Promise<boolean>} - Whether conditions are met
   */
  async checkTriggerConditions(automation, context) {
    try {
      // If there are no conditions, don't trigger
      if (!automation.conditions || automation.conditions.length === 0) {
        return false;
      }
      
      // Check each condition
      for (const condition of automation.conditions) {
        switch (condition.type) {
          case 'incomingSms':
            // This always matches for any incoming SMS
            return true;
            
          case 'keywordSms':
            // Only match if the message contains keywords
            if (!condition.parameters || !condition.parameters.keywords || 
                condition.parameters.keywords.length === 0) {
              break;
            }
            
            const messageText = context.messageText.toLowerCase();
            const hasKeyword = condition.parameters.keywords.some(keyword => 
              messageText.includes(keyword.toLowerCase())
            );
            
            if (hasKeyword) {
              return true;
            }
            break;
            
          // Other condition types are handled by their specific process methods
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking automation conditions:', error);
      return false;
    }
  }
  
  /**
   * Execute the actions for an automation
   * @param {Object} automation - The automation object
   * @param {Object} context - Context data for the actions
   * @returns {Promise<Array>} - Results of executed actions
   */
  async executeAutomationActions(automation, context) {
    try {
      const results = [];
      
      // If there are no actions, return empty results
      if (!automation.actions || automation.actions.length === 0) {
        return results;
      }
      
      // Execute each action
      for (const action of automation.actions) {
        // Handle delayed actions by scheduling them
        if (action.parameters && action.parameters.delay && 
            action.parameters.delay.value > 0) {
          
          await this.scheduleDelayedAction(automation._id, action, context);
          results.push({ 
            type: action.type, 
            status: 'scheduled',
            delay: `${action.parameters.delay.value} ${action.parameters.delay.unit}`
          });
          continue;
        }
        
        // Execute immediate actions
        const result = await this.executeAction(action, context);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error executing automation actions:', error);
      
      // Update error statistics
      await SmsAutomation.findByIdAndUpdate(context.automationId, {
        $inc: { 'statistics.errorCount': 1 }
      });
      
      throw new Error(`Failed to execute automation actions: ${error.message}`);
    }
  }
  
  /**
   * Execute a single automation action
   * @param {Object} action - The action to execute
   * @param {Object} context - Context data for the action
   * @returns {Promise<Object>} - Result of the action
   */
  async executeAction(action, context) {
    try {
      switch (action.type) {
        case 'sendSms':
          return await this.executeSendSmsAction(action, context);
          
        case 'notify':
          return await this.executeNotifyAction(action, context);
          
        default:
          return { 
            type: action.type, 
            status: 'skipped', 
            reason: 'Action type not implemented' 
          };
      }
    } catch (error) {
      console.error(`Error executing ${action.type} action:`, error);
      return { 
        type: action.type, 
        status: 'error', 
        error: error.message 
      };
    }
  }
  
  /**
   * Execute the sendSms action
   * @param {Object} action - The action configuration
   * @param {Object} context - Context data for the action
   * @returns {Promise<Object>} - Result of sending SMS
   */
  async executeSendSmsAction(action, context) {
    try {
      if (!action.parameters) {
        throw new Error('Missing action parameters');
      }
      
      // Determine the message text - either from template or direct message
      let messageText;
      
      if (action.parameters.template) {
        const replacedText = await this.processTemplate(
          action.parameters.template, 
          context
        );
        messageText = replacedText;
      } else if (action.parameters.message) {
        messageText = action.parameters.message;
      } else {
        throw new Error('No template or message provided for SMS action');
      }
      
      // Determine the to/from numbers
      const from = context.to || context.user?.telnyxPhoneNumber;
      const to = context.from;
      
      if (!from || !to) {
        throw new Error('Missing required to/from phone numbers');
      }
      
      // Send the SMS using the Telnyx service
      const result = await telnyxService.sendSMS(from, to, messageText);
      
      return {
        type: 'sendSms',
        status: 'success',
        messageId: result.id,
        to,
        from
      };
    } catch (error) {
      console.error('Error executing sendSms action:', error);
      throw error;
    }
  }
  
  /**
   * Execute the notify action
   * @param {Object} action - The action configuration
   * @param {Object} context - Context data for the action
   * @returns {Promise<Object>} - Result of notification
   */
  async executeNotifyAction(action, context) {
    // This would integrate with your notification system
    // For now, we'll just log the notification
    console.log('NOTIFICATION:', {
      type: action.parameters?.notifyMethod || 'app',
      users: action.parameters?.notifyUsers || [],
      message: `Automation "${context.automationName}" was triggered`,
      context
    });
    
    return {
      type: 'notify',
      status: 'success',
      notifyMethod: action.parameters?.notifyMethod || 'app'
    };
  }
  
  /**
   * Schedule a delayed action
   * @param {string} automationId - The automation ID
   * @param {Object} action - The action to schedule
   * @param {Object} context - Context data for the action
   * @returns {Promise<void>}
   */
  async scheduleDelayedAction(automationId, action, context) {
    try {
      // Calculate the delay in milliseconds
      let delayMs = action.parameters.delay.value * 60 * 1000; // Default minutes
      
      if (action.parameters.delay.unit === 'hours') {
        delayMs = action.parameters.delay.value * 60 * 60 * 1000;
      } else if (action.parameters.delay.unit === 'days') {
        delayMs = action.parameters.delay.value * 24 * 60 * 60 * 1000;
      }
      
      // Schedule the action to run after the delay
      setTimeout(async () => {
        try {
          const automation = await SmsAutomation.findById(automationId)
            .populate('actions.parameters.template');
          
          if (!automation || !automation.isActive) {
            console.log(`Automation ${automationId} is no longer active, skipping delayed action`);
            return;
          }
          
          await this.executeAction(action, context);
          
          // Update success statistics
          await SmsAutomation.findByIdAndUpdate(automationId, {
            $inc: { 'statistics.successCount': 1 }
          });
        } catch (error) {
          console.error('Error executing delayed action:', error);
          
          // Update error statistics
          await SmsAutomation.findByIdAndUpdate(automationId, {
            $inc: { 'statistics.errorCount': 1 }
          });
        }
      }, delayMs);
      
    } catch (error) {
      console.error('Error scheduling delayed action:', error);
      throw error;
    }
  }
  
  /**
   * Process a template with context variables
   * @param {Object} template - The template object
   * @param {Object} context - Context data for variable replacement
   * @returns {Promise<string>} - Processed template text
   */
  async processTemplate(template, context) {
    try {
      let content = template.content;
      
      // Get user if not included in context
      let user = context.user;
      if (!user && context.userId) {
        user = await User.findById(context.userId);
      }
      
      // Basic variable replacement
      const variables = {
        // User variables
        '{{user.name}}': user?.name || 'User',
        '{{user.firstName}}': user?.name?.split(' ')[0] || 'User',
        '{{user.email}}': user?.email || '',
        '{{user.phone}}': user?.phoneNumber || '',
        
        // Time/date variables
        '{{date}}': new Date().toLocaleDateString(),
        '{{time}}': new Date().toLocaleTimeString(),
        '{{day}}': new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        
        // Message context
        '{{sender}}': context.from || '',
        '{{message}}': context.messageText || '',
        
        // Call context
        '{{callType}}': context.callEventType || '',
        '{{callDuration}}': context.callData?.duration || '0',
        
        // Availability
        '{{availability}}': context.availabilityStatus || '',
      };
      
      // Replace variables in the template
      Object.keys(variables).forEach(key => {
        content = content.replace(new RegExp(key, 'g'), variables[key]);
      });
      
      return content;
    } catch (error) {
      console.error('Error processing template:', error);
      return template.content; // Return original content on error
    }
  }
  
  /**
   * Create a new SMS template
   * @param {Object} templateData - The template data
   * @returns {Promise<Object>} - Created template
   */
  async createTemplate(templateData) {
    try {
      const template = new SmsTemplate(templateData);
      await template.save();
      return template;
    } catch (error) {
      console.error('Error creating SMS template:', error);
      throw new Error(`Failed to create SMS template: ${error.message}`);
    }
  }
  
  /**
   * Create a new SMS automation
   * @param {Object} automationData - The automation data
   * @returns {Promise<Object>} - Created automation
   */
  async createAutomation(automationData) {
    try {
      const automation = new SmsAutomation(automationData);
      await automation.save();
      return automation;
    } catch (error) {
      console.error('Error creating SMS automation:', error);
      throw new Error(`Failed to create SMS automation: ${error.message}`);
    }
  }
  
  /**
   * Get SMS templates for a user
   * @param {string} userId - The user ID
   * @param {boolean} includeGlobal - Whether to include global templates
   * @returns {Promise<Array>} - List of templates
   */
  async getTemplates(userId, includeGlobal = true) {
    try {
      const query = includeGlobal 
        ? { $or: [{ user: userId }, { isGlobal: true }] }
        : { user: userId };
        
      const templates = await SmsTemplate.find(query).sort({ updatedAt: -1 });
      return templates;
    } catch (error) {
      console.error('Error getting SMS templates:', error);
      throw new Error(`Failed to get SMS templates: ${error.message}`);
    }
  }
  
  /**
   * Get SMS automations for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - List of automations
   */
  async getAutomations(userId) {
    try {
      const automations = await SmsAutomation.find({ user: userId })
        .sort({ updatedAt: -1 });
      return automations;
    } catch (error) {
      console.error('Error getting SMS automations:', error);
      throw new Error(`Failed to get SMS automations: ${error.message}`);
    }
  }
}

module.exports = new SmsAutomationService(); 