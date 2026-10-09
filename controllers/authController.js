/**
 * Auth Controller
 * ----------------
 * Handles the full authentication lifecycle:
 *   - Login / Logout
 *   - Self-registration for Schools, Organisations (NGO/Government),
 *     and Private Organisations/Individuals — all start life as
 *     `pending` and require approval (Super Admin, or for Schools and
 *     Private Organisations, any approved NGO/Government account too)
 *   - Forgot / Reset password
 *   - Forced password change on first login
 */

const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');

const User = require('../models/User');
const School = require('../models/School');
const Organisation = require('../models/Organisation');
const PrivateOrganisation = require('../models/PrivateOrganisation');

const catchAsync = require('../utils/catchAsync');
const { generateToken } = require('../utils/generatePassword');
const { dashboardPathFor } = require('../utils/roleRoutes');
const emailService = require('../services/emailService');
const auditService = require('../services/auditService');

require('dotenv').config();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

/* ------------------------------------------------------------------ */
/* View Renderers (GET routes)                                        */
/* ------------------------------------------------------------------ */

exports.showLogin = (req, res) => {
  res.render('auth/login', { title: 'Log In', layout: false });
};

exports.showRegisterChoice = (req, res) => {
  res.render('auth/register-choice', { title: 'Register', layout: false });
};

exports.showSchoolRegister = (req, res) => {
  res.render('auth/register-school', { title: 'School Registration', layout: false });
};

exports.showOrganisationRegister = (req, res) => {
  res.render('auth/register-organisation', { title: 'NGO / Government Registration', layout: false });
};

exports.showPrivateOrgRegister = (req, res) => {
  res.render('auth/register-private-org', { title: 'Private Organisation Registration', layout: false });
};

exports.showForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password', layout: false });
};

exports.showResetPassword = (req, res) => {
  res.render('auth/reset-password', { title: 'Reset Password', token: req.query.token, layout: false });
};

exports.showForceChangePassword = (req, res) => {
  res.render('auth/force-change-password', { title: 'Change Password', layout: false });
};

/* ------------------------------------------------------------------ */
/* Login / Logout                                                      */
/* ------------------------------------------------------------------ */

exports.login = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/auth/login');
  }

  const { email, password, rememberMe } = req.body;
  const user = await User.findByEmail(email);

  if (!user) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/auth/login');
  }

  if (user.status === 'pending') {
    req.flash('error', 'Your account is still awaiting approval.');
    return res.redirect('/auth/login');
  }
  if (user.status === 'rejected') {
    req.flash('error', 'Your registration application was not approved. Please contact support.');
    return res.redirect('/auth/login');
  }
  if (user.status === 'suspended') {
    req.flash('error', 'Your account has been suspended. Please contact the Super Administrator.');
    return res.redirect('/auth/login');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/auth/login');
  }

  // Regenerate session on login to prevent session fixation attacks
  req.session.regenerate(async (err) => {
    if (err) return next(err);

    req.session.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role_name: user.role_name,
      must_change_password: !!user.must_change_password,
    };

    // Sessions don't time out, but "remember me" still opts into the
    // cookie itself surviving a browser restart.
    if (rememberMe) {
      req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000;
    }

    await User.updateLastLogin(user.user_id);
    await auditService.logAction(req, 'LOGIN', { entityType: 'user', entityId: user.user_id });

    if (user.must_change_password) {
      return res.redirect('/auth/force-change-password');
    }
    return res.redirect(dashboardPathFor(user.role_name));
  });
});

exports.logout = catchAsync(async (req, res, next) => {
  const userId = req.session?.user?.user_id;

  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('grant_portal_sid');
    if (userId) {
      auditService.logAction(req, 'LOGOUT', { entityType: 'user', entityId: userId }).catch(() => {});
    }
    return res.redirect('/auth/login');
  });
});

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

exports.registerSchool = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/auth/register/school');
  }

  const { fullName, email, phone, schoolName, schoolCode, lga, address, schoolType, totalStudents, totalFemaleStudents, principalName } = req.body;

  const existing = await User.findByEmail(email);
  if (existing) {
    req.flash('error', 'An account with that email already exists.');
    return res.redirect('/auth/register/school');
  }

  // Placeholder password until approval issues a real temp password
  const placeholderHash = await bcrypt.hash(generateToken(), SALT_ROUNDS);
  const userId = await User.create({ roleName: 'school_representative', fullName, email, phone, passwordHash: placeholderHash, status: 'pending' });
  await School.create({ userId, schoolName, schoolCode, lga, address, schoolType, totalStudents, totalFemaleStudents, principalName });

  await auditService.logAction(req, 'SCHOOL_REGISTERED', { entityType: 'school', entityId: userId, details: schoolName });

  req.flash('success', 'Registration submitted successfully! You\u2019ll be notified by email once your school is approved by an administrator or a partner organisation.');
  return res.redirect('/auth/login');
});

