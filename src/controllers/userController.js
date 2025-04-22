const User = require('../models/User');
const telnyxService = require('../services/telnyxService');

/**
 * User controller for handling user-related operations
 */
class UserController {
  /**
   * Create a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createUser(req, res) {
    try {
      const { name, email, phoneNumber } = req.body;
      
      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }
      
      // Create new user
      const user = new User({
        name,
        email,
        phoneNumber
      });
      
      await user.save();
      
      res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  /**
   * Get user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserById(req, res) {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  /**
   * Update user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUser(req, res) {
    try {
      const { name, email, phoneNumber, voicemailGreeting, routeToLiveAgent, liveAgentNumber, emailPassword } = req.body;
      
      // Validate emailPassword if provided
      if (emailPassword !== undefined) {
        if (!/^\d{6}$/.test(emailPassword)) {
          return res.status(400).json({ error: 'Email password must be a 6-digit number' });
        }
      }
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        {
          name,
          email,
          phoneNumber,
          voicemailGreeting,
          routeToLiveAgent,
          liveAgentNumber,
          emailPassword
        },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  /**
   * Delete user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteUser(req, res) {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  /**
   * Assign Telnyx phone number to user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async assignPhoneNumber(req, res) {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Assign the phone number using Telnyx service
      const updatedUser = await telnyxService.assignPhoneNumberToUser(user._id, phoneNumber);
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error assigning phone number:', error);
      res.status(500).json({ error: `Failed to assign phone number: ${error.message}` });
    }
  }

  /**
   * Update user availability settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateAvailability(req, res) {
    try {
      const { availability } = req.body;
      
      if (!availability || !Array.isArray(availability)) {
        return res.status(400).json({ error: 'Valid availability settings are required' });
      }
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { availability },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({ error: 'Failed to update availability settings' });
    }
  }

  /**
   * Set or update email password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setEmailPassword(req, res) {
    try {
      const { emailPassword } = req.body;
      
      // Validate email password
      if (!emailPassword || !/^\d{6}$/.test(emailPassword)) {
        return res.status(400).json({ error: 'Email password must be a 6-digit number' });
      }
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { emailPassword },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json({
        success: true,
        message: 'Email password updated successfully'
      });
    } catch (error) {
      console.error('Error setting email password:', error);
      res.status(500).json({ error: 'Failed to set email password' });
    }
  }
}

module.exports = new UserController(); 