/**
 * generatePassword
 * -----------------
 * Generates a random, human-typeable temporary password used when
 * Super Admin approves a new NGO / Government Agency / School
 * registration. The generated password is emailed to the user and
 * must be changed on first login (see users.must_change_password).
 */

const crypto = require('crypto');

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O to avoid confusion
const LOWER = 'abcdefghijkmnpqrstuvwxyz'; // no l, o
const DIGITS = '23456789'; // no 0, 1
const SYMBOLS = '!@#$%';

function randomChar(set) {
  const index = crypto.randomInt(0, set.length);
  return set[index];
}

function generateTempPassword(length = 10) {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  let password = [
    randomChar(UPPER),
    randomChar(LOWER),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];

  for (let i = password.length; i < length; i += 1) {
    password.push(randomChar(all));
  }

  // Shuffle so the guaranteed character types aren't always in the same position
  for (let i = password.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateTempPassword, generateToken };
