/**
 * School — Browse Programmes & Apply Controller
 * --------------------------------------------------
 * Schools see every active grant programme open to their LGA and can
 * apply directly. If they have an approved needs assessment on file
 * with that same organisation, it's offered as supporting context.
 */

const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const School = require('../../models/School');
const GrantProgramme = require('../../models/GrantProgramme');
const GrantApplication = require('../../models/GrantApplication');
const NeedsAssessmentSurvey = require('../../models/NeedsAssessmentSurvey');
const { pool } = require('../../config/db');
const emailService = require('../../services/emailService');
const auditService = require('../../services/auditService');

const ITEM_OPTIONS = [
  { key: 'sanitary_pads', label: 'Sanitary Pads' },
  { key: 'reusable_pads', label: 'Reusable Pads' },
  { key: 'soap', label: 'Soap' },
  { key: 'underwear', label: 'Underwear' },
  { key: 'buckets', label: 'Buckets' },
  { key: 'educational_materials', label: 'Educational Materials' },
  { key: 'other_hygiene_kits', label: 'Other Hygiene Kits' },
];

exports.browse = catchAsync(async (req, res) => {
  const school = await School.findByUserId(req.session.user.user_id);
  const programmes = school ? await GrantProgramme.findOpenForSchools({ lga: school.lga, limit: 100 }) : [];

  res.render('school/programmes', {
    title: 'Available Grant Programmes',
    activePage: 'programmes',
    school,
    programmes,
  });
});

exports.showApplyForm = catchAsync(async (req, res, next) => {
  const school = await School.findByUserId(req.session.user.user_id);
  if (!school) return next(new ApiError(404, 'Your school profile could not be found.'));

  const programme = await GrantProgramme.findById(req.params.id);
  if (!programme || programme.status !== 'active') return next(new ApiError(404, 'This programme is not currently accepting applications.'));

  const ownerId = programme.owner_type === 'ngo_govt' ? programme.organisation_id : programme.private_org_id;
  const latestSurvey = await NeedsAssessmentSurvey.findLatestApprovedForOrg(school.school_id, programme.owner_type, ownerId);

  res.render('school/application-form', {
    title: `Apply — ${programme.title}`,
    activePage: 'programmes',
    school,
    programme,
    latestSurvey,
    itemOptions: ITEM_OPTIONS,
  });
});

exports.submitApplication = catchAsync(async (req, res, next) => {
  const school = await School.findByUserId(req.session.user.user_id);
  if (!school) return next(new ApiError(404, 'Your school profile could not be found.'));

  const programme = await GrantProgramme.findById(req.params.id);
  if (!programme || programme.status !== 'active') return next(new ApiError(404, 'This programme is not currently accepting applications.'));

  const { numberOfBeneficiaries, reasonForRequest, surveyId } = req.body;
  const requestedItems = req.body.items ? (Array.isArray(req.body.items) ? req.body.items : [req.body.items]) : [];

  if (!requestedItems.length || !reasonForRequest || !reasonForRequest.trim()) {
    req.flash('error', 'Select at least one requested item and explain the reason for your request.');
    return res.redirect(`/school_representative/programmes/${programme.programme_id}/apply`);
  }

  const applicationId = await GrantApplication.create({
    programmeId: programme.programme_id,
    schoolId: school.school_id,
    surveyId: surveyId || null,
    numberOfBeneficiaries,
    itemsRequested: requestedItems,
    reasonForRequest: reasonForRequest.trim(),
  });

  const ownerQuery = programme.owner_type === 'ngo_govt'
    ? 'SELECT u.email, u.full_name FROM organisations o JOIN users u ON u.user_id = o.user_id WHERE o.organisation_id = ?'
    : 'SELECT u.email, u.full_name FROM private_organisations p JOIN users u ON u.user_id = p.user_id WHERE p.private_org_id = ?';
  const ownerId = programme.owner_type === 'ngo_govt' ? programme.organisation_id : programme.private_org_id;
  const [ownerRows] = await pool.query(ownerQuery, [ownerId]);
  const owner = ownerRows[0];

  if (owner) {
    await emailService.sendGrantSubmitted(owner.email, {
      fullName: owner.full_name,
      programmeTitle: programme.title,
      schoolName: school.school_name,
    });
  }

  await auditService.logAction(req, 'APPLICATION_SUBMITTED', { entityType: 'grant_application', entityId: applicationId, details: programme.title });

  req.flash('success', 'Your application has been submitted. You can track its progress under My Applications.');
  return res.redirect('/school_representative/applications');
});
