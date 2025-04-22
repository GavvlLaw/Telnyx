const telnyx = require('telnyx');
const moment = require('moment');
const User = require('../models/User');
const calendarService = require('./calendarService');

// Initialize Telnyx client with API key, handling V2 keys properly
let telnyxClient;
const apiKey = process.env.TELNYX_API_KEY;

// Check if this is a V2 API key format (with underscore separator)
if (apiKey && apiKey.includes('_')) {
  // For V2 keys, split into id and secret
  const [keyId, keySecret] = apiKey.split('_');
  telnyxClient = telnyx({
    apiKey: keyId,
    apiSecret: keySecret
  });
  console.log('Initialized Telnyx client with V2 API key format');
} else {
  // For V1 keys or legacy format
  telnyxClient = telnyx(apiKey);
  console.log('Initialized Telnyx client with standard API key format');
}

// Ring timeout in seconds before going to voicemail
const RING_TIMEOUT_SECONDS = 15;

// Central forwarding number for option 2
const CENTRAL_FORWARDING_NUMBER = '+18446942885';

// Unavailable prompt URL
const UNAVAILABLE_PROMPT_URL = 'https://raw.githubusercontent.com/GavvlLaw/voicemail-greetings/main/Unavailable';

/**
 * Service for handling Telnyx phone numbers and telephony operations
 */
class TelnyxService {
  /**
   * Search for available phone numbers
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - List of available phone numbers
   */
  async searchPhoneNumbers(options = {}) {
    try {
      const defaultOptions = {
        country_code: 'US',
        limit: 10,
        features: ['sms', 'voice'],
        ...options
      };

      const result = await telnyxClient.availablePhoneNumbers.list(defaultOptions);
      return result.data;
    } catch (error) {
      console.error('Error searching for phone numbers:', error);
      throw new Error(`Failed to search phone numbers: ${error.message}`);
    }
  }

  /**
   * Purchase a phone number from Telnyx
   * @param {string} phoneNumber - The phone number to purchase
   * @param {Object} options - Purchase options
   * @returns {Promise<Object>} - The purchased phone number details
   */
  async purchasePhoneNumber(phoneNumber, options = {}) {
    try {
      const defaultOptions = {
        phone_number: phoneNumber,
        connection_id: process.env.TELNYX_SIP_CONNECTION_ID,
        messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID,
        ...options
      };

      const result = await telnyxClient.numberOrders.create(defaultOptions);
      return result.data;
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      throw new Error(`Failed to purchase phone number: ${error.message}`);
    }
  }

  /**
   * Assign a phone number to a user
   * @param {string} userId - The user ID
   * @param {string} phoneNumber - The phone number to assign
   * @returns {Promise<Object>} - Updated user document
   */
  async assignPhoneNumberToUser(userId, phoneNumber) {
    try {
      // First purchase the phone number
      const purchasedNumber = await this.purchasePhoneNumber(phoneNumber);
      
      // Then update the user with the new phone number
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          telnyxPhoneId: purchasedNumber.id,
          telnyxPhoneNumber: purchasedNumber.phone_number
        },
        { new: true }
      );
      
