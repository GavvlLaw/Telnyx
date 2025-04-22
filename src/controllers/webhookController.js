const callController = require('./callController');
const smsController = require('./smsController');
const User = require('../models/User');
const telnyxService = require('../services/telnyxService');
const smsAutomationService = require('../services/smsAutomationService');
const notificationService = require('../services/notificationService');

/**
 * Webhook controller for handling Telnyx webhooks
 */
class WebhookController {
  /**
   * Process Telnyx webhook events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processWebhook(req, res) {
    try {
      const event = req.body;
      console.log('Received webhook event:', event.data.event_type);
      
      // Verify webhook signature if configured
      if (process.env.TELNYX_PUBLIC_KEY) {
        // Here you'd implement Telnyx signature verification
        // using their public key for added security
      }
      
      // Process different event types
      switch (event.data.event_type) {
        // Call events
        case 'call.initiated':
          return await this.handleCallEvent(req, res);
          
        case 'call.answered':
        case 'call.hangup':
          // Update call status in the database and check for automations
          return await this.handleCallEvent(req, res);
          
        case 'call.recording.saved':
          // Handle call recording and check for voicemail automations
          return await this.handleCallRecording(req, res);
          
        case 'call.machine.detection.ended':
          // Handle answering machine detection
          break;
        
        case 'call.gather.ended':
          // Handle DTMF input from users
          return await this.handleGatherEvent(req, res);
          
        // SMS events
        case 'message.received':
          // Process incoming SMS and check for automations
          return await this.handleIncomingSms(req, res);
          
        case 'message.finalized':
          return await smsController.handleSMSStatus(req, res);
          
        default:
          console.log(`Unhandled event type: ${event.data.event_type}`);
      }
      
      // Generic response for unhandled event types
      res.status(200).send({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook event' });
    }
  }

  /**
   * Handle gather events (DTMF inputs)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleGatherEvent(req, res) {
    try {
      const event = req.body.data;
      const clientState = event.payload.client_state;
      const callLegId = event.payload.call_leg_id;
      
      // Check if this is part of the unavailable user flow
      if (clientState === 'unavailable-flow') {
        // Find the user associated with this call
        // We need to extract the user's phone number from the call information
        // This assumes that the 'to' field in the call event is the user's Telnyx number
        const toNumber = event.payload.to || '';
        
        const user = await User.findOne({ telnyxPhoneNumber: toNumber });
        
        if (!user) {
          console.error(`No user found for Telnyx number: ${toNumber}`);
          return res.status(200).send({ received: true });
        }
        
        // Process the DTMF input based on the user's choice
        const result = await telnyxService.handleUnavailableDTMF(event, user);
        
        return res.status(200).json({ 
          received: true, 
          action: result.action 
        });
      }
      
      // For other gather events that are not part of the unavailable flow
      res.status(200).send({ received: true });
    } catch (error) {
      console.error('Error handling gather event:', error);
      res.status(500).json({ error: 'Failed to process gather event' });
    }
  }

  /**
   * Handle incoming SMS events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleIncomingSms(req, res) {
    try {
      // First, let the SMS controller handle the message normally
      await smsController.handleIncomingSMS(req, res);
      
      // Then, process any automations for this SMS
      const event = req.body.data;
      const smsData = {
        from: event.payload.from.phone_number,
        to: event.payload.to[0].phone_number,
        text: event.payload.text,
        direction: 'inbound',
        messageId: event.payload.id
      };
      
      // Process automations asynchronously so we don't delay the webhook response
      smsAutomationService.processIncomingSms(smsData)
        .then(result => {
          if (result.processed) {
            console.log(`Processed SMS automations: ${result.total} triggered`);
          }
        })
        .catch(error => {
          console.error('Error processing SMS automations:', error);
        });
      
      // Send notification about new SMS
      const toNumber = smsData.to;
      const user = await User.findOne({ telnyxPhoneNumber: toNumber });
      
      if (user) {
        // Notify the user about the new SMS
        notificationService.notifyNewSMS(user, {
          from: smsData.from,
          text: smsData.text,
          timestamp: new Date()
        })
        .then(result => {
          console.log('SMS notification results:', result);
        })
        .catch(error => {
          console.error('Error sending SMS notification:', error);
        });
      }
      
      // The response was already sent by smsController.handleIncomingSMS
    } catch (error) {
      console.error('Error handling incoming SMS webhook:', error);
      res.status(500).json({ error: 'Failed to process SMS webhook' });
    }
  }

  /**
   * Handle call events for automations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleCallEvent(req, res) {
    try {
      // First, let the call controller handle the call event normally
      await callController.handleIncomingCall(req, res);
      
      // Then, process any automations for this call event
      const event = req.body.data;
      const callData = {
        from: event.payload.from,
        to: event.payload.to,
        callId: event.payload.call_leg_id,
        eventType: event.event_type,
        direction: 'inbound',
        // For hangup events
        hangupCause: event.payload?.hangup_cause,
        duration: event.payload?.duration_seconds
      };
      
      // Process automations asynchronously so we don't delay the webhook response
      smsAutomationService.processCallEvent(callData)
        .then(result => {
          if (result.processed) {
            console.log(`Processed call automations: ${result.total} triggered`);
          }
        })
        .catch(error => {
          console.error('Error processing call automations:', error);
        });
      
      // Check for missed call to send notification
      if (event.event_type === 'call.hangup' && event.payload?.hangup_cause === 'unanswered') {
        const toNumber = callData.to;
        const user = await User.findOne({ telnyxPhoneNumber: toNumber });
        
        if (user) {
          // Notify the user about the missed call
          notificationService.notifyMissedCall(user, {
            from: callData.from,
            timestamp: new Date(),
            callId: callData.callId
          })
          .then(result => {
            console.log('Missed call notification results:', result);
          })
          .catch(error => {
            console.error('Error sending missed call notification:', error);
          });
        }
      }
      
      // The response was already sent by callController
    } catch (error) {
      console.error('Error handling call event webhook:', error);
      res.status(500).json({ error: 'Failed to process call webhook' });
    }
  }

  /**
   * Handle call recording events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleCallRecording(req, res) {
    try {
      // First, let the call controller handle the recording normally
      await callController.handleCallRecording(req, res);
      
      // Then, process any automations for this recording (voicemail)
      const event = req.body.data;
      const callData = {
        from: event.payload.from,
        to: event.payload.to,
        callId: event.payload.call_leg_id,
        eventType: event.event_type,
        recordingUrl: event.payload.recording_urls?.mp3,
        duration: event.payload.duration_seconds,
        isVoicemail: true // Assuming all recordings here are voicemails
      };
      
      // Process automations asynchronously so we don't delay the webhook response
      smsAutomationService.processCallEvent(callData)
        .then(result => {
          if (result.processed) {
            console.log(`Processed voicemail automations: ${result.total} triggered`);
          }
        })
        .catch(error => {
          console.error('Error processing voicemail automations:', error);
        });
      
      // Send notification about new voicemail
      if (callData.isVoicemail) {
        // Find the user associated with this phone number
        const toNumber = callData.to;
        const user = await User.findOne({ telnyxPhoneNumber: toNumber });
        
        if (user) {
          // Notify the user about the new voicemail
          notificationService.notifyNewVoicemail(user, {
            from: callData.from,
            duration: callData.duration,
            recordingUrl: callData.recordingUrl,
            timestamp: new Date()
          })
          .then(result => {
            console.log('Voicemail notification results:', result);
          })
          .catch(error => {
            console.error('Error sending voicemail notification:', error);
          });
        }
      }
      
      // The response was already sent by callController
    } catch (error) {
      console.error('Error handling call recording webhook:', error);
      res.status(500).json({ error: 'Failed to process recording webhook' });
    }
  }
}

module.exports = new WebhookController(); 