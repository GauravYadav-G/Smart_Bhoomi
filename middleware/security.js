const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiter for API endpoints
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development - limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Strict rate limiter for authentication endpoints
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min (secure but usable)
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array()); // Log errors for debugging
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// User registration validation
exports.registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  body('governmentId').trim().notEmpty().withMessage('Government ID is required'),
  body('role').isIn(['property_owner', 'buyer', 'seller']).withMessage('Invalid role'),
  // Make address fields optional
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
  body('address.country').optional().trim()
];

// Property registration validation
exports.propertyValidation = [
  body('propertyDetails.title').notEmpty().withMessage('Property title is required'),
  body('propertyDetails.description').notEmpty().withMessage('Property description is required'),
  body('propertyDetails.propertyType').isIn(['residential', 'commercial', 'agricultural', 'industrial', 'land']).withMessage('Invalid property type'),
  body('propertyDetails.address').notEmpty().withMessage('Property address is required')
];

// Transfer request validation
exports.transferValidation = [
  body('propertyId').notEmpty().withMessage('Property ID is required'),
  body('proposedPrice').isNumeric().withMessage('Proposed price must be a number').isFloat({ min: 0 }).withMessage('Proposed price must be greater than 0')
];
