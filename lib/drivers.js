// Driver management service
import { query } from './db.js';

export async function listDrivers({ activeOnly = true } = {}) {
  let sql = `SELECT * FROM drivers`;
  if (activeOnly) sql += ` WHERE is_active = TRUE`;
  sql += ` ORDER BY name ASC`;
  const res = await query(sql);
  return res.rows;
}

export async function getDriverById(id) {
  const res = await query('SELECT * FROM drivers WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function createDriver({ name, phone, email, plateNumber, vehicleId, photoUrl, notes }) {
  const res = await query(
    `INSERT INTO drivers (name, phone, email, plate_number, vehicle_id, photo_url, notes, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW())
     RETURNING *`,
    [name, phone || null, email || null, plateNumber || null, vehicleId || null, photoUrl || null, notes || null]
  );
  return res.rows[0];
}

export async function updateDriver(id, { name, phone, email, plateNumber, vehicleId, photoUrl, notes, isActive }) {
  const updates = [];
  const params = [];
  if (name !== undefined) { params.push(name); updates.push(`name = $${params.length}`); }
  if (phone !== undefined) { params.push(phone); updates.push(`phone = $${params.length}`); }
  if (email !== undefined) { params.push(email); updates.push(`email = $${params.length}`); }
  if (plateNumber !== undefined) { params.push(plateNumber); updates.push(`plate_number = $${params.length}`); }
  if (vehicleId !== undefined) { params.push(vehicleId); updates.push(`vehicle_id = $${params.length}`); }
  if (photoUrl !== undefined) { params.push(photoUrl); updates.push(`photo_url = $${params.length}`); }
  if (notes !== undefined) { params.push(notes); updates.push(`notes = $${params.length}`); }
  if (isActive !== undefined) { params.push(isActive); updates.push(`is_active = $${params.length}`); }
  if (updates.length === 0) return await getDriverById(id);
  params.push(id);
  const res = await query(
    `UPDATE drivers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

export async function deleteDriver(id) {
  await query('UPDATE drivers SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
  return true;
}
