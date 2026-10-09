/**
 * Email Templates
 * -----------------
 * Each exported function returns { subject, html } for a specific
 * transactional email event. All templates share the professional
 * baseLayout wrapper defined in ./baseLayout.js.
 */

const { baseLayout, button } = require('./baseLayout');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

module.exports = {
  registrationApproved({ fullName, email, tempPassword, loginUrl = `${APP_URL}/auth/login` }) {
    return {
      subject: 'Your Registration Has Been Approved',
      html: baseLayout({
        preheader: 'Your account has been approved. Here are your login details.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>Congratulations! Your registration on the Benue Menstrual Grant Portal has been <strong>approved</strong> by the Super Administrator.</p>
          <p>You can now log in using the temporary credentials below:</p>
          <table role="presentation" style="background:#f7f2f4; border-radius:8px; padding:16px; margin:16px 0; width:100%;">
            <tr><td style="padding:6px 0;"><strong>Email:</strong></td></tr>
            <tr><td style="padding:6px 0; word-break:break-all;">${email}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Temporary Password:</strong></td></tr>
            <tr><td style="padding:6px 0; font-family:monospace; font-size:16px; color:#7a1f3d;">${tempPassword}</td></tr>
          </table>
          <p>For your security, you will be required to change this password immediately after your first login.</p>
          ${button('Log In Now', loginUrl)}
          <p style="font-size:13px; color:#888;">If you did not initiate this registration, please contact our support team immediately.</p>
        `,
      }),
    };
  },

  registrationRejected({ fullName, reason }) {
    return {
      subject: 'Update on Your Registration Application',
      html: baseLayout({
        accentColor: '#8a3b3b',
        preheader: 'Your registration application was not approved.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>After review, your registration application on the Benue Menstrual Grant Portal was <strong>not approved</strong> at this time.</p>
          ${reason ? `<p><strong>Reason provided:</strong> ${reason}</p>` : ''}
          <p>If you believe this was in error or would like to provide additional information, please contact the support team or re-apply with corrected details.</p>
        `,
      }),
    };
  },

  passwordReset({ fullName, resetUrl }) {
    return {
      subject: 'Reset Your Password',
      html: baseLayout({
        preheader: 'Use the link below to reset your password.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 30 minutes.</p>
          ${button('Reset Password', resetUrl)}
          <p style="font-size:13px; color:#888;">If you did not request a password reset, you can safely ignore this email.</p>
        `,
      }),
    };
  },

  passwordResetByAdmin({ fullName, email, tempPassword, loginUrl = `${APP_URL}/auth/login` }) {
    return {
      subject: 'Your Password Has Been Reset by an Administrator',
      html: baseLayout({
        preheader: 'A new temporary password has been issued for your account.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>The Super Administrator has reset your password on the Benue Menstrual Grant Portal. Use the temporary credentials below to sign in:</p>
          <table role="presentation" style="background:#f7f2f4; border-radius:8px; padding:16px; margin:16px 0; width:100%;">
            <tr><td style="padding:6px 0;"><strong>Email:</strong></td></tr>
            <tr><td style="padding:6px 0; word-break:break-all;">${email}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Temporary Password:</strong></td></tr>
            <tr><td style="padding:6px 0; font-family:monospace; font-size:16px; color:#7a1f3d;">${tempPassword}</td></tr>
          </table>
          <p>For your security, you will be required to change this password immediately after logging in.</p>
          ${button('Log In Now', loginUrl)}
          <p style="font-size:13px; color:#888;">If you did not expect this change, please contact the Super Administrator immediately.</p>
        `,
      }),
    };
  },

  grantSubmitted({ fullName, programmeTitle, schoolName }) {
    return {
      subject: `New Grant Application Submitted: ${programmeTitle}`,
      html: baseLayout({
        preheader: 'A new grant application has been submitted for your review.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p><strong>${schoolName}</strong> has submitted a new application under your programme "<strong>${programmeTitle}</strong>".</p>
          <p>Please log in to review the application details and supporting documents.</p>
          ${button('Review Application', `${APP_URL}/auth/login`)}
        `,
      }),
    };
  },

  needsAssessmentSubmitted({ fullName, schoolName }) {
    return {
      subject: `New Needs Assessment from ${schoolName}`,
      html: baseLayout({
        preheader: 'A school has submitted a needs assessment addressed to you.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p><strong>${schoolName}</strong> has submitted a needs assessment survey addressed to your organisation.</p>
          <p>Please log in to review it and decide whether to approve or reject it.</p>
          ${button('Review Needs Assessment', `${APP_URL}/auth/login`)}
        `,
      }),
    };
  },

  needsAssessmentReviewed({ fullName, decision, comment }) {
    const approved = decision === 'approved';
    return {
      subject: `Your Needs Assessment Was ${approved ? 'Approved' : 'Rejected'}`,
      html: baseLayout({
        preheader: `Your needs assessment has been ${decision}.`,
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>Your needs assessment submission has been <strong>${decision}</strong>.</p>
          ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
          ${approved ? '<p>You can now reference it when applying for a grant from this organisation.</p>' : ''}
          ${button('View Details', `${APP_URL}/auth/login`)}
        `,
      }),
    };
  },

  grantApproved({ fullName, programmeTitle }) {
    return {
      subject: `Grant Application Approved: ${programmeTitle}`,
      html: baseLayout({
        preheader: 'Your grant application has been approved.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>Great news! Your application under "<strong>${programmeTitle}</strong>" has been <strong>approved</strong>.</p>
          <p>Resource allocation and a distribution schedule will follow shortly. Please log in for further updates.</p>
          ${button('View Application', `${APP_URL}/auth/login`)}
        `,
      }),
    };
  },

  grantRejected({ fullName, programmeTitle, reason }) {
    return {
      subject: `Grant Application Update: ${programmeTitle}`,
      html: baseLayout({
        accentColor: '#8a3b3b',
        preheader: 'Update regarding your grant application.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>Your application under "<strong>${programmeTitle}</strong>" was <strong>not approved</strong> at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>You are welcome to submit a revised application addressing the feedback above.</p>
        `,
      }),
    };
  },

  resourceAllocationNotice({ fullName, programmeTitle, expectedDeliveryDate }) {
    return {
      subject: `Resources Allocated for ${programmeTitle}`,
      html: baseLayout({
        preheader: 'Resources have been allocated to your school.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>Resources have been allocated to your school under "<strong>${programmeTitle}</strong>".</p>
          <p><strong>Expected Delivery Date:</strong> ${expectedDeliveryDate}</p>
          <p>Please log in to view the full allocation breakdown and prepare to confirm receipt upon delivery.</p>
          ${button('View Allocation', `${APP_URL}/auth/login`)}
        `,
      }),
    };
  },

  distributionReminder({ fullName, programmeTitle }) {
    return {
      subject: `Reminder: Record Your Distribution for ${programmeTitle}`,
      html: baseLayout({
        accentColor: '#b8894a',
        preheader: 'Please record your distribution details.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>This is a friendly reminder to record the distribution of resources received under "<strong>${programmeTitle}</strong>" and upload supporting evidence.</p>
          ${button('Record Distribution', `${APP_URL}/auth/login`)}
        `,
      }),
    };
  },

  surveyReminder({ fullName, surveyType = 'Needs Assessment' }) {
    return {
      subject: `Reminder: Complete Your ${surveyType} Survey`,
      html: baseLayout({
        accentColor: '#b8894a',
        preheader: `Please complete your ${surveyType} survey.`,
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>This is a reminder to complete your <strong>${surveyType} Survey</strong> on the portal. This helps us better understand your school's needs and measure impact.</p>
          ${button('Complete Survey', `${APP_URL}/auth/login`)}
        `,
      }),
    };
  },

  evidenceApproved({ fullName, description }) {
    return {
      subject: 'Evidence Upload Approved',
      html: baseLayout({
        preheader: 'Your uploaded evidence has been approved.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>Your uploaded evidence${description ? ` ("${description}")` : ''} has been reviewed and <strong>approved</strong> by the programme officer.</p>
        `,
      }),
    };
  },

  evidenceRejected({ fullName, description, comment }) {
    return {
      subject: 'Evidence Upload Requires Attention',
      html: baseLayout({
        accentColor: '#8a3b3b',
        preheader: 'Your uploaded evidence needs a re-upload.',
        bodyHtml: `
          <p>Dear ${fullName},</p>
          <p>Your uploaded evidence${description ? ` ("${description}")` : ''} was <strong>rejected</strong> and requires re-upload.</p>
          ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
          ${button('Re-upload Evidence', `${APP_URL}/auth/login`)}
        `,
      }),
    };
  },
};
