/**
 * Impact Survey Model
 * ----------------------
 * A short post-distribution survey schools complete so grants are
 * measured by outcome, not just delivery.
 */

const { pool } = require('../config/db');

const ImpactSurvey = {
  async create({ schoolId, applicationId, attendanceImprovement, confidenceImprovement, girlsImpacted, feedbackNotes, submittedBy }) {
    const [result] = await pool.query(
      `INSERT INTO impact_surveys
        (school_id, application_id, attendance_improvement, confidence_improvement, girls_impacted, feedback_notes, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, applicationId, attendanceImprovement, confidenceImprovement, girlsImpacted || 0, feedbackNotes || null, submittedBy]
    );
    return result.insertId;
  },

  async findByApplication(applicationId) {
    const [rows] = await pool.query('SELECT * FROM impact_surveys WHERE application_id = ? LIMIT 1', [applicationId]);
    return rows[0] || null;
  },

  async findBySchool(schoolId) {
    const [rows] = await pool.query('SELECT * FROM impact_surveys WHERE school_id = ? ORDER BY created_at DESC', [schoolId]);
    return rows;
  },
};

module.exports = ImpactSurvey;
