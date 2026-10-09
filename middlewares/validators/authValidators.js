/**
 * Auth Validators
 * ----------------
 * express-validator rule chains for login, registration, and
 * password management routes. Kept separate from routes/controllers
 * so validation rules are reusable and easy to audit.
 */

const { body } = require('express-validator');

const passwordRules = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long.')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter.')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter.')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number.');

const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
];

const forgotPasswordValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false }),
];

const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is missing.'),
  passwordRules,
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match.');
    }
    return true;
  }),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  passwordRules.bail(),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match.');
    }
    return true;
  }),
];

const schoolRegistrationValidator = [
  body('fullName').trim().notEmpty().withMessage('Representative name is required.'),
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('schoolName').trim().notEmpty().withMessage('School name is required.'),
  body('lga').trim().notEmpty().withMessage('Local Government Area is required.'),
  body('principalName').trim().notEmpty().withMessage('Principal name is required.'),
  body('totalStudents').isInt({ min: 0 }).withMessage('Total students must be a valid number.'),
  body('totalFemaleStudents').isInt({ min: 0 }).withMessage('Total female students must be a valid number.'),
];

const organisationRegistrationValidator = [
  body('fullName').trim().notEmpty().withMessage('Contact person name is required.'),
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('orgName').trim().notEmpty().withMessage('Organisation name is required.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
];

const privateOrgRegistrationValidator = [
  body('fullName').trim().notEmpty().withMessage('Contact person name is required.'),
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('orgName').trim().notEmpty().withMessage('Organisation / individual name is required.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
];

module.exports = {
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  schoolRegistrationValidator,
  organisationRegistrationValidator,
  privateOrgRegistrationValidator,
};
