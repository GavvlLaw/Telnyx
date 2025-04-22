const telnyxService = require('../services/telnyxService');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

/**
 * Controller for admin operations including Telnyx configuration
 */
class AdminController {
  /**
   * Update Telnyx API key
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateTelnyxApiKey(req, res) {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'API key is required'
        });
      }

      // Validate API key format
      if (!apiKey.startsWith('KEY') && !apiKey.includes('_')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid API key format. Telnyx API keys typically start with "KEY" or include an underscore for V2 keys.'
        });
      }

      // Update the API key in environment variables
      process.env.TELNYX_API_KEY = apiKey;

      // Update the .env file if it exists
      try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = await fs.readFile(envPath, 'utf8');
        
        const regex = new RegExp(`^TELNYX_API_KEY=.*$`, 'm');
        if (regex.test(envContent)) {
          // Replace existing key
          envContent = envContent.replace(regex, `TELNYX_API_KEY=${apiKey}`);
        } else {
          // Add new key
          envContent += `\nTELNYX_API_KEY=${apiKey}`;
        }
        
        await fs.writeFile(envPath, envContent);
        
        // Reinitialize Telnyx client
        telnyxService.reinitializeClient(apiKey);
        
        return res.status(200).json({
          success: true,
          message: 'Telnyx API key updated successfully'
        });
      } catch (error) {
        // If .env file update fails, still consider it a success since the env var was updated
        console.error('Error updating .env file:', error);
        
        // Reinitialize Telnyx client anyway
        telnyxService.reinitializeClient(apiKey);
        
        return res.status(200).json({
          success: true,
          message: 'Telnyx API key updated in memory only. Could not update .env file.',
          warning: 'This change will be lost when the server restarts.'
        });
      }
    } catch (error) {
      console.error('Error updating Telnyx API key:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update Telnyx API key',
        error: error.message
      });
    }
  }

  /**
   * Update webhook URL
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateWebhookUrl(req, res) {
    try {
      const { webhookUrl } = req.body;
      
      if (!webhookUrl) {
        return res.status(400).json({
          success: false,
          message: 'Webhook URL is required'
        });
      }

      // Validate webhook URL format
      try {
        new URL(webhookUrl);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook URL format'
        });
      }

      // Update the webhook URL in environment variables
      process.env.WEBHOOK_URL = webhookUrl;

      // Update the .env file if it exists
      try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = await fs.readFile(envPath, 'utf8');
        
        const regex = new RegExp(`^WEBHOOK_URL=.*$`, 'm');
        if (regex.test(envContent)) {
          // Replace existing URL
          envContent = envContent.replace(regex, `WEBHOOK_URL=${webhookUrl}`);
        } else {
          // Add new URL
          envContent += `\nWEBHOOK_URL=${webhookUrl}`;
        }
        
        await fs.writeFile(envPath, envContent);
        
        return res.status(200).json({
          success: true,
          message: 'Webhook URL updated successfully'
        });
      } catch (error) {
        // If .env file update fails, still consider it a success since the env var was updated
        console.error('Error updating .env file:', error);
        
        return res.status(200).json({
          success: true,
          message: 'Webhook URL updated in memory only. Could not update .env file.',
          warning: 'This change will be lost when the server restarts.'
        });
      }
    } catch (error) {
      console.error('Error updating webhook URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update webhook URL',
        error: error.message
      });
    }
  }

  /**
   * Update messaging profile ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateMessagingProfileId(req, res) {
    try {
      const { messagingProfileId } = req.body;
      
      if (!messagingProfileId) {
        return res.status(400).json({
          success: false,
          message: 'Messaging profile ID is required'
        });
      }

      // Update the messaging profile ID in environment variables
      process.env.TELNYX_MESSAGING_PROFILE_ID = messagingProfileId;

      // Update the .env file if it exists
      try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = await fs.readFile(envPath, 'utf8');
        
        const regex = new RegExp(`^TELNYX_MESSAGING_PROFILE_ID=.*$`, 'm');
        if (regex.test(envContent)) {
          // Replace existing ID
          envContent = envContent.replace(regex, `TELNYX_MESSAGING_PROFILE_ID=${messagingProfileId}`);
        } else {
          // Add new ID
          envContent += `\nTELNYX_MESSAGING_PROFILE_ID=${messagingProfileId}`;
        }
        
        await fs.writeFile(envPath, envContent);
        
        return res.status(200).json({
          success: true,
          message: 'Messaging profile ID updated successfully'
        });
      } catch (error) {
        // If .env file update fails, still consider it a success since the env var was updated
        console.error('Error updating .env file:', error);
        
        return res.status(200).json({
          success: true,
          message: 'Messaging profile ID updated in memory only. Could not update .env file.',
          warning: 'This change will be lost when the server restarts.'
        });
      }
    } catch (error) {
      console.error('Error updating messaging profile ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update messaging profile ID',
        error: error.message
      });
    }
  }

  /**
   * Get current Telnyx configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTelnyxConfig(req, res) {
    try {
      // Return sanitized configuration (hide full API key)
      const apiKey = process.env.TELNYX_API_KEY || '';
      const sanitizedApiKey = apiKey ? 
        (apiKey.startsWith('KEY') ? 
          `KEY...${apiKey.slice(-4)}` : 
          `${apiKey.split('_')[0]}_...${apiKey.slice(-4)}`) : 
        '';
        
      const config = {
        apiKeySet: !!apiKey,
        apiKeySummary: sanitizedApiKey,
        webhookUrl: process.env.WEBHOOK_URL || '',
        messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID || '',
        sipConnectionId: process.env.TELNYX_SIP_CONNECTION_ID || '',
        texmlAppId: process.env.TELNYX_TEXML_APP_ID || ''
      };
      
      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting Telnyx configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get Telnyx configuration',
        error: error.message
      });
    }
  }

  /**
   * Test Telnyx API connection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async testTelnyxConnection(req, res) {
    try {
      // Try to list phone numbers as a simple test
      const result = await telnyxService.listPhoneNumbers({ pageSize: 1 });
      
      res.status(200).json({
        success: true,
        message: 'Telnyx API connection successful',
        data: {
          phoneNumbersFound: result.length
        }
      });
    } catch (error) {
      console.error('Error testing Telnyx API connection:', error);
      res.status(500).json({
        success: false,
        message: 'Telnyx API connection failed',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController(); 