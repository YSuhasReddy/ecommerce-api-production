const { body, param, validationResult } = require('express-validator');

// Validation rules for category
const categoryValidationRules = () => {
return [
body('name')
.trim()
.notEmpty().withMessage('Name is required')
.isLength({ min: 3, max: 50 })
.withMessage('Category name must be between 3 and 50 characters')
.matches(/^[a-zA-Z0-9\s&-]+$/).withMessage('Category name contains invalid characters'),
body('description')
.optional()
.trim()
.isLength({ max: 500 })
.withMessage('Description must not exceed 500 characters'),
];
};

// Validation rules for product
const productValidationRules = () => {
return [
body('name')
.trim()
.notEmpty().withMessage('Name is required')
.isLength({ min: 3, max: 100 })
.withMessage('Product name must be between 3 and 100 characters'),
body('description')
.optional()
.trim()
.isLength({ max: 1000 })
.withMessage('Description must not exceed 1000 characters'),
body('price')
.notEmpty().withMessage('Price is required')
.isFloat({ min: 0.01, max: 999999.99 })
.withMessage('Price must be a positive number between 0.01 and 999999.99'),
body('category_id')
.notEmpty().withMessage('Category ID is required')
.isInt({ min: 1 })
.withMessage('Category ID must be a positive integer'),
body('stock')
.notEmpty().withMessage('Stock is required')
.isInt({ min: 0, max: 999999 })
.withMessage('Stock must be a non-negative integer not exceeding 999999'),
];
};

// Validation rules for updating product (all fields optional)
const productUpdateValidationRules = () => {
return [
body('name')
.optional()
.trim()
.isLength({ min: 3, max: 100 })
.withMessage('Product name must be between 3 and 100 characters'),
body('description')
.optional()
.trim()
.isLength({ max: 1000 })
.withMessage('Description must not exceed 1000 characters'),
body('price')
.optional()
.isFloat({ min: 0.01, max: 999999.99 })
.withMessage('Price must be a positive number between 0.01 and 999999.99'),
body('stock')
.optional()
.isInt({ min: 0, max: 999999 })
.withMessage('Stock must be a non-negative integer not exceeding 999999'),
];
};

// Validation for ID parameters
const validateIdParam = (paramName = 'id') => {
return param(paramName)
.isInt({ min: 1 })
.withMessage(`${paramName} must be a positive integer`);
};

// Validation for update category (all fields optional but need at least one)
const categoryUpdateValidationRules = () => {
return [
body('name')
.optional()
.trim()
.isLength({ min: 3, max: 50 })
.withMessage('Category name must be between 3 and 50 characters')
.matches(/^[a-zA-Z0-9\s&-]+$/).withMessage('Category name contains invalid characters'),
body('description')
.optional()
.trim()
.isLength({ max: 500 })
.withMessage('Description must not exceed 500 characters'),
];
};

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({
success: false,
error: 'Validation failed',
details: errors.array().map(err => ({
field: err.param,
message: err.msg,
})),
});
}
next();
};

module.exports = {
categoryValidationRules,
categoryUpdateValidationRules,
productValidationRules,
productUpdateValidationRules,
validateIdParam,
handleValidationErrors,
};
