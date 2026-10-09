/**
 * School — Application Tracking Controller
 * ---------------------------------------------
 * The school-side mirror of the NGO/Government application-review page:
 * one screen per application showing its status, any resource
 * allocation, the school's own distribution record, evidence uploads,
 * and (once evidence is approved) the impact survey.
 */

const path = require('path');

const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const School = require('../../models/School');
const GrantApplication = require('../../models/GrantApplication');
const ResourceAllocation = require('../../models/ResourceAllocation');
const DistributionRecord = require('../../models/DistributionRecord');
const EvidenceUpload = require('../../models/EvidenceUpload');
const ImpactSurvey = require('../../models/ImpactSurvey');
const emailService = require('../../services/emailService');
const auditService = require('../../services/auditService');

async function loadOwnApplication(req) {
  const school = await School.findByUserId(req.session.user.user_id);
  if (!school) return { school: null, application: null };

  const application = await GrantApplication.findById(req.params.id);
  if (!application || application.school_id !== school.school_id) return { school, application: null };

  return { school, application };
}

exports.listMine = catchAsync(async (req, res) => {
  const school = await School.findByUserId(req.session.user.user_id);
  const applications = school ? await GrantApplication.findBySchool(school.school_id, { limit: 200 }) : [];

  res.render('school/applications', {
    title: 'My Applications',
    activePage: 'applications',
    school,
    applications,
  });
});

exports.show = catchAsync(async (req, res, next) => {
  const { school, application } = await loadOwnApplication(req);
  if (!application) return next(new ApiError(404, 'Application not found.'));

  const allocation = await ResourceAllocation.findByApplication(application.application_id);
  let distribution = null;
  let evidence = [];
  let impactSurvey = null;

  if (allocation) {
    distribution = await DistributionRecord.findByAllocation(allocation.allocation_id);
    if (distribution) evidence = await EvidenceUpload.findByDistribution(distribution.distribution_id);
  }
  impactSurvey = await ImpactSurvey.findByApplication(application.application_id);

  const evidenceApproved = evidence.some((e) => e.verification_status === 'approved');

  res.render('school/application-detail', {
    title: application.programme_title,
    activePage: 'applications',
    school,
    application,
    allocation,
    distribution,
    evidence,
    evidenceApproved,
    impactSurvey,
    itemFields: ResourceAllocation.itemFields,
  });
});

exports.recordDistribution = catchAsync(async (req, res, next) => {
  const { school, application } = await loadOwnApplication(req);
  if (!application) return next(new ApiError(404, 'Application not found.'));

  const allocation = await ResourceAllocation.findByApplication(application.application_id);
  if (!allocation) {
    req.flash('error', 'Resources have not been allocated for this application yet.');
    return res.redirect(`/school_representative/applications/${application.application_id}`);
  }
  if (await DistributionRecord.findByAllocation(allocation.allocation_id)) {
    req.flash('error', 'A distribution has already been recorded for this allocation.');
    return res.redirect(`/school_representative/applications/${application.application_id}`);
  }

  const { distributionDate, studentsServed, remarks, gpsLatitude, gpsLongitude } = req.body;
  const itemsReceived = {};
  const balanceRemaining = {};
  ResourceAllocation.itemFields.forEach((field) => {
    const received = Number(req.body[`received_${field}`]) || 0;
    itemsReceived[field] = received;
    balanceRemaining[field] = Math.max((Number(allocation[field]) || 0) - received, 0);
  });

  const distributionId = await DistributionRecord.create({
    allocationId: allocation.allocation_id,
    schoolId: school.school_id,
    recordedBy: req.session.user.user_id,
    distributionDate,
    itemsReceived,
    studentsServed,
    balanceRemaining,
    remarks,
  });

  await DistributionRecord.confirmReceipt(distributionId);
  await auditService.logAction(req, 'DISTRIBUTION_RECORDED', {
    entityType: 'distribution_record', entityId: distributionId, details: application.programme_title,
  });

  req.flash('success', 'Distribution recorded. Upload evidence next to complete verification.');
  return res.redirect(`/school_representative/applications/${application.application_id}`);
});

exports.uploadEvidence = catchAsync(async (req, res, next) => {
  const { school, application } = await loadOwnApplication(req);
  if (!application) return next(new ApiError(404, 'Application not found.'));

  const allocation = await ResourceAllocation.findByApplication(application.application_id);
  const distribution = allocation ? await DistributionRecord.findByAllocation(allocation.allocation_id) : null;

  if (!distribution) {
    req.flash('error', 'Record your distribution before uploading evidence.');
    return res.redirect(`/school_representative/applications/${application.application_id}`);
  }

  const files = req.files || [];
  if (!files.length) {
    req.flash('error', 'Select at least one photo, PDF, or Excel file to upload.');
    return res.redirect(`/school_representative/applications/${application.application_id}`);
  }

  const { ALLOWED_TYPES } = require('../../config/multer');
  const { description } = req.body;

  await Promise.all(files.map((file) => EvidenceUpload.create({
    schoolId: school.school_id,
    applicationId: application.application_id,
    distributionId: distribution.distribution_id,
    fileName: file.originalname,
    filePath: `/uploads/evidence/${file.filename}`,
    fileType: path.extname(file.originalname).replace('.', '').toLowerCase() || ALLOWED_TYPES[file.mimetype] || 'bin',
    fileSize: file.size,
    description,
    uploadedBy: req.session.user.user_id,
  })));

  await auditService.logAction(req, 'EVIDENCE_UPLOADED', {
    entityType: 'distribution_record', entityId: distribution.distribution_id, details: `${files.length} file(s)`,
  });

  req.flash('success', `${files.length} file${files.length === 1 ? '' : 's'} uploaded for review.`);
  return res.redirect(`/school_representative/applications/${application.application_id}`);
});

exports.submitImpactSurvey = catchAsync(async (req, res, next) => {
  const { school, application } = await loadOwnApplication(req);
  if (!application) return next(new ApiError(404, 'Application not found.'));

  if (await ImpactSurvey.findByApplication(application.application_id)) {
    req.flash('error', 'An impact survey has already been submitted for this application.');
    return res.redirect(`/school_representative/applications/${application.application_id}`);
  }

  const { attendanceImprovement, confidenceImprovement, girlsImpacted, feedbackNotes } = req.body;

  const surveyId = await ImpactSurvey.create({
    schoolId: school.school_id,
    applicationId: application.application_id,
    attendanceImprovement,
    confidenceImprovement,
    girlsImpacted,
    feedbackNotes,
    submittedBy: req.session.user.user_id,
  });

  await auditService.logAction(req, 'IMPACT_SURVEY_SUBMITTED', {
    entityType: 'impact_survey', entityId: surveyId, details: application.programme_title,
  });

  req.flash('success', 'Thank you — your impact survey has been submitted.');
  return res.redirect(`/school_representative/applications/${application.application_id}`);
});
