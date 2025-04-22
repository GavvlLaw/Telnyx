const telnyxService = require('../services/telnyxService');
const User = require('../models/User');

/**
 * Controller for WebRTC operations
 */
class WebRTCController {
  /**
   * Generate SIP credentials for WebRTC client
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateCredentials(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // Get user from database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Generate SIP credentials through Telnyx
      const credentials = await telnyxService.generateSIPCredentials(user);
      
      res.status(200).json({
        success: true,
        data: credentials
      });
    } catch (error) {
      console.error('Error generating WebRTC credentials:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate WebRTC credentials',
        error: error.message
      });
    }
  }
  
  /**
   * Reset SIP credentials password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetCredentialsPassword(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // Reset the SIP password
      const credentials = await telnyxService.resetSIPCredentialsPassword(userId);
      
      res.status(200).json({
        success: true,
        data: credentials
      });
    } catch (error) {
      console.error('Error resetting WebRTC credentials password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset WebRTC credentials password',
        error: error.message
      });
    }
  }
  
  /**
   * Delete SIP credentials
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteCredentials(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // Delete the SIP credentials
      await telnyxService.deleteSIPCredentials(userId);
      
      res.status(200).json({
        success: true,
        message: 'WebRTC credentials deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting WebRTC credentials:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete WebRTC credentials',
        error: error.message
      });
    }
  }
  
  /**
   * Get WebRTC connection token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConnectionToken(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // Generate a connection token from Telnyx
      const token = await telnyxService.generateWebRTCToken(userId);
      
      res.status(200).json({
        success: true,
        data: { token }
      });
    } catch (error) {
      console.error('Error generating WebRTC token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate WebRTC token',
        error: error.message
      });
    }
  }
  
  /**
   * Check if user has WebRTC enabled
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkWebRTCStatus(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      // Get user from database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          webrtcEnabled: user.webrtcEnabled,
          hasSipCredentials: !!user.sipCredentialId,
          sipUsername: user.sipUsername
        }
      });
    } catch (error) {
      console.error('Error checking WebRTC status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check WebRTC status',
        error: error.message
      });
    }
  }
  
  /**
   * Register device token for push notifications
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async registerDeviceToken(req, res) {
    try {
      const { userId, deviceToken } = req.body;
      
      if (!userId || !deviceToken) {
        return res.status(400).json({
          success: false,
          message: 'User ID and device token are required'
        });
      }
      
      // Update user's device token
      const user = await User.findByIdAndUpdate(
        userId,
        { deviceToken },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Device token registered successfully'
      });
    } catch (error) {
      console.error('Error registering device token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register device token',
        error: error.message
      });
    }
  }
}

module.exports = new WebRTCController(); 