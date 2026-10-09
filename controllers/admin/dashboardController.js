/**
 * Super Admin Dashboard Controller
 * -----------------------------------
 * Aggregates key system-wide statistics for the Super Admin's landing
 * dashboard: pending approvals, totals per entity type, and recent
 * audit activity.
 */

const catchAsync = require('../../utils/catchAsync');
const Organisation = require('../../models/Organisation');
const PrivateOrganisation = require('../../models/PrivateOrganisation');
const School = require('../../models/School');
const AuditLog = require('../../models/AuditLog');

function toCountMap(rows) {
  return rows.reduce((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 });
}

exports.showDashboard = catchAsync(async (req, res) => {
  const [orgCounts, privateOrgCounts, schoolCounts, recentLogs, totalSchools] = await Promise.all([
    Organisation.countByStatus(),
    PrivateOrganisation.countByStatus(),
    School.countByStatus(),
    AuditLog.findAll({ limit: 8 }),
    School.countTotal(),
  ]);

  const organisationStats = toCountMap(orgCounts);
  const privateOrgStats = toCountMap(privateOrgCounts);
  const schoolStats = toCountMap(schoolCounts);

  res.render('admin/dashboard', {
    title: 'Super Admin Dashboard',
    activePage: 'dashboard',
    organisationStats,
    privateOrgStats,
    schoolStats,
    totalSchools,
    totalPendingApprovals: organisationStats.pending + privateOrgStats.pending + schoolStats.pending,
    recentLogs,
  });
});
