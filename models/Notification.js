/**
 * Notification Model
 * --------------------
 * Data access layer for in-app notifications (bell icon dropdown),
 * separate from the email notifications sent via Nodemailer.
 */

const { pool } = require('../config/db');

const Notification = {
  async create({ userId, title, message, link }) {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)`,
      [userId, title, message, link || null]
    );
    return result.insertId;
  },

  async findForUser(userId, { limit = 10, unreadOnly = false } = {}) {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];
    if (unreadOnly) query += ' AND is_read = 0';
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const [rows] = await pool.query(query, params);
    return rows;
  },

  async countUnread(userId) {
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return row.count;
  },

  async markAsRead(notificationId, userId) {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
  },

  async markAllAsRead(userId) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  },
};

module.exports = Notification;
