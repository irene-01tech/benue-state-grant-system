/**
 * Distribution Record Model
 * ----------------------------
 * What the school actually recorded as received against an allocation —
 * items, quantities, students served, and remaining balance.
 */

const { pool } = require('../config/db');

const DistributionRecord = {
  async create({ allocationId, schoolId, recordedBy, distributionDate, itemsReceived, studentsServed, balanceRemaining, remarks }) {
    const [result] = await pool.query(
      `INSERT INTO distribution_records
        (allocation_id, school_id, recorded_by, distribution_date, items_received, students_served, balance_remaining, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [allocationId, schoolId, recordedBy, distributionDate, JSON.stringify(itemsReceived), studentsServed || 0,
        JSON.stringify(balanceRemaining || {}), remarks || null]
    );
    return result.insertId;
  },

  async findByAllocation(allocationId) {
    const [rows] = await pool.query('SELECT * FROM distribution_records WHERE allocation_id = ? LIMIT 1', [allocationId]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM distribution_records WHERE distribution_id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findBySchool(schoolId, { limit = 100 } = {}) {
    const [rows] = await pool.query(
      'SELECT * FROM distribution_records WHERE school_id = ? ORDER BY created_at DESC LIMIT ?',
      [schoolId, Number(limit)]
    );
    return rows;
  },

  async confirmReceipt(id) {
    await pool.query('UPDATE distribution_records SET receipt_confirmed = 1 WHERE distribution_id = ?', [id]);
  },
};

module.exports = DistributionRecord;
