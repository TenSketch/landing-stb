// Admin + Customer API route handlers
import express from 'express';
import cookieParser from 'cookie-parser';

import {
  loginAdmin, verifyAdminOtpAndCreateSession, logoutAdminSession,
  setupInitialAdminPassword, requestPasswordReset as requestAdminPasswordReset,
  resetPassword as resetAdminPassword, changeAdminPassword,
  requireAdminAuth
} from '../lib/auth.js';
import {
  registerCustomer, loginCustomer, logoutCustomer, requestPasswordReset as requestCustomerPasswordReset,
  resetPassword as resetCustomerPassword, changePassword as changeCustomerPassword,
  updateCustomerProfile, optionalCustomerAuth, requireCustomerAuth,
  listCustomerBookings, saveCustomerDeviceToken, removeCustomerDeviceToken
} from '../lib/customerAuth.js';
import {
  hasPermission, requirePermission, requireAnyPermission,
  getRoles, getRoleById, createRole, updateRole, deleteRole,
  getAdminUsers, getAdminUserById, createAdminUser, updateAdminUser, deleteAdminUser
} from '../lib/rbac.js';
import { listAuditLogs } from '../lib/audit.js';
import {
  getAllSettings, setSetting, setBookingSetting
} from '../lib/settings.js';
import { listVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType } from '../lib/vehicles.js';
import { listDrivers, createDriver, updateDriver, deleteDriver } from '../lib/drivers.js';
import { listIntegrations, upsertIntegration, deleteIntegration, getIntegration } from '../lib/integrations.js';
import { listNotificationTemplates, upsertNotificationTemplate, getNotificationSettings, updateNotificationSettings } from '../lib/notifications.js';
import { updateBookingStatus, assignDriver, getBookingStatusHistory } from '../lib/bookingStatus.js';
import { getBooking, listAllBookings } from '../lib/store.js';
import { query as dbQuery } from './db.js';

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(cookieParser());

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || process.env.ROOT_DOMAIN || "singaporetourbooking.com";
const isProd = process.env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "lax" : "lax", // 'lax' so cookies work when admin.* calls api.*
  domain: isProd ? COOKIE_DOMAIN : undefined,
  path: "/",
  maxAge: 8 * 60 * 60 * 1000
};

// Admin auth
router.post('/admin/auth/setup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await setupInitialAdminPassword(email, password, req);
    res.status(result.status || 200).json(result.body);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/admin/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await loginAdmin(email, password, req);
    if (result.requiresOtp) {
      return res.json({ success: true, requiresOtp: true, email: result.email });
    }
    res.cookie('stb_admin_session', result.sessionToken, cookieOpts);
    res.json({ success: true, admin: result.admin });
  } catch (err) {
    const status = err.message.includes('Too many') ? 429 : 401;
    res.status(status).json({ error: err.message });
  }
});

router.post('/admin/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const result = await verifyAdminOtpAndCreateSession(email, otp, req);
    res.cookie('stb_admin_session', result.sessionToken, cookieOpts);
    res.json({ success: true, admin: result.admin });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/admin/auth/logout', requireAdminAuth(), async (req, res) => {
  const token = req.cookies?.stb_admin_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  await logoutAdminSession(token, req);
  res.clearCookie('stb_admin_session', { path: "/", domain: cookieOpts.domain });
  res.json({ success: true });
});

router.get('/admin/auth/session', requireAdminAuth(), async (req, res) => {
  const { getAdminPermissions } = await import('../lib/rbac.js');
  const perms = await getAdminPermissions(req.admin.email);
  res.json({ success: true, admin: { email: req.admin.email, name: req.admin.name, roleSlug: req.admin.role_slug }, isSuper: perms.has('*'), permissions: Array.from(perms) });
});

