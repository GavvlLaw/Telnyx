const telnyxService = require('../services/telnyxService');
const User = require('../models/User');

/**
 * Controller for managing Telnyx phone numbers
 */
class PhoneController {
  /**
   * Search for available phone numbers with optional filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchAvailableNumbers(req, res) {
    try {
      const options = {
        country_code: req.query.country_code || 'US',
        area_code: req.query.area_code,
        locality: req.query.locality,
        administrative_area: req.query.administrative_area,
        features: req.query.features ? req.query.features.split(',') : ['sms', 'voice'],
        limit: parseInt(req.query.limit) || 10,
        page: parseInt(req.query.page) || 1
      };

      const phoneNumbers = await telnyxService.searchPhoneNumbers(options);
      
      res.status(200).json({
        success: true,
        data: phoneNumbers
      });
    } catch (error) {
      console.error('Error searching phone numbers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search for phone numbers',
        error: error.message
      });
    }
  }

  /**
   * Purchase a phone number
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async purchaseNumber(req, res) {
    try {
      const { phoneNumber, userId } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // If userId is provided, assign the number to that user
      if (userId) {
        const user = await User.findById(userId);
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: `User not found with ID: ${userId}`
          });
        }
        
        const updatedUser = await telnyxService.assignPhoneNumberToUser(userId, phoneNumber);
        
        return res.status(200).json({
          success: true,
          message: 'Phone number purchased and assigned to user',
          data: {
            user: updatedUser,
            telnyxPhoneNumber: updatedUser.telnyxPhoneNumber,
            telnyxPhoneId: updatedUser.telnyxPhoneId
          }
        });
      }
      
      // If no userId, just purchase the number without assigning
      const purchasedNumber = await telnyxService.purchasePhoneNumber(phoneNumber);
      
      res.status(200).json({
        success: true,
        message: 'Phone number purchased successfully',
        data: purchasedNumber
      });
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to purchase phone number',
        error: error.message
      });
    }
  }

  /**
   * List all phone numbers in the Telnyx account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async listNumbers(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 25,
        status: req.query.status || 'active'
      };

      const phoneNumbers = await telnyxService.listPhoneNumbers(options);
      
      res.status(200).json({
        success: true,
        data: phoneNumbers
      });
    } catch (error) {
      console.error('Error listing phone numbers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list phone numbers',
        error: error.message
      });
    }
  }

  /**
   * Release (delete) a phone number from the Telnyx account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async releaseNumber(req, res) {
    try {
      const { phoneId } = req.params;

      if (!phoneId) {
        return res.status(400).json({
          success: false,
          message: 'Phone ID is required'
        });
      }

      // Check if the number is assigned to a user
      const user = await User.findOne({ telnyxPhoneId: phoneId });
      
      if (user) {
        // Update the user to remove the phone association
        await User.findByIdAndUpdate(user._id, {
          $unset: { telnyxPhoneId: 1, telnyxPhoneNumber: 1 }
        });
      }
      
      // Release the number from Telnyx
      const result = await telnyxService.releasePhoneNumber(phoneId);
      
      res.status(200).json({
        success: true,
        message: 'Phone number released successfully',
        data: result
      });
    } catch (error) {
      console.error('Error releasing phone number:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to release phone number',
        error: error.message
      });
    }
  }

  /**
   * Update the settings for a phone number (messaging profile, connection ID, etc.)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateNumberSettings(req, res) {
    try {
      const { phoneId } = req.params;
      const { messagingProfileId, connectionId, tags } = req.body;

      if (!phoneId) {
        return res.status(400).json({
          success: false,
          message: 'Phone ID is required'
        });
      }

      const updateOptions = {};
      
      if (messagingProfileId) {
        updateOptions.messaging_profile_id = messagingProfileId;
      }
      
      if (connectionId) {
        updateOptions.connection_id = connectionId;
      }
      
      if (tags) {
        updateOptions.tags = tags;
      }
      
      const updatedNumber = await telnyxService.updatePhoneNumber(phoneId, updateOptions);
      
      res.status(200).json({
        success: true,
        message: 'Phone number settings updated successfully',
        data: updatedNumber
      });
    } catch (error) {
      console.error('Error updating phone number settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update phone number settings',
        error: error.message
      });
    }
  }

  /**
   * Get phone number details by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getNumberDetails(req, res) {
    try {
      const { phoneId } = req.params;

      if (!phoneId) {
        return res.status(400).json({
          success: false,
          message: 'Phone ID is required'
        });
      }

      const phoneDetails = await telnyxService.getPhoneNumberDetails(phoneId);
      
      res.status(200).json({
        success: true,
        data: phoneDetails
      });
    } catch (error) {
      console.error('Error getting phone number details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get phone number details',
        error: error.message
      });
    }
  }

  /**
   * Assign a phone number to a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async assignNumberToUser(req, res) {
    try {
      const { userId, phoneNumber } = req.body;

      if (!userId || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'User ID and phone number are required'
        });
      }

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User not found with ID: ${userId}`
        });
      }
      
      const updatedUser = await telnyxService.assignPhoneNumberToUser(userId, phoneNumber);
      
      res.status(200).json({
        success: true,
        message: 'Phone number assigned to user successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error assigning phone number to user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign phone number to user',
        error: error.message
      });
    }
  }
}

module.exports = new PhoneController(); 