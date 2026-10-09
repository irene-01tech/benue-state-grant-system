/**
 * Organisation Settings Controller (shared: ngo_govt + private_org)
 * ----------------------------------------------------------------------
 * Lets an organisation view and adjust its own stated reach estimate.
 * This is purely informational — never a hard limit. If actual reach
 * (sum of beneficiaries across approved applications) exceeds the
 * stated estimate, we simply show a note, never block anything.
 */

const catchAsync = require('../../utils/catchAsync');
const Organisation = require('../../models/Organisation');
const PrivateOrganisation = require('../../models/PrivateOrganisation');
const auditService = require('../../services/auditService');

exports.showSettings = catchAsync(async (req, res) => {
  const { ownerType, ownerId, ownerRecord, basePath, roleLabel } = req.orgContext;
  const Model = ownerType === 'ngo_govt' ? Organisation : PrivateOrganisation;

  const currentReach = await Model.currentReach(ownerId);

  res.render('shared/grant/settings', {
    title: 'Organisation Settings',
    activePage: 'settings',
    org: ownerRecord,
    ownerType,
    roleLabel,
    currentReach,
    basePath,
  });
});

exports.updateReachEstimate = catchAsync(async (req, res) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const Model = ownerType === 'ngo_govt' ? Organisation : PrivateOrganisation;

  const reachEstimate = parseInt(req.body.reachEstimate, 10);
  if (!reachEstimate || reachEstimate < 1) {
    req.flash('error', 'Enter a valid reach estimate.');
    return res.redirect(`${basePath}/settings`);
  }

  await Model.updateReachEstimate(ownerId, reachEstimate);
  await auditService.logAction(req, 'REACH_ESTIMATE_UPDATED', { entityType: ownerType, entityId: ownerId, details: String(reachEstimate) });

  req.flash('success', 'Your stated reach estimate has been updated.');
  return res.redirect(`${basePath}/settings`);
});
