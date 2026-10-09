/**
 * Needs Assessment Survey Model
 * --------------------------------
 * Schools complete this addressed to a specific organisation (NGO/
 * Government or Private Org) — the one they're requesting support
 * from. That organisation reviews and approves/rejects it; it is
 * never routed to the Super Admin. An approved survey can then be
 * attached to a grant application as supporting context.
 */

const { pool } = require('../config/db');

const NeedsAssessmentSurvey = {
  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO needs_assessment_surveys
        (school_id, target_org_type, target_organisation_id, target_private_org_id, total_female_students,
         girls_needing_support, existing_toilet_facilities, water_availability, menstrual_education_programme,
         previous_interventions, estimated_pad_requirement, hygiene_kit_requirement, other_challenges, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.schoolId, data.targetOrgType,
        data.targetOrgType === 'ngo_govt' ? data.targetOrgId : null,
        data.targetOrgType === 'private_org' ? data.targetOrgId : null,
        data.totalFemaleStudents, data.girlsNeedingSupport,
        data.existingToiletFacilities, data.waterAvailability, data.menstrualEducationProgramme ? 1 : 0,
        data.previousInterventions || null, data.estimatedPadRequirement, data.hygieneKitRequirement,
        data.otherChallenges || null, data.submittedBy,
      ]
    );
    return result.insertId;
  },

  async findBySchool(schoolId, { limit = 20 } = {}) {
    const [rows] = await pool.query(
      `SELECT nas.*, COALESCE(o.org_name, p.org_name) AS target_org_name
       FROM needs_assessment_surveys nas
       LEFT JOIN organisations o ON o.organisation_id = nas.target_organisation_id
       LEFT JOIN private_organisations p ON p.private_org_id = nas.target_private_org_id
       WHERE nas.school_id = ? ORDER BY nas.created_at DESC LIMIT ?`,
      [schoolId, Number(limit)]
    );
    return rows;
  },

  /** The school's most recent APPROVED survey addressed to a given org — used to attach to a new application. */
  async findLatestApprovedForOrg(schoolId, ownerType, ownerId) {
    const ownerCol = ownerType === 'ngo_govt' ? 'target_organisation_id' : 'target_private_org_id';
    const [rows] = await pool.query(
      `SELECT * FROM needs_assessment_surveys
       WHERE school_id = ? AND ${ownerCol} = ? AND status = 'approved'
       ORDER BY created_at DESC LIMIT 1`,
      [schoolId, ownerId]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT nas.*, s.school_name, s.lga, u.full_name AS school_rep_name, u.email AS school_rep_email
       FROM needs_assessment_surveys nas
       JOIN schools s ON s.school_id = nas.school_id
       JOIN users u ON u.user_id = s.user_id
       WHERE nas.survey_id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByOwner({ ownerType, ownerId, status, limit = 200 }) {
    const ownerCol = ownerType === 'ngo_govt' ? 'nas.target_organisation_id' : 'nas.target_private_org_id';
    const params = [ownerId];
    let where = `WHERE ${ownerCol} = ?`;
    if (status) {
      where += ' AND nas.status = ?';
      params.push(status);
    }
    params.push(Number(limit));

    const [rows] = await pool.query(
      `SELECT nas.*, s.school_name, s.lga
       FROM needs_assessment_surveys nas
       JOIN schools s ON s.school_id = nas.school_id
       ${where}
       ORDER BY nas.created_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  async setStatus(id, status, { reviewedBy, reviewComment } = {}) {
    await pool.query(
      `UPDATE needs_assessment_surveys SET status = ?, reviewed_by = ?, review_comment = ?, reviewed_at = NOW() WHERE survey_id = ?`,
      [status, reviewedBy || null, reviewComment || null, id]
    );
  },

  async countBySchool(schoolId) {
    const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM needs_assessment_surveys WHERE school_id = ?', [schoolId]);
    return row.total;
  },

  async countPendingForOwner({ ownerType, ownerId }) {
    const ownerCol = ownerType === 'ngo_govt' ? 'target_organisation_id' : 'target_private_org_id';
    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS total FROM needs_assessment_surveys WHERE ${ownerCol} = ? AND status = 'pending'`,
      [ownerId]
    );
    return row.total;
  },
};

module.exports = NeedsAssessmentSurvey;
