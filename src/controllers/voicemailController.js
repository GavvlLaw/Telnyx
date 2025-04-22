const Voicemail = require('../models/Voicemail');
const User = require('../models/User');
const telnyxService = require('../services/telnyxService');

/**
 * Voicemail controller for handling voicemail-related operations
 */
class VoicemailController {
  /**
   * Get voicemails for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserVoicemails(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, skip = 0, isNew } = req.query;
      
      const query = { userId };
      if (isNew !== undefined) {
        query.isNew = isNew === 'true';
      }
      
      const voicemails = await Voicemail.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      
      const total = await Voicemail.countDocuments(query);
      
      res.status(200).json({
        voicemails,
        total,
        hasMore: total > parseInt(skip) + voicemails.length
      });
    } catch (error) {
      console.error('Error fetching user voicemails:', error);
      res.status(500).json({ error: 'Failed to fetch voicemail history' });
    }
  }

  /**
   * Get voicemail by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVoicemailById(req, res) {
    try {
      const voicemail = await Voicemail.findById(req.params.id);
      
      if (!voicemail) {
        return res.status(404).json({ error: 'Voicemail not found' });
      }
      
      res.status(200).json(voicemail);
    } catch (error) {
      console.error('Error fetching voicemail:', error);
      res.status(500).json({ error: 'Failed to fetch voicemail details' });
    }
  }

  /**
   * Mark voicemail as read/not new
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markVoicemailAsRead(req, res) {
    try {
      const voicemail = await Voicemail.findByIdAndUpdate(
        req.params.id,
        { isNew: false },
        { new: true }
      );
      
      if (!voicemail) {
        return res.status(404).json({ error: 'Voicemail not found' });
      }
      
      res.status(200).json(voicemail);
    } catch (error) {
      console.error('Error marking voicemail as read:', error);
      res.status(500).json({ error: 'Failed to update voicemail status' });
    }
  }

  /**
   * Update voicemail notes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateVoicemailNotes(req, res) {
    try {
      const { notes } = req.body;
      
      const voicemail = await Voicemail.findByIdAndUpdate(
        req.params.id,
        { notes },
        { new: true }
      );
      
      if (!voicemail) {
        return res.status(404).json({ error: 'Voicemail not found' });
      }
      
      res.status(200).json(voicemail);
    } catch (error) {
      console.error('Error updating voicemail notes:', error);
      res.status(500).json({ error: 'Failed to update voicemail notes' });
    }
  }

  /**
   * Delete voicemail
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteVoicemail(req, res) {
    try {
      const voicemail = await Voicemail.findByIdAndDelete(req.params.id);
      
      if (!voicemail) {
        return res.status(404).json({ error: 'Voicemail not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting voicemail:', error);
      res.status(500).json({ error: 'Failed to delete voicemail' });
    }
  }

  /**
   * Update voicemail greeting text for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateVoicemailGreeting(req, res) {
    try {
      const { userId } = req.params;
      const { greeting } = req.body;
      
      if (!greeting) {
        return res.status(400).json({ error: 'Voicemail greeting text is required' });
      }
      
      const user = await User.findByIdAndUpdate(
        userId,
        { voicemailGreeting: greeting },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json({ 
        message: 'Voicemail greeting updated successfully',
        voicemailGreeting: user.voicemailGreeting
      });
    } catch (error) {
      console.error('Error updating voicemail greeting:', error);
      res.status(500).json({ error: 'Failed to update voicemail greeting' });
    }
  }

  /**
   * Update voicemail greeting URL for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateVoicemailGreetingUrl(req, res) {
    try {
      const { userId } = req.params;
      const { greetingUrl, useGitHub } = req.body;
      
      // Get the user first
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      let updatedUser;
      
      // If useGitHub is true, generate GitHub URL based on user's name
      if (useGitHub === true) {
        // Use the Telnyx service to get the GitHub URL format
        const gitHubUrl = telnyxService.generateGitHubVoicemailUrl(user);
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { voicemailGreetingUrl: gitHubUrl },
          { new: true }
        );
      } else if (greetingUrl) {
        // Use the provided URL
        updatedUser = await telnyxService.updateVoicemailGreetingUrl(userId, greetingUrl);
      } else {
        return res.status(400).json({ 
          error: 'Either greetingUrl or useGitHub=true is required'
        });
      }
      
      res.status(200).json({ 
        message: 'Voicemail greeting URL updated successfully',
        voicemailGreetingUrl: updatedUser.voicemailGreetingUrl
      });
    } catch (error) {
      console.error('Error updating voicemail greeting URL:', error);
      res.status(500).json({ error: 'Failed to update voicemail greeting URL' });
    }
  }

  /**
   * Get personalized voicemail greeting URL
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVoicemailGreetingUrl(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get the current greeting URL or generate GitHub URL
      let greetingUrl = user.voicemailGreetingUrl;
      
      if (!greetingUrl) {
        greetingUrl = telnyxService.generateGitHubVoicemailUrl(user);
      }
      
      res.status(200).json({
        userId: user._id,
        name: user.name,
        firstName: user.name.split(' ')[0],
        voicemailGreetingUrl: greetingUrl
      });
    } catch (error) {
      console.error('Error getting voicemail greeting URL:', error);
      res.status(500).json({ error: 'Failed to get voicemail greeting URL' });
    }
  }
}

module.exports = new VoicemailController(); 