router.post('/admin/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    await requestAdminPasswordReset(email, baseUrl, req);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/admin/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    await resetAdminPassword(token, password, req);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/admin/auth/change-password', requireAdminAuth(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    await changeAdminPassword(req.admin.email, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin dashboard
router.get('/admin/dashboard', requireAdminAuth(), requirePermission('dashboard.view'), async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const rows = await listAllBookings();
    const counts = {
      today: rows.filter(b => new Date(b.dateTime || b.created_at) >= todayStart).length,
      pending: rows.filter(b => b.status === 'PENDING').length,
      confirmed: rows.filter(b => b.status === 'CONFIRMED').length,
      assigned: rows.filter(b => b.status === 'ASSIGNED').length,
      active: rows.filter(b => ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(b.status)).length,
      completed: rows.filter(b => b.status === 'COMPLETED').length,
      cancelled: rows.filter(b => b.status === 'CANCELLED').length,
      unassigned: rows.filter(b => !b.driverName && ['PENDING', 'CONFIRMED'].includes(b.status)).length
    };
    const recent = rows.slice(0, 10);
    res.json({ success: true, counts, recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customers list
router.get('/admin/customers', requireAdminAuth(), requirePermission('customers.view'), async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT c.id, c.email, c.name, c.phone, c.is_active, c.created_at,
             COUNT(b.id) AS booking_count
      FROM customers c
      LEFT JOIN bookings b ON b.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 500
    `);
    res.json({ success: true, customers: result.rows });
  } catch (err) {
    console.error('[Admin Customers]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Users & Roles
router.get('/admin/roles', requireAdminAuth(), requirePermission('roles.view'), async (req, res) => {
  res.json({ success: true, roles: await getRoles() });
});
router.get('/admin/roles/:id', requireAdminAuth(), requirePermission('roles.view'), async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) return res.status(404).json({ error: 'Role not found' });
  res.json({ success: true, role });
});
router.post('/admin/roles', requireAdminAuth(), requirePermission('roles.manage'), async (req, res) => {
  try {
    const role = await createRole(req.body);
    res.status(201).json({ success: true, role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.put('/admin/roles/:id', requireAdminAuth(), requirePermission('roles.manage'), async (req, res) => {
  try {
    const role = await updateRole(req.params.id, req.body);
    res.json({ success: true, role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.delete('/admin/roles/:id', requireAdminAuth(), requirePermission('roles.manage'), async (req, res) => {
  await deleteRole(req.params.id);
  res.json({ success: true });
});

router.get('/admin/users', requireAdminAuth(), requirePermission('users.view'), async (req, res) => {
  try {
    res.json({ success: true, users: await getAdminUsers() });
  } catch (err) {
    console.error('[Admin Users]', err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/admin/users/:id', requireAdminAuth(), requirePermission('users.view'), async (req, res) => {
  try {
    const user = await getAdminUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/admin/users', requireAdminAuth(), requirePermission('users.manage'), async (req, res) => {
  try {
    const user = await createAdminUser(req.body);
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.put('/admin/users/:id', requireAdminAuth(), requirePermission('users.manage'), async (req, res) => {
  try {
    const user = await updateAdminUser(req.params.id, req.body);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.delete('/admin/users/:id', requireAdminAuth(), requirePermission('users.manage'), async (req, res) => {
  await deleteAdminUser(req.params.id);
  res.json({ success: true });
});

// Audit logs
router.get('/admin/audit-logs', requireAdminAuth(), requirePermission('audit_logs.view'), async (req, res) => {
  const { limit = 100, offset = 0, actorEmail, action, tableName } = req.query;
  const logs = await listAuditLogs({ limit: Number(limit), offset: Number(offset), actorEmail, action, tableName });
  res.json({ success: true, logs });
});

// Content blocks (FAQ, hero, services, footer) — admin-editable landing content
router.get('/admin/content', requireAdminAuth(), requirePermission('settings.view'), async (req, res) => {
  try {
    const { category } = req.query;
    const params = [];
    let where = "TRUE";
    if (category) { params.push(category); where += " AND category = $1"; }
    const result = await dbQuery(
      `SELECT id, block_key, category, title, body, icon, image_url, meta_json, is_active, sort_order
       FROM content_blocks WHERE ${where} ORDER BY sort_order ASC, id ASC`,
      params
    );
    res.json({ success: true, blocks: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put('/admin/content/:id', requireAdminAuth(), requirePermission('settings.manage'), async (req, res) => {
  try {
    const { title, body, icon, image_url, meta_json, is_active, sort_order } = req.body || {};
    const result = await dbQuery(
      `UPDATE content_blocks SET
         title = COALESCE($1, title),
         body = COALESCE($2, body),
         icon = COALESCE($3, icon),
         image_url = COALESCE($4, image_url),
         meta_json = COALESCE($5, meta_json),
         is_active = COALESCE($6, is_active),
         sort_order = COALESCE($7, sort_order),
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title ?? null, body ?? null, icon ?? null, image_url ?? null,
       meta_json !== undefined ? JSON.stringify(meta_json) : null,
       is_active !== undefined ? Boolean(is_active) : null,
       sort_order !== undefined ? Number(sort_order) : null,
       req.params.id]
    );
    res.json({ success: true, block: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.post('/admin/content', requireAdminAuth(), requirePermission('settings.manage'), async (req, res) => {
  try {
    const { block_key, category, title, body, icon, image_url, meta_json, is_active, sort_order } = req.body || {};
    if (!block_key || !category) return res.status(400).json({ error: 'block_key and category are required.' });
    const result = await dbQuery(
      `INSERT INTO content_blocks (block_key, category, title, body, icon, image_url, meta_json, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, TRUE), COALESCE($9, 0))
       ON CONFLICT (block_key) DO UPDATE SET
         title = EXCLUDED.title, body = EXCLUDED.body, icon = EXCLUDED.icon,
         image_url = EXCLUDED.image_url, meta_json = EXCLUDED.meta_json,
         is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [block_key, category, title || '', body || '', icon || '', image_url || '',
       JSON.stringify(meta_json || {}), is_active, sort_order]
    );
    res.status(201).json({ success: true, block: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.delete('/admin/content/:id', requireAdminAuth(), requirePermission('settings.manage'), async (req, res) => {
  try {
    await dbQuery('DELETE FROM content_blocks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Vehicles (extended fields — image, features, display order)
router.put('/admin/vehicles/:id/extended', requireAdminAuth(), requirePermission('vehicles.manage'), async (req, res) => {
  try {
    const { slug, full_name, category, tag, tag_style, pax, luggage,
            base_fare_sgd, per_km_sgd, min_fare_sgd, hourly_sgd,
            image_url, fallback_image_url, description_html, features_json, display_order } = req.body || {};
    const result = await dbQuery(
      `UPDATE vehicle_types SET
         slug = COALESCE($1, slug),
         full_name = COALESCE($2, full_name),
         category = COALESCE($3, category),
         tag = COALESCE($4, tag),
         tag_style = COALESCE($5, tag_style),
         pax = COALESCE($6, pax),
         luggage = COALESCE($7, luggage),
         base_fare_sgd = COALESCE($8, base_fare_sgd),
         per_km_sgd = COALESCE($9, per_km_sgd),
         min_fare_sgd = COALESCE($10, min_fare_sgd),
         hourly_sgd = COALESCE($11, hourly_sgd),
         image_url = COALESCE($12, image_url),
         fallback_image_url = COALESCE($13, fallback_image_url),
         description_html = COALESCE($14, description_html),
         features_json = COALESCE($15, features_json),
         display_order = COALESCE($16, display_order),
         updated_at = NOW()
       WHERE id = $17 RETURNING *`,
      [slug ?? null, full_name ?? null, category ?? null, tag ?? null, tag_style ?? null,
       pax !== undefined ? Number(pax) : null, luggage !== undefined ? Number(luggage) : null,
       base_fare_sgd !== undefined ? parseFloat(base_fare_sgd) : null,
       per_km_sgd !== undefined ? parseFloat(per_km_sgd) : null,
       min_fare_sgd !== undefined ? parseFloat(min_fare_sgd) : null,
       hourly_sgd !== undefined ? parseFloat(hourly_sgd) : null,
       image_url ?? null, fallback_image_url ?? null, description_html ?? null,
       features_json !== undefined ? JSON.stringify(features_json) : null,
       display_order !== undefined ? Number(display_order) : null,
       req.params.id]
    );
    res.json({ success: true, vehicle: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Settings
router.get('/admin/settings', requireAdminAuth(), requirePermission('settings.view'), async (req, res) => {
  res.json({ success: true, settings: await getAllSettings() });
});
router.put('/admin/settings/system', requireAdminAuth(), requirePermission('settings.manage'), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body || {})) {
      await setSetting(key, value, req.admin.email);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.put('/admin/settings/booking', requireAdminAuth(), requirePermission('settings.manage'), async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body || {})) {
      await setBookingSetting(key, value, req.admin.email);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Vehicles
router.get('/admin/vehicles', requireAdminAuth(), requireAnyPermission('vehicles.view', 'vehicles.manage'), async (req, res) => {
  res.json({ success: true, vehicles: await listVehicleTypes() });
});
router.post('/admin/vehicles', requireAdminAuth(), requirePermission('vehicles.manage'), async (req, res) => {
  try {
    const vehicle = await createVehicleType(req.body);
    res.status(201).json({ success: true, vehicle });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.put('/admin/vehicles/:id', requireAdminAuth(), requirePermission('vehicles.manage'), async (req, res) => {
  try {
    const vehicle = await updateVehicleType(req.params.id, req.body);
    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.delete('/admin/vehicles/:id', requireAdminAuth(), requirePermission('vehicles.manage'), async (req, res) => {
  await deleteVehicleType(req.params.id);
  res.json({ success: true });
});

// Drivers
router.get('/admin/drivers', requireAdminAuth(), requireAnyPermission('drivers.view', 'drivers.manage'), async (req, res) => {
  res.json({ success: true, drivers: await listDrivers({ activeOnly: false }) });
});
router.post('/admin/drivers', requireAdminAuth(), requirePermission('drivers.manage'), async (req, res) => {
  try {
    const driver = await createDriver(req.body);
    res.status(201).json({ success: true, driver });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.put('/admin/drivers/:id', requireAdminAuth(), requirePermission('drivers.manage'), async (req, res) => {
  try {
    const driver = await updateDriver(req.params.id, req.body);
    res.json({ success: true, driver });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.delete('/admin/drivers/:id', requireAdminAuth(), requirePermission('drivers.manage'), async (req, res) => {
  await deleteDriver(req.params.id);
  res.json({ success: true });
});

// Pricing — returns full admin-facing pricing data (all vehicles, all rules incl. inactive)
router.get('/admin/pricing', requireAdminAuth(), requireAnyPermission('pricing.view', 'pricing.manage'), async (req, res) => {
  try {
    const [vehiclesRes, rulesRes, overridesRes, surchargesRes] = await Promise.all([
      dbQuery(`SELECT id, name, description, pax_max, is_active FROM vehicle_types ORDER BY id ASC`),
      dbQuery(`
        SELECT pr.id, pr.vehicle_id, vt.name as vehicle_name,
               pr.base_fare, pr.per_km_rate, pr.minimum_fare, pr.hourly_rate, pr.daily_rate, pr.is_active
        FROM pricing_rules pr
        JOIN vehicle_types vt ON pr.vehicle_id = vt.id
        ORDER BY vt.id ASC
      `),
      dbQuery(`
        SELECT ro.id, ro.vehicle_id, vt.name as vehicle_name,
               ro.origin_place_id, ro.destination_place_id,
               ro.origin_display_name, ro.destination_display_name,
               ro.fixed_price, ro.is_active, ro.created_at
        FROM route_overrides ro
        JOIN vehicle_types vt ON ro.vehicle_id = vt.id
        ORDER BY ro.created_at DESC
      `),
      dbQuery(`
        SELECT id, name, type, value, start_time, end_time, applicable_mode, is_active
        FROM surcharges ORDER BY id ASC
      `)
    ]);
    res.json({
      success: true,
      pricing: {
        vehicles: vehiclesRes.rows,
        rules: rulesRes.rows,
        overrides: overridesRes.rows,
        surcharges: surchargesRes.rows
      }
    });
  } catch (err) {
    console.error('[Admin Pricing GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update pricing rules (bulk)
router.put('/admin/pricing/rules', requireAdminAuth(), requirePermission('pricing.manage'), async (req, res) => {
  try {
    const { rules } = req.body || {};
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'Invalid rules payload.' });
    for (const rule of rules) {
      const { vehicle_id, base_fare, per_km_rate, minimum_fare, hourly_rate, daily_rate, is_active } = rule;
      await dbQuery(`
        INSERT INTO pricing_rules (vehicle_id, base_fare, per_km_rate, minimum_fare, hourly_rate, daily_rate, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (vehicle_id) DO UPDATE SET
          base_fare = EXCLUDED.base_fare,
          per_km_rate = EXCLUDED.per_km_rate,
          minimum_fare = EXCLUDED.minimum_fare,
          hourly_rate = EXCLUDED.hourly_rate,
          daily_rate = EXCLUDED.daily_rate,
          is_active = COALESCE(EXCLUDED.is_active, pricing_rules.is_active),
          updated_at = NOW()
      `, [
        Number(vehicle_id),
        parseFloat(base_fare || 0),
        parseFloat(per_km_rate || 0),
        parseFloat(minimum_fare || 0),
        parseFloat(hourly_rate || 0),
        parseFloat(daily_rate || 0),
        is_active !== false
      ]);
    }
    res.json({ success: true, message: 'Pricing rules saved.' });
  } catch (err) {
    console.error('[Admin Pricing Rules PUT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete route override
router.delete('/admin/pricing/overrides/:id', requireAdminAuth(), requirePermission('pricing.manage'), async (req, res) => {
  try {
    await dbQuery('DELETE FROM route_overrides WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin Pricing Override DELETE]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update surcharges (bulk)
router.put('/admin/pricing/surcharges', requireAdminAuth(), requirePermission('pricing.manage'), async (req, res) => {
  try {
    const { surcharges } = req.body || {};
    if (!Array.isArray(surcharges)) return res.status(400).json({ error: 'Invalid surcharges payload.' });
    for (const sc of surcharges) {
      const { id, value, is_active } = sc;
      await dbQuery('UPDATE surcharges SET value = COALESCE($1, value), is_active = COALESCE($2, is_active), updated_at = NOW() WHERE id = $3',
        [value !== undefined ? parseFloat(value) : null, is_active !== undefined ? Boolean(is_active) : null, id]);
    }
    res.json({ success: true, message: 'Surcharges saved.' });
  } catch (err) {
    console.error('[Admin Pricing Surcharges PUT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bookings
router.get('/admin/bookings', requireAdminAuth(), requirePermission('bookings.view'), async (req, res) => {
  res.json({ success: true, bookings: await listAllBookings() });
});
router.get('/admin/bookings/:voucher/status-history', requireAdminAuth(), requirePermission('bookings.view'), async (req, res) => {
  res.json({ success: true, history: await getBookingStatusHistory(req.params.voucher) });
});
router.put('/admin/bookings/:voucher/status', requireAdminAuth(), requirePermission('bookings.update_status'), async (req, res) => {
  try {
    const { status, notes } = req.body || {};
    const updated = await updateBookingStatus(req.params.voucher, status, { changedByEmail: req.admin.email, changedByType: 'admin', notes, req });
    res.json({ success: true, booking: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.put('/admin/bookings/:voucher/assign-driver', requireAdminAuth(), requirePermission('bookings.assign_driver'), async (req, res) => {
  try {
    const updated = await assignDriver(req.params.voucher, req.body, { changedByEmail: req.admin.email, changedByType: 'admin', req });
    res.json({ success: true, booking: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Notifications
router.get('/admin/notifications/templates', requireAdminAuth(), requireAnyPermission('notifications.view', 'notifications.manage'), async (req, res) => {
  res.json({ success: true, templates: await listNotificationTemplates() });
});
router.put('/admin/notifications/templates/:id', requireAdminAuth(), requirePermission('notifications.manage'), async (req, res) => {
  try {
    const tmpl = await upsertNotificationTemplate({ id: req.params.id, ...req.body });
    res.json({ success: true, template: tmpl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.get('/admin/notifications/settings', requireAdminAuth(), requireAnyPermission('notifications.view', 'notifications.manage'), async (req, res) => {
  res.json({ success: true, settings: await getNotificationSettings() });
});
router.put('/admin/notifications/settings', requireAdminAuth(), requirePermission('notifications.manage'), async (req, res) => {
  try {
    const result = await updateNotificationSettings(req.body);
    res.json({ success: true, settings: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Integrations
router.get('/admin/integrations', requireAdminAuth(), requireAnyPermission('integrations.view', 'integrations.manage'), async (req, res) => {
  res.json({ success: true, integrations: await listIntegrations() });
});
router.post('/admin/integrations', requireAdminAuth(), requirePermission('integrations.manage'), async (req, res) => {
  try {
    const integration = await upsertIntegration({ ...req.body, actorEmail: req.admin.email });
    res.status(201).json({ success: true, integration });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.put('/admin/integrations/:id', requireAdminAuth(), requirePermission('integrations.manage'), async (req, res) => {
  try {
    const integration = await upsertIntegration({ id: req.params.id, ...req.body, actorEmail: req.admin.email });
    res.json({ success: true, integration });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.get('/admin/integrations/:id', requireAdminAuth(), requireAnyPermission('integrations.view', 'integrations.manage'), async (req, res) => {
  const integration = await getIntegration(req.params.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  res.json({ success: true, integration });
});

router.put('/admin/integrations/:id/default', requireAdminAuth(), requirePermission('integrations.manage'), async (req, res) => {
  const integration = await getIntegration(req.params.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  const { setDefaultIntegration } = await import('../lib/integrations.js');
  await setDefaultIntegration(integration.provider_type, req.params.id);
  res.json({ success: true });
});

router.delete('/admin/integrations/:id', requireAdminAuth(), requirePermission('integrations.manage'), async (req, res) => {
  await deleteIntegration(req.params.id);
  res.json({ success: true });
});

router.post('/admin/integrations/:id/test', requireAdminAuth(), requirePermission('integrations.manage'), async (req, res) => {
  try {
    const integration = await getIntegration(req.params.id);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });
    if (!integration.enabled) return res.status(400).json({ error: 'Integration is disabled' });

    const config = { ...integration.config, ...integration.secrets, enabled: integration.enabled, mode: integration.mode, providerKey: integration.provider_key };
    let provider;
    let result = { valid: false, errors: [] };

    if (integration.provider_type === 'EMAIL') {
      const { EmailProvider } = await import('../lib/providers/email.js');
      provider = new EmailProvider(config);
      result = provider.validateConfig();
      if (result.valid && req.body?.to) {
        const sendResult = await provider.send({
          to: req.body.to,
          from: config.from,
          subject: 'STB Test Email',
          html: '<p>This is a test email from STB admin panel.</p>',
          text: 'This is a test email from STB admin panel.'
        });
        result.send = sendResult;
      }
    } else if (integration.provider_type === 'SMS') {
      const { SmsProvider } = await import('../lib/providers/sms.js');
      provider = new SmsProvider(config);
      result = provider.validateConfig();
    } else if (integration.provider_type === 'WHATSAPP') {
      const { WhatsAppProvider } = await import('../lib/providers/whatsapp.js');
      provider = new WhatsAppProvider(config);
      result = provider.validateConfig();
    } else if (integration.provider_type === 'FIREBASE') {
      const { FirebaseProvider } = await import('../lib/providers/firebase.js');
      provider = new FirebaseProvider(config);
      result = provider.validateConfig();
    } else if (integration.provider_type === 'PAYMENT') {
      result = { valid: true, message: 'Payment provider placeholder — not yet active.' };
    } else {
      result = { valid: false, errors: ['Unsupported provider type'] };
    }

    res.json({ success: result.valid, result });
  } catch (err) {
    console.error('[Integration Test]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customer auth
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, phone, whatsapp, password } = req.body || {};
    const customer = await registerCustomer({ name, email, phone, whatsapp, password }, req);
    res.cookie('stb_customer_session', customer.sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, customer: customer.public });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const customer = await loginCustomer(email, password, req);
    res.cookie('stb_customer_session', customer.sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, customer: customer.public });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/auth/logout', optionalCustomerAuth, async (req, res) => {
  const token = req.cookies?.stb_customer_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  await logoutCustomer(token);
  res.clearCookie('stb_customer_session');
  res.json({ success: true });
});

router.get('/auth/session', optionalCustomerAuth, async (req, res) => {
  res.json({ success: true, customer: req.customer || null });
});

router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    await requestCustomerPasswordReset(email);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    await resetCustomerPassword(token, password);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/auth/change-password', requireCustomerAuth(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    await changeCustomerPassword(req.customer.id, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/customer/profile', requireCustomerAuth(), async (req, res) => {
  res.json({ success: true, customer: req.customer });
});

router.put('/customer/profile', requireCustomerAuth(), async (req, res) => {
  try {
    const customer = await updateCustomerProfile(req.customer.id, req.body);
    res.json({ success: true, customer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/customer/bookings', requireCustomerAuth(), async (req, res) => {
  const { status, upcoming } = req.query;
  const bookings = await listCustomerBookings(req.customer.id, { status, upcoming: upcoming === 'true' });
  res.json({ success: true, bookings });
});

router.get('/customer/bookings/:voucher', requireCustomerAuth(), async (req, res) => {
  const booking = await getBooking(req.params.voucher);
  if (!booking || booking.customer_id !== req.customer.id) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true, booking });
});

router.post('/customer/device-token', requireCustomerAuth(), async (req, res) => {
  try {
    const { token, provider } = req.body || {};
    await saveCustomerDeviceToken(req.customer.id, token, provider || 'fcm', req.headers['user-agent']);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/customer/device-token', requireCustomerAuth(), async (req, res) => {
  const { token } = req.body || {};
  await removeCustomerDeviceToken(req.customer.id, token);
  res.json({ success: true });
});

export default router;
