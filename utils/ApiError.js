/**
 * ApiError
 * ---------
 * Standardized application error class. Thrown anywhere in the
 * controller/service layer and caught by the centralized error
 * handling middleware (middlewares/errorHandler.js).
 */

class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational; // true = expected/handled error, false = programming bug
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
