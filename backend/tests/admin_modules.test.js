// Backend unit/integration tests for admin modules: vehicles, drivers, notifications,
// integrations, audit, ratelimit, RBAC. Runs against disposable stb_test DB.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ path: ['/root/landing-stb/.env.local', '/root/landing-stb/.env'] });

if (process.env.NODE_ENV !== 'test') {
  throw new Error('admin_modules.test.js requires NODE_ENV=test');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in the process environment');
}

const testUrl = new URL(process.env.DATABASE_URL);
testUrl.pathname = '/stb_test';
process.env.DATABASE_URL = testUrl.toString();
process.env.STB_SECRET_KEY ||= 'test-only-secret-key-32-bytes-minimum!!';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASSWORD = '';
process.env.EMAIL_FROM = '';
process.env.GOOGLE_MAPS_API_KEY = '';

const suffix = crypto.randomBytes(4).toString('hex');
const marker = `qa-modules-${suffix}`;
const email = `${marker}@example.com`;

const { query, getPool } = await import('../../lib/db.js');
const {
  seedRolesAndPermissions, getRoles, createRole, getRoleById, updateRole, deleteRole,
  createAdminUser, getAdminUserById, updateAdminUser, deleteAdminUser,
  hasPermission, getAdminPermissions
} = await import('../../lib/rbac.js');
const {
  listVehicleTypes, createVehicleType, getVehicleTypeById, updateVehicleType, deleteVehicleType
} = await import('../../lib/vehicles.js');
const {
  listDrivers, createDriver, getDriverById, updateDriver, deleteDriver
} = await import('../../lib/drivers.js');
const {
  listNotificationTemplates, upsertNotificationTemplate, getNotificationSettings,
  updateNotificationSettings, refreshProviders, getProvider, notify, buildRoutingFromBooking
} = await import('../../lib/notifications.js');
const {
  listIntegrations, getIntegration, upsertIntegration, setDefaultIntegration,
  deleteIntegration, getDefaultIntegration
} = await import('../../lib/integrations.js');
const { logAudit, listAuditLogs } = await import('../../lib/audit.js');
const { isAllowed, resetLimit, getStatus } = await import('../../lib/ratelimit.js');

let passed = 0;
let total = 0;

async function t(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    throw err;
  }
}

async function cleanup() {
  const like = `${marker}%`;
  const silent = (p) => p.catch(() => {});
  await silent(query('DELETE FROM customer_device_tokens WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE $1)', [like]));
  await silent(query('DELETE FROM customer_password_reset_tokens WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE $1)', [like]));
  await silent(query('DELETE FROM customer_sessions WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE $1)', [like]));
  await silent(query("DELETE FROM bookings WHERE passenger_email LIKE $1 OR passenger_name LIKE $1", [like]));
  await silent(query('DELETE FROM customers WHERE email LIKE $1', [like]));
  await silent(query('DELETE FROM audit_logs WHERE actor_email LIKE $1', [like]));
  await silent(query('DELETE FROM integration_settings WHERE provider_key LIKE $1 OR display_name LIKE $1', [like]));
  await silent(query('DELETE FROM notification_templates WHERE name LIKE $1', [like]));
  await silent(query('DELETE FROM admin_users WHERE email LIKE $1', [like]));
  await silent(query('DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE slug LIKE $1)', [like]));
  await silent(query('DELETE FROM roles WHERE slug LIKE $1', [like]));
  await silent(query('DELETE FROM drivers WHERE name LIKE $1', [like]));
  await silent(query('DELETE FROM vehicle_types WHERE name LIKE $1', [like]));
}

