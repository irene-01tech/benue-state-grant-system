/**
 * NGO/Government — Delegated Approvals Controller
 * ----------------------------------------------------
 * Any approved NGO/Government account has the same approval authority
 * as the Super Admin for exactly two registration types: Schools and
 * Private Organisations. This spreads out the review workload without
 * letting an organisation approve peer NGO/Government accounts (that
 * stays Super-Admin-only, to avoid an uncontrolled approval chain).
 */

const catchAsync = require('../../utils/catchAsync');
const School = require('../../models/School');
const PrivateOrganisation = require('../../models/PrivateOrganisation');
const { buildApprovalHandlers } = require('../../services/registrationApprovalService');

exports.showApprovals = catchAsync(async (req, res) => {
  const { basePath } = req.orgContext;
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const tab = ['schools', 'private-orgs'].includes(req.query.tab) ? req.query.tab : 'schools';

  const [schools, privateOrgs] = await Promise.all([
    School.findAll({ status, limit: 100 }),
    PrivateOrganisation.findAll({ status, limit: 100 }),
  ]);

  res.render('shared/grant/approvals', {
    title: 'Registration Approvals',
    activePage: 'approvals',
    status,
    tab,
    schools,
    privateOrgs,
    counts: { schools: schools.length, privateOrgs: privateOrgs.length },
    basePath,
  });
});

exports.school = buildApprovalHandlers({
  model: School, idParam: 'schoolId', nameField: 'school_name', auditType: 'school',
  redirectUrl: (req) => `${req.orgContext.basePath}/approvals?tab=schools`,
});

exports.privateOrg = buildApprovalHandlers({
  model: PrivateOrganisation, idParam: 'privateOrgId', nameField: 'org_name', auditType: 'private_organisation',
  redirectUrl: (req) => `${req.orgContext.basePath}/approvals?tab=private-orgs`,
});
