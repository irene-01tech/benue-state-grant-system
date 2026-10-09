/**
 * Organisation Model  (role: ngo_govt)
 * ---------------------------------------
 * Data access layer for the `organisations` table — merges what used
 * to be two separate NGO / Government Agency tables into one, since
 * they share the same role and workflow.
 */

const { pool } = require('../config/db');

const Organisation = {
  DEFAULT_REACH_ESTIMATE: 7000000,

  async create({ userId, orgName, registrationNumber, address, focusArea, website, reachEstimate }) {
    const [result] = await pool.query(
      `INSERT INTO organisations (user_id, org_name, registration_number, address, focus_area, website, reach_estimate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, orgName, registrationNumber || null, address || null, focusArea || null, website || null,
        reachEstimate || Organisation.DEFAULT_REACH_ESTIMATE]
    );
    return result.insertId;
  },

  async findByUserId(userId) {
    const [rows] = await pool.query('SELECT * FROM organisations WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  },

  async findById(organisationId) {
    const [rows] = await pool.query(
      `SELECT o.*, u.full_name, u.email, u.phone, u.status AS user_status
       FROM organisations o JOIN users u ON u.user_id = o.user_id
       WHERE o.organisation_id = ? LIMIT 1`,
      [organisationId]
    );
    return rows[0] || null;
  },

  async findAll({ status, search, limit = 50, offset = 0 } = {}) {
    let query = `SELECT o.*, u.full_name, u.email, u.phone
                 FROM organisations o JOIN users u ON u.user_id = o.user_id WHERE 1=1`;
    const params = [];
    if (status) {
      query += ' AND o.approval_status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (o.org_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  },

  async approve(organisationId, approvedBy) {
    await pool.query(
      `UPDATE organisations SET approval_status = 'approved', approved_by = ?, approved_at = NOW(), rejection_reason = NULL
       WHERE organisation_id = ?`,
      [approvedBy, organisationId]
    );
  },

  async reject(organisationId, approvedBy, reason) {
    await pool.query(
      `UPDATE organisations SET approval_status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ?
       WHERE organisation_id = ?`,
      [approvedBy, reason || null, organisationId]
    );
  },

  async updateReachEstimate(organisationId, reachEstimate) {
    await pool.query('UPDATE organisations SET reach_estimate = ? WHERE organisation_id = ?', [reachEstimate, organisationId]);
  },

  async countByStatus() {
    const [rows] = await pool.query(
      `SELECT approval_status AS status, COUNT(*) AS count FROM organisations GROUP BY approval_status`
    );
    return rows;
  },

  async countTotal() {
    const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM organisations');
    return row.total;
  },

  /** Sum of beneficiaries across every approved application this org has decided on — the "actual reach" to compare against the stated estimate. */
  async currentReach(organisationId) {
    const [[row]] = await pool.query(
      `SELECT COALESCE(SUM(ga.number_of_beneficiaries), 0) AS total
       FROM grant_applications ga
       JOIN grant_programmes gp ON gp.programme_id = ga.programme_id
       WHERE gp.organisation_id = ? AND ga.status = 'approved'`,
      [organisationId]
    );
    return row.total;
  },
};

module.exports = Organisation;
