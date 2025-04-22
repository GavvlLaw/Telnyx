const SMS = require('../models/SMS');
const User = require('../models/User');
const telnyxService = require('../services/telnyxService');

/**
 * SMS controller for handling SMS-related operations
 */
class SMSController {
  /**
   * Get SMS messages for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserMessages(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, skip = 0, direction } = req.query;
      
      const query = { userId };
      if (direction) {
        query.direction = direction;
      }
      
      const messages = await SMS.find(query)
        .sort({ sentAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      
      const total = await SMS.countDocuments(query);
      
      res.status(200).json({
        messages,
        total,
        hasMore: total > parseInt(skip) + messages.length
      });
    } catch (error) {
      console.error('Error fetching user messages:', error);
      res.status(500).json({ error: 'Failed to fetch message history' });
    }
  }

  /**
   * Get SMS by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSMSById(req, res) {
    try {
      const sms = await SMS.findById(req.params.id);
      
      if (!sms) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      res.status(200).json(sms);
    } catch (error) {
      console.error('Error fetching message:', error);
      res.status(500).json({ error: 'Failed to fetch message details' });
    }
  }

  /**
   * Send SMS message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendSMS(req, res) {
    try {
      const { userId, to, body, mediaUrls } = req.body;
      
      if (!userId || !to || !body) {
        return res.status(400).json({ error: 'User ID, destination number, and message body are required' });
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!user.telnyxPhoneNumber) {
        return res.status(400).json({ error: 'User does not have a Telnyx phone number assigned' });
      }
      
      // Check if user is available based on their settings
      const isAvailable = telnyxService.isUserAvailable(user);
      
      if (!isAvailable) {
        return res.status(403).json({ 
          error: 'User is not available to send messages at this time',
          isAvailable: false
        });
      }
      
      // Send the SMS using Telnyx
      const messageData = await telnyxService.sendSMS(
        user.telnyxPhoneNumber, 
        to, 
        body,
        { media_urls: mediaUrls }
      );
      
      // Save message record to database
      const sms = new SMS({
        userId,
        telnyxMessageId: messageData.id,
        direction: 'outbound',
        from: user.telnyxPhoneNumber,
        to,
        body,
        status: 'sent',
        sentAt: new Date(),
        mediaUrls: mediaUrls || []
      });
      
      await sms.save();
      
      res.status(201).json({
        message: 'SMS sent successfully',
        sms
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ error: `Failed to send SMS: ${error.message}` });
    }
  }

  /**
   * Handle webhook for incoming SMS
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleIncomingSMS(req, res) {
    try {
      const event = req.body.data;
      
      if (event.event_type !== 'message.received') {
        return res.status(200).send({ received: true });
      }
      
      const { from, to, text, id, media } = event.payload;
      
      // Find user by Telnyx phone number
      const user = await User.findOne({ telnyxPhoneNumber: to });
      
      if (!user) {
        console.error(`No user found for Telnyx number: ${to}`);
        return res.status(200).send({ received: true });
      }
      
      // Check if user is available based on their settings
      const isAvailable = telnyxService.isUserAvailable(user);
      
      // Create SMS record
      const sms = new SMS({
        userId: user._id,
        telnyxMessageId: id,
        direction: 'inbound',
        from,
        to,
        body: text,
        status: 'received',
        sentAt: new Date(),
        mediaUrls: media ? media.map(m => m.url) : []
      });
      
      await sms.save();
      
      // If user is not available, send an auto-reply
      if (!isAvailable) {
        // Send auto-reply
        const autoReplyText = `Thank you for your message. I'm currently unavailable. I'll respond when I'm back online.`;
        
        await telnyxService.sendSMS(to, from, autoReplyText);
        
        // Save auto-reply record
        const autoReplySMS = new SMS({
          userId: user._id,
          telnyxMessageId: `auto-reply-${Date.now()}`,
          direction: 'outbound',
          from: to,
          to: from,
          body: autoReplyText,
          status: 'sent',
          sentAt: new Date()
        });
        
        await autoReplySMS.save();
      }
      
      res.status(200).send({ received: true, isAvailable });
    } catch (error) {
      console.error('Error handling incoming SMS webhook:', error);
      res.status(500).json({ error: 'Failed to process incoming SMS' });
    }
  }

  /**
   * Handle SMS status updates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleSMSStatus(req, res) {
    try {
      const event = req.body.data;
      
      if (event.event_type !== 'message.finalized') {
        return res.status(200).send({ received: true });
      }
      
      const { id, status } = event.payload;
      
      // Map Telnyx status to our status
      let smsStatus = 'sent';
      if (status === 'delivered') {
        smsStatus = 'delivered';
      } else if (status === 'failed' || status === 'rejected') {
        smsStatus = 'failed';
      }
      
      // Update SMS status
      const sms = await SMS.findOneAndUpdate(
        { telnyxMessageId: id },
        { 
          status: smsStatus,
          deliveredAt: smsStatus === 'delivered' ? new Date() : undefined
        },
        { new: true }
      );
      
      if (!sms) {
        console.error(`No SMS found for message ID: ${id}`);
      }
      
      res.status(200).send({ received: true });
    } catch (error) {
      console.error('Error handling SMS status webhook:', error);
      res.status(500).json({ error: 'Failed to process SMS status update' });
    }
  }
}

module.exports = new SMSController(); 