/**
 * Needs Assessment Review Controller (shared: ngo_govt + private_org)
 * -----------------------------------------------------------------------
 * Every needs assessment a school submits is addressed to a specific
 * organisation. This is that organisation's review queue — approve or
 * reject, with the school notified by email either way.
 */

const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const NeedsAssessmentSurvey = require('../../models/NeedsAssessmentSurvey');
const emailService = require('../../services/emailService');
const auditService = require('../../services/auditService');

exports.list = catchAsync(async (req, res) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';

  const surveys = await NeedsAssessmentSurvey.findByOwner({ ownerType, ownerId, status, limit: 200 });

  res.render('shared/grant/needs-assessments', {
    title: 'Needs Assessments',
    activePage: 'needs-assessments',
    surveys,
    statusFilter: status,
    basePath,
  });
});

exports.show = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const survey = await NeedsAssessmentSurvey.findById(req.params.id);

  if (!survey) return next(new ApiError(404, 'Needs assessment not found.'));
  const ownerCol = ownerType === 'ngo_govt' ? 'target_organisation_id' : 'target_private_org_id';
  if (survey[ownerCol] !== ownerId) return next(new ApiError(404, 'Needs assessment not found.'));

  res.render('shared/grant/needs-assessment-detail', {
    title: `Needs Assessment — ${survey.school_name}`,
    activePage: 'needs-assessments',
    survey,
    basePath,
  });
});

exports.decide = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;
  const { decision, comment } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    req.flash('error', 'Invalid decision.');
    return res.redirect(`${basePath}/needs-assessments`);
  }

  const survey = await NeedsAssessmentSurvey.findById(id);
  if (!survey) return next(new ApiError(404, 'Needs assessment not found.'));
  const ownerCol = ownerType === 'ngo_govt' ? 'target_organisation_id' : 'target_private_org_id';
  if (survey[ownerCol] !== ownerId) return next(new ApiError(404, 'Needs assessment not found.'));

  await NeedsAssessmentSurvey.setStatus(id, decision, { reviewedBy: req.session.user.user_id, reviewComment: comment });

  await emailService.sendNeedsAssessmentReviewed(survey.school_rep_email, {
    fullName: survey.school_rep_name,
    decision,
    comment,
  });

  await auditService.logAction(req, `NEEDS_ASSESSMENT_${decision.toUpperCase()}`, {
    entityType: 'needs_assessment_survey', entityId: Number(id), details: survey.school_name,
  });

  req.flash('success', `Needs assessment from ${survey.school_name} has been ${decision}.`);
  return res.redirect(`${basePath}/needs-assessments`);
});
