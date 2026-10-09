/**
 * Organisation (NGO/Government) Routes
 * ----------------------------------------
 * Protected by requireAuth + authorizeRoles('ngo_govt') + orgContext
 * at the /organisation mount point in routes/index.js.
 */

const express = require('express');

const router = express.Router();
const dashboardController = require('../controllers/shared/orgDashboardController');
const approvalController = require('../controllers/organisation/approvalController');
const grantWorkspaceRoutes = require('./grantWorkspaceRoutes');

router.get('/dashboard', dashboardController.showDashboard);

/* ------------------------------ Delegated Approvals ------------------------------ */
/* Only ngo_govt accounts get this — same approval authority as the   */
/* Super Admin, but scoped to Schools and Private Organisations only. */
router.get('/approvals', approvalController.showApprovals);
router.post('/approvals/schools/:schoolId/approve', approvalController.school.approve);
router.post('/approvals/schools/:schoolId/reject', approvalController.school.reject);
router.post('/approvals/private-orgs/:privateOrgId/approve', approvalController.privateOrg.approve);
router.post('/approvals/private-orgs/:privateOrgId/reject', approvalController.privateOrg.reject);

/* ------------------------------ Shared grant workspace ------------------------------ */
router.use('/', grantWorkspaceRoutes);

module.exports = router;
