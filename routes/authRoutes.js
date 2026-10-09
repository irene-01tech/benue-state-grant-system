/**
 * Auth Routes
 * ------------
 * Public-facing routes for login, registration, and password recovery.
 * All state-changing routes are protected by CSRF (applied globally
 * in app.js) and the strict authLimiter rate limiter.
 */

const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');
const { redirectIfAuthenticated, requireAuth } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const {
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  schoolRegistrationValidator,
  organisationRegistrationValidator,
  privateOrgRegistrationValidator,
} = require('../middlewares/validators/authValidators');

router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', authLimiter, redirectIfAuthenticated, loginValidator, authController.login);

router.post('/logout', requireAuth, authController.logout);

router.get('/register', redirectIfAuthenticated, authController.showRegisterChoice);
router.get('/register/school', redirectIfAuthenticated, authController.showSchoolRegister);
router.post('/register/school', redirectIfAuthenticated, schoolRegistrationValidator, authController.registerSchool);

router.get('/register/organisation', redirectIfAuthenticated, authController.showOrganisationRegister);
router.post('/register/organisation', redirectIfAuthenticated, organisationRegistrationValidator, authController.registerOrganisation);

router.get('/register/private-org', redirectIfAuthenticated, authController.showPrivateOrgRegister);
router.post('/register/private-org', redirectIfAuthenticated, privateOrgRegistrationValidator, authController.registerPrivateOrg);

router.get('/forgot-password', redirectIfAuthenticated, authController.showForgotPassword);
router.post('/forgot-password', authLimiter, redirectIfAuthenticated, forgotPasswordValidator, authController.forgotPassword);

router.get('/reset-password', redirectIfAuthenticated, authController.showResetPassword);
router.post('/reset-password', authLimiter, redirectIfAuthenticated, resetPasswordValidator, authController.resetPassword);

router.get('/force-change-password', requireAuth, authController.showForceChangePassword);
router.post('/force-change-password', requireAuth, changePasswordValidator, authController.forceChangePassword);

module.exports = router;
