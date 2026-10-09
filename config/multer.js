/**
 * Multer Configuration
 * -----------------------
 * Handles evidence file uploads (photos, PDFs, Excel reports) from
 * schools. Files are stored on disk under /uploads/evidence with a
 * randomised name to avoid collisions and path-traversal issues.
 *
 * Files are checked by extension (reliable across browsers/OSes) with
 * mimetype used only as a secondary signal — some browsers send
 * inconsistent mimetypes for .xlsx in particular, so relying on
 * mimetype alone rejected otherwise-valid files.
 */

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

require('dotenv').config();

const UPLOAD_DIR = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', 'evidence');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'xlsx'];

// Used to label the stored file_type in the database; extension is the
// source of truth, this just maps known mimetypes to a clean label.
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
  'application/octet-stream': null, // ambiguous — fall back to extension check
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase() || 'bin';
    cb(null, `${uuidv4()}.${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) return cb(null, true);
  cb(new ApiError(400, 'Only JPG, PNG, PDF, and XLSX files are allowed.'));
}

const maxSizeMb = parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 10;

const uploadEvidence = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024, files: 5 },
});

/**
 * Wraps a multer middleware so its errors (wrong type, too large, too
 * many files) become friendly flash messages instead of an unhandled
 * exception. Use this instead of calling `uploadEvidence.array(...)`
 * directly in a route.
 */
function handleEvidenceUpload(fieldName, maxCount) {
  const middleware = uploadEvidence.array(fieldName, maxCount);
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, `File too large. Maximum size is ${maxSizeMb}MB per file.`));
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError(400, `You can upload up to ${maxCount} files at a time.`));
        }
        return next(new ApiError(400, err.message));
      }
      if (err) return next(err);
      return next();
    });
  };
}

module.exports = { uploadEvidence, handleEvidenceUpload, ALLOWED_TYPES, ALLOWED_EXTENSIONS, UPLOAD_DIR };
