const express = require('express');
const calendarController = require('../controllers/calendarController');
const router = express.Router();

// Get Google auth URL
router.get('/google/auth-url', calendarController.getGoogleAuthUrl);

// Connect Google Calendar
router.post('/user/:userId/google/connect', calendarController.connectGoogleCalendar);

// Connect iCal feed
router.post('/user/:userId/ical/connect', calendarController.connectIcalFeed);

// Get calendar events for a user
router.get('/user/:userId/events', calendarController.getCalendarEvents);

// Sync calendar for a user
router.post('/user/:userId/sync', calendarController.syncCalendar);

// Update event settings
router.put('/user/:userId/event/:eventId', calendarController.updateEventSettings);

// Disconnect calendar
router.delete('/user/:userId/disconnect', calendarController.disconnectCalendar);

// Update calendar settings
router.put('/user/:userId/settings', calendarController.updateCalendarSettings);

module.exports = router; 