const express = require('express');
const smsController = require('../controllers/smsController');
const router = express.Router();

// Get messages for a user
router.get('/user/:userId', smsController.getUserMessages);

// Get message by ID
router.get('/:id', smsController.getSMSById);

// Send SMS message
router.post('/', smsController.sendSMS);

// Webhook handlers for SMS events
router.post('/webhook/incoming', smsController.handleIncomingSMS);
router.post('/webhook/status', smsController.handleSMSStatus);

module.exports = router; 