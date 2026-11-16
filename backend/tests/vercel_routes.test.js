import assert from 'node:assert/strict';

// Vercel serverless route regression tests (review findings on PR #6):
//  - P1: api/bookings.js must forward the Idempotency-Key header to
//        handleCreateBooking, otherwise retries on Vercel create duplicates.
//  - P2: api/config.js must return the browser-safe Maps key selector and
//        never the server-only key.
//
// Disposable-database contract matches booking_status.test.js.
if (process.env.NODE_ENV !== 'test') {
  throw new Error('vercel_routes.test.js requires NODE_ENV=test');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must point to a disposable PostgreSQL instance');
}
const testUrl = new URL(process.env.DATABASE_URL);
testUrl.pathname = '/stb_test';
process.env.DATABASE_URL = testUrl.toString();
process.env.STB_SECRET_KEY ||= 'test-only-secret-key-32-bytes-minimum!!';

const { query, getPool } = await import('../../lib/db.js');

function mockRes() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

let passed = 0;
function test(name, condition) {
  assert.ok(condition, name);
  passed++;
  console.log(`✅ ${name}`);
}

const createdVouchers = [];

try {
  // ---------- api/config.js: browser-safe Maps key only ----------
  process.env.GOOGLE_MAPS_BROWSER_API_KEY = 'qa-browser-key-safe';
  process.env.GOOGLE_MAPS_API_KEY = 'qa-server-secret-key';
  const { default: configHandler } = await import('../../api/config.js');

  const getConfig = mockRes();
  await configHandler({ method: 'GET', headers: {} }, getConfig);
  test('config route returns 200', getConfig.statusCode === 200);
  test('config route returns the browser key selector value',
    getConfig.body && getConfig.body.googleMapsApiKey === 'qa-browser-key-safe');
  test('config response never contains the server-only key',
    !JSON.stringify(getConfig.body).includes('qa-server-secret-key'));
  test('config route sets a cache-control header', Boolean(getConfig.headers['Cache-Control']));

  // Legacy-only environment: server key must not leak through the fallback.
  delete process.env.GOOGLE_MAPS_BROWSER_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const legacyConfig = mockRes();
  await configHandler({ method: 'GET', headers: {} }, legacyConfig);
  test('legacy server key is not exposed when no browser key is configured',
    legacyConfig.body.googleMapsApiKey === '' &&
    !JSON.stringify(legacyConfig.body).includes('qa-server-secret-key'));

  const badMethod = mockRes();
  await configHandler({ method: 'POST', headers: {} }, badMethod);
  test('config route rejects non-GET methods', badMethod.statusCode === 405);

  // ---------- api/bookings.js: idempotency key forwarding ----------
  const { default: bookingsHandler } = await import('../../api/bookings.js');
  const key = `qa-vercel-${Date.now()}`;
  const payload = {
    passengerName: 'QA-VERCEL-TEST',
    passengerEmail: 'qa-vercel-test@example.com',
    passengerPhone: '+650****0007',
    vehicle: '4-Seater',
    pickup: 'QA test pickup',
    destination: 'QA test destination',
    dateTime: new Date(Date.now() + 7 * 86400000).toISOString(),
    bookingType: 'One Way',
    pax: '1-3 Passengers'
  };
  const makeReq = (body, headers = {}) => ({
    method: 'POST',
    headers: { host: 'qa-test.local', 'x-forwarded-proto': 'https', 'idempotency-key': key, ...headers },
    body
  });

  const first = mockRes();
  await bookingsHandler(makeReq(payload), first);
  test('first booking with key returns 200', first.statusCode === 200);
  test('first booking reports success and a voucher',
    Boolean(first.body && first.body.success && first.body.booking && first.body.booking.voucherCode));
  const voucher = first.body?.booking?.voucherCode;
  if (voucher) createdVouchers.push(voucher);

  const replay = mockRes();
  await bookingsHandler(makeReq(payload), replay);
  test('same key + same payload replays the original response',
    replay.statusCode === 200 && replay.body?.booking?.voucherCode === voucher);

  const conflict = mockRes();
  await bookingsHandler(makeReq({ ...payload, passengerName: 'QA-VERCEL-OTHER' }), conflict);
  test('same key + different payload returns 409 conflict', conflict.statusCode === 409);

  const invalidKey = mockRes();
  await bookingsHandler(makeReq(payload, { 'idempotency-key': 'bad key!' }), invalidKey);
  test('malformed idempotency key returns 400', invalidKey.statusCode === 400);

  const noKeyReq = { method: 'POST', headers: { host: 'qa-test.local' }, body: payload };
  const keyless = mockRes();
  await bookingsHandler(noKeyReq, keyless);
  test('keyless booking still works (key stays optional for old clients)',
    keyless.statusCode === 200 && Boolean(keyless.body?.booking?.voucherCode));
  if (keyless.body?.booking?.voucherCode) createdVouchers.push(keyless.body.booking.voucherCode);

  const wrongMethod = mockRes();
  await bookingsHandler({ method: 'GET', headers: {} }, wrongMethod);
  test('bookings route rejects non-POST methods', wrongMethod.statusCode === 405);

  // Persistence proof: the replayed key produced exactly one booking row.
  const rows = await query('SELECT COUNT(*)::int AS n FROM bookings WHERE voucher_code = $1', [voucher]);
  test('replay did not create a duplicate booking row', rows.rows[0].n === 1);
} finally {
  // Cleanup: purge this test's bookings and idempotency rows.
  for (const v of createdVouchers) {
    await query('DELETE FROM bookings WHERE voucher_code = $1', [v]);
    await query('DELETE FROM booking_idempotency WHERE voucher_code = $1', [v]);
  }
  await query("DELETE FROM bookings WHERE passenger_email = 'qa-vercel-test@example.com'");
  await query(`DELETE FROM booking_idempotency WHERE key_hash IN (
    SELECT key_hash FROM booking_idempotency WHERE response_body::text LIKE '%QA-VERCEL-TEST%'
  )`);
  await getPool().end();
}

console.log(`Vercel route tests: ${passed} assertions passed`);
