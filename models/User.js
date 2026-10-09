/**
 * User Model
 * -----------
 * Data access layer for the `users` table plus its joined `roles`
 * table. All raw SQL for user-related queries lives here so
 * controllers/services never write SQL directly (clean MVC separation).
 */

const { pool } = require('../config/db');

const User = {
  /**
   * Finds a user by email, joined with their role name.
   * Used during login.
   */
  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT u.*, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(userId) {
    const [rows] = await pool.query(
      `SELECT u.*, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async findByResetToken(token) {
    const [rows] = await pool.query(
      `SELECT u.*, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.password_reset_token = ? AND u.password_reset_expires > NOW()
       LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  },

  /**
   * Creates a new user record. Returns the inserted user_id.
   * roleName must be one of the enum values in the `roles` table.
   */
  async create({ roleName, fullName, email, phone, passwordHash, status = 'pending' }) {
    const [[role]] = await pool.query('SELECT role_id FROM roles WHERE role_name = ?', [roleName]);
    if (!role) throw new Error(`Unknown role: ${roleName}`);

    const [result] = await pool.query(
      `INSERT INTO users (role_id, full_name, email, phone, password_hash, status, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [role.role_id, fullName, email, phone || null, passwordHash, status]
    );
    return result.insertId;
  },

  async updatePassword(userId, passwordHash, mustChange = 0) {
    await pool.query(
      `UPDATE users SET password_hash = ?, must_change_password = ?,
       password_reset_token = NULL, password_reset_expires = NULL
       WHERE user_id = ?`,
      [passwordHash, mustChange, userId]
    );
  },

  async setResetToken(userId, token, expiresAt) {
    await pool.query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE user_id = ?',
      [token, expiresAt, userId]
    );
  },

  async setStatus(userId, status) {
    await pool.query('UPDATE users SET status = ? WHERE user_id = ?', [status, userId]);
  },

  async updateLastLogin(userId) {
    await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [userId]);
  },

  async updateProfile(userId, { fullName, phone }) {
    await pool.query(
      'UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?',
      [fullName, phone || null, userId]
    );
  },

  async countByRole() {
    const [rows] = await pool.query(
      `SELECT r.role_name, COUNT(u.user_id) AS total
       FROM roles r LEFT JOIN users u ON u.role_id = r.role_id
       GROUP BY r.role_name`
    );
    return rows;
  },

  async findAll({ role, status, search, limit = 50, offset = 0 } = {}) {
    let query = `SELECT u.user_id, u.full_name, u.email, u.phone, u.status, u.last_login,
                        u.created_at, r.role_name
                 FROM users u JOIN roles r ON r.role_id = u.role_id WHERE 1=1`;
    const params = [];

    if (role) {
      query += ' AND r.role_name = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND u.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  },
};

module.exports = User;
