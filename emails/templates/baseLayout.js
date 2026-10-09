/**
 * Base Email Layout
 * -------------------
 * Wraps all outgoing email bodies in a consistent, professional
 * HTML shell (header banner, footer, styling). Individual templates
 * only need to supply the inner content HTML.
 */

const APP_NAME = process.env.APP_NAME || 'Benue Menstrual Grant Portal';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function baseLayout({ preheader = '', bodyHtml = '', accentColor = '#7a1f3d' }) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_NAME}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f1ee; font-family: 'Segoe UI', Arial, sans-serif;">
    <span style="display:none; max-height:0; overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ee; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:600px; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:${accentColor}; padding:28px 32px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.3px;">
                      ${APP_NAME}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#f0d9e2; font-size:12px; padding-top:4px;">
                      Grant Processing &amp; Management System
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px; color:#2b2b2b; font-size:15px; line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background:#faf8f7; border-top:1px solid #eee;">
                <p style="margin:0; font-size:12px; color:#8a8a8a;">
                  This is an automated message from ${APP_NAME}. Please do not reply directly to this email.
                </p>
                <p style="margin:6px 0 0; font-size:12px;">
                  <a href="${APP_URL}" style="color:${accentColor}; text-decoration:none;">${APP_URL}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

function button(label, url, color = '#7a1f3d') {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:${color}; border-radius:6px;">
          <a href="${url}" style="display:inline-block; padding:12px 26px; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

module.exports = { baseLayout, button };
