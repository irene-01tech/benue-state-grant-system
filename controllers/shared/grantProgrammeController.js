/**
 * Grant Programme Controller (shared: NGO + Government Agency)
 * ------------------------------------------------------------------
 * Relies on req.orgContext (see middlewares/orgContext.js) to stay
 * completely agnostic to which of the two roles is calling it.
 */

const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const GrantProgramme = require('../../models/GrantProgramme');
const GrantCategory = require('../../models/GrantCategory');
const GrantApplication = require('../../models/GrantApplication');
const auditService = require('../../services/auditService');

const LGAS = ['Ado','Agatu','Apa','Buruku','Gboko','Guma','Gwer East','Gwer West','Katsina-Ala','Konshisha',
  'Kwande','Logo','Makurdi','Obi','Ogbadibo','Ohimini','Oju','Okpokwu','Otukpo','Tarka','Ukum','Ushongo','Vandeikya'];

exports.list = catchAsync(async (req, res) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const status = ['draft', 'active', 'closed', 'archived'].includes(req.query.status) ? req.query.status : undefined;
  const programmes = await GrantProgramme.findByOwner({ ownerType, ownerId, status, limit: 200 });

  res.render('shared/grant/programmes', {
    title: 'Grant Programmes',
    activePage: 'programmes',
    programmes,
    statusFilter: status || '',
    basePath,
  });
});

exports.showCreateForm = catchAsync(async (req, res) => {
  const categories = await GrantCategory.findAll({ activeOnly: true });
  res.render('shared/grant/programme-form', {
    title: 'New Grant Programme',
    activePage: 'programmes',
    categories,
    lgas: LGAS,
    programme: null,
    basePath: req.orgContext.basePath,
  });
});

exports.create = catchAsync(async (req, res) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { categoryId, title, description, totalBudget, targetLgas, startDate, endDate } = req.body;

  if (!categoryId || !title || !title.trim()) {
    req.flash('error', 'Category and title are required.');
    return res.redirect(`${basePath}/programmes/new`);
  }

  const targetLgasValue = Array.isArray(targetLgas) && targetLgas.length ? targetLgas.join(',') : 'ALL';

  const programmeId = await GrantProgramme.create({
    categoryId, createdByUserId: req.session.user.user_id, ownerType,
    organisationId: ownerType === 'ngo_govt' ? ownerId : null,
    privateOrgId: ownerType === 'private_org' ? ownerId : null,
    title: title.trim(), description, totalBudget, targetLgas: targetLgasValue, startDate, endDate,
  });

  await auditService.logAction(req, 'GRANT_PROGRAMME_CREATED', { entityType: 'grant_programme', entityId: programmeId, details: title });

  req.flash('success', `"${title}" is live and open for school applications.`);
  return res.redirect(`${basePath}/programmes/${programmeId}`);
});

exports.showEditForm = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;

  if (!(await GrantProgramme.isOwnedBy(id, ownerType, ownerId))) return next(new ApiError(404, 'Programme not found.'));

  const [programme, categories] = await Promise.all([GrantProgramme.findById(id), GrantCategory.findAll({ activeOnly: true })]);
  res.render('shared/grant/programme-form', {
    title: 'Edit Grant Programme',
    activePage: 'programmes',
    categories,
    lgas: LGAS,
    programme,
    basePath,
  });
});

exports.update = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;

  if (!(await GrantProgramme.isOwnedBy(id, ownerType, ownerId))) return next(new ApiError(404, 'Programme not found.'));

  const { categoryId, title, description, totalBudget, targetLgas, startDate, endDate } = req.body;
  const targetLgasValue = Array.isArray(targetLgas) && targetLgas.length ? targetLgas.join(',') : 'ALL';

  await GrantProgramme.update(id, { categoryId, title, description, totalBudget, targetLgas: targetLgasValue, startDate, endDate });
  await auditService.logAction(req, 'GRANT_PROGRAMME_UPDATED', { entityType: 'grant_programme', entityId: Number(id) });

  req.flash('success', 'Programme updated.');
  return res.redirect(`${basePath}/programmes/${id}`);
});

exports.show = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;

  if (!(await GrantProgramme.isOwnedBy(id, ownerType, ownerId))) return next(new ApiError(404, 'Programme not found.'));

  const [programme, applications] = await Promise.all([
    GrantProgramme.findById(id),
    GrantApplication.findByProgramme(id, { limit: 200 }),
  ]);

  res.render('shared/grant/programme-detail', {
    title: programme.title,
    activePage: 'programmes',
    programme,
    applications,
    basePath,
  });
});

exports.setStatus = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;
  const { status } = req.body;

  if (!['draft', 'active', 'closed', 'archived'].includes(status)) return next(new ApiError(400, 'Invalid status.'));
  if (!(await GrantProgramme.isOwnedBy(id, ownerType, ownerId))) return next(new ApiError(404, 'Programme not found.'));

  await GrantProgramme.setStatus(id, status);
  await auditService.logAction(req, 'GRANT_PROGRAMME_STATUS_CHANGED', { entityType: 'grant_programme', entityId: Number(id), details: status });

  req.flash('success', `Programme marked as ${status}.`);
  return res.redirect(`${basePath}/programmes/${id}`);
});

exports.delete = catchAsync(async (req, res, next) => {
  const { ownerType, ownerId, basePath } = req.orgContext;
  const { id } = req.params;

  if (!(await GrantProgramme.isOwnedBy(id, ownerType, ownerId))) return next(new ApiError(404, 'Programme not found.'));

  try {
    await GrantProgramme.delete(id);
    await auditService.logAction(req, 'GRANT_PROGRAMME_DELETED', { entityType: 'grant_programme', entityId: Number(id) });
    req.flash('success', 'Programme deleted.');
  } catch (err) {
    req.flash('error', 'This programme has applications on record and cannot be deleted. Close or archive it instead.');
  }
  return res.redirect(`${basePath}/programmes`);
});