async function runTests() {
  await seedRolesAndPermissions();
  const roles = await getRoles();
  const superAdminRole = roles.find(r => r.slug === 'SUPER_ADMIN');
  assert.ok(superAdminRole, 'SUPER_ADMIN role should be seeded');

  // ─── Vehicles ───
  let vehicleId;
  await t('vehicle: create and retrieve', async () => {
    const created = await createVehicleType({
      name: `QA Vehicle ${suffix}`,
      description: 'QA test vehicle',
      paxMax: 4,
      luggageCapacity: 2,
      sortOrder: 99
    });
    assert.ok(created?.id, 'created vehicle has id');
    vehicleId = created.id;
    const fetched = await getVehicleTypeById(vehicleId);
    assert.strictEqual(fetched.name, `QA Vehicle ${suffix}`);
    assert.strictEqual(fetched.pax_max, 4);
  });

  await t('vehicle: list includes created vehicle', async () => {
    const all = await listVehicleTypes();
    assert.ok(all.some(v => v.id === vehicleId));
  });

  await t('vehicle: update fields', async () => {
    const updated = await updateVehicleType(vehicleId, {
      name: `QA Vehicle Updated ${suffix}`,
      paxMax: 5,
      luggageCapacity: 3
    });
    assert.strictEqual(updated.name, `QA Vehicle Updated ${suffix}`);
    assert.strictEqual(updated.pax_max, 5);
    assert.strictEqual(updated.luggage_capacity, 3);
  });

  await t('vehicle: soft delete is excluded from active list', async () => {
    await deleteVehicleType(vehicleId);
    const active = await listVehicleTypes({ activeOnly: true });
    assert.ok(!active.some(v => v.id === vehicleId));
  });

  // ─── Drivers ───
  let driverId;
  await t('driver: create and retrieve', async () => {
    const created = await createDriver({
      name: `QA Driver ${suffix}`,
      phone: '+650****0001',
      email: `${marker}-driver@example.com`,
      plateNumber: 'SGA1234A',
      notes: 'QA test driver'
    });
    assert.ok(created?.id);
    driverId = created.id;
    const fetched = await getDriverById(driverId);
    assert.strictEqual(fetched.plate_number, 'SGA1234A');
  });

  await t('driver: list includes created driver', async () => {
    const all = await listDrivers();
    assert.ok(all.some(d => d.id === driverId));
  });

  await t('driver: update fields', async () => {
    const updated = await updateDriver(driverId, { plateNumber: 'SGB5678B', notes: 'updated' });
    assert.strictEqual(updated.plate_number, 'SGB5678B');
  });

  await t('driver: soft delete is excluded from active list', async () => {
    await deleteDriver(driverId);
    const active = await listDrivers();
    assert.ok(!active.some(d => d.id === driverId));
  });

  // ─── Notifications ───
  let templateId;
  await t('notification: upsert template and list', async () => {
    const before = await listNotificationTemplates();
    const tpl = await upsertNotificationTemplate({
      channel: 'email',
      event: 'booking_created',
      name: `QA Template ${suffix}`,
      subject: 'Hello {{passengerName}}',
      body: 'Booking {{voucherCode}} created',
      isActive: true
    });
    assert.ok(tpl?.id);
    templateId = tpl.id;
    const after = await listNotificationTemplates({ event: 'booking_created' });
    assert.ok(after.some(t => t.id === templateId));
  });

  await t('notification: update settings', async () => {
    const settings = await updateNotificationSettings({
      email: { enabled: true, config: { from: 'qa@example.com' } }
    });
    assert.strictEqual(settings.email.enabled, true);
    assert.ok(settings.email.config);
  });

  await t('notification: refresh providers returns default instances', async () => {
    await refreshProviders();
    const emailProv = getProvider('email');
    assert.ok(emailProv);
    assert.strictEqual(emailProv.type, 'email');
  });

  await t('notification: unknown event throws', async () => {
    await assert.rejects(notify('not_an_event', {}, {}), /Unknown notification event/);
  });

  await t('notification: notify with no template returns empty results', async () => {
    // Remove the template so no email is rendered
    await query('DELETE FROM notification_templates WHERE id = $1', [templateId]);
    const res = await notify('booking_created', { passengerName: 'QA', voucherCode: 'STB-123' }, { email: 'qa@example.com' });
    assert.deepStrictEqual(res.email, []);
    assert.deepStrictEqual(res.sms, []);
    assert.deepStrictEqual(res.whatsapp, []);
    assert.deepStrictEqual(res.push, []);
  });

  await t('notification: buildRoutingFromBooking prefers booking data', async () => {
    const routing = buildRoutingFromBooking(
      { passenger_email: 'guest@example.com', passenger_phone: '+650****0000' },
      { email: 'cust@example.com', phone: '+650****1111' }
    );
    assert.strictEqual(routing.email, 'guest@example.com');
    assert.strictEqual(routing.sms, '+650****0000');
  });

  // ─── Integrations ───
  let integrationId;
  await t('integration: create with encrypted secrets', async () => {
    const created = await upsertIntegration({
      providerType: 'EMAIL',
      providerKey: `${marker}-smtp`,
      displayName: 'QA SMTP',
      enabled: false,
      mode: 'test',
      config: { host: 'smtp.example.com' },
      secrets: { pass: 'secret123' },
      isDefault: false,
      actorEmail: email
    });
    assert.ok(created?.id);
    integrationId = created.id;
    assert.strictEqual(created.secrets.pass, 'secret123');
  });

  await t('integration: get decrypts secrets', async () => {
    const fetched = await getIntegration(integrationId);
    assert.strictEqual(fetched.secrets.pass, 'secret123');
  });

  await t('integration: update config', async () => {
    const updated = await upsertIntegration({
      id: integrationId,
      providerType: 'EMAIL',
      providerKey: `${marker}-smtp`,
      displayName: 'QA SMTP Updated',
      enabled: true,
      mode: 'test',
      config: { host: 'smtp2.example.com' },
      secrets: { pass: 'newsecret' },
      isDefault: false,
      actorEmail: email
    });
    assert.strictEqual(updated.display_name, 'QA SMTP Updated');
    assert.strictEqual(updated.secrets.pass, 'newsecret');
  });

  await t('integration: set default and list by type', async () => {
    const def = await upsertIntegration({
      providerType: 'EMAIL',
      providerKey: `${marker}-smtp-default`,
      displayName: 'QA Default SMTP',
      enabled: true,
      mode: 'live',
      config: {},
      secrets: null,
      isDefault: false,
      actorEmail: email
    });
    await setDefaultIntegration('EMAIL', def.id);
    const fetched = await getDefaultIntegration('EMAIL');
    assert.strictEqual(fetched.provider_key, `${marker}-smtp-default`);
    const byType = await listIntegrations({ type: 'EMAIL' });
    assert.ok(byType.length >= 2);
  });

  await t('integration: delete removes row', async () => {
    await deleteIntegration(integrationId);
    const after = await listIntegrations({ type: 'EMAIL' });
    assert.ok(!after.some(i => i.id === integrationId));
  });

  // ─── Audit ───
  await t('audit: log event and redact secrets', async () => {
    await logAudit({
      actorEmail: email,
      actorType: 'admin',
      action: 'TEST_INSERT',
      tableName: 'test_table',
      recordId: '123',
      newValues: { password: 'secret', api_key: 'abc', safe: 'visible' },
      req: { headers: { 'user-agent': 'qa-agent' }, socket: { remoteAddress: '127.0.0.1' } }
    });
    const logs = await listAuditLogs({ action: 'TEST_INSERT', tableName: 'test_table' });
    assert.ok(logs.length >= 1);
    assert.strictEqual(logs[0].new_values.password, '[REDACTED]');
    assert.strictEqual(logs[0].new_values.api_key, '[REDACTED]');
    assert.strictEqual(logs[0].new_values.safe, 'visible');
  });

  // ─── Rate limit ───
  await t('ratelimit: allows up to max attempts then blocks', async () => {
    const key = `${marker}:login`;
    let r = isAllowed(key, 3, 60000);
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.remaining, 2);
    r = isAllowed(key, 3, 60000);
    assert.strictEqual(r.remaining, 1);
    r = isAllowed(key, 3, 60000);
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.remaining, 0);
    r = isAllowed(key, 3, 60000);
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.remaining, 0);
  });

  await t('ratelimit: reset restores access', async () => {
    const key = `${marker}:reset`;
    isAllowed(key, 2, 60000);
    isAllowed(key, 2, 60000);
    let st = getStatus(key, 2, 60000);
    assert.strictEqual(st.allowed, false);
    resetLimit(key);
    st = getStatus(key, 2, 60000);
    assert.strictEqual(st.allowed, true);
    assert.strictEqual(st.remaining, 2);
  });

  // ─── RBAC ───
  let customRoleId;
  let adminUserId;
  await t('rbac: create role with permissions', async () => {
    const role = await createRole({
      name: `QA Role ${suffix}`,
      slug: `${marker}-role`,
      description: 'test role',
      permissionKeys: ['vehicles.view', 'bookings.view']
    });
    assert.ok(role?.id);
    customRoleId = role.id;
    assert.ok(role.permissions.includes('vehicles.view'));
  });

  await t('rbac: get role by id', async () => {
    const fetched = await getRoleById(customRoleId);
    assert.ok(fetched.permissions.includes('bookings.view'));
  });

  await t('rbac: update role permissions', async () => {
    const updated = await updateRole(customRoleId, {
      name: `QA Role Updated ${suffix}`,
      permissionKeys: ['vehicles.manage']
    });
    assert.ok(updated.permissions.includes('vehicles.manage'));
    assert.ok(!updated.permissions.includes('bookings.view'));
  });

  await t('rbac: create admin user and check permission matrix', async () => {
    const user = await createAdminUser({
      email,
      name: 'QA Admin',
      roleId: customRoleId,
      password: 'InitialPass123!',
      isActive: true
    });
    assert.ok(user?.id);
    adminUserId = user.id;
    assert.strictEqual(await hasPermission(email, 'vehicles.manage'), true);
    assert.strictEqual(await hasPermission(email, 'bookings.view'), false);
  });

  await t('rbac: super admin permissions include wildcard', async () => {
    const superUser = await createAdminUser({
      email: `super-${email}`,
      name: 'QA Super Admin',
      roleId: superAdminRole.id,
      password: 'SuperPass123!',
      isActive: true
    });
    const perms = await getAdminPermissions(superUser.email);
    assert.ok(perms.has('*'));
    await deleteAdminUser(superUser.id);
  });

  await t('rbac: update and delete admin user', async () => {
    const updated = await updateAdminUser(adminUserId, { name: 'QA Admin Updated' });
    assert.strictEqual(updated.name, 'QA Admin Updated');
    await deleteAdminUser(adminUserId);
    const deleted = await getAdminUserById(adminUserId);
    assert.strictEqual(deleted, null);
  });

  await t('rbac: delete custom role', async () => {
    await deleteRole(customRoleId);
    const gone = await getRoleById(customRoleId);
    assert.strictEqual(gone, null);
  });

  console.log(`\n🎉 Admin modules tests: ${passed}/${total} passed`);
}

try {
  await cleanup();
  await runTests();
  process.exit(passed === total ? 0 : 1);
} finally {
  await cleanup();
  const pool = getPool();
  if (pool) await pool.end();
}
