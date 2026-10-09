/**
 * Organisation Dashboard Controller (shared: ngo_govt + private_org)
 * -----------------------------------------------------------------------
 * Relies on req.orgContext to stay agnostic to which of the two roles
 * is calling it. Shows programme/application stats and the reach
 * estimate compared to actual reach — purely informational, never a
 * limit (see the note rendered on the view when exceeded).
 */

const catchAsync = require('../../utils/catchAsync');
const GrantProgramme = require('../../models/GrantProgramme');
const GrantApplication = require('../../models/GrantApplication');
const NeedsAssessmentSurvey = require('../../models/NeedsAssessmentSurvey');
const Organisation = require('../../models/Organisation');
const PrivateOrganisation = require('../../models/PrivateOrganisation');

exports.showDashboard = catchAsync(async (req, res) => {
  const { ownerType, ownerId, ownerRecord, basePath, roleLabel } = req.orgContext;
  const Model = ownerType === 'ngo_govt' ? Organisation : PrivateOrganisation;

  const [programmes, applicationCounts, pendingSurveys, currentReach] = await Promise.all([
    GrantProgramme.findByOwner({ ownerType, ownerId, limit: 200 }),
    GrantApplication.countByOwnerAndStatus({ ownerType, ownerId }),
    NeedsAssessmentSurvey.countPendingForOwner({ ownerType, ownerId }),
    Model.currentReach(ownerId),
  ]);

  const appStats = applicationCounts.reduce((acc, row) => {
    acc[row.status] = row.total;
    return acc;
  }, { submitted: 0, under_review: 0, approved: 0, rejected: 0 });

  const totalBudget = programmes.reduce((sum, p) => sum + Number(p.total_budget), 0);
  const budgetUtilized = programmes.reduce((sum, p) => sum + Number(p.budget_utilized), 0);
  const activeProgrammes = programmes.filter((p) => p.status === 'active').length;

  res.render('shared/grant/dashboard', {
    title: 'Dashboard',
    activePage: 'dashboard',
    roleLabel,
    org: ownerRecord,
    ownerType,
    basePath,
    stats: {
      totalProgrammes: programmes.length,
      activeProgrammes,
      pendingApplications: appStats.submitted + appStats.under_review,
      approvedApplications: appStats.approved,
      rejectedApplications: appStats.rejected,
      pendingSurveys,
      totalBudget,
      budgetUtilized,
    },
    reachEstimate: ownerRecord.reach_estimate,
    currentReach,
    reachExceeded: currentReach > ownerRecord.reach_estimate,
  });
});
