/**
 * Role → Dashboard Path
 * -----------------------
 * Role names don't map 1:1 to their URL mount points — ngo_govt lives
 * at /organisation, private_org at /private_org — so anywhere that
 * needs to redirect a user to "their" dashboard should use this map
 * rather than assuming `/${role}/dashboard`.
 */

const DASHBOARD_PATH_BY_ROLE = {
  super_admin: '/super_admin/dashboard',
  ngo_govt: '/organisation/dashboard',
  private_org: '/private_org/dashboard',
  school_representative: '/school_representative/dashboard',
};

function dashboardPathFor(roleName) {
  return DASHBOARD_PATH_BY_ROLE[roleName] || '/';
}

module.exports = { DASHBOARD_PATH_BY_ROLE, dashboardPathFor };
