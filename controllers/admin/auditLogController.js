/**
 * Super Admin — Audit Log Controller
 * -------------------------------------
 * Read-only, filterable view over every recorded system transaction —
 * the Super Admin's window into everything happening in the system.
 */

const catchAsync = require('../../utils/catchAsync');
const AuditLog = require('../../models/AuditLog');

exports.showAuditLogs = catchAsync(async (req, res) => {
  const { action, userId, startDate, endDate } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = 25;
  const offset = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.findAll({ action, userId, startDate, endDate, limit, offset }),
    AuditLog.countAll(),
  ]);

  res.render('admin/audit-logs', {
    title: 'Audit Logs',
    activePage: 'audit-logs',
    logs,
    filters: { action: action || '', userId: userId || '', startDate: startDate || '', endDate: endDate || '' },
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});
