/**
 * AuditLog Model
 * ---------------
 * Data access layer for the `audit_logs` table. Every significant
 * transaction in the system is recorded here via services/auditService.js.
 */

const { pool } = require('../config/db');

const AuditLog = {
  async create({ userId, userRole, action, entityType, entityId, details, ipAddress }) {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, userRole || null, action, entityType || null, entityId || null, details || null, ipAddress || null]
    );
  },

  async findAll({ userId, action, startDate, endDate, limit = 50, offset = 0 } = {}) {
    let query = `SELECT al.*, u.full_name AS user_name
                 FROM audit_logs al LEFT JOIN users u ON u.user_id = al.user_id WHERE 1=1`;
    const params = [];

    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }
    if (action) {
      query += ' AND al.action LIKE ?';
      params.push(`%${action}%`);
    }
    if (startDate) {
      query += ' AND al.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND al.created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  },

  async countAll() {
    const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM audit_logs');
    return row.total;
  },
};

module.exports = AuditLog;
