// Backend unit/integration tests for customer auth, booking store, and shared handlers.
// Runs against disposable stb_test DB.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ path: ['/root/landing-stb/.env.local', '/root/landing-stb/.env'] });

if (process.env.NODE_ENV !== 'test') {
  throw new Error('customer_modules.test.js requires NODE_ENV=test');
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
const marker = `qa-customer-${suffix}`;
const email = `${marker}@example.com`;
const password = 'InitialPass123!';

const { query, getPool } = await import('../../lib/db.js');
const {
  registerCustomer, loginCustomer, requestPasswordReset, resetPassword,
  changePassword, saveCustomerDeviceToken, removeCustomerDeviceToken,
  getCustomerDeviceTokens
} = await import('../../lib/customerAuth.js');
const { saveBooking, getBooking, updateBooking, listAllBookings } = await import('../../lib/store.js');
const { handleCreateBooking, handleEstimateFare, handleGetAssign, handlePostAssign } = await import('../../lib/handlers.js');

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
}

async function runTests() {
  // ─── Customer auth ───
  let customerId;
  await t('customer: register creates account', async () => {
    const reg = await registerCustomer({ email, password, name: 'QA Customer', phone: '+650****0000' });
    assert.ok(reg?.public?.id);
    customerId = reg.public.id;
    assert.strictEqual(reg.public.email, email);
  });

  await t('customer: login rejects wrong password', async () => {
    await assert.rejects(loginCustomer(email, 'wrong-password'), /Invalid email or password/);
  });

  await t('customer: login with correct password succeeds', async () => {
    const login = await loginCustomer(email, password);
    assert.ok(login?.sessionToken);
    assert.strictEqual(login.public.email, email);
  });

  let rawToken;
  await t('customer: request password reset creates token', async () => {
    const res = await requestPasswordReset(email);
    assert.strictEqual(res.success, true);
    assert.ok(res.rawToken);
    rawToken = res.rawToken;
  });

  await t('customer: reset password with invalid token fails', async () => {
    await assert.rejects(resetPassword('invalid-token', 'NewPass123!'), /Invalid or expired reset token/);
  });

  await t('customer: reset password with valid token changes password', async () => {
    const res = await resetPassword(rawToken, 'NewPass123!');
    assert.strictEqual(res.success, true);
    await assert.rejects(loginCustomer(email, password), /Invalid email or password/);
    const login = await loginCustomer(email, 'NewPass123!');
    assert.ok(login?.sessionToken);
  });

  await t('customer: change password fails with wrong old password', async () => {
    await assert.rejects(changePassword(customerId, 'wrong-old', 'AnotherPass123!'), /Current password is incorrect/);
  });

  await t('customer: change password succeeds with correct old password', async () => {
    const res = await changePassword(customerId, 'NewPass123!', 'FinalPass123!');
    assert.strictEqual(res.success, true);
    const login = await loginCustomer(email, 'FinalPass123!');
    assert.ok(login?.sessionToken);
  });

  await t('customer: device token lifecycle', async () => {
    await saveCustomerDeviceToken(customerId, 'token-a', 'fcm', 'qa-agent');
    await saveCustomerDeviceToken(customerId, 'token-b', 'fcm', 'qa-agent');
    let tokens = await getCustomerDeviceTokens(customerId);
    assert.strictEqual(tokens.length, 2);
    await removeCustomerDeviceToken(customerId, 'token-a');
    tokens = await getCustomerDeviceTokens(customerId);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0], 'token-b');
  });

  // ─── Store / bookings ───
  let voucherCode;
  await t('store: save and retrieve booking', async () => {
    voucherCode = `STB-QA-${suffix.toUpperCase()}`;
    await saveBooking({
      id: voucherCode,
      voucherCode,
      passengerName: `QA Customer ${suffix}`,
      passengerEmail: email,
      passengerPhone: '+650****0000',
      vehicle: '4-Seater',
      pickup: 'Changi Airport',
      destination: 'Marina Bay Sands',
      dateTime: new Date(Date.now() + 7 * 86400000).toISOString(),
      fare: '62.00',
      currency: 'SGD',
      pax: '2',
      bookingType: 'One Way',
      notes: 'QA store test'
    });
    const fetched = await getBooking(voucherCode);
    assert.ok(fetched);
    assert.strictEqual(fetched.passengerEmail, email);
    assert.strictEqual(fetched.vehicle, '4-Seater');
  });

  await t('store: update booking driver fields', async () => {
    const updated = await updateBooking(voucherCode, {
      driverName: 'QA Driver',
      driverPhone: '+650****9999',
      driverPlate: 'SGA9999A'
    });
    assert.strictEqual(updated.driverName, 'QA Driver');
    assert.strictEqual(updated.driverPlate, 'SGA9999A');
    const fetched = await getBooking(voucherCode);
    assert.strictEqual(fetched.driverName, 'QA Driver');
  });

  await t('store: list all bookings includes created booking', async () => {
    const all = await listAllBookings();
    assert.ok(all.some(b => b.voucherCode === voucherCode));
  });

  // ─── Handlers ───
  await t('handlers: estimate rejects missing origin/destination', async () => {
    const res = await handleEstimateFare({ bookingType: 'One Way' }, '');
    assert.strictEqual(res.status, 400);
  });

  await t('handlers: estimate falls back to coordinate distance without Maps key', async () => {
    const res = await handleEstimateFare({
      bookingType: 'One Way',
      origin: { name: 'Changi Airport', lat: 1.3644, lng: 103.9915 },
      destination: { name: 'Marina Bay Sands', lat: 1.2834, lng: 103.8607 }
    }, '');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.distanceSource, 'approx');
    assert.ok(res.body.fares?.['4-Seater'] > 0);
  });

  await t('handlers: assign page returns 404 for missing voucher', async () => {
    const res = await handleGetAssign('STB-MISSING-999999');
    assert.strictEqual(res.status, 404);
    assert.ok(res.html.includes('not found') || res.html.includes('Not Found'));
  });

  await t('handlers: post assign updates driver and renders page', async () => {
    const res = await handlePostAssign(voucherCode, {
      driverName: 'QA Handler Driver',
      driverPhone: '+650****8888',
      driverPlate: 'SGA8888A'
    }, 'https://qa.example.com');
    assert.strictEqual(res.status, 200);
    assert.ok(res.html.includes('QA Handler Driver'));
    assert.ok(res.html.includes('SGA8888A'));
    const booking = await getBooking(voucherCode);
    assert.strictEqual(booking.driverName, 'QA Handler Driver');
  });

  await t('handlers: create booking rejects missing fields', async () => {
    const res = await handleCreateBooking({ passengerName: 'X' }, 'https://qa.example.com');
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  await t('handlers: create booking returns success and voucher', async () => {
    const res = await handleCreateBooking({
      passengerName: `QA Handler ${suffix}`,
      passengerEmail: email,
      passengerPhone: '+650****7777',
      vehicle: '4-Seater',
      pickup: 'Changi Airport',
      destination: 'Marina Bay Sands',
      dateTime: new Date(Date.now() + 7 * 86400000).toISOString(),
      bookingType: 'One Way',
      pax: '2',
      distanceKm: 20
    }, 'https://qa.example.com');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.booking?.voucherCode);
    assert.ok(res.body.whatsappUrl?.includes('wa.me'));
  });

  console.log(`\n🎉 Customer modules tests: ${passed}/${total} passed`);
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
