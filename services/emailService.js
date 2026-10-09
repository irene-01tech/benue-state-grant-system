/**
 * Email Service
 * --------------
 * Thin wrapper around the Nodemailer transporter (config/mailer.js)
 * combined with the templates in emails/templates/index.js. Controllers
 * call these named functions rather than building emails inline.
 */

const transporter = require('../config/mailer');
const templates = require('../emails/templates');
const logger = require('../utils/logger');

require('dotenv').config();

async function dispatch(to, { subject, html }) {
  try {
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    // Email failures should never crash the request that triggered them.
    logger.error(`Failed to send email to ${to} ("${subject}"): ${err.message}`);
  }
}

module.exports = {
  sendRegistrationApproved: (to, data) => dispatch(to, templates.registrationApproved(data)),
  sendRegistrationRejected: (to, data) => dispatch(to, templates.registrationRejected(data)),
  sendPasswordReset: (to, data) => dispatch(to, templates.passwordReset(data)),
  sendPasswordResetByAdmin: (to, data) => dispatch(to, templates.passwordResetByAdmin(data)),
  sendGrantSubmitted: (to, data) => dispatch(to, templates.grantSubmitted(data)),
  sendNeedsAssessmentSubmitted: (to, data) => dispatch(to, templates.needsAssessmentSubmitted(data)),
  sendNeedsAssessmentReviewed: (to, data) => dispatch(to, templates.needsAssessmentReviewed(data)),
  sendGrantApproved: (to, data) => dispatch(to, templates.grantApproved(data)),
  sendGrantRejected: (to, data) => dispatch(to, templates.grantRejected(data)),
  sendResourceAllocationNotice: (to, data) => dispatch(to, templates.resourceAllocationNotice(data)),
  sendDistributionReminder: (to, data) => dispatch(to, templates.distributionReminder(data)),
  sendSurveyReminder: (to, data) => dispatch(to, templates.surveyReminder(data)),
  sendEvidenceApproved: (to, data) => dispatch(to, templates.evidenceApproved(data)),
  sendEvidenceRejected: (to, data) => dispatch(to, templates.evidenceRejected(data)),
};
