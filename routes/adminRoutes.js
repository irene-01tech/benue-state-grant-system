/**
 * Super Admin Routes
 * --------------------
 * All routes here are protected by requireAuth + authorizeRoles('super_admin')
 * applied once in app.js at the /super_admin mount point.
 */

const express = require('express');

const router = express.Router();
const dashboardController = require('../controllers/admin/dashboardController');
const approvalController = require('../controllers/admin/approvalController');
const userController = require('../controllers/admin/userController');
const auditLogController = require('../controllers/admin/auditLogController');
const reportController = require('../controllers/admin/reportController');
const announcementController = require('../controllers/admin/announcementController');
const settingsController = require('../controllers/admin/settingsController');
const grantCategoryController = require('../controllers/admin/grantCategoryController');

router.get('/dashboard', dashboardController.showDashboard);

/* ------------------------------ Approvals ------------------------------ */
router.get('/approvals', approvalController.showApprovals);
router.post('/approvals/schools/:schoolId/approve', approvalController.school.approve);
router.post('/approvals/schools/:schoolId/reject', approvalController.school.reject);
router.post('/approvals/organisations/:organisationId/approve', approvalController.organisation.approve);
router.post('/approvals/organisations/:organisationId/reject', approvalController.organisation.reject);
router.post('/approvals/private-orgs/:privateOrgId/approve', approvalController.privateOrg.approve);
router.post('/approvals/private-orgs/:privateOrgId/reject', approvalController.privateOrg.reject);

/* ------------------------------ User Management ------------------------------ */
router.get('/users', userController.showUsers);
router.post('/users/:userId/suspend', userController.suspendUser);
router.post('/users/:userId/activate', userController.activateUser);
router.post('/users/:userId/reset-password', userController.resetUserPassword);

/* ------------------------------ Audit Logs ------------------------------ */
router.get('/audit-logs', auditLogController.showAuditLogs);

/* ------------------------------ Reports ------------------------------ */
router.get('/reports', reportController.showReports);
router.get('/reports/export/:reportType/:format', reportController.exportReport);

/* ------------------------------ Announcements ------------------------------ */
router.get('/announcements', announcementController.showAnnouncements);
router.post('/announcements', announcementController.createAnnouncement);
router.post('/announcements/:id/delete', announcementController.deleteAnnouncement);

/* ------------------------------ System Settings ------------------------------ */
router.get('/settings', settingsController.showSettings);
router.post('/settings', settingsController.updateSettings);

/* ------------------------------ Grant Categories ------------------------------ */
router.get('/grant-categories', grantCategoryController.showCategories);
router.post('/grant-categories', grantCategoryController.createCategory);
router.post('/grant-categories/:id', grantCategoryController.updateCategory);
router.post('/grant-categories/:id/toggle', grantCategoryController.toggleCategory);
router.post('/grant-categories/:id/delete', grantCategoryController.deleteCategory);

module.exports = router;
