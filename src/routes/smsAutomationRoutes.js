const express = require('express');
const smsAutomationController = require('../controllers/smsAutomationController');
const smsTemplateController = require('../controllers/smsTemplateController');
const router = express.Router();

// Template routes
router.get('/templates', smsTemplateController.getTemplates);
router.get('/templates/:id', smsTemplateController.getTemplateById);
router.post('/templates', smsTemplateController.createTemplate);
router.put('/templates/:id', smsTemplateController.updateTemplate);
router.delete('/templates/:id', smsTemplateController.deleteTemplate);
router.post('/templates/preview', smsTemplateController.previewTemplate);
router.get('/templates/variables/list', smsTemplateController.getTemplateVariables);

// Automation routes
router.get('/automations', smsAutomationController.getAutomations);
router.get('/automations/:id', smsAutomationController.getAutomationById);
router.post('/automations', smsAutomationController.createAutomation);
router.put('/automations/:id', smsAutomationController.updateAutomation);
router.delete('/automations/:id', smsAutomationController.deleteAutomation);
router.put('/automations/:id/toggle', smsAutomationController.toggleAutomationStatus);
router.get('/automations/:id/stats', smsAutomationController.getAutomationStats);
router.post('/automations/test', smsAutomationController.testAutomation);

module.exports = router; 