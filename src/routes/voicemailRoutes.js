const express = require('express');
const voicemailController = require('../controllers/voicemailController');
const router = express.Router();

// Get voicemails for a user
router.get('/user/:userId', voicemailController.getUserVoicemails);

// Get voicemail by ID
router.get('/:id', voicemailController.getVoicemailById);

// Mark voicemail as read
router.put('/:id/read', voicemailController.markVoicemailAsRead);

// Update voicemail notes
router.put('/:id/notes', voicemailController.updateVoicemailNotes);

// Delete voicemail
router.delete('/:id', voicemailController.deleteVoicemail);

// Update voicemail greeting text for a user
router.put('/user/:userId/greeting', voicemailController.updateVoicemailGreeting);

// Update voicemail greeting URL for a user
router.put('/user/:userId/greeting-url', voicemailController.updateVoicemailGreetingUrl);

// Get personalized voicemail greeting URL for a user
router.get('/user/:userId/greeting-url', voicemailController.getVoicemailGreetingUrl);

module.exports = router; 