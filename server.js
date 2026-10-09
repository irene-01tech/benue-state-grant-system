/**
 * Server Bootstrap
 * -----------------
 * Verifies the database connection, then starts the HTTP server.
 * Keeping this separate from app.js makes the Express app importable
 * in tests without opening a real network port.
 */

require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

(async () => {
  await testConnection();

  app.listen(PORT, () => {
    logger.info(`${process.env.APP_NAME || 'Grant Management System'} running at http://localhost:${PORT}`);
  });
})();

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
