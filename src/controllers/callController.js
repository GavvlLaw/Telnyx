const Call = require('../models/Call');
const User = require('../models/User');
const Voicemail = require('../models/Voicemail');
const telnyxService = require('../services/telnyxService');

/**
 * Call controller for handling call-related operations
 */
class CallController {
  /**
   * Get calls for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserCalls(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, skip = 0, direction } = req.query;
      
      const query = { userId };
      if (direction) {
        query.direction = direction;
      }
      
      const calls = await Call.find(query)
        .sort({ startTime: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      
      const total = await Call.countDocuments(query);
      
      res.status(200).json({
        calls,
        total,
        hasMore: total > parseInt(skip) + calls.length
      });
    } catch (error) {
      console.error('Error fetching user calls:', error);
      res.status(500).json({ error: 'Failed to fetch call history' });
    }
  }

  /**
   * Get call by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCallById(req, res) {
    try {
      const call = await Call.findById(req.params.id);
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      res.status(200).json(call);
    } catch (error) {
      console.error('Error fetching call:', error);
      res.status(500).json({ error: 'Failed to fetch call details' });
    }
  }

  /**
   * Make outbound call
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async makeOutboundCall(req, res) {
    try {
      const { userId, to } = req.body;
      
      if (!userId || !to) {
        return res.status(400).json({ error: 'User ID and destination number are required' });
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!user.telnyxPhoneNumber) {
        return res.status(400).json({ error: 'User does not have a Telnyx phone number assigned' });
      }
      
      // Make the call using Telnyx
      const callData = await telnyxService.makeOutboundCall(user.telnyxPhoneNumber, to);
      
      // Save call record to database
      const call = new Call({
        userId,
        telnyxCallControlId: callData.call_control_id,
        direction: 'outbound',
        from: user.telnyxPhoneNumber,
        to,
        status: 'initiated',
        startTime: new Date()
      });
      
      await call.save();
      
      res.status(201).json({
        message: 'Call initiated successfully',
        call
      });
    } catch (error) {
      console.error('Error making outbound call:', error);
      res.status(500).json({ error: `Failed to initiate call: ${error.message}` });
    }
  }

  /**
   * Handle webhook for incoming call
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleIncomingCall(req, res) {
    try {
      const event = req.body.data;
      
      if (event.event_type !== 'call.initiated' || event.direction !== 'incoming') {
        return res.status(200).send({ received: true });
      }
      
      const { from, to, call_control_id } = event.payload;
      
      // Find user by Telnyx phone number
      const user = await User.findOne({ telnyxPhoneNumber: to });
      
      if (!user) {
        console.error(`No user found for Telnyx number: ${to}`);
        return res.status(200).send({ received: true });
      }
      
      // Create call record
      const call = new Call({
        userId: user._id,
        telnyxCallControlId: call_control_id,
        direction: 'inbound',
        from,
        to,
        status: 'initiated',
        startTime: new Date()
      });
      
      await call.save();
      
      // Handle the call based on user availability
      const result = await telnyxService.handleIncomingCall(user, call_control_id);
      
      // Update call status based on handling result
      if (result.action === 'voicemail') {
        await Call.findByIdAndUpdate(call._id, { status: 'voicemail' });
      }
      
      res.status(200).send({ received: true, action: result.action });
    } catch (error) {
      console.error('Error handling incoming call webhook:', error);
      res.status(500).json({ error: 'Failed to process incoming call' });
    }
  }

  /**
   * Handle call recording events (for voicemail)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleCallRecording(req, res) {
    try {
      const event = req.body.data;
      
      if (event.event_type !== 'call.recording.saved') {
        return res.status(200).send({ received: true });
      }
      
      const { call_control_id, recording_urls } = event.payload;
      const recordingUrl = recording_urls?.mp3;
      
      if (!recordingUrl) {
        console.error('No recording URL found in event payload');
        return res.status(200).send({ received: true });
      }
      
      // Find the call by Telnyx call control ID
      const call = await Call.findOne({ telnyxCallControlId: call_control_id });
      
      if (!call) {
        console.error(`No call found for call control ID: ${call_control_id}`);
        return res.status(200).send({ received: true });
      }
      
      // Update call with recording URL
      await Call.findByIdAndUpdate(call._id, {
        recordingUrl,
        status: 'completed'
      });
      
      // If this was a voicemail, create a voicemail record
      if (call.status === 'voicemail') {
        const voicemail = new Voicemail({
          userId: call.userId,
          callId: call._id,
          from: call.from,
          to: call.to,
          recordingUrl,
          duration: event.payload.recording_duration_sec || 0,
          createdAt: new Date()
        });
        
        await voicemail.save();
      }
      
      res.status(200).send({ received: true });
    } catch (error) {
      console.error('Error handling call recording webhook:', error);
      res.status(500).json({ error: 'Failed to process call recording' });
    }
  }

  /**
   * Update call with notes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateCallNotes(req, res) {
    try {
      const { notes } = req.body;
      
      const call = await Call.findByIdAndUpdate(
        req.params.id,
        { notes },
        { new: true }
      );
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      res.status(200).json(call);
    } catch (error) {
      console.error('Error updating call notes:', error);
      res.status(500).json({ error: 'Failed to update call notes' });
    }
  }
}

module.exports = new CallController(); 