/**
 * CSRF Protection Middleware
 * ---------------------------
 * Uses csurf with the session as the token store. Every server-rendered
 * form must include the hidden {{ csrfToken }} field (exposed to all
 * views via res.locals in app.js) so form submissions are validated.
 */

const csrf = require('csurf');

const csrfProtection = csrf({
  cookie: false, // token stored in session, not a separate cookie
});

/**
 * Makes the CSRF token available to every EJS view as `csrfToken`.
 */
function exposeCsrfToken(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
}

/**
 * Translates csurf's EBADCSRFTOKEN error into a clean 403 response.
 */
function csrfErrorHandler(err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(403).json({ success: false, message: 'Invalid or expired form submission. Please refresh and try again.' });
  }
  req.flash('error', 'Your session expired or the form was tampered with. Please try again.');
  return res.redirect('back');
}

module.exports = { csrfProtection, exposeCsrfToken, csrfErrorHandler };
