/**
 * Super Admin — User Management Controller
 * -------------------------------------------
 * Lists every user in the system regardless of role, and lets the
 * Super Admin suspend, reactivate, or force a password reset.
 */

const bcrypt = require('bcrypt');

const catchAsync = require('../../utils/catchAsync');
const User = require('../../models/User');
const emailService = require('../../services/emailService');
const auditService = require('../../services/auditService');
const { generateTempPassword } = require('../../utils/generatePassword');

require('dotenv').config();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

exports.showUsers = catchAsync(async (req, res) => {
  const { role, status, search } = req.query;
  const users = await User.findAll({ role, status, search, limit: 200 });

  res.render('admin/users', {
    title: 'User Management',
    activePage: 'users',
    users,
    filters: { role: role || '', status: status || '', search: search || '' },
  });
});

exports.suspendUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  await User.setStatus(userId, 'suspended');
  await auditService.logAction(req, 'USER_SUSPENDED', { entityType: 'user', entityId: Number(userId) });
  req.flash('success', 'The user account has been suspended.');
  return res.redirect('back');
});

exports.activateUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  await User.setStatus(userId, 'active');
  await auditService.logAction(req, 'USER_ACTIVATED', { entityType: 'user', entityId: Number(userId) });
  req.flash('success', 'The user account has been reactivated.');
  return res.redirect('back');
});

exports.resetUserPassword = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  if (!user) {
    req.flash('error', 'User not found.');
    return res.redirect('back');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
  await User.updatePassword(userId, passwordHash, 1);

  await emailService.sendPasswordResetByAdmin(user.email, {
    fullName: user.full_name,
    email: user.email,
    tempPassword,
  });

  await auditService.logAction(req, 'PASSWORD_RESET_BY_ADMIN', { entityType: 'user', entityId: Number(userId) });
  req.flash('success', `A new temporary password was generated and emailed to ${user.email}.`);
  return res.redirect('back');
});
