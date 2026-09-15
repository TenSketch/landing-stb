// Vehicle management service
import { query } from './db.js';

export async function listVehicleTypes({ activeOnly = false } = {}) {
  let sql = `SELECT * FROM vehicle_types`;
  if (activeOnly) sql += ` WHERE is_active = TRUE`;
  sql += ` ORDER BY sort_order ASC, id ASC`;
  const res = await query(sql);
  return res.rows;
}

export async function getVehicleTypeById(id) {
  const res = await query('SELECT * FROM vehicle_types WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function createVehicleType({ name, description, paxMax, luggageCapacity, imageUrl, sortOrder }) {
  const res = await query(
    `INSERT INTO vehicle_types (name, description, pax_max, luggage_capacity, image_url, sort_order, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
     RETURNING *`,
    [name, description || null, paxMax || 4, luggageCapacity || 2, imageUrl || null, sortOrder || 0]
  );
  return res.rows[0];
}

export async function updateVehicleType(id, { name, description, paxMax, luggageCapacity, imageUrl, sortOrder, isActive }) {
  const updates = [];
  const params = [];
  if (name !== undefined) { params.push(name); updates.push(`name = $${params.length}`); }
  if (description !== undefined) { params.push(description); updates.push(`description = $${params.length}`); }
  if (paxMax !== undefined) { params.push(paxMax); updates.push(`pax_max = $${params.length}`); }
  if (luggageCapacity !== undefined) { params.push(luggageCapacity); updates.push(`luggage_capacity = $${params.length}`); }
  if (imageUrl !== undefined) { params.push(imageUrl); updates.push(`image_url = $${params.length}`); }
  if (sortOrder !== undefined) { params.push(sortOrder); updates.push(`sort_order = $${params.length}`); }
  if (isActive !== undefined) { params.push(isActive); updates.push(`is_active = $${params.length}`); }
  if (updates.length === 0) return await getVehicleTypeById(id);
  params.push(id);
  const res = await query(
    `UPDATE vehicle_types SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

export async function deleteVehicleType(id) {
  await query('UPDATE vehicle_types SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
  return true;
}
