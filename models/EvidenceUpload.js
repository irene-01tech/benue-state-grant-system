/**
 * Evidence Upload Model
 * ------------------------
 * Photo / document proof a school submits for a distribution, which
 * the funding NGO or Government Agency then verifies.
 */

const { pool } = require('../config/db');

const EvidenceUpload = {
  async create({ schoolId, applicationId, distributionId, fileName, filePath, fileType, fileSize, description, uploadedBy }) {
    const [result] = await pool.query(
      `INSERT INTO evidence_uploads
        (school_id, application_id, distribution_id, file_name, file_path, file_type, file_size, description, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, applicationId || null, distributionId || null, fileName, filePath, fileType, fileSize || null, description || null, uploadedBy]
    );
    return result.insertId;
  },

  async findByDistribution(distributionId) {
    const [rows] = await pool.query(
      'SELECT * FROM evidence_uploads WHERE distribution_id = ? ORDER BY created_at DESC',
      [distributionId]
    );
    return rows;
  },

  async findBySchool(schoolId, { limit = 100 } = {}) {
    const [rows] = await pool.query(
      'SELECT * FROM evidence_uploads WHERE school_id = ? ORDER BY created_at DESC LIMIT ?',
      [schoolId, Number(limit)]
    );
    return rows;
  },

  async findByOwner({ ownerType, ownerId, status, limit = 200 }) {
    const ownerCol = ownerType === 'ngo_govt' ? 'gp.organisation_id' : 'gp.private_org_id';
    const params = [ownerId];
    let where = `WHERE ${ownerCol} = ?`;
    if (status) {
      where += ' AND eu.verification_status = ?';
      params.push(status);
    }
    params.push(Number(limit));

    const [rows] = await pool.query(
      `SELECT eu.*, gapp.application_id AS linked_application_id, s.school_name, dr.distribution_date
       FROM evidence_uploads eu
       JOIN distribution_records dr ON dr.distribution_id = eu.distribution_id
       JOIN resource_allocations ra ON ra.allocation_id = dr.allocation_id
       JOIN grant_applications gapp ON gapp.application_id = ra.application_id
       JOIN grant_programmes gp ON gp.programme_id = gapp.programme_id
       JOIN schools s ON s.school_id = eu.school_id
       ${where}
       ORDER BY eu.created_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM evidence_uploads WHERE upload_id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async setVerification(id, status, { verifiedBy, comment } = {}) {
    await pool.query(
      `UPDATE evidence_uploads SET verification_status = ?, verified_by = ?, verification_comment = ?, verified_at = NOW() WHERE upload_id = ?`,
      [status, verifiedBy || null, comment || null, id]
    );
  },
};

module.exports = EvidenceUpload;