exports.registerOrganisation = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/auth/register/organisation');
  }

  const { fullName, email, phone, orgName, registrationNumber, address, focusArea, website } = req.body;

  const existing = await User.findByEmail(email);
  if (existing) {
    req.flash('error', 'An account with that email already exists.');
    return res.redirect('/auth/register/organisation');
  }

  const placeholderHash = await bcrypt.hash(generateToken(), SALT_ROUNDS);
  const userId = await User.create({ roleName: 'ngo_govt', fullName, email, phone, passwordHash: placeholderHash, status: 'pending' });
  await Organisation.create({ userId, orgName, registrationNumber, address, focusArea, website });

  await auditService.logAction(req, 'ORGANISATION_REGISTERED', { entityType: 'organisation', entityId: userId, details: orgName });

  req.flash('success', 'Registration submitted successfully! You\u2019ll be notified by email once the Super Administrator reviews your application.');
  return res.redirect('/auth/login');
});

exports.registerPrivateOrg = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/auth/register/private-org');
  }

  const { fullName, email, phone, orgName, description, address, website } = req.body;

  const existing = await User.findByEmail(email);
  if (existing) {
    req.flash('error', 'An account with that email already exists.');
    return res.redirect('/auth/register/private-org');
  }

  const placeholderHash = await bcrypt.hash(generateToken(), SALT_ROUNDS);
  const userId = await User.create({ roleName: 'private_org', fullName, email, phone, passwordHash: placeholderHash, status: 'pending' });
  await PrivateOrganisation.create({ userId, orgName, description, address, website });

  await auditService.logAction(req, 'PRIVATE_ORG_REGISTERED', { entityType: 'private_organisation', entityId: userId, details: orgName });

  req.flash('success', 'Registration submitted successfully! You\u2019ll be notified by email once the Super Administrator or a partner organisation reviews your application.');
  return res.redirect('/auth/login');
});

/* ------------------------------------------------------------------ */
/* Forgot / Reset Password                                              */
/* ------------------------------------------------------------------ */

exports.forgotPassword = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/auth/forgot-password');
  }

  const { email } = req.body;
  const user = await User.findByEmail(email);

  // Always show the same message, whether or not the email exists,
  // to avoid leaking which emails are registered in the system.
  if (user) {
    const token = generateToken();
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await User.setResetToken(user.user_id, token, expires);

    const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;
    await emailService.sendPasswordReset(user.email, { fullName: user.full_name, resetUrl });
    await auditService.logAction(req, 'PASSWORD_RESET_REQUESTED', { entityType: 'user', entityId: user.user_id });
  }

  req.flash('success', 'If that email address is registered, a password reset link has been sent.');
  return res.redirect('/auth/login');
});

exports.resetPassword = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect(`/auth/reset-password?token=${req.body.token}`);
  }

  const { token, password } = req.body;
  const user = await User.findByResetToken(token);

  if (!user) {
    req.flash('error', 'This password reset link is invalid or has expired.');
    return res.redirect('/auth/forgot-password');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await User.updatePassword(user.user_id, passwordHash, 0);
  await auditService.logAction(req, 'PASSWORD_RESET_COMPLETED', { entityType: 'user', entityId: user.user_id });

  req.flash('success', 'Your password has been reset successfully. You can now log in.');
  return res.redirect('/auth/login');
});

exports.forceChangePassword = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/auth/force-change-password');
  }

  const { currentPassword, password } = req.body;
  const user = await User.findById(req.session.user.user_id);

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    req.flash('error', 'Your current password is incorrect.');
    return res.redirect('/auth/force-change-password');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await User.updatePassword(user.user_id, passwordHash, 0);
  req.session.user.must_change_password = false;

  await auditService.logAction(req, 'PASSWORD_CHANGED', { entityType: 'user', entityId: user.user_id });

  req.flash('success', 'Your password has been updated successfully.');
  return res.redirect(dashboardPathFor(user.role_name));
});
