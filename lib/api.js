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
import { listIntegrations, upsertIntegration, deleteIntegration } from '../lib/integrations.js';
import { listNotificationTemplates, upsertNotificationTemplate, getNotificationSettings, updateNotificationSettings } from '../lib/notifications.js';
import { updateBookingStatus, assignDriver, getBookingStatusHistory } from '../lib/bookingStatus.js';
import { getBooking, listAllBookings } from '../lib/store.js';

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(cookieParser());

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
    res.cookie('stb_admin_session', result.sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 });
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
    res.cookie('stb_admin_session', result.sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 });
    res.json({ success: true, admin: result.admin });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/admin/auth/logout', requireAdminAuth(), async (req, res) => {
  const token = req.cookies?.stb_admin_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  await logoutAdminSession(token, req);
  res.clearCookie('stb_admin_session');
  res.json({ success: true });
});

router.get('/admin/auth/session', requireAdminAuth(), async (req, res) => {
  const perms = await hasPermission(req.admin.email, '*');
  res.json({ success: true, admin: { email: req.admin.email, name: req.admin.name, roleSlug: req.admin.role_slug, isSuper: perms } });
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
  res.json({ success: true, users: await getAdminUsers() });
});
router.get('/admin/users/:id', requireAdminAuth(), requirePermission('users.view'), async (req, res) => {
  const user = await getAdminUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user });
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

// Pricing (delegates to existing pricing handlers)
router.get('/admin/pricing', requireAdminAuth(), requireAnyPermission('pricing.view', 'pricing.manage'), async (req, res) => {
  const { getActivePricingConfig } = await import('../lib/pricing.js');
  res.json({ success: true, pricing: await getActivePricingConfig() });
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
router.delete('/admin/integrations/:id', requireAdminAuth(), requirePermission('integrations.manage'), async (req, res) => {
  await deleteIntegration(req.params.id);
  res.json({ success: true });
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
