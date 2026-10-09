/**
 * Role-Based Access Control (RBAC) Middleware
 * ---------------------------------------------
 * Restricts a route to one or more roles. Must run AFTER requireAuth
 * so req.session.user is guaranteed to exist.
 *
 * Usage:
 *   router.get('/admin/users', requireAuth, authorizeRoles('super_admin'), controller);
 *   router.get('/grants', requireAuth, authorizeRoles('ngo_govt', 'private_org'), controller);
 */

const ApiError = require('../utils/ApiError');
const { DASHBOARD_PATH_BY_ROLE } = require('../utils/roleRoutes');

function authorizeRoles(...allowedRoles) {
  return function (req, res, next) {
    const userRole = req.session?.user?.role_name;

    if (!userRole) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!allowedRoles.includes(userRole)) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return next(new ApiError(403, 'You do not have permission to perform this action.'));
      }
      req.flash('error', 'You do not have permission to access that page.');
      return res.redirect(DASHBOARD_PATH_BY_ROLE[userRole] || '/');
    }

    return next();
  };
}

module.exports = authorizeRoles;
module.exports.DASHBOARD_PATH_BY_ROLE = DASHBOARD_PATH_BY_ROLE;
