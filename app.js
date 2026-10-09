/**
 * Application Entry (Express App Configuration)
 * ------------------------------------------------
 * Wires together security middleware, sessions, view engine, static
 * assets, and routes. server.js imports this and starts listening.
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const { sessionMiddleware } = require('./config/session');
const { csrfProtection, exposeCsrfToken, csrfErrorHandler } = require('./middlewares/csrf');
const { generalLimiter } = require('./middlewares/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();

/* ---------------------------- View Engine ---------------------------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

/* ------------------------------ Security ------------------------------ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  })
);
app.disable('x-powered-by');
app.use(generalLimiter);

/* ------------------------------ Core Middleware ------------------------------ */
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ------------------------------ Sessions & Flash ------------------------------ */
app.use(sessionMiddleware);
app.use(flash());

/* ------------------------------ CSRF ------------------------------ */
/* ------------------------------ CSRF ------------------------------ */
// Multipart uploads (file uploads) can't be checked here: express.json()/
// express.urlencoded() don't parse multipart bodies, only Multer does,
// and Multer only runs at the route level — after this middleware would
// already have run. So req.body._csrf would always be empty here for
// those requests, and every upload would be wrongly rejected as an
// invalid CSRF token. Those specific routes apply csrfProtection
// themselves, in the route file, positioned after their upload
// middleware so the body (and the token in it) is already parsed.
const MULTIPART_ROUTE_PATTERNS = [
  /^\/school_representative\/applications\/\d+\/evidence$/,
];

app.use((req, res, next) => {
  const isExemptUpload = req.method === 'POST' && MULTIPART_ROUTE_PATTERNS.some((p) => p.test(req.path));
  if (isExemptUpload) return next();
  return csrfProtection(req, res, next);
});

app.use((req, res, next) => {
  // req.csrfToken() only exists once csrfProtection has run — skip
  // exposing it on the exempted upload routes above (those requests
  // end in a redirect, not a rendered form, so no view needs it).
  if (typeof req.csrfToken !== 'function') return next();
  return exposeCsrfToken(req, res, next);
});

/* ------------------------------ Locals available to every view ------------------------------ */
app.use(async (req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'Benue Menstrual Grant Portal';
  res.locals.currentUser = req.session.user || null;
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
  res.locals.notifications = [];
  res.locals.unreadNotificationCount = 0;

  if (req.session.user) {
    try {
      const Notification = require('./models/Notification');
      const [list, count] = await Promise.all([
        Notification.findForUser(req.session.user.user_id, { limit: 8 }),
        Notification.countUnread(req.session.user.user_id),
      ]);
      res.locals.notifications = list;
      res.locals.unreadNotificationCount = count;
    } catch (err) {
      // Notifications are a non-critical enhancement — never block the page for them.
      console.error('[Notifications] Failed to load:', err.message);
    }
  }

  next();
});

/* ------------------------------ Routes ------------------------------ */
app.use('/', routes);

/* ------------------------------ Error Handling ------------------------------ */
app.use(csrfErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
