/**
 * School — Needs Assessment Controller
 * ----------------------------------------
 * Schools document their situation and address it to a specific
 * organisation (NGO/Government or Private Org) — the one they're
 * requesting support from. That organisation reviews and decides;
 * this is never routed to the Super Admin.
 */

const catchAsync = require('../../utils/catchAsync');
const School = require('../../models/School');
const NeedsAssessmentSurvey = require('../../models/NeedsAssessmentSurvey');
const Organisation = require('../../models/Organisation');
const PrivateOrganisation = require('../../models/PrivateOrganisation');
const emailService = require('../../services/emailService');
const auditService = require('../../services/auditService');
const path = require('path');
const EvidenceUpload = require('../../models/EvidenceUpload');
const { ALLOWED_TYPES } = require('../../config/multer');

exports.showForm = catchAsync(async (req, res) => {
  const school = await School.findByUserId(req.session.user.user_id);
  const [surveys, organisations, privateOrgs] = await Promise.all([
    school ? NeedsAssessmentSurvey.findBySchool(school.school_id) : [],
    Organisation.findAll({ status: 'approved', limit: 200 }),
    PrivateOrganisation.findAll({ status: 'approved', limit: 200 }),
  ]);

  res.render('school/needs-assessment', {
    title: 'Needs Assessment',
    activePage: 'needs-assessment',
    school,
    surveys,
    organisations,
    privateOrgs,
  });
});

exports.submit = catchAsync(async (req, res) => {
  const school = await School.findByUserId(req.session.user.user_id);
  if (!school) {
    req.flash('error', 'Your school profile could not be found.');
    return res.redirect('/school_representative/needs-assessment');
  }

  const {
    targetOrg, totalFemaleStudents, girlsNeedingSupport, existingToiletFacilities, waterAvailability,
    menstrualEducationProgramme, previousInterventions, estimatedPadRequirement, hygieneKitRequirement, otherChallenges,
  } = req.body;

  if (!targetOrg) {
    req.flash('error', 'Select which organisation you\u2019re requesting support from.');
    return res.redirect('/school_representative/needs-assessment');
  }

  // targetOrg comes in as "ngo_govt:12" or "private_org:7"
  const [targetOrgType, targetOrgIdRaw] = targetOrg.split(':');
  const targetOrgId = Number(targetOrgIdRaw);
  if (!['ngo_govt', 'private_org'].includes(targetOrgType) || !targetOrgId) {
    req.flash('error', 'Invalid organisation selected.');
    return res.redirect('/school_representative/needs-assessment');
  }

  const surveyId = await NeedsAssessmentSurvey.create({
    schoolId: school.school_id,
    targetOrgType,
    targetOrgId,
    totalFemaleStudents, girlsNeedingSupport, existingToiletFacilities, waterAvailability,
    menstrualEducationProgramme: menstrualEducationProgramme === 'on' || menstrualEducationProgramme === 'true',
    previousInterventions, estimatedPadRequirement, hygieneKitRequirement, otherChallenges,
    submittedBy: req.session.user.user_id,
  });

  const targetOrgRecord = targetOrgType === 'ngo_govt'
    ? await Organisation.findById(targetOrgId)
    : await PrivateOrganisation.findById(targetOrgId);

  if (targetOrgRecord) {
    await emailService.sendNeedsAssessmentSubmitted(targetOrgRecord.email, {
      fullName: targetOrgRecord.full_name,
      schoolName: school.school_name,
    });
  }

  // Save any uploaded supporting files (optional)
  const files = req.files || [];
  if (files.length) {
    await Promise.all(files.map((file) => EvidenceUpload.create({
      schoolId: school.school_id,
      applicationId: null,
      distributionId: null,
      fileName: file.originalname,
      filePath: `/uploads/evidence/${file.filename}`,
      fileType: path.extname(file.originalname).replace('.', '').toLowerCase() || ALLOWED_TYPES[file.mimetype] || 'bin',
      fileSize: file.size,
      description: null,
      uploadedBy: req.session.user.user_id,
    })));

    await auditService.logAction(req, 'NEEDS_ASSESSMENT_ATTACHMENTS_UPLOADED', {
      entityType: 'needs_assessment_survey', entityId: surveyId, details: `${files.length} file(s)`,
    });
  }

  await auditService.logAction(req, 'NEEDS_ASSESSMENT_SUBMITTED', { entityType: 'needs_assessment_survey', entityId: surveyId });

  req.flash('success', 'Needs assessment submitted for review. You\u2019ll be notified once it\u2019s decided.');
  return res.redirect('/school_representative/needs-assessment');
});
