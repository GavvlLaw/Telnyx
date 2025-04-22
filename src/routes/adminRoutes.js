const express = require('express');
const adminController = require('../controllers/adminController');
const router = express.Router();

// Get Telnyx configuration
router.get('/telnyx-config', adminController.getTelnyxConfig);

// Update Telnyx API key
router.put('/telnyx-api-key', adminController.updateTelnyxApiKey);

// Update webhook URL
router.put('/webhook-url', adminController.updateWebhookUrl);

// Update messaging profile ID
router.put('/messaging-profile-id', adminController.updateMessagingProfileId);

// Test Telnyx API connection
router.get('/test-telnyx-connection', adminController.testTelnyxConnection);

module.exports = router; 