/**
 * Super Admin — System Settings Controller
 * --------------------------------------------
 * Reads and writes global key/value configuration used across the
 * platform (site name, support email, session timeout, upload limit).
 */

const catchAsync = require('../../utils/catchAsync');
const SystemSetting = require('../../models/SystemSetting');
const auditService = require('../../services/auditService');

const EDITABLE_KEYS = [
  { key: 'site_name', label: 'Site Name', type: 'text' },
  { key: 'support_email', label: 'Support Email', type: 'email' },
  { key: 'session_timeout_minutes', label: 'Session Timeout (minutes)', type: 'number' },
  { key: 'max_upload_size_mb', label: 'Max Upload Size (MB)', type: 'number' },
];

exports.showSettings = catchAsync(async (req, res) => {
  const settingsMap = await SystemSetting.findAsMap();

  res.render('admin/settings', {
    title: 'System Settings',
    activePage: 'settings',
    fields: EDITABLE_KEYS.map((f) => ({ ...f, value: settingsMap[f.key] || '' })),
  });
});

exports.updateSettings = catchAsync(async (req, res) => {
  const updates = {};
  EDITABLE_KEYS.forEach((f) => {
    if (req.body[f.key] !== undefined) updates[f.key] = req.body[f.key];
  });

  await SystemSetting.setMany(updates, req.session.user.user_id);
  await auditService.logAction(req, 'SYSTEM_SETTINGS_UPDATED', { entityType: 'system_settings' });

  req.flash('success', 'System settings updated successfully.');
  return res.redirect('/super_admin/settings');
});
