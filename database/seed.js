/**
 * Database Seeder
 * -----------------
 * Creates the first Super Administrator account, plus one pre-approved
 * demo account per operational role (NGO/Government, Private
 * Organisation, School) so the system can be explored immediately
 * without going through the full registration + approval cycle.
 *
 * Usage:
 *   npm run seed
 *
 * Reads the Super Admin's credentials from .env (SEED_ADMIN_*); demo
 * accounts use a fixed, clearly-labelled password so they're easy to
 * hand to anyone reviewing the system. Change all of these before any
 * real deployment — this script is for local development / demos only.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');

const { pool } = require('../config/db');
const User = require('../models/User');
const Organisation = require('../models/Organisation');
const PrivateOrganisation = require('../models/PrivateOrganisation');
const School = require('../models/School');
const logger = require('../utils/logger');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo12345';

const ADMIN = {
  fullName: process.env.SEED_ADMIN_NAME || 'Irene Anigo',
  email: process.env.SEED_ADMIN_EMAIL || 'grantadmin.irene@gmail.com',
  phone: process.env.SEED_ADMIN_PHONE || '09125181985',
  password: process.env.SEED_ADMIN_PASSWORD || '12345678910',
};

async function userExists(email) {
  const [[row]] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
  return Boolean(row);
}

async function seedSuperAdmin() {
  if (await userExists(ADMIN.email)) {
    logger.info(`Seed skipped — a user with email ${ADMIN.email} already exists.`);
    return;
  }

  const [[existingSuperAdmin]] = await pool.query(
    `SELECT u.user_id, u.email FROM users u
     JOIN roles r ON r.role_id = u.role_id
     WHERE r.role_name = 'super_admin' LIMIT 1`
  );
  if (existingSuperAdmin) {
    logger.info(`Seed skipped — a Super Admin already exists (${existingSuperAdmin.email}). Only one seed run is expected.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, SALT_ROUNDS);
  await User.create({
    roleName: 'super_admin',
    fullName: ADMIN.fullName,
    email: ADMIN.email,
    phone: ADMIN.phone,
    passwordHash,
    status: 'active',
  });
  // User.create always sets must_change_password = 1, so the very
  // first login will force this admin to set their own password.

  logger.info('=================================================');
  logger.info('Super Admin account created successfully.');
  logger.info(`  Email:    ${ADMIN.email}`);
  logger.info(`  Password: ${ADMIN.password}`);
  logger.info('  You will be required to change this password on first login.');
  logger.info('=================================================');
}

/**
 * Creates a pre-approved demo account for a given role, skipping
 * quietly if that email is already taken (e.g. on a re-run).
 */
async function seedDemoAccount({ email, fullName, phone, roleName, createProfile }) {
  if (await userExists(email)) {
    logger.info(`Demo account skipped — ${email} already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const userId = await User.create({
    roleName,
    fullName,
    email,
    phone,
    passwordHash,
    status: 'active',
  });

  await createProfile(userId);

  logger.info(`Demo ${roleName} account created: ${email} / ${DEMO_PASSWORD}`);
}

(async () => {
  try {
    await seedSuperAdmin();

    await seedDemoAccount({
      email: 'ngo.demo@gmail.com',
      fullName: 'NGO Demo Account',
      phone: '08010000001',
      roleName: 'ngo_govt',
      createProfile: async (userId) => {
        const orgId = await Organisation.create({
          userId,
          orgName: 'HerDignity Foundation (Demo)',
          registrationNumber: 'CAC/DEMO/001',
          address: 'Nigeria',
          focusArea: 'Menstrual health and hygiene',
          website: null,
        });
        await Organisation.approve(orgId, null);
      },
    });

    await seedDemoAccount({
      email: 'private.demo@gmail.com',
      fullName: 'Private Org Demo Account',
      phone: '08010000002',
      roleName: 'private_org',
      createProfile: async (userId) => {
        const orgId = await PrivateOrganisation.create({
          userId,
          orgName: 'Grace Community Fund (Demo)',
          description: 'A small individual giver supporting local schools.',
          address: 'Nigeria',
        });
        await PrivateOrganisation.approve(orgId, null);
      },
    });

    await seedDemoAccount({
      email: 'school.demo@gmail.com',
      fullName: 'School Demo Account',
      phone: '08010000003',
      roleName: 'school_representative',
      createProfile: async (userId) => {
        const schoolId = await School.create({
          userId,
          schoolName: "St. Mary's Girls' Secondary School (Demo)",
          schoolCode: 'DEMO/001',
          lga: 'Makurdi',
          address: 'Nigeria',
          schoolType: 'public',
          totalStudents: 500,
          totalFemaleStudents: 260,
          principalName: 'Demo Principal',
        });
        await School.approve(schoolId, null);
      },
    });

    logger.info('=================================================');
    logger.info('All seed accounts are ready. Demo password (non-admin accounts):');
    logger.info(`  ${DEMO_PASSWORD}`);
    logger.info('=================================================');

    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1);
  }
})();
