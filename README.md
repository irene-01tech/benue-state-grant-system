# Grant Processing & Management System

**Addressing menstrual poverty in secondary schools**

A full-stack grant management platform connecting NGOs, Government organisations, Private Organisations/Individuals, and secondary schools around one accountable workflow: registration → approval → needs assessment → grant application → resource allocation → distribution → evidence verification → impact reporting.

## Tech Stack

- **Backend:** Node.js, Express.js (MVC architecture)
- **Views:** EJS + express-ejs-layouts, vanilla JavaScript (ES6+)
- **Database:** MySQL (`mysql2`)
- **Auth & Security:** bcrypt, express-session (MySQL-backed, no inactivity timeout), CSRF protection, Helmet, express-validator, rate limiting
- **File uploads:** Multer
- **Email:** Nodemailer
- **Reports:** ExcelJS (Excel), PDFKit (PDF), native CSV

## What to install

```bash
npm install
```

This pulls in everything the app depends on — Express, EJS, MySQL driver, bcrypt, Multer, Nodemailer, ExcelJS, PDFKit, and the rest, as declared in `package.json`. Nothing else needs to be installed globally beyond Node.js itself (v18+) and a running MySQL server (v8+).

## Project Structure

```
config/         Database, session, mailer, multer configuration
controllers/    Route handlers — admin/, organisation/ (NGO+Government), school/, shared/
database/       schema.sql and seed.js
emails/         HTML email templates
middlewares/    Auth, RBAC, org context, CSRF, validators, error handling
models/         Data access layer (one file per table/entity)
public/         Static assets — css, js, and the landing page's own asset copies
routes/         Express routers — one per role area, plus shared/account/auth
services/       Email + audit log services
utils/          Shared helpers (password generation, report export, logging)
views/          EJS templates, grouped by role, plus layouts/ and partials/
index.html      Standalone static copy of the landing page (see below)
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up the database
```bash
mysql -u root -p -e "CREATE DATABASE grant_management_system"
mysql -u root -p grant_management_system < database/schema.sql
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Fill in your MySQL credentials, a session secret, and (optionally) real SMTP credentials so registration-approval emails actually send.

### 4. Seed accounts
```bash
npm run seed
```
Creates the first Super Admin (from `SEED_ADMIN_*` in `.env`) plus one pre-approved demo account per role — `ngo.demo@gmail.com`, `private.demo@gmail.com`, `school.demo@gmail.com` — so you can explore every dashboard immediately without going through registration and approval yourself. See the console output for exact credentials.

### 5. Run the app
```bash
npm run dev    # nodemon, restarts on file changes
# or
npm start
```
Visit **http://localhost:3000**.

## About `index.html`

The project root contains a **standalone static copy** of the landing page (`index.html`), separate from the dynamic one the running app serves at `/` (`views/public/landing.ejs`). It references the same stylesheets under `public/css/` with relative paths, so it can be opened directly in a browser or hosted as-is (e.g. GitHub Pages) without the Node/MySQL backend running. It's a snapshot for preview purposes — the live app always serves the EJS version, which stays in sync with session state (login redirects, flash messages, etc.).

## User Roles

Four roles: one platform overseer and three operational roles.

| Role | Access |
|---|---|
| **Super Administrator** | Full system oversight — approves any registration, manages users, reports, audit logs, announcements, system settings, and grant categories |
| **NGO / Government Organisation** | Creates grant programmes, reviews needs assessments and applications from schools, allocates resources, verifies evidence. Also has delegated authority to approve/reject School and Private Organisation registrations — the same authority as the Super Admin for those two types |
| **Private Organisation / Individual** | Same core grant workflow as NGO/Government, scaled for smaller operations — creates programmes, reviews applications, allocates resources, verifies evidence. Does not approve other accounts |
| **School Representative** | Registers, completes needs assessments (addressed to a specific NGO/Government or Private Organisation), browses and applies to grant programmes, tracks applications, confirms receipt, records distribution, uploads evidence, completes impact surveys |

### Reach estimates

Every NGO/Government and Private Organisation account states an estimated number of people they expect to reach — NGO/Government defaults to up to 7,000,000, Private Organisations default to up to 4,000. This is purely informational: it's shown on the dashboard and in reports, and if actual reach goes over the stated estimate, the system shows a note rather than blocking anything. Each organisation can adjust their own estimate any time from Settings.

## License

MIT
