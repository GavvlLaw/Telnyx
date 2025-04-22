const express = require('express');
const webrtcController = require('../controllers/webrtcController');
const router = express.Router();

// Generate SIP credentials for WebRTC
router.post('/credentials', webrtcController.generateCredentials);

// Reset SIP credentials password
router.post('/credentials/reset', webrtcController.resetCredentialsPassword);

// Delete SIP credentials
router.delete('/credentials', webrtcController.deleteCredentials);

// Get WebRTC connection token
router.post('/token', webrtcController.getConnectionToken);

// Check WebRTC status
router.get('/status/:userId', webrtcController.checkWebRTCStatus);

// Register device token for push notifications
router.post('/device-token', webrtcController.registerDeviceToken);

module.exports = router; 