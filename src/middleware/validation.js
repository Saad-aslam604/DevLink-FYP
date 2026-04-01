const { validationResult } = require('express-validator');

/**
 * Express middleware to handle validation results from express-validator
 * Formats errors consistently with our API response structure
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors consistently
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    // Group errors by field for better client handling
    const fieldErrors = formattedErrors.reduce((acc, error) => {
      if (!acc[error.field]) {
        acc[error.field] = [];
      }
      acc[error.field].push(error.message);
      return acc;
    }, {});

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: {
        type: 'VALIDATION_ERROR',
        details: formattedErrors,
        fieldErrors: fieldErrors,
        count: formattedErrors.length
      }
    });
  }
  
  next();
};

/**
 * Optional: Conditional validation - only validate if field exists
 * Useful for partial updates where not all fields are required
 */
const validateIfExists = (validations) => {
  return async (req, res, next) => {
    await Promise.all(
      validations.map(validation => validation.run(req))
    );
    
    const errors = validationResult(req);
    const relevantErrors = errors.array().filter(error => {
      // Only include errors for fields that were actually provided in the request
      return req.body[error.param] !== undefined;
    });
    
    if (relevantErrors.length > 0) {
      const formattedErrors = relevantErrors.map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }));

      return res.status(422).json({
        success: false,
        message: 'Validation failed for provided fields',
        error: {
          type: 'VALIDATION_ERROR',
          details: formattedErrors,
          count: formattedErrors.length
        }
      });
    }
    
    next();
  };
};

/**
 * Sanitize input data - trim strings and convert empty strings to null
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
        if (req.body[key] === '') {
          req.body[key] = null;
        }
      }
    });
  }
  next();
};

/**
 * Validate ObjectId format for MongoDB IDs in params
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (id && !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        error: {
          type: 'INVALID_ID',
          field: paramName,
          value: id
        }
      });
    }
    
    next();
  };
};

module.exports = {
  handleValidationErrors,
  validateIfExists,
  sanitizeInput,
  validateObjectId
};

