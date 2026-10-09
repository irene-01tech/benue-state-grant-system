/**
 * Database Configuration
 * -----------------------
 * Creates and exports a MySQL connection pool using mysql2/promise.
 * A pool is used (rather than a single connection) so the app can
 * handle multiple concurrent requests safely and efficiently.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  dateStrings: true,
});

/**
 * Verifies the database connection on startup.
 * Exits the process if the connection cannot be established,
 * since the application cannot function without a database.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('[Database] MySQL connection pool established successfully.');
    connection.release();
  } catch (error) {
    console.error('[Database] Failed to connect to MySQL:', error.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
