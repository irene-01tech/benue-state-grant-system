/**
 * School Representative Dashboard Controller
 * ---------------------------------------------
 * NOTE: Grant status / active grants / received resources queries will
 * be completed in the Grant Application & Distribution module. For now
 * this renders real counts where the underlying tables already have
 * data paths (applications) and zero-safe defaults elsewhere.
 */

const catchAsync = require('../../utils/catchAsync');
const { pool } = require('../../config/db');
const School = require('../../models/School');

exports.showDashboard = catchAsync(async (req, res) => {
  const school = await School.findByUserId(req.session.user.user_id);

  let stats = {
    activeGrants: 0,
    pendingApplications: 0,
    receivedResources: 0,
    surveysCompleted: 0,
  };

  if (school) {
    const [[appStats]] = await pool.query(
      `SELECT
         SUM(CASE WHEN status IN ('submitted','under_review') THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS active
       FROM grant_applications WHERE school_id = ?`,
      [school.school_id]
    );
    const [[distStats]] = await pool.query(
      `SELECT COUNT(*) AS total FROM distribution_records WHERE school_id = ?`,
      [school.school_id]
    );
    const [[surveyStats]] = await pool.query(
      `SELECT COUNT(*) AS total FROM needs_assessment_surveys WHERE school_id = ?`,
      [school.school_id]
    );

    stats = {
      activeGrants: appStats.active || 0,
      pendingApplications: appStats.pending || 0,
      receivedResources: distStats.total || 0,
      surveysCompleted: surveyStats.total || 0,
    };
  }

  res.render('school/dashboard', {
    title: 'School Dashboard',
    activePage: 'dashboard',
    school,
    stats,
  });
});