      return updatedUser;
    } catch (error) {
      console.error('Error assigning phone number to user:', error);
      throw new Error(`Failed to assign phone number: ${error.message}`);
    }
  }

  /**
   * Make an outbound call
   * @param {string} from - From phone number
   * @param {string} to - To phone number
   * @param {Object} options - Call options
   * @returns {Promise<Object>} - Call control information
   */
  async makeOutboundCall(from, to, options = {}) {
    try {
      const defaultOptions = {
        connection_id: process.env.TELNYX_SIP_CONNECTION_ID,
        texml_application_id: process.env.TELNYX_TEXML_APP_ID,
        from,
        to,
        ...options
      };

      const call = await telnyxClient.calls.create(defaultOptions);
      return call.data;
    } catch (error) {
      console.error('Error making outbound call:', error);
      throw new Error(`Failed to make call: ${error.message}`);
    }
  }

  /**
   * Send SMS message
   * @param {string} from - From phone number
   * @param {string} to - To phone number
   * @param {string} text - Message text
   * @param {Object} options - SMS options
   * @returns {Promise<Object>} - Message information
   */
  async sendSMS(from, to, text, options = {}) {
    try {
      const defaultOptions = {
        from,
        to,
        text,
        messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID,
        ...options
      };

      const message = await telnyxClient.messages.create(defaultOptions);
      return message.data;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Check if a user is available based on their availability settings
   * @param {Object} user - User object with availability settings
   * @returns {boolean} - Whether the user is currently available
   */
  isUserAvailable(user) {
    // Check calendar integration first - if the user is in a meeting, they're unavailable
    if (calendarService.isUserInMeeting(user)) {
      return false;
    }
    
    // Then check regular availability settings
    const now = moment();
    const dayOfWeek = now.format('dddd').toLowerCase();
    const currentTime = now.format('HH:mm');
    
    // Find the availability setting for the current day
    const dayAvailability = user.availability.find(a => a.day === dayOfWeek);
    
    if (!dayAvailability || !dayAvailability.isAvailable) {
      return false;
    }
    
    // Check if current time is within available hours
    return currentTime >= dayAvailability.startTime && currentTime <= dayAvailability.endTime;
  }

  /**
   * Handle DTMF input for unavailable user flow
   * @param {Object} event - The DTMF event from Telnyx
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Result of handling the DTMF
   */
  async handleUnavailableDTMF(event, user) {
    try {
      const { call_control_id, digit } = event.payload;
      
      switch (digit) {
        case '1':
          // Option 1: Go to voicemail
          return this.sendToVoicemail(call_control_id, user);
          
        case '2':
          // Option 2: Forward to central number
          const result = await telnyxClient.calls.update(call_control_id, {
            command_id: 'transfer',
            to: CENTRAL_FORWARDING_NUMBER,
            webhook_url: process.env.WEBHOOK_URL,
            webhook_type: 'transfer'
          });
          
          return { 
            action: 'forwarded_to_central', 
            result: result.data 
          };
          
        default:
          // Default: Any other key or no key pressed (timeout) - go to voicemail
          return this.sendToVoicemail(call_control_id, user);
      }
    } catch (error) {
      console.error('Error handling DTMF input:', error);
      throw new Error(`Failed to handle DTMF input: ${error.message}`);
    }
  }
  
  /**
   * Send a call to voicemail
   * @param {string} callControlId - Call control ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Result of sending to voicemail
   */
  async sendToVoicemail(callControlId, user) {
    try {
      // Determine which voicemail greeting to use
      let audioUrl;
      
      // Check if user has a custom voicemail greeting URL
      if (user.voicemailGreetingUrl) {
        audioUrl = user.voicemailGreetingUrl;
      } else {
        // Use the GitHub repository format with the user's first name
        const firstName = user.name.split(' ')[0];
        // Encode the first name for URL (spaces become %20)
        const encodedName = encodeURIComponent(`${firstName} Voicemail.mp3`);
        audioUrl = `https://raw.githubusercontent.com/GavvlLaw/voicemail-greetings/main/${encodedName}`;
      }
      
      try {
        // Play voicemail greeting audio file
        const result = await telnyxClient.calls.update(callControlId, {
          command_id: 'play_audio',
          audio_url: audioUrl
        });
        
        // After playing greeting, wait a second and then start recording for voicemail
        setTimeout(async () => {
          await telnyxClient.calls.update(callControlId, {
            command_id: 'record_start',
            format: 'mp3',
            channels: 'single',
            play_beep: true
          });
        }, 1000);
        
        return { action: 'voicemail', result: result.data };
      } catch (audioError) {
        console.error('Error playing audio greeting, falling back to text:', audioError);
        
        // Fallback to text-to-speech if audio fails
        const result = await telnyxClient.calls.update(callControlId, {
          command_id: 'speak',
          payload: user.voicemailGreeting,
          voice: 'female',
          language: 'en-US'
        });
        
        // After greeting, start recording for voicemail
        await telnyxClient.calls.update(callControlId, {
          command_id: 'record_start',
          format: 'mp3',
          channels: 'single',
          play_beep: true
        });
        
        return { action: 'voicemail', result: result.data };
      }
    } catch (error) {
      console.error('Error sending to voicemail:', error);
      throw new Error(`Failed to send to voicemail: ${error.message}`);
    }
  }

  /**
   * Handle an incoming call based on user availability
   * @param {Object} user - User object
   * @param {string} callControlId - Call control ID
   * @returns {Promise<Object>} - Call handling result
   */
  async handleIncomingCall(user, callControlId) {
    try {
      // Check if user is available based on their settings
      const isAvailable = this.isUserAvailable(user);
      
      if (isAvailable) {
        // User is available, forward the call to their number
        // But first set a timeout for the call
        await telnyxClient.calls.update(callControlId, {
          command_id: 'answer',
          client_state: 'awaiting-transfer'
        });
        
        // Create a call control transfer to the user's phone number
        // with a specific timeout that will end the transfer attempt after 15 seconds
        const result = await telnyxClient.calls.update(callControlId, {
          command_id: 'transfer',
          to: user.phoneNumber,
          timeout_secs: RING_TIMEOUT_SECONDS,
          webhook_url: process.env.WEBHOOK_URL,
          webhook_type: 'transfer'
        });
        
        return { action: 'forwarded', result: result.data };
      } else if (user.routeToLiveAgent && user.liveAgentNumber) {
        // User is not available but has live agent routing enabled
        // First answer the call
        await telnyxClient.calls.update(callControlId, {
          command_id: 'answer',
          client_state: 'awaiting-transfer'
        });
        
        // Create a call control transfer to the live agent with a timeout
        const result = await telnyxClient.calls.update(callControlId, {
          command_id: 'transfer',
          to: user.liveAgentNumber,
          timeout_secs: RING_TIMEOUT_SECONDS,
          webhook_url: process.env.WEBHOOK_URL,
          webhook_type: 'transfer'
        });
        
        return { action: 'routed_to_agent', result: result.data };
      } else {
        // User is not available, play unavailable prompt with options
        // First answer the call
        await telnyxClient.calls.update(callControlId, {
          command_id: 'answer'
        });
        
        // Play the unavailable prompt that offers options
        const result = await telnyxClient.calls.update(callControlId, {
          command_id: 'play_audio',
          audio_url: UNAVAILABLE_PROMPT_URL,
          client_state: 'gathering-input'
        });
        
        // Set up DTMF gathering for user input
        await telnyxClient.calls.update(callControlId, {
          command_id: 'gather',
          max_digits: 1,
          timeout_secs: 5, // Give 5 seconds to press a key
          client_state: 'unavailable-flow'
        });
        
        return { 
          action: 'unavailable_prompt', 
          result: result.data,
          message: 'Playing unavailable prompt with options: 1 for voicemail, 2 for central number'
        };
      }
    } catch (error) {
      console.error('Error handling incoming call:', error);
      throw new Error(`Failed to handle call: ${error.message}`);
    }
  }

  /**
   * Generate the GitHub voicemail greeting URL for a user
   * @param {Object} user - User object
   * @returns {string} - URL to the audio file for voicemail greeting
   */
  generateGitHubVoicemailUrl(user) {
    const firstName = user.name.split(' ')[0];
    const encodedName = encodeURIComponent(`${firstName} Voicemail.mp3`);
    // Use the raw.githubusercontent.com URL to directly access the file content
    return `https://raw.githubusercontent.com/GavvlLaw/voicemail-greetings/main/${encodedName}`;
  }

  /**
   * Update user's voicemail greeting URL
   * @param {string} userId - The user ID
   * @param {string} greetingUrl - URL to the audio file for voicemail greeting
   * @returns {Promise<Object>} - Updated user document
   */
  async updateVoicemailGreetingUrl(userId, greetingUrl) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { voicemailGreetingUrl: greetingUrl },
        { new: true }
      );
      
      if (!updatedUser) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating voicemail greeting URL:', error);
      throw new Error(`Failed to update voicemail greeting URL: ${error.message}`);
    }
  }

  /**
   * List all phone numbers in the Telnyx account
   * @param {Object} options - Listing options such as page, pageSize, and status
   * @returns {Promise<Array>} - List of phone numbers
   */
  async listPhoneNumbers(options = {}) {
    try {
      const defaultOptions = {
        page: 1,
        pageSize: 25,
        status: 'active',
        ...options
      };

      const result = await telnyxClient.phoneNumbers.list({
        page: {
          number: defaultOptions.page,
          size: defaultOptions.pageSize
        },
        filter: {
          status: defaultOptions.status
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('Error listing phone numbers:', error);
      throw new Error(`Failed to list phone numbers: ${error.message}`);
    }
  }

  /**
   * Get details for a specific phone number by ID
   * @param {string} phoneId - The ID of the phone number
   * @returns {Promise<Object>} - The phone number details
   */
  async getPhoneNumberDetails(phoneId) {
    try {
      const result = await telnyxClient.phoneNumbers.retrieve(phoneId);
      return result.data;
    } catch (error) {
      console.error(`Error retrieving phone number ${phoneId}:`, error);
      throw new Error(`Failed to get phone number details: ${error.message}`);
    }
  }

  /**
   * Release (delete) a phone number from the Telnyx account
   * @param {string} phoneId - The ID of the phone number to release
   * @returns {Promise<Object>} - Result of the release operation
   */
  async releasePhoneNumber(phoneId) {
    try {
      const result = await telnyxClient.phoneNumbers.delete(phoneId);
      return result.data;
    } catch (error) {
      console.error(`Error releasing phone number ${phoneId}:`, error);
      throw new Error(`Failed to release phone number: ${error.message}`);
    }
  }

  /**
   * Update settings for a phone number
   * @param {string} phoneId - The ID of the phone number to update
   * @param {Object} options - Update options (messaging_profile_id, connection_id, tags)
   * @returns {Promise<Object>} - Updated phone number details
   */
  async updatePhoneNumber(phoneId, options = {}) {
    try {
      const result = await telnyxClient.phoneNumbers.update(phoneId, options);
      return result.data;
    } catch (error) {
      console.error(`Error updating phone number ${phoneId}:`, error);
      throw new Error(`Failed to update phone number: ${error.message}`);
    }
  }

  /**
   * Generate SIP credentials for WebRTC
   * @param {Object} user - User object
   * @returns {Promise<Object>} - SIP credentials
   */
  async generateSIPCredentials(user) {
    try {
      // Create a SIP connection with Telnyx if user doesn't have one
      if (!user.sipCredentialId) {
        const result = await telnyxClient.sipCredentials.create({
          connection_id: process.env.TELNYX_SIP_CONNECTION_ID,
          name: `User-${user._id}-Credentials`,
          user_name: `user-${user._id}-${Date.now()}`, // Ensure uniqueness
          password: this.generateRandomPassword(), // Implement this helper
        });
        
        // Update user with new credential ID
        await User.findByIdAndUpdate(user._id, {
          sipCredentialId: result.data.id,
          sipUsername: result.data.user_name,
          webrtcEnabled: true
        });
        
        return {
          credentialId: result.data.id,
          username: result.data.user_name,
          password: result.data.password, // Only returned once
          sipUri: process.env.TELNYX_SIP_URI,
          wsUri: process.env.TELNYX_WS_URI
        };
      } else {
        // Retrieve existing credentials
        const result = await telnyxClient.sipCredentials.retrieve(user.sipCredentialId);
        
        // Note: Password is not retrievable, would need to reset if lost
        return {
          credentialId: result.data.id,
          username: result.data.user_name,
          // Password not included in retrieval
          sipUri: process.env.TELNYX_SIP_URI,
          wsUri: process.env.TELNYX_WS_URI
        };
      }
    } catch (error) {
      console.error('Error generating SIP credentials:', error);
      throw new Error(`Failed to generate SIP credentials: ${error.message}`);
    }
  }

  /**
   * Reset SIP credentials password
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated SIP credentials
   */
  async resetSIPCredentialsPassword(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.sipCredentialId) {
        throw new Error('User does not have SIP credentials');
      }

      // Generate new password
      const password = this.generateRandomPassword();
      
      // Update SIP credentials with new password
      const result = await telnyxClient.sipCredentials.update(user.sipCredentialId, {
        password
      });
      
      return {
        credentialId: result.data.id,
        username: result.data.user_name,
        password, // Return new password
        sipUri: process.env.TELNYX_SIP_URI,
        wsUri: process.env.TELNYX_WS_URI
      };
    } catch (error) {
      console.error('Error resetting SIP credentials password:', error);
      throw new Error(`Failed to reset SIP credentials password: ${error.message}`);
    }
  }

  /**
   * Generate a random secure password
   * @returns {string} - Random password
   */
  generateRandomPassword() {
    const length = 16;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }

  /**
   * Generate a WebRTC token for connecting
   * @param {string} userId - User ID
   * @returns {Promise<string>} - Connection token
   */
  async generateWebRTCToken(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.sipCredentialId) {
        throw new Error('User does not have SIP credentials');
      }
      
      // Generate WebRTC token using Telnyx API
      const result = await telnyxClient.credentials.token({
        credential_id: user.sipCredentialId
      });
      
      return result.data.token;
    } catch (error) {
      console.error('Error generating WebRTC token:', error);
      throw new Error(`Failed to generate WebRTC token: ${error.message}`);
    }
  }

  /**
   * Delete SIP credentials
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success
   */
  async deleteSIPCredentials(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.sipCredentialId) {
        throw new Error('User does not have SIP credentials');
      }
      
      // Delete SIP credentials
      await telnyxClient.sipCredentials.delete(user.sipCredentialId);
      
      // Update user record
      await User.findByIdAndUpdate(userId, {
        $unset: { sipCredentialId: 1, sipUsername: 1 },
        webrtcEnabled: false
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting SIP credentials:', error);
      throw new Error(`Failed to delete SIP credentials: ${error.message}`);
    }
  }

  /**
   * Reinitialize the Telnyx client with a new API key
   * @param {string} apiKey - The new API key to use
   */
  reinitializeClient(apiKey) {
    try {
      // Check if this is a V2 API key format (with underscore separator)
      if (apiKey && apiKey.includes('_')) {
        // For V2 keys, split into id and secret
        const [keyId, keySecret] = apiKey.split('_');
        telnyxClient = telnyx({
          apiKey: keyId,
          apiSecret: keySecret
        });
        console.log('Reinitialized Telnyx client with V2 API key format');
      } else {
        // For V1 keys or legacy format
        telnyxClient = telnyx(apiKey);
        console.log('Reinitialized Telnyx client with standard API key format');
      }
      return true;
    } catch (error) {
      console.error('Error reinitializing Telnyx client:', error);
      throw new Error(`Failed to reinitialize Telnyx client: ${error.message}`);
    }
  }
}

module.exports = new TelnyxService(); 