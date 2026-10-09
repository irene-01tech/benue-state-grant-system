/**
 * Centralized Error Handling Middleware
 * ----------------------------------------
 * Every error in the application (thrown in controllers/services, or
 * passed via next(err)) ends up here. Renders a friendly error page
 * for browser requests and a consistent JSON shape for API/XHR calls.
 */

const logger = require('../utils/logger');

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong on our end. Please try again later.';

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.stack || err.message}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${err.message}`);
  }

  const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));

  if (wantsJson) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  return res.status(statusCode).render('shared/error', {
    title: statusCode === 404 ? 'Page Not Found' : 'Something Went Wrong',
    statusCode,
    message,
    layout: false,
  });
}

function notFoundHandler(req, res, next) {
  const err = new (require('../utils/ApiError'))(404, `Route not found: ${req.originalUrl}`);
  next(err);
}

module.exports = { errorHandler, notFoundHandler };
