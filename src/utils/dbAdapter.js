const db = require('../models/db');

/**
 * Adapter to provide a Mongoose-like interface for Sequelize models
 * This helps avoid rewriting all controllers
 */
class DbAdapter {
  /**
   * Convert Mongoose-like query to Sequelize query
   * @param {Object} query - Mongoose-style query
   * @returns {Object} - Sequelize where clause
   */
  static convertQuery(query) {
    if (!query || Object.keys(query).length === 0) {
      return {};
    }
    
    const whereClause = {};
    
    Object.entries(query).forEach(([key, value]) => {
      // Handle special MongoDB operators
      if (key === '$or') {
        whereClause[db.Sequelize.Op.or] = value.map(condition => 
          DbAdapter.convertQuery(condition)
        );
      } else if (key === '$and') {
        whereClause[db.Sequelize.Op.and] = value.map(condition => 
          DbAdapter.convertQuery(condition)
        );
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested operators
        if ('$regex' in value) {
          const options = value.$options || '';
          whereClause[key] = {
            [db.Sequelize.Op.iLike]: `%${value.$regex}%` // Simplified regex conversion
          };
        } else if ('$in' in value) {
          whereClause[key] = {
            [db.Sequelize.Op.in]: value.$in
          };
        } else if ('$ne' in value) {
          whereClause[key] = {
            [db.Sequelize.Op.ne]: value.$ne
          };
        } else if ('$gt' in value) {
          whereClause[key] = {
            [db.Sequelize.Op.gt]: value.$gt
          };
        } else if ('$gte' in value) {
          whereClause[key] = {
            [db.Sequelize.Op.gte]: value.$gte
          };
        } else if ('$lt' in value) {
          whereClause[key] = {
            [db.Sequelize.Op.lt]: value.$lt
          };
        } else if ('$lte' in value) {
          whereClause[key] = {
            [db.Sequelize.Op.lte]: value.$lte
          };
        } else {
          // Plain object (not an operator)
          whereClause[key] = value;
        }
      } else {
        // Simple key-value
        whereClause[key] = value;
      }
    });
    
    return whereClause;
  }
  
  /**
   * Create a model adapter that provides Mongoose-like interface
   * @param {Object} model - Sequelize model
   * @param {string} modelName - Name of the model
   * @returns {Object} - Model adapter with Mongoose-like methods
   */
  static createModelAdapter(model, modelName) {
    return {
      // Store model reference
      _model: model,
      _modelName: modelName,
      
      /**
       * Find documents by query
       * @param {Object} query - Query to filter by
       * @returns {Promise<Array>} - Found documents
       */
      find: async function(query = {}) {
        const whereClause = DbAdapter.convertQuery(query);
        const results = await this._model.findAll({ where: whereClause });
        return results.map(item => item.toJSON());
      },
      
      /**
       * Find a single document by query
       * @param {Object} query - Query to filter by
       * @returns {Promise<Object>} - Found document or null
       */
      findOne: async function(query = {}) {
        const whereClause = DbAdapter.convertQuery(query);
        const result = await this._model.findOne({ where: whereClause });
        return result ? result.toJSON() : null;
      },
      
      /**
       * Find document by ID
       * @param {string|number} id - Document ID
       * @returns {Promise<Object>} - Found document or null
       */
      findById: async function(id) {
        const result = await this._model.findByPk(id);
        return result ? result.toJSON() : null;
      },
      
      /**
       * Create a new document
       * @param {Object} data - Document data
       * @returns {Promise<Object>} - Created document
       */
      create: async function(data) {
        const result = await this._model.create(data);
        return result.toJSON();
      },
      
      /**
       * Find document by ID and update
       * @param {string|number} id - Document ID
       * @param {Object} update - Update data
       * @param {Object} options - Update options
       * @returns {Promise<Object>} - Updated document or null
       */
      findByIdAndUpdate: async function(id, update, options = {}) {
        const returnNew = options.new !== false;
        
        await this._model.update(update, {
          where: { id }
        });
        
        if (returnNew) {
          const result = await this._model.findByPk(id);
          return result ? result.toJSON() : null;
        }
        
        return null;
      },
      
      /**
       * Find document by ID and delete
       * @param {string|number} id - Document ID
       * @returns {Promise<Object>} - Deleted document or null
       */
      findByIdAndDelete: async function(id) {
        const result = await this._model.findByPk(id);
        
        if (!result) {
          return null;
        }
        
        const jsonResult = result.toJSON();
        await result.destroy();
        
        return jsonResult;
      },
      
      /**
       * Count documents matching query
       * @param {Object} query - Query to filter by
       * @returns {Promise<number>} - Count of matching documents
       */
      countDocuments: async function(query = {}) {
        const whereClause = DbAdapter.convertQuery(query);
        return await this._model.count({ where: whereClause });
      }
    };
  }
}

// Create adapters for all models
const User = DbAdapter.createModelAdapter(db.User, 'User');
const SmsTemplate = DbAdapter.createModelAdapter(db.SmsTemplate, 'SmsTemplate');
const SmsAutomation = DbAdapter.createModelAdapter(db.SmsAutomation, 'SmsAutomation');
const Call = DbAdapter.createModelAdapter(db.Call, 'Call');
const Sms = DbAdapter.createModelAdapter(db.Sms, 'Sms');
const Voicemail = DbAdapter.createModelAdapter(db.Voicemail, 'Voicemail');
const Config = DbAdapter.createModelAdapter(db.Config, 'Config');

module.exports = {
  User,
  SmsTemplate,
  SmsAutomation,
  Call,
  Sms,
  Voicemail,
  Config,
  db
}; 