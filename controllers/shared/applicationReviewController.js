/**
 * Application Review Controller (shared: NGO + Government Agency)
 * ---------------------------------------------------------------------
 * The single-page workflow for one grant application: review & decide,
 * allocate resources once approved, and verify the school's evidence
 * once they've recorded a distribution.
 */

const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const GrantApplication = require('../../models/GrantApplication');
const GrantProgramme = require('../../models/GrantProgramme');
const ResourceAllocation = require('../../models/ResourceAllocation');
const DistributionRecord = require('../../models/DistributionRecord');
const EvidenceUpload = require('../../models/EvidenceUpload');
const emailService = require('../../services/emailService');
const auditService = require('../../services/auditService');

async function loadApplicationOwnedBy(applicationId, ownerType, ownerId) {
  const application = await GrantApplication.findById(applicationId);
  if (!application) return null;
  const belongsToOwner = ownerType === 'ngo_govt' ? application.organisation_id === ownerId : application.private_org_id === ownerId;
  return belongsToOwner ? application : null;
}

exports.listAll = catchAsync(async (req, res) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const status = ['submitted', 'under_review', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : undefined;

  const applications = await GrantApplication.findByOwner({ ownerType, ownerId, status, limit: 300 });

  res.render('shared/grant/applications', {
    title: 'Applications',
    activePage: 'applications',
    applications,
    statusFilter: status || '',
    basePath,
  });
});

exports.show = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;

  const application = await loadApplicationOwnedBy(id, ownerType, ownerId);
  if (!application) return next(new ApiError(404, 'Application not found.'));

  const allocation = await ResourceAllocation.findByApplication(id);
  let distribution = null;
  let evidence = [];

  if (allocation) {
    distribution = await DistributionRecord.findByAllocation(allocation.allocation_id);
    if (distribution) evidence = await EvidenceUpload.findByDistribution(distribution.distribution_id);
  }

  res.render('shared/grant/application-review', {
    title: `Application — ${application.school_name}`,
    activePage: 'programmes',
    application,
    allocation,
    distribution,
    evidence,
    itemFields: ResourceAllocation.itemFields,
    basePath,
  });
});

exports.decide = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;
  const { decision, comment } = req.body;

  if (!['approved', 'rejected'].includes(decision)) return next(new ApiError(400, 'Invalid decision.'));

  const application = await loadApplicationOwnedBy(id, ownerType, ownerId);
  if (!application) return next(new ApiError(404, 'Application not found.'));

  await GrantApplication.setStatus(id, decision, { reviewedBy: req.session.user.user_id, reviewComment: comment });

  if (decision === 'approved') {
    await emailService.sendGrantApproved(application.school_rep_email, {
      fullName: application.school_rep_name,
      programmeTitle: application.programme_title,
    });
  } else {
    await emailService.sendGrantRejected(application.school_rep_email, {
      fullName: application.school_rep_name,
      programmeTitle: application.programme_title,
      reason: comment || 'No specific reason was provided.',
    });
  }

  await auditService.logAction(req, `APPLICATION_${decision.toUpperCase()}`, {
    entityType: 'grant_application', entityId: Number(id), details: application.school_name,
  });

  req.flash('success', `Application ${decision}.`);
  return res.redirect(`${basePath}/applications/${id}`);
});

exports.allocate = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;

  const application = await loadApplicationOwnedBy(id, ownerType, ownerId);
  if (!application) return next(new ApiError(404, 'Application not found.'));
  if (application.status !== 'approved') {
    req.flash('error', 'Only approved applications can receive a resource allocation.');
    return res.redirect(`${basePath}/applications/${id}`);
  }
  if (await GrantApplication.hasAllocation(id)) {
    req.flash('error', 'Resources have already been allocated for this application.');
    return res.redirect(`${basePath}/applications/${id}`);
  }

  const items = {};
  ResourceAllocation.itemFields.forEach((field) => { items[field] = Number(req.body[field]) || 0; });

  const { otherItemsDescription, budgetAllocated, expectedDeliveryDate } = req.body;

  await ResourceAllocation.create({
    applicationId: id, allocatedBy: req.session.user.user_id, items,
    otherItemsDescription, budgetAllocated, expectedDeliveryDate,
  });

  await GrantProgramme.incrementUtilizedBudget(application.programme_id, Number(budgetAllocated) || 0);

  await emailService.sendResourceAllocationNotice(application.school_rep_email, {
    fullName: application.school_rep_name,
    programmeTitle: application.programme_title,
    expectedDeliveryDate: expectedDeliveryDate || 'to be confirmed',
  });

  await auditService.logAction(req, 'RESOURCES_ALLOCATED', { entityType: 'grant_application', entityId: Number(id), details: application.school_name });

  req.flash('success', 'Resources allocated and the school has been notified.');
  return res.redirect(`${basePath}/applications/${id}`);
});

exports.verifyEvidence = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id, uploadId } = req.params;
  const { decision, comment } = req.body;

  if (!['approved', 'rejected', 'reupload_requested'].includes(decision)) return next(new ApiError(400, 'Invalid decision.'));

  const application = await loadApplicationOwnedBy(id, ownerType, ownerId);
  if (!application) return next(new ApiError(404, 'Application not found.'));

  const upload = await EvidenceUpload.findById(uploadId);
  if (!upload) return next(new ApiError(404, 'Evidence file not found.'));

  await EvidenceUpload.setVerification(uploadId, decision, { verifiedBy: req.session.user.user_id, comment });

  if (decision === 'approved') {
    await emailService.sendEvidenceApproved(application.school_rep_email, { fullName: application.school_rep_name, description: upload.description || upload.file_name });
  } else {
    await emailService.sendEvidenceRejected(application.school_rep_email, {
      fullName: application.school_rep_name, description: upload.description || upload.file_name, comment: comment || 'No comment provided.',
    });
  }

  await auditService.logAction(req, 'EVIDENCE_' + decision.toUpperCase(), { entityType: 'evidence_upload', entityId: Number(uploadId) });

  req.flash('success', 'Evidence review recorded.');
  return res.redirect(`${basePath}/applications/${id}`);
});
