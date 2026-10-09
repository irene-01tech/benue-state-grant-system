/**
 * Router Index
 * -------------
 * Mounts every route module onto its base path and applies the
 * appropriate auth + RBAC guards per role area.
 */

const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middlewares/auth');
const authorizeRoles = require('../middlewares/rbac');
const orgContext = require('../middlewares/orgContext');

const { dashboardPathFor } = require('../utils/roleRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const organisationRoutes = require('./organisationRoutes');
const privateOrgRoutes = require('./privateOrgRoutes');
const schoolRoutes = require('./schoolRoutes');
const accountRoutes = require('./accountRoutes');

router.get('/', (req, res) => {
  if (req.session?.user) {
    const path = dashboardPathFor(req.session.user.role_name);
    return res.redirect(path);
  }
  return res.render('public/landing', { title: 'Home', layout: false });
});

router.use('/auth', authRoutes);
router.use('/account', requireAuth, accountRoutes);
router.use('/super_admin', requireAuth, authorizeRoles('super_admin'), adminRoutes);
router.use('/organisation', requireAuth, authorizeRoles('ngo_govt'), orgContext, organisationRoutes);
router.use('/private_org', requireAuth, authorizeRoles('private_org'), orgContext, privateOrgRoutes);
router.use('/school_representative', requireAuth, authorizeRoles('school_representative'), schoolRoutes);

module.exports = router;
