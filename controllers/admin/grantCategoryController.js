/**
 * Super Admin — Grant Categories Controller
 * ---------------------------------------------
 * Categories are the taxonomy every grant programme is filed under
 * (e.g. "Sanitary Products", "WASH Facilities"). Managed centrally so
 * NGOs and agencies pick from a consistent list.
 */

const catchAsync = require('../../utils/catchAsync');
const GrantCategory = require('../../models/GrantCategory');
const auditService = require('../../services/auditService');

exports.showCategories = catchAsync(async (req, res) => {
  const categories = await GrantCategory.findAll();
  res.render('admin/grant-categories', {
    title: 'Grant Categories',
    activePage: 'grant-categories',
    categories,
  });
});

exports.createCategory = catchAsync(async (req, res) => {
  const { categoryName, description } = req.body;

  if (!categoryName || !categoryName.trim()) {
    req.flash('error', 'Category name is required.');
    return res.redirect('/super_admin/grant-categories');
  }

  const id = await GrantCategory.create({ categoryName: categoryName.trim(), description, createdBy: req.session.user.user_id });
  await auditService.logAction(req, 'GRANT_CATEGORY_CREATED', { entityType: 'grant_category', entityId: id, details: categoryName });

  req.flash('success', `Category "${categoryName}" created.`);
  return res.redirect('/super_admin/grant-categories');
});

exports.updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { categoryName, description } = req.body;

  await GrantCategory.update(id, { categoryName, description });
  await auditService.logAction(req, 'GRANT_CATEGORY_UPDATED', { entityType: 'grant_category', entityId: Number(id) });

  req.flash('success', 'Category updated.');
  return res.redirect('/super_admin/grant-categories');
});

exports.toggleCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const category = await GrantCategory.findById(id);
  if (!category) {
    req.flash('error', 'Category not found.');
    return res.redirect('/super_admin/grant-categories');
  }

  await GrantCategory.setActive(id, !category.is_active);
  await auditService.logAction(req, category.is_active ? 'GRANT_CATEGORY_DEACTIVATED' : 'GRANT_CATEGORY_ACTIVATED', {
    entityType: 'grant_category', entityId: Number(id),
  });

  req.flash('success', `Category ${category.is_active ? 'deactivated' : 'activated'}.`);
  return res.redirect('/super_admin/grant-categories');
});

exports.deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  try {
    await GrantCategory.delete(id);
    await auditService.logAction(req, 'GRANT_CATEGORY_DELETED', { entityType: 'grant_category', entityId: Number(id) });
    req.flash('success', 'Category deleted.');
  } catch (err) {
    req.flash('error', 'This category is in use by one or more grant programmes and cannot be deleted. Deactivate it instead.');
  }
  return res.redirect('/super_admin/grant-categories');
});
