const SmsTemplate = require('../models/SmsTemplate');
const errorHandler = require('../utils/errorHandler');

/**
 * Controller for SMS templates
 */
class SmsTemplateController {
  /**
   * Get all templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTemplates(req, res) {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get filters from query parameters
      const filters = {};
      if (req.query.category) {
        filters.category = req.query.category;
      }
      if (req.query.search) {
        filters.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { content: { $regex: req.query.search, $options: 'i' } }
        ];
      }
      
      // Get templates with pagination and filters
      const templates = await SmsTemplate.find(filters)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      // Get total count for pagination
      const total = await SmsTemplate.countDocuments(filters);
      
      res.status(200).json({
        success: true,
        count: templates.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: templates
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Get a template by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTemplateById(req, res) {
    try {
      const template = await SmsTemplate.findById(req.params.id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: template
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Create a new template
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTemplate(req, res) {
    try {
      const { name, content, category, description, variables } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({
          success: false,
          message: 'Name and content are required'
        });
      }
      
      // Create new template
      const template = await SmsTemplate.create({
        name,
        content,
        category: category || 'General',
        description: description || '',
        variables: variables || []
      });
      
      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Update an existing template
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateTemplate(req, res) {
    try {
      const { name, content, category, description, variables } = req.body;
      
      if (!name && !content && !category && !description && !variables) {
        return res.status(400).json({
          success: false,
          message: 'At least one field to update is required'
        });
      }
      
      // Find and update the template
      const template = await SmsTemplate.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: template
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Delete a template
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteTemplate(req, res) {
    try {
      const template = await SmsTemplate.findByIdAndDelete(req.params.id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Preview a template with variables
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async previewTemplate(req, res) {
    try {
      const { templateId, templateContent, variables } = req.body;
      
      // Check if we have either template ID or content
      if (!templateId && !templateContent) {
        return res.status(400).json({
          success: false,
          message: 'Either templateId or templateContent is required'
        });
      }
      
      let content;
      
      // Get content from database if templateId is provided
      if (templateId) {
        const template = await SmsTemplate.findById(templateId);
        
        if (!template) {
          return res.status(404).json({
            success: false,
            message: 'Template not found'
          });
        }
        
        content = template.content;
      } else {
        // Use provided content
        content = templateContent;
      }
      
      // Replace variables in the template
      let renderedContent = content;
      
      if (variables && Object.keys(variables).length > 0) {
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
          renderedContent = renderedContent.replace(regex, variables[key]);
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          original: content,
          rendered: renderedContent
        }
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }

  /**
   * Get all available template variables
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTemplateVariables(req, res) {
    try {
      // Return a list of all possible variables that can be used in templates
      const variables = [
        {
          category: 'User',
          variables: [
            { name: 'firstName', description: 'User\'s first name' },
            { name: 'lastName', description: 'User\'s last name' },
            { name: 'fullName', description: 'User\'s full name' },
            { name: 'email', description: 'User\'s email address' },
            { name: 'phone', description: 'User\'s phone number' }
          ]
        },
        {
          category: 'Client',
          variables: [
            { name: 'clientName', description: 'Client\'s name' },
            { name: 'clientPhone', description: 'Client\'s phone number' },
            { name: 'clientEmail', description: 'Client\'s email address' }
          ]
        },
        {
          category: 'Call',
          variables: [
            { name: 'callDuration', description: 'Duration of the call' },
            { name: 'callTimestamp', description: 'When the call occurred' },
            { name: 'callerId', description: 'Phone number of the caller' }
          ]
        },
        {
          category: 'Appointment',
          variables: [
            { name: 'appointmentDate', description: 'Date of the appointment' },
            { name: 'appointmentTime', description: 'Time of the appointment' },
            { name: 'appointmentLocation', description: 'Location of the appointment' }
          ]
        },
        {
          category: 'Custom',
          variables: [
            { name: 'custom1', description: 'Custom variable 1' },
            { name: 'custom2', description: 'Custom variable 2' },
            { name: 'custom3', description: 'Custom variable 3' }
          ]
        }
      ];
      
      res.status(200).json({
        success: true,
        data: variables
      });
    } catch (error) {
      errorHandler(res, error);
    }
  }
}

module.exports = new SmsTemplateController(); 