/**
 * Grant Category Model
 * ----------------------
 * Managed by the Super Admin. Every grant programme belongs to one
 * category (e.g. "Sanitary Products", "WASH Facilities").
 */

const { pool } = require('../config/db');

const GrantCategory = {
  async create({ categoryName, description, createdBy }) {
    const [result] = await pool.query(
      `INSERT INTO grant_categories (category_name, description, created_by) VALUES (?, ?, ?)`,
      [categoryName, description || null, createdBy]
    );
    return result.insertId;
  },

  async findAll({ activeOnly = false } = {}) {
    const where = activeOnly ? 'WHERE is_active = 1' : '';
    const [rows] = await pool.query(`SELECT * FROM grant_categories ${where} ORDER BY category_name ASC`);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM grant_categories WHERE category_id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async update(id, { categoryName, description }) {
    await pool.query(
      'UPDATE grant_categories SET category_name = ?, description = ? WHERE category_id = ?',
      [categoryName, description || null, id]
    );
  },

  async setActive(id, isActive) {
    await pool.query('UPDATE grant_categories SET is_active = ? WHERE category_id = ?', [isActive ? 1 : 0, id]);
  },

  async delete(id) {
    await pool.query('DELETE FROM grant_categories WHERE category_id = ?', [id]);
  },
};

module.exports = GrantCategory;
