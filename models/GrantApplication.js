/**
 * Grant Application Model
 * --------------------------
 * A school's request against a specific grant programme. Reviewed
 * by the owning Organisation (NGO/Government) or Private Organisation.
 */

const { pool } = require('../config/db');

const GrantApplication = {
  async create({ programmeId, schoolId, surveyId, numberOfBeneficiaries, itemsRequested, reasonForRequest }) {
    const [result] = await pool.query(
      `INSERT INTO grant_applications
        (programme_id, school_id, survey_id, number_of_beneficiaries, items_requested, reason_for_request)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [programmeId, schoolId, surveyId || null, numberOfBeneficiaries, JSON.stringify(itemsRequested), reasonForRequest]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ga.*, gp.title AS programme_title, gp.organisation_id, gp.private_org_id, gp.owner_type, gp.status AS programme_status,
              s.school_name, s.lga, s.principal_name, s.total_students, s.total_female_students, s.user_id AS school_user_id,
              u.full_name AS school_rep_name, u.email AS school_rep_email
       FROM grant_applications ga
       JOIN grant_programmes gp ON gp.programme_id = ga.programme_id
       JOIN schools s ON s.school_id = ga.school_id
       JOIN users u ON u.user_id = s.user_id
       WHERE ga.application_id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findBySchool(schoolId, { limit = 100 } = {}) {
    const [rows] = await pool.query(
      `SELECT ga.*, gp.title AS programme_title, gp.owner_type,
              COALESCE(o.org_name, p.org_name) AS owner_name
       FROM grant_applications ga
       JOIN grant_programmes gp ON gp.programme_id = ga.programme_id
       LEFT JOIN organisations o ON o.organisation_id = gp.organisation_id
       LEFT JOIN private_organisations p ON p.private_org_id = gp.private_org_id
       WHERE ga.school_id = ?
       ORDER BY ga.created_at DESC
       LIMIT ?`,
      [schoolId, Number(limit)]
    );
    return rows;
  },

  async findByProgramme(programmeId, { status, limit = 200 } = {}) {
    const params = [programmeId];
    let where = 'WHERE ga.programme_id = ?';
    if (status) {
      where += ' AND ga.status = ?';
      params.push(status);
    }
    params.push(Number(limit));

    const [rows] = await pool.query(
      `SELECT ga.*, s.school_name, s.lga, s.total_students, s.total_female_students
       FROM grant_applications ga
       JOIN schools s ON s.school_id = ga.school_id
       ${where}
       ORDER BY ga.created_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  async findByOwner({ ownerType, ownerId, status, limit = 200 }) {
    const ownerCol = ownerType === 'ngo_govt' ? 'gp.organisation_id' : 'gp.private_org_id';
    const params = [ownerId];
    let where = `WHERE ${ownerCol} = ?`;
    if (status) {
      where += ' AND ga.status = ?';
      params.push(status);
    }
    params.push(Number(limit));

    const [rows] = await pool.query(
      `SELECT ga.*, gp.title AS programme_title, s.school_name, s.lga
       FROM grant_applications ga
       JOIN grant_programmes gp ON gp.programme_id = ga.programme_id
       JOIN schools s ON s.school_id = ga.school_id
       ${where}
       ORDER BY ga.created_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  async setStatus(id, status, { reviewedBy, reviewComment } = {}) {
    await pool.query(
      `UPDATE grant_applications SET status = ?, reviewed_by = ?, review_comment = ?, reviewed_at = NOW() WHERE application_id = ?`,
      [status, reviewedBy || null, reviewComment || null, id]
    );
  },

  async hasAllocation(applicationId) {
    const [rows] = await pool.query('SELECT allocation_id FROM resource_allocations WHERE application_id = ? LIMIT 1', [applicationId]);
    return rows.length > 0;
  },

  async countByOwnerAndStatus({ ownerType, ownerId }) {
    const ownerCol = ownerType === 'ngo_govt' ? 'gp.organisation_id' : 'gp.private_org_id';
    const [rows] = await pool.query(
      `SELECT ga.status, COUNT(*) AS total
       FROM grant_applications ga JOIN grant_programmes gp ON gp.programme_id = ga.programme_id
       WHERE ${ownerCol} = ? GROUP BY ga.status`,
      [ownerId]
    );
    return rows;
  },
};

module.exports = GrantApplication;
