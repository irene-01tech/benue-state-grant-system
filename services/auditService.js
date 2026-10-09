/**
 * Audit Service
 * --------------
 * Central place every controller calls to record an audit trail entry.
 * Wraps AuditLog.create with a request-aware helper so callers don't
 * need to repeat IP/user extraction logic everywhere.
 */

const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Records an audit log entry from within a request context.
 * @param {import('express').Request} req
 * @param {string} action - short machine-readable action name, e.g. 'SCHOOL_APPROVED'
 * @param {object} [options]
 * @param {string} [options.entityType]
 * @param {number} [options.entityId]
 * @param {string} [options.details]
 */
async function logAction(req, action, { entityType, entityId, details } = {}) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    await AuditLog.create({
      userId: req.session?.user?.user_id || null,
      userRole: req.session?.user?.role_name || null,
      action,
      entityType,
      entityId,
      details,
      ipAddress: ip,
    });
  } catch (err) {
    // Audit logging must never break the main request flow
    logger.error(`Audit logging failed for action "${action}": ${err.message}`);
  }
}

module.exports = { logAction };
