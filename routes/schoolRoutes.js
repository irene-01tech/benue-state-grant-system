/**
 * School Representative Routes
 * -------------------------------
 * Protected by requireAuth + authorizeRoles('school_representative')
 * at the /school_representative mount point in app.js.
 */

const express = require('express');

const router = express.Router();
const dashboardController = require('../controllers/school/dashboardController');
const needsAssessmentController = require('../controllers/school/needsAssessmentController');
const programmeController = require('../controllers/school/programmeController');
const applicationController = require('../controllers/school/applicationController');
const { handleEvidenceUpload } = require('../config/multer');

router.get('/dashboard', dashboardController.showDashboard);

/* ------------------------------ Needs Assessment ------------------------------ */
router.get('/needs-assessment', needsAssessmentController.showForm);
router.post('/needs-assessment', handleEvidenceUpload('attachments', 5), needsAssessmentController.submit);

/* ------------------------------ Browse & Apply ------------------------------ */
router.get('/programmes', programmeController.browse);
router.get('/programmes/:id/apply', programmeController.showApplyForm);
router.post('/programmes/:id/apply', programmeController.submitApplication);

/* ------------------------------ My Applications ------------------------------ */
router.get('/applications', applicationController.listMine);
router.get('/applications/:id', applicationController.show);
router.post('/applications/:id/distribution', applicationController.recordDistribution);
router.post('/applications/:id/evidence', handleEvidenceUpload('files', 5), applicationController.uploadEvidence);
router.post('/applications/:id/impact-survey', applicationController.submitImpactSurvey);

module.exports = router;
