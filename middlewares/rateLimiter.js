/**
 * Rate Limiting Middleware
 * -------------------------
 * Two limiters are exported:
 *  - generalLimiter: applied to the whole app to prevent abuse/DoS.
 *  - authLimiter: a much stricter limiter applied only to login and
 *    password-reset endpoints to slow down brute-force attempts.
 */

const rateLimit = require('express-rate-limit');
require('dotenv').config();

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login/reset attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait before trying again.' },
});

module.exports = { generalLimiter, authLimiter };
