// Vehicle management service
import { query } from './db.js';

export async function listVehicleTypes({ activeOnly = false } = {}) {
  let sql = `SELECT * FROM vehicle_types`;
  if (activeOnly) sql += ` WHERE is_active = TRUE`;
  sql += ` ORDER BY sort_order ASC, display_order ASC, id ASC`;
  const res = await query(sql);
  return res.rows;
}

export async function getVehicleTypeById(id) {
  const res = await query('SELECT * FROM vehicle_types WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function createVehicleType(data = {}) {
  const {
    name, description, paxMax, luggageCapacity, imageUrl, sortOrder,
    slug, full_name, category, tag, tag_style
  } = data;
  const res = await query(
    `INSERT INTO vehicle_types
       (name, description, pax_max, luggage_capacity, image_url, sort_order,
        slug, full_name, category, tag, tag_style, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW(), NOW())
     RETURNING *`,
    [
      name, description || null, paxMax || 4, luggageCapacity || 2, imageUrl || null, sortOrder || 0,
      slug || null, full_name || null, category || null, tag || null, tag_style || null
    ]
  );
  return res.rows[0];
}

export async function updateVehicleType(id, data = {}) {
  const allowed = ['name','description','paxMax','luggageCapacity','imageUrl','sortOrder','isActive',
                   'slug','full_name','category','tag','tag_style'];
  const colMap = {
    name: 'name', description: 'description',
    paxMax: 'pax_max', luggageCapacity: 'luggage_capacity',
    imageUrl: 'image_url', sortOrder: 'sort_order', isActive: 'is_active',
    slug: 'slug', full_name: 'full_name', category: 'category',
    tag: 'tag', tag_style: 'tag_style'
  };
  const updates = [];
  const params = [];
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) continue;
    if (data[key] === undefined) continue;
    params.push(data[key]);
    updates.push(`${colMap[key]} = $${params.length}`);
  }
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
