// Backend unit tests for admin auth, RBAC, customer auth, dynamic settings, security boundaries
import assert from 'assert';
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: ['.env.local', '.env'] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB_NAME = 'stb_test';
const baseDatabaseUrl = new URL(process.env.DATABASE_URL || 'postgresql://postgres:***@localhost:5432/stb_dev');
baseDatabaseUrl.pathname = '/' + TEST_DB_NAME;
const TEST_DATABASE_URL = baseDatabaseUrl.toString();

async function withTestDb(fn) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL, ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function resetTestDb() {
  const baseClient = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false });
  await baseClient.connect();
  await baseClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
  await baseClient.query(`CREATE DATABASE ${TEST_DB_NAME}`);
  await baseClient.end();

  const client = new pg.Client({ connectionString: TEST_DATABASE_URL, ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false });
  await client.connect();
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.query(sql);
  }
  // Seed bootstrap admin user so first-time setup tests can run
  await client.query(
    `INSERT INTO admin_users (email, is_active) VALUES ($1, TRUE) ON CONFLICT (email) DO NOTHING`,
    [(process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase()]
  );
  await client.end();
}

function mockReq() {
  return { headers: { 'user-agent': 'test-agent' }, socket: { remoteAddress: '127.0.0.1' } };
}

async function runTests() {
  console.log('🧪 Resetting test database and running migrations...');
  await resetTestDb();
  console.log('✅ Test DB ready\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    return async () => {
      total++;
      try {
        await fn();
        console.log(`✅ ${name}`);
        passed++;
      } catch (err) {
        console.error(`❌ ${name}:`, err.message);
      }
    };
  }

  // Security tests
  const { hashPassword, verifyPassword, generateSecureToken, hashToken, generateNumericOtp } = await import('../../lib/security.js');
  await test('Password hashing and verification', async () => {
    const hash = await hashPassword('TestPass123!');
    assert.ok(hash.startsWith('$stb-scrypt$'));
    assert.strictEqual(await verifyPassword('TestPass123!', hash), true);
    assert.strictEqual(await verifyPassword('WrongPass', hash), false);
  })();

  await test('Token generation and hashing', async () => {
    const token = generateSecureToken(32);
    assert.strictEqual(token.length, 64);
    const hashed = hashToken(token);
    assert.strictEqual(hashed.length, 64);
    assert.notStrictEqual(token, hashed);
  })();

  await test('Numeric OTP generation', async () => {
    const otp = generateNumericOtp(6);
    assert.match(otp, /^\d{6}$/);
  })();

  // Admin auth tests
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { setupInitialAdminPassword, loginAdmin } = await import('../../lib/auth.js');

  await test('Admin first-time setup and login', async () => {
    await withTestDb(async () => {
      const setup = await setupInitialAdminPassword('admin@example.com', 'AdminPass123!');
      assert.strictEqual(setup.success, true);
      const login = await loginAdmin('admin@example.com', 'AdminPass123!', mockReq());
      assert.strictEqual(login.success, true);
      assert.ok(login.sessionToken);
    });
  })();

  await test('Invalid admin password rejected', async () => {
    await withTestDb(async () => {
      await assert.rejects(loginAdmin('admin@example.com', 'wrongpass', mockReq()), /Invalid email or password/);
    });
  })();

  // RBAC tests
  const { hasPermission, getAdminPermissions } = await import('../../lib/rbac.js');

  await test('Super admin has all permissions', async () => {
    await withTestDb(async () => {
      const perms = await getAdminPermissions('admin@example.com');
      assert.ok(perms.has('*'));
      assert.ok(await hasPermission('admin@example.com', 'bookings.view'));
      assert.ok(await hasPermission('admin@example.com', 'settings.manage'));
    });
  })();

  // Customer auth tests
  const { registerCustomer, loginCustomer, getCustomerBySession } = await import('../../lib/customerAuth.js');

  await test('Customer registration and session', async () => {
    await withTestDb(async () => {
      const reg = await registerCustomer({ name: 'Test', email: 'cust1@example.com', phone: '+659****0000', password: 'TestPass123' }, mockReq());
      assert.ok(reg.public.id);
      assert.strictEqual(reg.public.email, 'cust1@example.com');
      assert.ok(reg.sessionToken);
      const session = await getCustomerBySession(reg.sessionToken);
      assert.strictEqual(session.email, 'cust1@example.com');
    });
  })();

  await test('Customer login creates session', async () => {
    await withTestDb(async () => {
      await registerCustomer({ name: 'Test', email: 'cust2@example.com', phone: '+659****0000', password: 'TestPass123' }, mockReq());
      const login = await loginCustomer('cust2@example.com', 'TestPass123', mockReq());
      assert.ok(login.sessionToken);
      assert.strictEqual(login.public.email, 'cust2@example.com');
    });
  })();

  // Dynamic settings tests
  const { getSetting, setSetting, getPublicBrandConfig } = await import('../../lib/settings.js');

  await test('Settings default and override', async () => {
    await withTestDb(async () => {
      const val = await getSetting('brand.name', 'Default');
      assert.strictEqual(typeof val, 'string');
      await setSetting('brand.name', 'Test Brand', 'tester@example.com');
      const updated = await getSetting('brand.name', 'Default');
      assert.strictEqual(updated, 'Test Brand');
    });
  })();

  await test('Public brand config does not expose secrets', async () => {
    await withTestDb(async () => {
      const brand = await getPublicBrandConfig();
      assert.ok(brand.name);
      assert.strictEqual(brand.stbSecretKey, undefined);
    });
  })();

  console.log(`\n🎉 Summary: ${passed}/${total} backend unit tests passed`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
