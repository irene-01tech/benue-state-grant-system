/**
 * Session Configuration
 * ----------------------
 * Configures express-session with a MySQL-backed session store so
 * sessions survive server restarts and can scale across processes.
 *
 * Sessions are intentionally long-lived (1 year) with no inactivity
 * timeout — once a user logs in, they stay logged in until they
 * explicitly sign out. There is no time-based restriction on usage.
 */

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const sessionMaxAge = parseInt(process.env.SESSION_MAX_AGE_MS, 10) || ONE_YEAR_MS;

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 24 * 60 * 60 * 1000, // once a day is plenty given how long-lived sessions are
  expiration: sessionMaxAge,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
});

const sessionMiddleware = session({
  key: 'grant_portal_sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true, // every request pushes the expiry further out, so an active user is never cut off
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: sessionMaxAge,
  },
});

module.exports = { sessionMiddleware, sessionStore };
