/**
 * Org Context Middleware
 * -------------------------
 * ngo_govt and private_org users share the exact same grant workflow
 * (programmes, applications, allocations, evidence review, needs
 * assessment review) — the only difference is which table backs their
 * identity and what their default reach estimate is. This middleware
 * resolves that once per request into a single shape, `req.orgContext`,
 * so shared controllers never need role-specific logic.
 */

const Organisation = require('../models/Organisation');
const PrivateOrganisation = require('../models/PrivateOrganisation');
const ApiError = require('../utils/ApiError');

module.exports = async function orgContext(req, res, next) {
  try {
    const role = req.session.user.role_name;

    if (role === 'ngo_govt') {
      const org = await Organisation.findByUserId(req.session.user.user_id);
      if (!org) return next(new ApiError(404, 'Your organisation profile could not be found.'));
      req.orgContext = {
        ownerType: 'ngo_govt', ownerId: org.organisation_id, ownerRecord: org,
        basePath: '/organisation', roleLabel: 'NGO / Government',
      };
      res.locals.orgContext = req.orgContext;
      return next();
    }

    if (role === 'private_org') {
      const org = await PrivateOrganisation.findByUserId(req.session.user.user_id);
      if (!org) return next(new ApiError(404, 'Your organisation profile could not be found.'));
      req.orgContext = {
        ownerType: 'private_org', ownerId: org.private_org_id, ownerRecord: org,
        basePath: '/private_org', roleLabel: 'Private Organisation',
      };
      res.locals.orgContext = req.orgContext;
      return next();
    }

    return next(new ApiError(403, 'This area is only available to NGO/Government and Private Organisation accounts.'));
  } catch (err) {
    return next(err);
  }
};
