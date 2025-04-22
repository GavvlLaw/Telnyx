const express = require('express');
const phoneController = require('../controllers/phoneController');
const router = express.Router();

// Get available phone numbers 
router.get('/available', phoneController.searchAvailableNumbers);

// List phone numbers in the account
router.get('/', phoneController.listNumbers);

// Get details for a specific phone number
router.get('/:phoneId', phoneController.getNumberDetails);

// Purchase a new phone number
router.post('/', phoneController.purchaseNumber);

// Assign a phone number to a user
router.post('/assign', phoneController.assignNumberToUser);

// Update settings for a phone number
router.put('/:phoneId', phoneController.updateNumberSettings);

// Release (delete) a phone number
router.delete('/:phoneId', phoneController.releaseNumber);

module.exports = router; 