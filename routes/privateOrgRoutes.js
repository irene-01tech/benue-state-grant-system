/**
 * Private Organisation Routes
 * -------------------------------
 * Protected by requireAuth + authorizeRoles('private_org') + orgContext
 * at the /private_org mount point in routes/index.js.
 *
 * Private Organisations get the same grant workflow as ngo_govt
 * (programmes, applications, allocation, evidence, needs assessments,
 * reach-estimate settings) but NOT delegated approval authority over
 * Schools/Private Organisations — that stays with Super Admin and
 * ngo_govt accounts only.
 */

const express = require('express');

const router = express.Router();
const dashboardController = require('../controllers/shared/orgDashboardController');
const grantWorkspaceRoutes = require('./grantWorkspaceRoutes');

router.get('/dashboard', dashboardController.showDashboard);

router.use('/', grantWorkspaceRoutes);

module.exports = router;
