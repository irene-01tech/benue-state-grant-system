/**
 * Evidence Review Controller (shared: NGO + Government Agency)
 * ------------------------------------------------------------------
 * A single list of every evidence file submitted across all of this
 * organisation's programmes. Actually approving/rejecting a file
 * happens on the parent application's review page — this is the
 * triage view that gets you there.
 */

const catchAsync = require('../../utils/catchAsync');
const EvidenceUpload = require('../../models/EvidenceUpload');

exports.list = catchAsync(async (req, res) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const status = ['pending', 'approved', 'rejected', 'reupload_requested'].includes(req.query.status) ? req.query.status : 'pending';

  const evidence = await EvidenceUpload.findByOwner({ ownerType, ownerId, status, limit: 300 });

  res.render('shared/grant/evidence', {
    title: 'Evidence Review',
    activePage: 'evidence',
    evidence,
    statusFilter: status,
    basePath,
  });
});
