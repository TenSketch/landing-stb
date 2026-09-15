// Role-Based Access Control service
import { query } from './db.js';

const ROLE_PERMISSIONS_CACHE = new Map();
const PERMISSIONS_CACHE_TTL_MS = 60 * 1000;

export async function seedRolesAndPermissions() {
  // Permissions are seeded in migration 004; this function can be used to repair missing entries.
  const required = [
    { module: 'dashboard', action: 'view', key: 'dashboard.view' },
    { module: 'bookings', action: 'view', key: 'bookings.view' },
    { module: 'bookings', action: 'update_status', key: 'bookings.update_status' },
    { module: 'bookings', action: 'assign_driver', key: 'bookings.assign_driver' },
    { module: 'bookings', action: 'cancel', key: 'bookings.cancel' },
    { module: 'customers', action: 'view', key: 'customers.view' },
    { module: 'customers', action: 'manage', key: 'customers.manage' },
    { module: 'vehicles', action: 'view', key: 'vehicles.view' },
    { module: 'vehicles', action: 'manage', key: 'vehicles.manage' },
    { module: 'pricing', action: 'view', key: 'pricing.view' },
    { module: 'pricing', action: 'manage', key: 'pricing.manage' },
    { module: 'drivers', action: 'view', key: 'drivers.view' },
    { module: 'drivers', action: 'manage', key: 'drivers.manage' },
    { module: 'notifications', action: 'view', key: 'notifications.view' },
    { module: 'notifications', action: 'manage', key: 'notifications.manage' },
    { module: 'notifications', action: 'send', key: 'notifications.send' },
    { module: 'payments', action: 'view', key: 'payments.view' },
    { module: 'payments', action: 'manage', key: 'payments.manage' },
    { module: 'integrations', action: 'view', key: 'integrations.view' },
    { module: 'integrations', action: 'manage', key: 'integrations.manage' },
    { module: 'settings', action: 'view', key: 'settings.view' },
    { module: 'settings', action: 'manage', key: 'settings.manage' },
    { module: 'users', action: 'view', key: 'users.view' },
    { module: 'users', action: 'manage', key: 'users.manage' },
    { module: 'roles', action: 'view', key: 'roles.view' },
    { module: 'roles', action: 'manage', key: 'roles.manage' },
    { module: 'audit_logs', action: 'view', key: 'audit_logs.view' },
    { module: 'reports', action: 'view', key: 'reports.view' }
  ];

  for (const p of required) {
    await query(
      `INSERT INTO permissions (module, action, key) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
      [p.module, p.action, p.key]
    );
  }

  const roles = [
    { name: 'Super Admin', slug: 'SUPER_ADMIN' },
    { name: 'Admin', slug: 'ADMIN' },
    { name: 'Dispatcher', slug: 'DISPATCHER' },
    { name: 'Operations', slug: 'OPERATIONS' },
    { name: 'Viewer', slug: 'VIEWER' }
  ];
  for (const r of roles) {
    await query(
      `INSERT INTO roles (name, slug, is_system_role) VALUES ($1, $2, TRUE) ON CONFLICT (slug) DO NOTHING`,
      [r.name, r.slug]
    );
  }

  // Clear cache so permissions are reloaded
  ROLE_PERMISSIONS_CACHE.clear();
}

async function loadRolePermissions(roleId) {
  const res = await query(
    `SELECT p.key FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = $1`,
    [roleId]
  );
  return res.rows.map(r => r.key);
}

async function getAdminRolePermissions(roleId) {
  if (!roleId) return new Set();
  const cached = ROLE_PERMISSIONS_CACHE.get(roleId);
  if (cached && cached.ts > Date.now() - PERMISSIONS_CACHE_TTL_MS) {
    return cached.permissions;
  }
  const keys = await loadRolePermissions(roleId);
  const set = new Set(keys);
  ROLE_PERMISSIONS_CACHE.set(roleId, { ts: Date.now(), permissions: set });
  return set;
}

export async function getAdminPermissions(adminEmail) {
  const res = await query(
    `SELECT u.role_id, r.slug FROM admin_users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.email = $1 AND u.is_active = TRUE`,
    [adminEmail.toLowerCase()]
  );
  if (res.rows.length === 0) return new Set();
  const row = res.rows[0];
  if (row.slug === 'SUPER_ADMIN') {
    // SUPER_ADMIN bypass: all permission keys
    const all = await query('SELECT key FROM permissions');
    return new Set(all.rows.map(r => r.key).concat('*'));
  }
  return await getAdminRolePermissions(row.role_id);
}

export async function hasPermission(adminEmail, permissionKey) {
  const perms = await getAdminPermissions(adminEmail);
  if (perms.has('*')) return true;
  if (permissionKey.includes('.')) {
    const [module] = permissionKey.split('.');
    if (perms.has(`${module}.*`)) return true;
  }
  return perms.has(permissionKey);
}

export function requirePermission(permissionKey) {
  return async (req, res, next) => {
    if (!req.admin?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const ok = await hasPermission(req.admin.email, permissionKey);
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

export function requireAnyPermission(...permissionKeys) {
  return async (req, res, next) => {
    if (!req.admin?.email) return res.status(401).json({ error: 'Unauthorized' });
    const perms = await getAdminPermissions(req.admin.email);
    if (perms.has('*')) return next();
    const ok = permissionKeys.some(k => perms.has(k));
    if (!ok) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    next();
  };
}

export async function getRoles() {
  const res = await query('SELECT id, name, slug, description, is_system_role, created_at, updated_at FROM roles ORDER BY id');
  return res.rows;
}

export async function getRoleById(id) {
  const roleRes = await query('SELECT * FROM roles WHERE id = $1', [id]);
  if (roleRes.rows.length === 0) return null;
  const perms = await loadRolePermissions(id);
  return { ...roleRes.rows[0], permissions: perms };
}

export async function createRole({ name, slug, description, permissionKeys = [] }) {
  const client = await query('BEGIN'); // query helper doesn't support transactions; we'll use raw pg here? Simpler: run sequentially.
  const insertRes = await query(
    `INSERT INTO roles (name, slug, description) VALUES ($1, $2, $3) RETURNING *`,
    [name, slug, description]
  );
  const role = insertRes.rows[0];
  await setRolePermissions(role.id, permissionKeys);
  ROLE_PERMISSIONS_CACHE.delete(role.id);
  return await getRoleById(role.id);
}

export async function updateRole(id, { name, description, permissionKeys }) {
  await query(
    `UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3`,
    [name, description, id]
  );
  if (permissionKeys) {
    await setRolePermissions(id, permissionKeys);
  }
  ROLE_PERMISSIONS_CACHE.delete(id);
  return await getRoleById(id);
}

export async function deleteRole(id) {
  await query('DELETE FROM roles WHERE id = $1 AND is_system_role = FALSE', [id]);
  ROLE_PERMISSIONS_CACHE.delete(id);
  return true;
}

async function setRolePermissions(roleId, permissionKeys) {
  await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
  if (!permissionKeys?.length) return;
  const permRes = await query('SELECT id, key FROM permissions WHERE key = ANY($1::text[])', [permissionKeys]);
  const ids = permRes.rows.map(r => r.id);
  for (const permissionId of ids) {
    await query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleId, permissionId]);
  }
}

export async function getAdminUsers() {
  const res = await query(
    `SELECT u.id, u.email, u.name, u.is_active, u.last_login, u.email_verified_at, u.created_at, u.updated_at,
            r.id as role_id, r.name as role_name, r.slug as role_slug
     FROM admin_users u
     LEFT JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at DESC`
  );
  return res.rows;
}

export async function getAdminUserById(id) {
  const res = await query(
    `SELECT u.id, u.email, u.name, u.is_active, u.last_login, u.email_verified_at, u.created_at,
            r.id as role_id, r.name as role_name, r.slug as role_slug
     FROM admin_users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

export async function createAdminUser({ email, name, roleId, password, isActive = true }) {
  const passwordHash = password ? await import('./security.js').then(m => m.hashPassword(password)) : null;
  const insertRes = await query(
    `INSERT INTO admin_users (email, name, password_hash, role_id, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id, email, name, is_active, role_id`,
    [email.toLowerCase(), name || null, passwordHash, roleId, isActive]
  );
  return insertRes.rows[0];
}

export async function updateAdminUser(id, { name, roleId, isActive, password }) {
  const updates = [];
  const params = [];
  if (name !== undefined) { params.push(name); updates.push(`name = $${params.length}`); }
  if (roleId !== undefined) { params.push(roleId); updates.push(`role_id = $${params.length}`); }
  if (isActive !== undefined) { params.push(isActive); updates.push(`is_active = $${params.length}`); }
  if (password) {
    const { hashPassword } = await import('./security.js');
    params.push(await hashPassword(password));
    updates.push(`password_hash = $${params.length}`);
  }
  if (updates.length === 0) return await getAdminUserById(id);
  params.push(id);
  await query(`UPDATE admin_users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
  return await getAdminUserById(id);
}

export async function deleteAdminUser(id) {
  await query('DELETE FROM admin_users WHERE id = $1 AND email != (SELECT COALESCE($2, \'\'))', [id, process.env.INITIAL_ADMIN_EMAIL?.toLowerCase()]);
  return true;
}

export async function assignRole(adminEmail, roleId) {
  await query('UPDATE admin_users SET role_id = $1, updated_at = NOW() WHERE email = $2', [roleId, adminEmail.toLowerCase()]);
  ROLE_PERMISSIONS_CACHE.clear();
}
