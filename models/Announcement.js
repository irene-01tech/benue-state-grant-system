/**
 * Announcement Model
 * --------------------
 * Data access layer for system-wide or role-targeted announcements
 * broadcast by the Super Admin.
 */

const { pool } = require('../config/db');

const Announcement = {
  async create({ title, message, targetRole = 'all', createdBy }) {
    const [result] = await pool.query(
      `INSERT INTO announcements (title, message, target_role, created_by)
       VALUES (?, ?, ?, ?)`,
      [title, message, targetRole, createdBy]
    );
    return result.insertId;
  },

  async findAll({ limit = 50, offset = 0 } = {}) {
    const [rows] = await pool.query(
      `SELECT a.*, u.full_name AS author_name
       FROM announcements a
       JOIN users u ON u.user_id = a.created_by
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM announcements WHERE announcement_id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async delete(id) {
    await pool.query('DELETE FROM announcements WHERE announcement_id = ?', [id]);
  },

  async countAll() {
    const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM announcements');
    return row.total;
  },
};

module.exports = Announcement;
