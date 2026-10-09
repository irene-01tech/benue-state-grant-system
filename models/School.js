/**
 * School Model
 * -------------
 * Data access layer for the `schools` table.
 */

const { pool } = require('../config/db');

const School = {
  async create({ userId, schoolName, schoolCode, lga, address, schoolType, totalStudents, totalFemaleStudents, principalName }) {
    const [result] = await pool.query(
      `INSERT INTO schools
        (user_id, school_name, school_code, lga, address, school_type, total_students, total_female_students, principal_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        schoolName,
        schoolCode || null,
        lga,
        address || null,
        schoolType || 'public',
        totalStudents || 0,
        totalFemaleStudents || 0,
        principalName || null,
      ]
    );
    return result.insertId;
  },

  async findByUserId(userId) {
    const [rows] = await pool.query('SELECT * FROM schools WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  },

  async findById(schoolId) {
    const [rows] = await pool.query(
      `SELECT s.*, u.full_name, u.email, u.phone, u.status AS user_status
       FROM schools s JOIN users u ON u.user_id = s.user_id
       WHERE s.school_id = ? LIMIT 1`,
      [schoolId]
    );
    return rows[0] || null;
  },

  async findAll({ status, lga, search, limit = 50, offset = 0 } = {}) {
    let query = `SELECT s.*, u.full_name, u.email, u.phone
                 FROM schools s JOIN users u ON u.user_id = s.user_id WHERE 1=1`;
    const params = [];
    if (status) {
      query += ' AND s.approval_status = ?';
      params.push(status);
    }
    if (lga) {
      query += ' AND s.lga = ?';
      params.push(lga);
    }
    if (search) {
      query += ' AND (s.school_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  },

  async approve(schoolId, approvedBy) {
    await pool.query(
      `UPDATE schools SET approval_status = 'approved', approved_by = ?, approved_at = NOW(), rejection_reason = NULL
       WHERE school_id = ?`,
      [approvedBy, schoolId]
    );
  },

  async reject(schoolId, approvedBy, reason) {
    await pool.query(
      `UPDATE schools SET approval_status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ?
       WHERE school_id = ?`,
      [approvedBy, reason || null, schoolId]
    );
  },

  async countByStatus() {
    const [rows] = await pool.query(
      `SELECT approval_status AS status, COUNT(*) AS count FROM schools GROUP BY approval_status`
    );
    return rows;
  },

  async countTotal() {
    const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM schools');
    return row.total;
  },
};

module.exports = School;
