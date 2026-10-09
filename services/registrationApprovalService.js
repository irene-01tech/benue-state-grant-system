/**
 * Registration Approval Service
 * --------------------------------
 * Builds approve/reject handlers for a registration-type entity
 * (School, Organisation, Private Organisation). Shared between the
 * Super Admin approvals controller and the NGO/Government delegated
 * approvals controller, since both perform the exact same action —
 * only the review queue and redirect target differ.
 *
 * Approving generates a temporary password, activates the account,
 * and emails credentials. Rejecting records a reason and notifies
 * the applicant. Both are logged to the audit trail with who
 * performed the action, so it's clear whether it was the Super Admin
 * or a partner organisation that decided.
 */

const bcrypt = require('bcrypt');

const catchAsync = require('../utils/catchAsync');
const User = require('../models/User');
const emailService = require('../services/emailService');
const auditService = require('../services/auditService');
const { generateTempPassword } = require('../utils/generatePassword');

require('dotenv').config();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

/**
 * @param {Object} config
 * @param {Object} config.model - the model (School, Organisation, PrivateOrganisation)
 * @param {string} config.idParam - the route param name for this entity's id (e.g. 'schoolId')
 * @param {string} config.nameField - the model's display-name column (e.g. 'school_name')
 * @param {string} config.auditType - short label used in audit log action names (e.g. 'school')
 * @param {(kind: string) => string} config.redirectUrl - builds the redirect URL after approve/reject
 */
function buildApprovalHandlers({ model, idParam, nameField, auditType, redirectUrl }) {
  const approve = catchAsync(async (req, res) => {
    const id = req.params[idParam];
    const record = await model.findById(id);

    if (!record) {
      req.flash('error', 'Record not found.');
      return res.redirect(redirectUrl(req));
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await User.updatePassword(record.user_id, passwordHash, 1);
    await model.approve(id, req.session.user.user_id);
    await User.setStatus(record.user_id, 'active');

    await emailService.sendRegistrationApproved(record.email, {
      fullName: record.full_name,
      email: record.email,
      tempPassword,
    });

    await auditService.logAction(req, `${auditType.toUpperCase()}_APPROVED`, {
      entityType: auditType,
      entityId: Number(id),
      details: record[nameField],
    });

    req.flash('success', `${record[nameField]} has been approved. Login credentials were emailed to ${record.email}.`);
    return res.redirect(redirectUrl(req));
  });

  const reject = catchAsync(async (req, res) => {
    const id = req.params[idParam];
    const { reason } = req.body;
    const record = await model.findById(id);

    if (!record) {
      req.flash('error', 'Record not found.');
      return res.redirect(redirectUrl(req));
    }

    await model.reject(id, req.session.user.user_id, reason);
    await User.setStatus(record.user_id, 'rejected');

    await emailService.sendRegistrationRejected(record.email, {
      fullName: record.full_name,
      reason: reason || 'No specific reason was provided.',
    });

    await auditService.logAction(req, `${auditType.toUpperCase()}_REJECTED`, {
      entityType: auditType,
      entityId: Number(id),
      details: reason || record[nameField],
    });

    req.flash('success', `${record[nameField]}'s registration has been rejected.`);
    return res.redirect(redirectUrl(req));
  });

  return { approve, reject };
}

module.exports = { buildApprovalHandlers };
