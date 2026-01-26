const logger = require('./logger');

// Custom application error class
class AppError extends Error {
constructor(message, statusCode, code = null) {
super(message);
this.statusCode = statusCode;
this.code = code;
Error.captureStackTrace(this, this.constructor);
}
}

// Database error handler
function handleDatabaseError(error, context = 'Database') {
logger.error(context, 'Database error occurred', {
code: error.code,
message: error.message,
});

// Handle specific PostgreSQL errors
switch (error.code) {
case '23505': // Unique constraint violation
return new AppError('This record already exists', 409, 'DUPLICATE_ENTRY');
case '23503': // Foreign key constraint violation
return new AppError('Referenced record does not exist', 400, 'FOREIGN_KEY_VIOLATION');
case '23514': // Check constraint violation
return new AppError('Invalid data provided', 400, 'CONSTRAINT_VIOLATION');
case '08006':
case '08003':
case '57P03':
return new AppError('Database connection error', 503, 'DB_CONNECTION_ERROR');
default:
return new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
}
}

// Async route wrapper to catch errors
const asyncHandler = (fn) => {
return (req, res, next) => {
Promise.resolve(fn(req, res, next)).catch(next);
};
};

// Global error response formatter
function sendErrorResponse(error, req, res) {
const isDevelopment = process.env.NODE_ENV === 'development';
const isAppError = error instanceof AppError;

const statusCode = isAppError ? error.statusCode : 500;
const errorCode = isAppError ? error.code : 'INTERNAL_ERROR';

// Build response - NEVER include stack traces in any environment for security
const response = {
success: false,
error: isDevelopment ? error.message : 'An unexpected error occurred',
code: errorCode,
requestId: req?.id,
};

// Log full error details server-side (including stack trace)
logger.error('ErrorHandler', 'Request error', {
method: req?.method,
path: req?.path,
statusCode,
errorCode,
message: error.message,
stack: error.stack,
requestId: req?.id,
});

res.status(statusCode).json(response);
}

// Custom error classes for better error handling
class BadRequestError extends AppError {
constructor(message, code = 'BAD_REQUEST') {
super(message, 400, code);
this.name = 'BadRequestError';
}
}

class NotFoundError extends AppError {
constructor(message, code = 'NOT_FOUND') {
super(message, 404, code);
this.name = 'NotFoundError';
}
}

module.exports = {
AppError,
BadRequestError,
NotFoundError,
handleDatabaseError,
asyncHandler,
sendErrorResponse,
};
