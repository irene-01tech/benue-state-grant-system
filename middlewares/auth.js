/**
 * Authentication Middleware
 * --------------------------
 * Guards routes that require a logged-in user. Also exposes a helper
 * to redirect already-authenticated users away from guest-only pages
 * (e.g. the login page).
 */

const ApiError = require('../utils/ApiError');
const { dashboardPathFor } = require('../utils/roleRoutes');

/**
 * Requires the request to have a valid, active session user.
 * If the user must change their password, they are redirected to
 * the force-change-password page for every route except that one
 * and logout.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return next(new ApiError(401, 'You must be logged in to access this resource.'));
    }
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/auth/login');
  }

  const exemptPaths = ['/auth/force-change-password', '/force-change-password', '/auth/logout', '/logout'];
  const requestPath = req.path || '';
  const requestUrl = req.originalUrl || requestPath;

  if (req.session.user.must_change_password && !exemptPaths.includes(requestPath) && !exemptPaths.includes(requestUrl)) {
    return res.redirect('/auth/force-change-password');
  }

  res.locals.currentUser = req.session.user;
  return next();
}

/**
 * Redirects an already-authenticated user away from guest-only pages
 * (login, register, forgot password) straight to their dashboard.
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect(dashboardPathFor(req.session.user.role_name));
  }
  return next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
