/**
 * Grant Programme Model
 * ------------------------
 * Created by an Organisation (NGO/Government) or a Private Organisation.
 * Schools apply against an active programme. `owner_type` +
 * `organisation_id`/`private_org_id` scope every programme to whoever
 * created it.
 */

const { pool } = require('../config/db');

const GrantProgramme = {
  async create({ categoryId, createdByUserId, ownerType, organisationId, privateOrgId, title, description, totalBudget, targetLgas, startDate, endDate }) {
    const [result] = await pool.query(
      `INSERT INTO grant_programmes
        (category_id, created_by_user_id, owner_type, organisation_id, private_org_id, title, description, total_budget, target_lgas, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [categoryId, createdByUserId, ownerType, organisationId || null, privateOrgId || null, title, description || null,
        totalBudget || 0, targetLgas || 'ALL', startDate || null, endDate || null]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT gp.*, gc.category_name,
              COALESCE(o.org_name, p.org_name) AS owner_name
       FROM grant_programmes gp
       JOIN grant_categories gc ON gc.category_id = gp.category_id
       LEFT JOIN organisations o ON o.organisation_id = gp.organisation_id
       LEFT JOIN private_organisations p ON p.private_org_id = gp.private_org_id
       WHERE gp.programme_id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByOwner({ ownerType, ownerId, status, limit = 100 }) {
    const ownerCol = ownerType === 'ngo_govt' ? 'organisation_id' : 'private_org_id';
    const params = [ownerId];
    let where = `WHERE gp.${ownerCol} = ?`;
    if (status) {
      where += ' AND gp.status = ?';
      params.push(status);
    }
    params.push(Number(limit));

    const [rows] = await pool.query(
      `SELECT gp.*, gc.category_name,
              (SELECT COUNT(*) FROM grant_applications ga WHERE ga.programme_id = gp.programme_id) AS application_count,
              (SELECT COUNT(*) FROM grant_applications ga WHERE ga.programme_id = gp.programme_id AND ga.status IN ('submitted','under_review')) AS pending_count
       FROM grant_programmes gp
       JOIN grant_categories gc ON gc.category_id = gp.category_id
       ${where}
       ORDER BY gp.created_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  /** Every active programme, regardless of owner — used by schools browsing what's open. */
  async findOpenForSchools({ lga, limit = 100 }) {
    const params = [];
    let where = "WHERE gp.status = 'active'";
    if (lga) {
      where += " AND (gp.target_lgas = 'ALL' OR FIND_IN_SET(?, gp.target_lgas))";
      params.push(lga);
    }
    params.push(Number(limit));

    const [rows] = await pool.query(
      `SELECT gp.*, gc.category_name,
              COALESCE(o.org_name, p.org_name) AS owner_name
       FROM grant_programmes gp
       JOIN grant_categories gc ON gc.category_id = gp.category_id
       LEFT JOIN organisations o ON o.organisation_id = gp.organisation_id
       LEFT JOIN private_organisations p ON p.private_org_id = gp.private_org_id
       ${where}
       ORDER BY gp.created_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  async update(id, { categoryId, title, description, totalBudget, targetLgas, startDate, endDate }) {
    await pool.query(
      `UPDATE grant_programmes SET category_id = ?, title = ?, description = ?, total_budget = ?,
        target_lgas = ?, start_date = ?, end_date = ? WHERE programme_id = ?`,
      [categoryId, title, description || null, totalBudget || 0, targetLgas || 'ALL', startDate || null, endDate || null, id]
    );
  },

  async setStatus(id, status) {
    await pool.query('UPDATE grant_programmes SET status = ? WHERE programme_id = ?', [status, id]);
  },

  async incrementUtilizedBudget(id, amount) {
    await pool.query('UPDATE grant_programmes SET budget_utilized = budget_utilized + ? WHERE programme_id = ?', [amount, id]);
  },

  async delete(id) {
    await pool.query('DELETE FROM grant_programmes WHERE programme_id = ?', [id]);
  },

  async isOwnedBy(programmeId, ownerType, ownerId) {
    const ownerCol = ownerType === 'ngo_govt' ? 'organisation_id' : 'private_org_id';
    const [rows] = await pool.query(
      `SELECT programme_id FROM grant_programmes WHERE programme_id = ? AND ${ownerCol} = ? LIMIT 1`,
      [programmeId, ownerId]
    );
    return rows.length > 0;
  },
};

module.exports = GrantProgramme;
