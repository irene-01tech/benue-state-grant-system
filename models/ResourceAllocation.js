/**
 * Resource Allocation Model
 * ----------------------------
 * What the NGO/Agency actually commits to an approved application:
 * specific item quantities, a budget figure, and an expected delivery date.
 */

const { pool } = require('../config/db');

const ITEM_FIELDS = [
  'sanitary_pads_qty', 'reusable_pads_qty', 'soap_qty', 'underwear_qty',
  'buckets_qty', 'educational_materials_qty', 'other_hygiene_kits_qty',
];

const ResourceAllocation = {
  itemFields: ITEM_FIELDS,

  async create({ applicationId, allocatedBy, items, otherItemsDescription, budgetAllocated, expectedDeliveryDate }) {
    const [result] = await pool.query(
      `INSERT INTO resource_allocations
        (application_id, allocated_by, sanitary_pads_qty, reusable_pads_qty, soap_qty, underwear_qty,
         buckets_qty, educational_materials_qty, other_hygiene_kits_qty, other_items_description,
         budget_allocated, expected_delivery_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        applicationId, allocatedBy,
        items.sanitary_pads_qty || 0, items.reusable_pads_qty || 0, items.soap_qty || 0, items.underwear_qty || 0,
        items.buckets_qty || 0, items.educational_materials_qty || 0, items.other_hygiene_kits_qty || 0,
        otherItemsDescription || null, budgetAllocated || 0, expectedDeliveryDate || null,
      ]
    );
    return result.insertId;
  },

  async findByApplication(applicationId) {
    const [rows] = await pool.query('SELECT * FROM resource_allocations WHERE application_id = ? LIMIT 1', [applicationId]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ra.*, ga.school_id, ga.programme_id
       FROM resource_allocations ra
       JOIN grant_applications ga ON ga.application_id = ra.application_id
       WHERE ra.allocation_id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async setStatus(id, status) {
    await pool.query('UPDATE resource_allocations SET status = ? WHERE allocation_id = ?', [status, id]);
  },
};

module.exports = ResourceAllocation;
