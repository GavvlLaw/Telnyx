const express = require('express');
const callController = require('../controllers/callController');
const router = express.Router();

// Get calls for a user
router.get('/user/:userId', callController.getUserCalls);

// Get call by ID
router.get('/:id', callController.getCallById);

// Make outbound call
router.post('/', callController.makeOutboundCall);

// Update call notes
router.put('/:id/notes', callController.updateCallNotes);

// Webhook handlers for call events
router.post('/webhook/incoming', callController.handleIncomingCall);
router.post('/webhook/recording', callController.handleCallRecording);

module.exports = router; 