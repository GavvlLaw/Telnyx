const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

// Create new user
router.post('/', userController.createUser);

// Get user by ID
router.get('/:id', userController.getUserById);

// Update user
router.put('/:id', userController.updateUser);

// Delete user
router.delete('/:id', userController.deleteUser);

// Assign phone number to user
router.post('/:id/phone-number', userController.assignPhoneNumber);

// Update user availability settings
router.put('/:id/availability', userController.updateAvailability);

// Set or update email password
router.put('/:id/email-password', userController.setEmailPassword);

// Get available phone numbers
router.get('/phone-numbers/available', userController.getAvailablePhoneNumbers);

module.exports = router; 