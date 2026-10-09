/**
 * Grant Workspace Routes (shared: NGO + Government Agency)
 * ------------------------------------------------------------
 * Identical route set for both roles — the actual scoping happens
 * inside req.orgContext (see middlewares/orgContext.js), applied by
 * the caller before this router is mounted.
 */

const express = require('express');

const router = express.Router();
const programmeController = require('../controllers/shared/grantProgrammeController');
const applicationController = require('../controllers/shared/applicationReviewController');
const evidenceController = require('../controllers/shared/evidenceReviewController');
const needsAssessmentController = require('../controllers/shared/needsAssessmentReviewController');
const settingsController = require('../controllers/shared/orgSettingsController');

/* ------------------------------ Grant Programmes ------------------------------ */
router.get('/programmes', programmeController.list);
router.get('/programmes/new', programmeController.showCreateForm);
router.post('/programmes', programmeController.create);
router.get('/programmes/:id', programmeController.show);
router.get('/programmes/:id/edit', programmeController.showEditForm);
router.post('/programmes/:id', programmeController.update);
router.post('/programmes/:id/status', programmeController.setStatus);
router.post('/programmes/:id/delete', programmeController.delete);

/* ------------------------------ Applications ------------------------------ */
router.get('/applications', applicationController.listAll);
router.get('/applications/:id', applicationController.show);
router.post('/applications/:id/decide', applicationController.decide);
router.post('/applications/:id/allocate', applicationController.allocate);
router.post('/applications/:id/evidence/:uploadId/verify', applicationController.verifyEvidence);

/* ------------------------------ Evidence (all, across applications) ------------------------------ */
router.get('/evidence', evidenceController.list);

/* ------------------------------ Needs Assessments ------------------------------ */
router.get('/needs-assessments', needsAssessmentController.list);
router.get('/needs-assessments/:id', needsAssessmentController.show);
router.post('/needs-assessments/:id/decide', needsAssessmentController.decide);

/* ------------------------------ Settings (reach estimate) ------------------------------ */
router.get('/settings', settingsController.showSettings);
router.post('/settings/reach-estimate', settingsController.updateReachEstimate);

module.exports = router;
