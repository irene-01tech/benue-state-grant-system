/**
 * Super Admin — Approvals Controller
 * ------------------------------------
 * Handles the review queue for School / Organisation (NGO/Government)
 * / Private Organisation registrations. The Super Admin can approve
 * or reject any of the three; NGO/Government accounts additionally
 * have delegated authority to approve Schools and Private
 * Organisations (see controllers/organisation/approvalController.js).
 */

const catchAsync = require('../../utils/catchAsync');
const School = require('../../models/School');
const Organisation = require('../../models/Organisation');
const PrivateOrganisation = require('../../models/PrivateOrganisation');
const { buildApprovalHandlers } = require('../../services/registrationApprovalService');

exports.showApprovals = catchAsync(async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const tab = ['schools', 'organisations', 'private-orgs'].includes(req.query.tab) ? req.query.tab : 'schools';

  const [schools, organisations, privateOrgs] = await Promise.all([
    School.findAll({ status, limit: 100 }),
    Organisation.findAll({ status, limit: 100 }),
    PrivateOrganisation.findAll({ status, limit: 100 }),
  ]);

  res.render('admin/approvals', {
    title: 'Registration Approvals',
    activePage: 'approvals',
    status,
    tab,
    schools,
    organisations,
    privateOrgs,
    counts: { schools: schools.length, organisations: organisations.length, privateOrgs: privateOrgs.length },
  });
});

exports.school = buildApprovalHandlers({
  model: School, idParam: 'schoolId', nameField: 'school_name', auditType: 'school',
  redirectUrl: () => '/super_admin/approvals?tab=schools',
});

exports.organisation = buildApprovalHandlers({
  model: Organisation, idParam: 'organisationId', nameField: 'org_name', auditType: 'organisation',
  redirectUrl: () => '/super_admin/approvals?tab=organisations',
});

exports.privateOrg = buildApprovalHandlers({
  model: PrivateOrganisation, idParam: 'privateOrgId', nameField: 'org_name', auditType: 'private_organisation',
  redirectUrl: () => '/super_admin/approvals?tab=private-orgs',
});
