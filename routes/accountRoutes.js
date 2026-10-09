/**
 * Account Routes
 * ----------------
 * Shared, role-agnostic routes available to any authenticated user:
 * profile management and in-app notifications. Mounted at /account
 * with only requireAuth applied (no RBAC — every role needs these).
 */

const express = require('express');

const router = express.Router();
const profileController = require('../controllers/shared/profileController');

router.get('/profile', profileController.showProfile);
router.post('/profile', profileController.updateProfile);
router.post('/profile/change-password', profileController.changePassword);

router.post('/notifications/:id/read', profileController.markNotificationRead);
router.post('/notifications/read-all', profileController.markAllNotificationsRead);

module.exports = router;
