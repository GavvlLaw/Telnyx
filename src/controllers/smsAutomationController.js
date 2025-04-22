const SmsAutomation = require('../models/SmsAutomation');
const smsAutomationService = require('../services/smsAutomationService');
const errorHandler = require('../utils/errorHandler');

/**
 * Controller for SMS automations
 */
class SmsAutomationController {
  /**
   * Get all automations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAutomations(req, res) {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get filters from query parameters
      const filters = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.triggerType) {
        filters.triggerType = req.query.triggerType;
      }
      if (req.query.search) {
        filters.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } }
        ];
      }
      
      // Get automations with pagination and filters
      const automations = await SmsAutomation.find(filters)
        .populate('templateId')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      // Get total count for pagination
      const total = await SmsAutomation.countDocuments(filters);
      
      res.status(200).json({
        success: true,
        count: automations.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: automations
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Get an automation by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAutomationById(req, res) {
    try {
      const automation = await SmsAutomation.findById(req.params.id)
        .populate('templateId');
      
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automation not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: automation
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Create a new automation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createAutomation(req, res) {
    try {
      const {
        name,
        description,
        triggerType,
        triggerConditions,
        templateId,
        templateContent,
        status,
        delay,
        priority,
        phoneNumbers
      } = req.body;
      
      if (!name || !triggerType || (!templateId && !templateContent)) {
        return res.status(400).json({
          success: false,
          message: 'Name, trigger type, and either template ID or content are required'
        });
      }
      
      // Create automation object
      const automationData = {
        name,
        description: description || '',
        triggerType,
        triggerConditions: triggerConditions || {},
        status: status || 'inactive',
        delay: delay || 0,
        priority: priority || 'normal',
        phoneNumbers: phoneNumbers || []
      };
      
      // Check if we're using an existing template or creating a custom one
      if (templateId) {
        automationData.templateId = templateId;
        automationData.useCustomTemplate = false;
      } else if (templateContent) {
        automationData.templateContent = templateContent;
        automationData.useCustomTemplate = true;
      }
      
      // Create the automation
      const automation = await SmsAutomation.create(automationData);
      
      res.status(201).json({
        success: true,
        data: automation
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Update an existing automation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateAutomation(req, res) {
    try {
      const { 
        name, 
        description, 
        triggerType, 
        triggerConditions, 
        templateId, 
        templateContent,
        status,
        delay,
        priority,
        phoneNumbers
      } = req.body;
      
      // Find the automation
      const automation = await SmsAutomation.findById(req.params.id);
      
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automation not found'
        });
      }
      
      // Update automation fields
      if (name) automation.name = name;
      if (description !== undefined) automation.description = description;
      if (triggerType) automation.triggerType = triggerType;
      if (triggerConditions) automation.triggerConditions = triggerConditions;
      if (status) automation.status = status;
      if (delay !== undefined) automation.delay = delay;
      if (priority) automation.priority = priority;
      if (phoneNumbers) automation.phoneNumbers = phoneNumbers;
      
      // Check if we're updating the template
      if (templateId) {
        automation.templateId = templateId;
        automation.useCustomTemplate = false;
        automation.templateContent = '';
      } else if (templateContent) {
        automation.templateContent = templateContent;
        automation.useCustomTemplate = true;
        automation.templateId = null;
      }
      
      // Save the updated automation
      await automation.save();
      
      res.status(200).json({
        success: true,
        data: automation
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Delete an automation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteAutomation(req, res) {
    try {
      const automation = await SmsAutomation.findByIdAndDelete(req.params.id);
      
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automation not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Automation deleted successfully'
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Toggle automation status (active/inactive)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async toggleAutomationStatus(req, res) {
    try {
      const automation = await SmsAutomation.findById(req.params.id);
      
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automation not found'
        });
      }
      
      // Toggle status
      automation.status = automation.status === 'active' ? 'inactive' : 'active';
      await automation.save();
      
      res.status(200).json({
        success: true,
        data: {
          id: automation._id,
          status: automation.status
        },
        message: `Automation ${automation.status === 'active' ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Get statistics for an automation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAutomationStats(req, res) {
    try {
      const automationId = req.params.id;
      
      // Check if automation exists
      const automation = await SmsAutomation.findById(automationId);
      
      if (!automation) {
        return res.status(404).json({
          success: false,
          message: 'Automation not found'
        });
      }
      
      // Get stats from the service
      const stats = await smsAutomationService.getAutomationStats(automationId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Test an automation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async testAutomation(req, res) {
    try {
      const { automationId, testData } = req.body;
      
      if (!automationId) {
        return res.status(400).json({
          success: false,
          message: 'Automation ID is required'
        });
      }
      
      // If automationId is provided, get the automation from the database
      let automation;
      if (automationId) {
        automation = await SmsAutomation.findById(automationId);
        
        if (!automation) {
          return res.status(404).json({
            success: false,
            message: 'Automation not found'
          });
        }
      } else {
        // If automationId is not provided, use the data in the request
        automation = req.body;
      }
      
      // Test the automation
      const result = await smsAutomationService.testAutomation(automation, testData);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }
}

module.exports = new SmsAutomationController(); 