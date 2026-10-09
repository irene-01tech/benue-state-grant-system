/**
 * Profile Controller (shared across all roles)
 * -----------------------------------------------
 * Every authenticated user — regardless of role — can view their own
 * profile, update their name/phone, and jump to the password-change
 * flow. Mounted at /account, guarded only by requireAuth (no RBAC).
 */

const bcrypt = require('bcrypt');
const catchAsync = require('../../utils/catchAsync');
const User = require('../../models/User');
const auditService = require('../../services/auditService');

require('dotenv').config();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

exports.showProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.session.user.user_id);
  res.render('shared/profile', {
    title: 'My Profile',
    activePage: 'profile',
    profileUser: user,
  });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const { fullName, phone } = req.body;

  if (!fullName || !fullName.trim()) {
    req.flash('error', 'Full name is required.');
    return res.redirect('/account/profile');
  }

  await User.updateProfile(req.session.user.user_id, { fullName: fullName.trim(), phone });
  req.session.user.full_name = fullName.trim();

  await auditService.logAction(req, 'PROFILE_UPDATED', { entityType: 'user', entityId: req.session.user.user_id });

  req.flash('success', 'Your profile has been updated.');
  return res.redirect('/account/profile');
});

exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const user = await User.findById(req.session.user.user_id);

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    req.flash('error', 'All password fields are required.');
    return res.redirect('/account/profile');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    req.flash('error', 'Your current password is incorrect.');
    return res.redirect('/account/profile');
  }

  if (newPassword !== confirmNewPassword) {
    req.flash('error', 'New passwords do not match.');
    return res.redirect('/account/profile');
  }

  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    req.flash('error', 'New password must be at least 8 characters and include uppercase, lowercase, and a number.');
    return res.redirect('/account/profile');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await User.updatePassword(user.user_id, passwordHash, 0);

  await auditService.logAction(req, 'PASSWORD_CHANGED', { entityType: 'user', entityId: user.user_id });

  req.flash('success', 'Your password has been changed.');
  return res.redirect('/account/profile');
});

exports.markNotificationRead = catchAsync(async (req, res) => {
  const Notification = require('../../models/Notification');
  await Notification.markAsRead(req.params.id, req.session.user.user_id);
  return res.redirect(req.get('Referrer') || `/${req.session.user.role_name}/dashboard`);
});

exports.markAllNotificationsRead = catchAsync(async (req, res) => {
  const Notification = require('../../models/Notification');
  await Notification.markAllAsRead(req.session.user.user_id);
  return res.redirect(req.get('Referrer') || `/${req.session.user.role_name}/dashboard`);
});
