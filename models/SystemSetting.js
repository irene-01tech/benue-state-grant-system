/**
 * System Setting Model
 * ----------------------
 * Simple key/value store for global configuration, editable by the
 * Super Admin from the System Settings page.
 */

const { pool } = require('../config/db');

const SystemSetting = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM system_settings ORDER BY setting_key ASC');
    return rows;
  },

  async findAsMap() {
    const rows = await this.findAll();
    return rows.reduce((map, row) => {
      map[row.setting_key] = row.setting_value;
      return map;
    }, {});
  },

  async set(key, value, updatedBy) {
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
      [key, value, updatedBy]
    );
  },

  async setMany(entries, updatedBy) {
    const keys = Object.keys(entries);
    await Promise.all(keys.map((key) => this.set(key, entries[key], updatedBy)));
  },
};

module.exports = SystemSetting;
