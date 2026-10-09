/**
 * Private Organisation Model  (role: private_org)
 * -----------------------------------------------
 * Data access layer for the `private_organisations` table — a smaller-
 * scale counterpart to `organisations` (NGO/Government), sharing the
 * same workflow but with its own default reach estimate.
 */

const { pool } = require('../config/db');

const PrivateOrganisation = {
  DEFAULT_REACH_ESTIMATE: 4000,

  async create({ userId, orgName, description, address, website, reachEstimate }) {
    const [result] = await pool.query(
      `INSERT INTO private_organisations (user_id, org_name, description, address, website, reach_estimate)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, orgName, description || null, address || null, website || null,
        reachEstimate || PrivateOrganisation.DEFAULT_REACH_ESTIMATE]
    );
    return result.insertId;
  },

  async findByUserId(userId) {
    const [rows] = await pool.query('SELECT * FROM private_organisations WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  },

  async findById(privateOrgId) {
    const [rows] = await pool.query(
      `SELECT p.*, u.full_name, u.email, u.phone, u.status AS user_status
       FROM private_organisations p JOIN users u ON u.user_id = p.user_id
       WHERE p.private_org_id = ? LIMIT 1`,
      [privateOrgId]
    );
    return rows[0] || null;
  },

  async findAll({ status, search, limit = 50, offset = 0 } = {}) {
    let query = `SELECT p.*, u.full_name, u.email, u.phone
                 FROM private_organisations p JOIN users u ON u.user_id = p.user_id WHERE 1=1`;
    const params = [];
    if (status) {
      query += ' AND p.approval_status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (p.org_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  },

  async approve(privateOrgId, approvedBy) {
    await pool.query(
      `UPDATE private_organisations SET approval_status = 'approved', approved_by = ?, approved_at = NOW(), rejection_reason = NULL
       WHERE private_org_id = ?`,
      [approvedBy, privateOrgId]
    );
  },

  async reject(privateOrgId, approvedBy, reason) {
    await pool.query(
      `UPDATE private_organisations SET approval_status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ?
       WHERE private_org_id = ?`,
      [approvedBy, reason || null, privateOrgId]
    );
  },

  async updateReachEstimate(privateOrgId, reachEstimate) {
    await pool.query('UPDATE private_organisations SET reach_estimate = ? WHERE private_org_id = ?', [reachEstimate, privateOrgId]);
  },

  async countByStatus() {
    const [rows] = await pool.query(
      `SELECT approval_status AS status, COUNT(*) AS count FROM private_organisations GROUP BY approval_status`
    );
    return rows;
  },

  async countTotal() {
    const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM private_organisations');
    return row.total;
  },

  async currentReach(privateOrgId) {
    const [[row]] = await pool.query(
      `SELECT COALESCE(SUM(ga.number_of_beneficiaries), 0) AS total
       FROM grant_applications ga
       JOIN grant_programmes gp ON gp.programme_id = ga.programme_id
       WHERE gp.private_org_id = ? AND ga.status = 'approved'`,
      [privateOrgId]
    );
    return row.total;
  },
};

module.exports = PrivateOrganisation;
