/**
 * Mailer Configuration
 * ---------------------
 * Configures the Nodemailer transporter used across the application
 * for all transactional emails (approvals, rejections, password resets,
 * notifications, reminders, etc).
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

// Verify transporter configuration at startup (non-fatal if it fails,
// since the app should still run even if email is temporarily down).
transporter.verify((error) => {
  if (error) {
    console.warn('[Mailer] SMTP connection could not be verified:', error.message);
  } else {
    console.log('[Mailer] SMTP transporter is ready to send emails.');
  }
});

module.exports = transporter;
