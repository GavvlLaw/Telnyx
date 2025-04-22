const { google } = require('googleapis');
const axios = require('axios');
const ical = require('node-ical');
const ICAL = require('ical.js');
const moment = require('moment');
const User = require('../models/User');

/**
 * Service for handling calendar integrations
 */
class CalendarService {
  /**
   * Initialize Google Calendar API client
   * @returns {Object} - Google Calendar API client
   */
  initGoogleCalendar() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }
  
  /**
   * Get Google OAuth URL for authorization
   * @returns {string} - Google OAuth URL
   */
  getGoogleAuthUrl() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly'
    ];
    
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }
  
  /**
   * Get Microsoft OAuth URL for authorization
   * @returns {string} - Microsoft OAuth URL
   */
  getMicrosoftAuthUrl() {
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    
    const scopes = [
      'offline_access',
      'Calendars.Read'
    ].join(' ');
    
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_mode=query`;
  }
  
  /**
   * Get Apple iCloud Calendar auth URL
   * @returns {string} - Apple auth URL info
   */
  getAppleAuthInfo() {
    // Apple uses app-specific passwords/tokens rather than OAuth flow
    return {
      message: "Apple calendar requires an app-specific password. Please follow instructions to connect your Apple account.",
      instructionsUrl: "https://support.apple.com/en-us/HT204397"
    };
  }
  
  /**
   * Get Calendly auth info
   * @returns {string} - Calendly auth info
   */
  getCalendlyAuthInfo() {
    return {
      message: "Calendly requires a Personal Access Token. Please generate one in your Calendly account settings.",
      instructionsUrl: "https://developer.calendly.com/getting-started"
    };
  }
  
  /**
   * Exchange Google auth code for tokens
   * @param {string} code - Authorization code
   * @returns {Promise<Object>} - Tokens
   */
  async getGoogleTokens(code) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }
  
  /**
   * Exchange Microsoft auth code for tokens
   * @param {string} code - Authorization code
   * @returns {Promise<Object>} - Tokens
   */
  async getMicrosoftTokens(code) {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    const params = new URLSearchParams();
    params.append('client_id', process.env.MICROSOFT_CLIENT_ID);
    params.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET);
    params.append('code', code);
    params.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI);
    params.append('grant_type', 'authorization_code');
    
    const response = await axios.post(tokenUrl, params);
    return response.data;
  }
  
  /**
   * Connect a user to Google Calendar
   * @param {string} userId - User ID
   * @param {string} code - Google authorization code
   * @returns {Promise<Object>} - Updated user
   */
  async connectGoogleCalendar(userId, code) {
    try {
      // Get tokens from authorization code
      const tokens = await this.getGoogleTokens(code);
      
      // Set up Google Calendar provider
      const calendarProvider = {
        type: 'google',
        isConnected: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date),
        lastSynced: new Date()
      };
      
      // Update user with Google Calendar info
      const user = await User.findByIdAndUpdate(
        userId,
        {
          'calendarIntegration.enabled': true,
          'calendarIntegration.provider': calendarProvider,
          'calendarIntegration.lastSyncTime': new Date()
        },
        { new: true }
      );
      
      // Sync calendar events immediately
      await this.syncUserCalendar(userId);
      
      return user;
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      throw new Error(`Failed to connect Google Calendar: ${error.message}`);
    }
  }
  
  /**
   * Connect a user to Microsoft/Outlook Calendar
   * @param {string} userId - User ID
   * @param {string} code - Microsoft authorization code
   * @returns {Promise<Object>} - Updated user
   */
  async connectMicrosoftCalendar(userId, code) {
    try {
      // Get tokens from authorization code
      const tokens = await this.getMicrosoftTokens(code);
      
      // Set up Microsoft Calendar provider
      const calendarProvider = {
        type: 'microsoft',
        isConnected: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        lastSynced: new Date()
      };
      
      // Update user with Microsoft Calendar info
      const user = await User.findByIdAndUpdate(
        userId,
        {
          'calendarIntegration.enabled': true,
          'calendarIntegration.provider': calendarProvider,
          'calendarIntegration.lastSyncTime': new Date()
        },
        { new: true }
      );
      
      // Sync calendar events immediately
      await this.syncUserCalendar(userId);
      
      return user;
    } catch (error) {
      console.error('Error connecting Microsoft Calendar:', error);
      throw new Error(`Failed to connect Microsoft Calendar: ${error.message}`);
    }
  }
  
  /**
   * Connect a user to Apple Calendar (iCloud)
   * @param {string} userId - User ID
   * @param {string} username - Apple ID
   * @param {string} appPassword - App-specific password
   * @returns {Promise<Object>} - Updated user
   */
  async connectAppleCalendar(userId, username, appPassword) {
    try {
      // Set up Apple Calendar provider
      const calendarProvider = {
        type: 'apple',
        isConnected: true,
        username: username,
        password: appPassword, // In production, this should be securely encrypted
        lastSynced: new Date()
      };
      
      // Update user with Apple Calendar info
      const user = await User.findByIdAndUpdate(
        userId,
        {
          'calendarIntegration.enabled': true,
          'calendarIntegration.provider': calendarProvider,
          'calendarIntegration.lastSyncTime': new Date()
        },
        { new: true }
      );
      
      // Sync calendar events immediately
      await this.syncUserCalendar(userId);
      
      return user;
    } catch (error) {
      console.error('Error connecting Apple Calendar:', error);
      throw new Error(`Failed to connect Apple Calendar: ${error.message}`);
    }
  }
  
  /**
   * Connect a user to Calendly
   * @param {string} userId - User ID
   * @param {string} apiKey - Calendly API key
   * @returns {Promise<Object>} - Updated user
   */
  async connectCalendly(userId, apiKey) {
    try {
      // Validate the API key by attempting to fetch user info
      await this.validateCalendlyApiKey(apiKey);
      
      // Set up Calendly provider
      const calendarProvider = {
        type: 'calendly',
        isConnected: true,
        apiKey: apiKey,
        lastSynced: new Date()
      };
      
      // Update user with Calendly info
      const user = await User.findByIdAndUpdate(
        userId,
        {
          'calendarIntegration.enabled': true,
          'calendarIntegration.provider': calendarProvider,
          'calendarIntegration.lastSyncTime': new Date()
        },
        { new: true }
      );
      
      // Sync calendar events immediately
      await this.syncUserCalendar(userId);
      
      return user;
    } catch (error) {
      console.error('Error connecting Calendly:', error);
      throw new Error(`Failed to connect Calendly: ${error.message}`);
    }
  }
  
  /**
   * Connect a user to Office 365 Calendar
   * @param {string} userId - User ID
   * @param {string} code - Office 365 authorization code
   * @returns {Promise<Object>} - Updated user
   */
  async connectOffice365Calendar(userId, code) {
    try {
      // Office 365 uses the same authentication flow as Microsoft
      return await this.connectMicrosoftCalendar(userId, code);
    } catch (error) {
      console.error('Error connecting Office 365 Calendar:', error);
      throw new Error(`Failed to connect Office 365 Calendar: ${error.message}`);
    }
  }
  
  /**
   * Connect a user to CalDAV calendar
   * @param {string} userId - User ID
   * @param {string} caldavUrl - CalDAV server URL
   * @param {string} username - CalDAV username
   * @param {string} password - CalDAV password
   * @returns {Promise<Object>} - Updated user
   */
  async connectCalDAVCalendar(userId, caldavUrl, username, password) {
    try {
      // Validate CalDAV credentials by attempting to connect
      // This would require a CalDAV client library in a real implementation
      
      // Set up CalDAV provider
      const calendarProvider = {
        type: 'caldav',
        isConnected: true,
        caldavUrl: caldavUrl,
        username: username,
        password: password, // In production, this should be securely encrypted
        lastSynced: new Date()
      };
      
      // Update user with CalDAV info
      const user = await User.findByIdAndUpdate(
        userId,
        {
          'calendarIntegration.enabled': true,
          'calendarIntegration.provider': calendarProvider,
          'calendarIntegration.lastSyncTime': new Date()
        },
        { new: true }
      );
      
      // Sync calendar events immediately
      await this.syncUserCalendar(userId);
      
      return user;
    } catch (error) {
      console.error('Error connecting CalDAV Calendar:', error);
      throw new Error(`Failed to connect CalDAV Calendar: ${error.message}`);
    }
  }
  
  /**
   * Connect a user to iCal URL
   * @param {string} userId - User ID
   * @param {string} icalUrl - URL to iCal feed
   * @returns {Promise<Object>} - Updated user
   */
  async connectIcalUrl(userId, icalUrl) {
    try {
      // Validate iCal URL by attempting to fetch it
      await axios.get(icalUrl);
      
      // Set up iCal provider
      const calendarProvider = {
        type: 'ical',
        isConnected: true,
        icalUrl,
        lastSynced: new Date()
      };
      
      // Update user with iCal info
      const user = await User.findByIdAndUpdate(
        userId,
        {
          'calendarIntegration.enabled': true,
          'calendarIntegration.provider': calendarProvider,
          'calendarIntegration.lastSyncTime': new Date()
        },
        { new: true }
      );
      
      // Sync calendar events immediately
      await this.syncUserCalendar(userId);
      
      return user;
    } catch (error) {
      console.error('Error connecting iCal feed:', error);
      throw new Error(`Failed to connect iCal feed: ${error.message}`);
    }
  }
  
  /**
   * Validate Calendly API key
   * @param {string} apiKey - Calendly API key
   * @returns {Promise<boolean>} - Whether the API key is valid
   */
  async validateCalendlyApiKey(apiKey) {
    try {
      // Make a request to Calendly API to validate the key
      const response = await axios.get('https://api.calendly.com/users/me', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.status === 200;
    } catch (error) {
      throw new Error('Invalid Calendly API key');
    }
  }
  
  /**
   * Sync calendar events for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated user with synced events
   */
  async syncUserCalendar(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.calendarIntegration || !user.calendarIntegration.enabled) {
        throw new Error('Calendar integration not enabled for this user');
      }
      
      const provider = user.calendarIntegration.provider;
      let events = [];
      
      // Get events based on provider type
      switch (provider.type) {
        case 'google':
          events = await this.fetchGoogleCalendarEvents(user);
          break;
        case 'microsoft':
        case 'office365':
          events = await this.fetchMicrosoftCalendarEvents(user);
          break;
        case 'apple':
          events = await this.fetchAppleCalendarEvents(user);
          break;
        case 'ical':
          events = await this.fetchIcalEvents(user);
          break;
        case 'caldav':
          events = await this.fetchCalDAVEvents(user);
          break;
        case 'calendly':
          events = await this.fetchCalendlyEvents(user);
          break;
        default:
          throw new Error(`Unsupported calendar provider: ${provider.type}`);
      }
      
      // Update user with new events
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          'calendarIntegration.events': events,
          'calendarIntegration.lastSyncTime': new Date(),
          'calendarIntegration.provider.lastSynced': new Date()
        },
        { new: true }
      );
      
      return updatedUser;
    } catch (error) {
      console.error('Error syncing calendar:', error);
      throw new Error(`Failed to sync calendar: ${error.message}`);
    }
  }
  
  /**
   * Fetch events from Google Calendar
   * @param {Object} user - User object
   * @returns {Promise<Array>} - Calendar events
   */
  async fetchGoogleCalendarEvents(user) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      const provider = user.calendarIntegration.provider;
      
      // Set credentials
      oauth2Client.setCredentials({
        access_token: provider.accessToken,
        refresh_token: provider.refreshToken
      });
      
      // Check if token needs refresh
      if (provider.tokenExpiry && new Date(provider.tokenExpiry) < new Date()) {
        const { tokens } = await oauth2Client.refreshToken(provider.refreshToken);
        
        // Update user with new tokens
        await User.findByIdAndUpdate(user._id, {
          'calendarIntegration.provider.accessToken': tokens.access_token,
          'calendarIntegration.provider.tokenExpiry': new Date(tokens.expiry_date)
        });
        
        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: provider.refreshToken
        });
      }
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Get events for the next week
      const now = new Date();
      const oneWeekLater = new Date();
      oneWeekLater.setDate(now.getDate() + 7);
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: oneWeekLater.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      // Format events
      return response.data.items.map(event => ({
        eventId: event.id,
        title: event.summary,
        startTime: new Date(event.start.dateTime || event.start.date),
        endTime: new Date(event.end.dateTime || event.end.date),
        allDay: !!event.start.date,
        recurrence: event.recurrence ? event.recurrence.join(';') : null,
        status: event.status,
        makeUnavailable: true // Default to making user unavailable during this event
      }));
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      throw new Error(`Failed to fetch Google Calendar events: ${error.message}`);
    }
  }
  
  /**
   * Fetch events from Microsoft/Office 365 Calendar
   * @param {Object} user - User object
   * @returns {Promise<Array>} - Calendar events
   */
  async fetchMicrosoftCalendarEvents(user) {
    try {
      const provider = user.calendarIntegration.provider;
      
      // Check if token needs refresh
      if (provider.tokenExpiry && new Date(provider.tokenExpiry) < new Date()) {
        // Refresh Microsoft token
        const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        
        const params = new URLSearchParams();
        params.append('client_id', process.env.MICROSOFT_CLIENT_ID);
        params.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET);
        params.append('refresh_token', provider.refreshToken);
        params.append('grant_type', 'refresh_token');
        
        const response = await axios.post(tokenUrl, params);
        const tokens = response.data;
        
        // Update user with new tokens
        await User.findByIdAndUpdate(user._id, {
          'calendarIntegration.provider.accessToken': tokens.access_token,
          'calendarIntegration.provider.refreshToken': tokens.refresh_token || provider.refreshToken,
          'calendarIntegration.provider.tokenExpiry': new Date(Date.now() + tokens.expires_in * 1000)
        });
        
        // Update provider with new tokens for this request
        provider.accessToken = tokens.access_token;
      }
      
      // Get events for the next week
      const now = new Date();
      const oneWeekLater = new Date();
      oneWeekLater.setDate(now.getDate() + 7);
      
      // Microsoft Graph API endpoint for calendar events
      const eventsUrl = 'https://graph.microsoft.com/v1.0/me/calendarView';
      const queryParams = `?startDateTime=${now.toISOString()}&endDateTime=${oneWeekLater.toISOString()}`;
      
      const response = await axios.get(`${eventsUrl}${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${provider.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Format events
      return response.data.value.map(event => ({
        eventId: event.id,
        title: event.subject,
        startTime: new Date(event.start.dateTime + 'Z'), // Microsoft returns local time
        endTime: new Date(event.end.dateTime + 'Z'),
        allDay: event.isAllDay,
        recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
        status: event.showAs === 'free' ? 'free' : 'busy',
        makeUnavailable: event.showAs !== 'free' // Only make user unavailable if busy
      }));
    } catch (error) {
      console.error('Error fetching Microsoft Calendar events:', error);
      throw new Error(`Failed to fetch Microsoft Calendar events: ${error.message}`);
    }
  }
  
  /**
   * Fetch events from Apple Calendar (iCloud)
   * @param {Object} user - User object
   * @returns {Promise<Array>} - Calendar events
   */
  async fetchAppleCalendarEvents(user) {
    try {
      const provider = user.calendarIntegration.provider;
      
      // In a real implementation, you would use a library to connect to iCloud
      // or use an iCal URL from the user's iCloud account
      
      // For now, we'll return a placeholder message
      console.log('Apple Calendar integration would require a specialized library');
      
      // Return empty events array as this is a placeholder
      return [];
    } catch (error) {
      console.error('Error fetching Apple Calendar events:', error);
      throw new Error(`Failed to fetch Apple Calendar events: ${error.message}`);
    }
  }
  
  /**
   * Fetch events from CalDAV calendar
   * @param {Object} user - User object
   * @returns {Promise<Array>} - Calendar events
   */
  async fetchCalDAVEvents(user) {
    try {
      // In a real implementation, you would use a CalDAV client library
      // such as 'dav' or a similar package
      
      // For now, we'll return a placeholder message
      console.log('CalDAV integration would require a specialized library');
      
      // Return empty events array as this is a placeholder
      return [];
    } catch (error) {
      console.error('Error fetching CalDAV events:', error);
      throw new Error(`Failed to fetch CalDAV events: ${error.message}`);
    }
  }
  
  /**
   * Fetch events from Calendly
   * @param {Object} user - User object
   * @returns {Promise<Array>} - Calendar events
   */
  async fetchCalendlyEvents(user) {
    try {
      const provider = user.calendarIntegration.provider;
      
      // Get events for the next week
      const now = new Date();
      const oneWeekLater = new Date();
      oneWeekLater.setDate(now.getDate() + 7);
      
      // Calendly API endpoint for scheduled events
      const eventsUrl = 'https://api.calendly.com/scheduled_events';
      const queryParams = `?min_start_time=${now.toISOString()}&max_start_time=${oneWeekLater.toISOString()}`;
      
      // First, get user URI
      const userResponse = await axios.get('https://api.calendly.com/users/me', {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const userUri = userResponse.data.resource.uri;
      
      // Get events for this user
      const response = await axios.get(`${eventsUrl}${queryParams}&user=${userUri}`, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Format events
      return response.data.collection.map(event => ({
        eventId: event.uri.split('/').pop(),
        title: event.name,
        startTime: new Date(event.start_time),
        endTime: new Date(event.end_time),
        allDay: false, // Calendly events are never all-day
        status: 'confirmed',
        makeUnavailable: true // Calendly events always make user unavailable
      }));
    } catch (error) {
      console.error('Error fetching Calendly events:', error);
      throw new Error(`Failed to fetch Calendly events: ${error.message}`);
    }
  }
  
  /**
   * Fetch events from iCal URL
   * @param {Object} user - User object
   * @returns {Promise<Array>} - Calendar events
   */
  async fetchIcalEvents(user) {
    try {
      const provider = user.calendarIntegration.provider;
      
      if (!provider.icalUrl) {
        throw new Error('No iCal URL provided');
      }
      
      // Fetch the iCal data
      const response = await axios.get(provider.icalUrl);
      const events = await ical.async.parseICS(response.data);
      
      // Get events for the next week
      const now = new Date();
      const oneWeekLater = new Date();
      oneWeekLater.setDate(now.getDate() + 7);
      
      // Format events
      const formattedEvents = [];
      
      for (const key in events) {
        const event = events[key];
        
        // Skip non-events
        if (event.type !== 'VEVENT') continue;
        
        // Check if event is within the next week
        const startTime = event.start;
        const endTime = event.end;
        
        // Skip events that have already ended
        if (endTime < now) continue;
        
        // Skip events that start after our week window
        if (startTime > oneWeekLater) continue;
        
        formattedEvents.push({
          eventId: event.uid,
          title: event.summary,
          startTime,
          endTime,
          allDay: !event.start.hasOwnProperty('tz'),
          recurrence: event.rrule ? event.rrule.toString() : null,
          status: event.status || 'confirmed',
          makeUnavailable: true // Default to making user unavailable during this event
        });
      }
      
      return formattedEvents;
    } catch (error) {
      console.error('Error fetching iCal events:', error);
      throw new Error(`Failed to fetch iCal events: ${error.message}`);
    }
  }
  
  /**
   * Check if a user is currently in a meeting
   * @param {Object} user - User object
   * @returns {boolean} - Whether the user is in a meeting
   */
  isUserInMeeting(user) {
    if (!user.calendarIntegration || !user.calendarIntegration.enabled || 
        !user.calendarIntegration.makeUnavailableDuringEvents) {
      return false;
    }
    
    // Get current time
    const now = new Date();
    
    // Check if any events are happening now
    const currentEvent = user.calendarIntegration.events.find(event => {
      // Skip events that are cancelled
      if (event.status === 'cancelled') return false;
      
      // Skip events that user has excluded
      if (!event.makeUnavailable) return false;
      
      // Check if current time is within event time
      return now >= event.startTime && now <= event.endTime;
    });
    
    return !!currentEvent;
  }
  
  /**
   * Disconnect calendar integration for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated user
   */
  async disconnectCalendar(userId) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          'calendarIntegration.enabled': false,
          'calendarIntegration.provider': null,
          'calendarIntegration.events': []
        },
        { new: true }
      );
      
      return updatedUser;
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      throw new Error(`Failed to disconnect calendar: ${error.message}`);
    }
  }
  
  /**
   * Update event settings (e.g., makeUnavailable flag)
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @param {Object} settings - Event settings to update
   * @returns {Promise<Object>} - Updated user
   */
  async updateEventSettings(userId, eventId, settings) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.calendarIntegration || !user.calendarIntegration.enabled) {
        throw new Error('Calendar integration not enabled for this user');
      }
      
      // Find the event
      const eventIndex = user.calendarIntegration.events.findIndex(e => e.eventId === eventId);
      
      if (eventIndex === -1) {
        throw new Error(`Event not found: ${eventId}`);
      }
      
      // Update the event
      const events = [...user.calendarIntegration.events];
      events[eventIndex] = { ...events[eventIndex], ...settings };
      
      // Save updated user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 'calendarIntegration.events': events },
        { new: true }
      );
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating event settings:', error);
      throw new Error(`Failed to update event settings: ${error.message}`);
    }
  }
}

module.exports = new CalendarService(); 