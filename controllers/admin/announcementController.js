/**
 * Super Admin — Announcements Controller
 * ------------------------------------------
 * Lets the Super Admin broadcast a message to everyone, or to a
 * specific role. Every announcement is also pushed out as an
 * in-app notification to each matching, active user.
 */

const catchAsync = require('../../utils/catchAsync');
const Announcement = require('../../models/Announcement');
const Notification = require('../../models/Notification');
const User = require('../../models/User');
const auditService = require('../../services/auditService');

exports.showAnnouncements = catchAsync(async (req, res) => {
  const announcements = await Announcement.findAll({ limit: 50 });
  res.render('admin/announcements', {
    title: 'Announcements',
    activePage: 'announcements',
    announcements,
  });
});

exports.createAnnouncement = catchAsync(async (req, res) => {
  const { title, message, targetRole } = req.body;

  if (!title || !message) {
    req.flash('error', 'Both a title and a message are required.');
    return res.redirect('/super_admin/announcements');
  }

  const announcementId = await Announcement.create({
    title,
    message,
    targetRole: targetRole || 'all',
    createdBy: req.session.user.user_id,
  });

  const recipients = await User.findAll({
    role: targetRole && targetRole !== 'all' ? targetRole : undefined,
    status: 'active',
    limit: 100000,
  });

  await Promise.all(
    recipients.map((r) =>
      Notification.create({
        userId: r.user_id,
        title: `Announcement: ${title}`,
        message,
        link: '/super_admin/announcements',
      })
    )
  );

  await auditService.logAction(req, 'ANNOUNCEMENT_CREATED', {
    entityType: 'announcement',
    entityId: announcementId,
    details: title,
  });

  req.flash('success', `Announcement sent to ${recipients.length} user${recipients.length === 1 ? '' : 's'}.`);
  return res.redirect('/super_admin/announcements');
});

exports.deleteAnnouncement = catchAsync(async (req, res) => {
  const { id } = req.params;
  const announcement = await Announcement.findById(id);

  if (!announcement) {
    req.flash('error', 'Announcement not found.');
    return res.redirect('/super_admin/announcements');
  }

  await Announcement.delete(id);
  await auditService.logAction(req, 'ANNOUNCEMENT_DELETED', { entityType: 'announcement', entityId: Number(id), details: announcement.title });

  req.flash('success', 'Announcement removed.');
  return res.redirect('/super_admin/announcements');
});
