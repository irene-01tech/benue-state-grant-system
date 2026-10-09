/**
 * Super Admin — Reports Controller
 * -----------------------------------
 * Renders the reports hub and streams exports (CSV / Excel / PDF) for
 * each organisation type, the full user directory, and the audit trail.
 */

const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const School = require('../../models/School');
const Organisation = require('../../models/Organisation');
const PrivateOrganisation = require('../../models/PrivateOrganisation');
const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');
const auditService = require('../../services/auditService');
const { toCSV, toExcel, toPDF } = require('../../utils/reportExporter');

const REPORTS = {
  schools: {
    label: 'Schools Report',
    description: 'Every registered school, its status, location, and student population.',
    fetch: () => School.findAll({ limit: 1000 }),
    columns: [
      { key: 'school_name', label: 'School Name', width: 30 },
      { key: 'school_type', label: 'Type', width: 10 },
      { key: 'lga', label: 'LGA', width: 14 },
      { key: 'principal_name', label: 'Principal', width: 22 },
      { key: 'total_students', label: 'Total Students', width: 12 },
      { key: 'total_female_students', label: 'Female Students', width: 12 },
      { key: 'approval_status', label: 'Status', width: 12 },
      { key: 'full_name', label: 'Representative', width: 22 },
      { key: 'email', label: 'Email', width: 26 },
      { key: 'created_at', label: 'Registered', width: 14 },
    ],
  },
  organisations: {
    label: 'NGO / Government Organisation Report',
    description: 'Every registered NGO/Government organisation with focus area, contact, reach estimate, and status.',
    fetch: () => Organisation.findAll({ limit: 1000 }),
    columns: [
      { key: 'org_name', label: 'Organisation Name', width: 30 },
      { key: 'focus_area', label: 'Focus Area', width: 22 },
      { key: 'registration_number', label: 'Reg. Number', width: 16 },
      { key: 'reach_estimate', label: 'Stated Reach Estimate', width: 16 },
      { key: 'approval_status', label: 'Status', width: 12 },
      { key: 'full_name', label: 'Contact', width: 22 },
      { key: 'email', label: 'Email', width: 26 },
      { key: 'created_at', label: 'Registered', width: 14 },
    ],
  },
  'private-orgs': {
    label: 'Private Organisation Report',
    description: 'Every registered private organisation/individual with reach estimate and status.',
    fetch: () => PrivateOrganisation.findAll({ limit: 1000 }),
    columns: [
      { key: 'org_name', label: 'Organisation Name', width: 30 },
      { key: 'description', label: 'Description', width: 26 },
      { key: 'reach_estimate', label: 'Stated Reach Estimate', width: 16 },
      { key: 'approval_status', label: 'Status', width: 12 },
      { key: 'full_name', label: 'Contact', width: 22 },
      { key: 'email', label: 'Email', width: 26 },
      { key: 'created_at', label: 'Registered', width: 14 },
    ],
  },
  users: {
    label: 'User Directory Report',
    description: 'Every user account across all roles, with status and last login.',
    fetch: () => User.findAll({ limit: 2000 }),
    columns: [
      { key: 'full_name', label: 'Full Name', width: 24 },
      { key: 'email', label: 'Email', width: 26 },
      { key: 'role_name', label: 'Role', width: 18 },
      { key: 'status', label: 'Status', width: 12 },
      { key: 'last_login', label: 'Last Login', width: 16 },
      { key: 'created_at', label: 'Created', width: 14 },
    ],
  },
  'audit-logs': {
    label: 'Audit Trail Report',
    description: 'A chronological record of every significant action taken in the system.',
    fetch: () => AuditLog.findAll({ limit: 2000 }),
    columns: [
      { key: 'action', label: 'Action', width: 24 },
      { key: 'user_name', label: 'Performed By', width: 22 },
      { key: 'user_role', label: 'Role', width: 16 },
      { key: 'entity_type', label: 'Entity', width: 14 },
      { key: 'ip_address', label: 'IP Address', width: 16 },
      { key: 'created_at', label: 'When', width: 16 },
    ],
  },
};

exports.showReports = catchAsync(async (req, res) => {
  const [schoolTotal, orgTotal, privateOrgTotal, userTotal, auditTotal] = await Promise.all([
    School.countTotal(),
    Organisation.countByStatus().then((rows) => rows.reduce((s, r) => s + r.count, 0)),
    PrivateOrganisation.countByStatus().then((rows) => rows.reduce((s, r) => s + r.count, 0)),
    User.findAll({ limit: 100000 }).then((rows) => rows.length),
    AuditLog.countAll(),
  ]);

  res.render('admin/reports', {
    title: 'Reports',
    activePage: 'reports',
    reportMeta: [
      { key: 'schools', ...pick(REPORTS.schools), total: schoolTotal },
      { key: 'organisations', ...pick(REPORTS.organisations), total: orgTotal },
      { key: 'private-orgs', ...pick(REPORTS['private-orgs']), total: privateOrgTotal },
      { key: 'users', ...pick(REPORTS.users), total: userTotal },
      { key: 'audit-logs', ...pick(REPORTS['audit-logs']), total: auditTotal },
    ],
  });
});

function pick({ label, description }) {
  return { label, description };
}

exports.exportReport = catchAsync(async (req, res, next) => {
  const { reportType, format } = req.params;
  const report = REPORTS[reportType];

  if (!report) return next(new ApiError(404, 'Unknown report type.'));
  if (!['csv', 'excel', 'pdf'].includes(format)) return next(new ApiError(400, 'Unknown export format.'));

  const rows = await report.fetch();
  const filename = `${reportType}-report-${new Date().toISOString().slice(0, 10)}`;

  await auditService.logAction(req, 'REPORT_EXPORTED', { entityType: 'report', details: `${reportType} (${format})` });

  if (format === 'csv') return toCSV(res, filename, report.columns, rows);
  if (format === 'excel') return toExcel(res, filename, report.label, report.columns, rows);
  return toPDF(res, filename, report.label, report.columns, rows);
});
