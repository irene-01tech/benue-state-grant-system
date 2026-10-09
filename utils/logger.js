/**
 * Logger Utility
 * ---------------
 * Lightweight logger that writes to both the console and rotating
 * daily log files under /logs. Keeps a dependency-free footprint
 * while still giving persistent, timestamped application logs.
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogFilePath() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `app-${today}.log`);
}

function writeLine(level, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  fs.appendFile(getLogFilePath(), line, (err) => {
    if (err) console.error('Failed to write to log file:', err.message);
  });
  return line;
}

const logger = {
  info: (message) => {
    const line = writeLine('info', message);
    console.log(line.trim());
  },
  warn: (message) => {
    const line = writeLine('warn', message);
    console.warn(line.trim());
  },
  error: (message) => {
    const line = writeLine('error', message);
    console.error(line.trim());
  },
};

module.exports = logger;
