const calendarService = require('../services/calendarService');
const User = require('../models/User');

/**
 * Controller for handling calendar integration
 */
class CalendarController {
  /**
   * Get Google Calendar auth URL
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getGoogleAuthUrl(req, res) {
    try {
      const authUrl = calendarService.getGoogleAuthUrl();
      res.status(200).json({ authUrl });
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      res.status(500).json({ error: 'Failed to generate auth URL' });
    }
  }
  
  /**
   * Connect Google Calendar
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async connectGoogleCalendar(req, res) {
    try {
      const { userId } = req.params;
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }
      
      const user = await calendarService.connectGoogleCalendar(userId, code);
      res.status(200).json({ 
        message: 'Google Calendar connected successfully',
        user
      });
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      res.status(500).json({ error: 'Failed to connect Google Calendar' });
    }
  }
  
  /**
   * Connect iCal feed
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async connectIcalFeed(req, res) {
    try {
      const { userId } = req.params;
      const { icalUrl } = req.body;
      
      if (!icalUrl) {
        return res.status(400).json({ error: 'iCal URL is required' });
      }
      
      const user = await calendarService.connectIcalUrl(userId, icalUrl);
      res.status(200).json({ 
        message: 'iCal feed connected successfully',
        user
      });
    } catch (error) {
      console.error('Error connecting iCal feed:', error);
      res.status(500).json({ error: 'Failed to connect iCal feed' });
    }
  }
  
  /**
   * Sync calendar events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async syncCalendar(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await calendarService.syncUserCalendar(userId);
      res.status(200).json({ 
        message: 'Calendar synced successfully',
        events: user.calendarIntegration.events,
        lastSyncTime: user.calendarIntegration.lastSyncTime
      });
    } catch (error) {
      console.error('Error syncing calendar:', error);
      res.status(500).json({ error: 'Failed to sync calendar' });
    }
  }
  
  /**
   * Get calendar events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCalendarEvents(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!user.calendarIntegration || !user.calendarIntegration.enabled) {
        return res.status(400).json({ error: 'Calendar integration not enabled' });
      }
      
      res.status(200).json({ 
        events: user.calendarIntegration.events,
        lastSyncTime: user.calendarIntegration.lastSyncTime
      });
    } catch (error) {
      console.error('Error getting calendar events:', error);
      res.status(500).json({ error: 'Failed to get calendar events' });
    }
  }
  
  /**
   * Update event settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateEventSettings(req, res) {
    try {
      const { userId, eventId } = req.params;
      const { makeUnavailable } = req.body;
      
      if (makeUnavailable === undefined) {
        return res.status(400).json({ error: 'Event settings are required' });
      }
      
      const user = await calendarService.updateEventSettings(userId, eventId, { makeUnavailable });
      res.status(200).json({ 
        message: 'Event settings updated successfully',
        event: user.calendarIntegration.events.find(e => e.eventId === eventId)
      });
    } catch (error) {
      console.error('Error updating event settings:', error);
      res.status(500).json({ error: 'Failed to update event settings' });
    }
  }
  
  /**
   * Disconnect calendar integration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async disconnectCalendar(req, res) {
    try {
      const { userId } = req.params;
      
      await calendarService.disconnectCalendar(userId);
      res.status(200).json({ message: 'Calendar disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      res.status(500).json({ error: 'Failed to disconnect calendar' });
    }
  }
  
  /**
   * Update calendar integration settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateCalendarSettings(req, res) {
    try {
      const { userId } = req.params;
      const { enabled, makeUnavailableDuringEvents, syncFrequency, excludeEventTypes } = req.body;
      
      const updateFields = {};
      
      if (enabled !== undefined) {
        updateFields['calendarIntegration.enabled'] = enabled;
      }
      
      if (makeUnavailableDuringEvents !== undefined) {
        updateFields['calendarIntegration.makeUnavailableDuringEvents'] = makeUnavailableDuringEvents;
      }
      
      if (syncFrequency !== undefined) {
        updateFields['calendarIntegration.syncFrequency'] = syncFrequency;
      }
      
      if (excludeEventTypes) {
        updateFields['calendarIntegration.excludeEventTypes'] = excludeEventTypes;
      }
      
      const user = await User.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json({ 
        message: 'Calendar settings updated successfully',
        calendarIntegration: user.calendarIntegration
      });
    } catch (error) {
      console.error('Error updating calendar settings:', error);
      res.status(500).json({ error: 'Failed to update calendar settings' });
    }
  }
}

module.exports = new CalendarController(); 