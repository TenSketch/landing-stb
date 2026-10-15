import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// This integration test must never point at a developer's default or production DB.
// The CI database integration suite creates a disposable database named stb_test.
if (process.env.NODE_ENV !== 'test') {
  throw new Error('booking_status.test.js requires NODE_ENV=test');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must point to a disposable PostgreSQL instance');
}
const testUrl = new URL(process.env.DATABASE_URL);
testUrl.pathname = '/stb_test';
process.env.DATABASE_URL = testUrl.toString();
process.env.STB_SECRET_KEY ||= 'test-only-secret-key-32-bytes-minimum!!';

const { query, getPool } = await import('../../lib/db.js');
const { saveBooking, getBooking } = await import('../../lib/store.js');
const { assignDriver, updateBookingStatus, getBookingStatusHistory } = await import('../../lib/bookingStatus.js');

const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
const voucherCode = `STB-TXN-${suffix}`;
const actor = { changedByEmail: 'qa-test@example.com', changedByType: 'system' };
let passed = 0;

function test(name, condition) {
  assert.ok(condition, name);
  passed++;
  console.log(`✅ ${name}`);
}

try {
  await saveBooking({
    id: voucherCode,
    voucherCode,
    passengerName: 'E2E-TEST Transaction',
    passengerEmail: '',
    passengerPhone: '',
    vehicle: '4-Seater',
    pickup: 'Test pickup',
    destination: 'Test destination',
    dateTime: new Date(Date.now() + 7 * 86400000).toISOString(),
    fare: '1.00',
    currency: 'SGD',
    pax: 1,
    bookingType: 'One Way',
    notes: 'Safe to delete transaction regression test'
  });

  const assigned = await assignDriver(voucherCode, {
    driverName: 'Transaction Test Driver',
    driverPhone: '+650000001',
    driverPlate: 'sga1234'
  }, actor);
  test('pending booking assignment commits driver and ASSIGNED status',
    assigned.status === 'ASSIGNED' &&
    assigned.driverName === 'Transaction Test Driver' &&
    assigned.driverPlate === 'SGA1234');

  const historyAfterAssign = await getBookingStatusHistory(voucherCode);
  test('assignment writes exactly one status-history transition',
    historyAfterAssign.length === 1 &&
    historyAfterAssign[0].previous_status === 'PENDING' &&
    historyAfterAssign[0].status === 'ASSIGNED');

  // Concurrent dispatch updates must serialize on the booking row and preserve a
  // complete, valid booking. The last assignment may win, but status/history cannot split.
  const concurrent = await Promise.all([
    assignDriver(voucherCode, { driverName: 'Concurrent Driver A', driverPhone: '+650000002', driverPlate: 'SGA2345' }, actor),
    assignDriver(voucherCode, { driverName: 'Concurrent Driver B', driverPhone: '+650000003', driverPlate: 'SGB3456' }, actor)
  ]);
  test('concurrent assignments serialize without corrupting status',
    concurrent.every(b => b.status === 'ASSIGNED' && b.driverName) &&
    (await getBooking(voucherCode)).status === 'ASSIGNED');
  test('reassigning an already assigned booking does not duplicate status history',
    (await getBookingStatusHistory(voucherCode)).length === 1);

  const beforeFailure = await getBooking(voucherCode);
  await assert.rejects(
    assignDriver(voucherCode, { driverName: 'D'.repeat(300), driverPhone: '+650000004', driverPlate: 'SGX1234' }, actor),
    /value too long|character varying/i
  );
  const afterFailure = await getBooking(voucherCode);
  test('failed assignment rolls back all booking changes',
    afterFailure.driverName === beforeFailure.driverName &&
    afterFailure.driverPhone === beforeFailure.driverPhone &&
    afterFailure.status === beforeFailure.status);

  const statusBeforeInvalid = await getBookingStatusHistory(voucherCode);
  await assert.rejects(
    updateBookingStatus(voucherCode, 'COMPLETED', { ...actor, notes: 'illegal transition' }),
    /Cannot transition booking/
  );
  test('illegal status transition leaves status and history unchanged',
    (await getBooking(voucherCode)).status === 'ASSIGNED' &&
    (await getBookingStatusHistory(voucherCode)).length === statusBeforeInvalid.length);

  await updateBookingStatus(voucherCode, 'CANCELLED', { ...actor, notes: 'test cleanup' });
  const cancelled = await getBooking(voucherCode);
  await assert.rejects(
    assignDriver(voucherCode, { driverName: 'Should Not Assign', driverPhone: '', driverPlate: '' }, actor),
    /Cannot assign driver while booking is CANCELLED/
  );
  test('closed booking cannot be assigned and retains its driver data',
    (await getBooking(voucherCode)).driverName === cancelled.driverName &&
    (await getBooking(voucherCode)).status === 'CANCELLED');

  const audit = await query(
    'SELECT COUNT(*)::int AS count FROM audit_logs WHERE record_id = $1 AND action = $2',
    [voucherCode, 'ASSIGN_DRIVER']
  );
  test('assignment audit events are committed', audit.rows[0].count >= 3);

  console.log(`\nBooking transaction tests: ${passed} passed`);
} finally {
  await query('DELETE FROM booking_status_history WHERE booking_id = $1', [voucherCode]).catch(() => {});
  await query('DELETE FROM audit_logs WHERE record_id = $1', [voucherCode]).catch(() => {});
  await query('DELETE FROM bookings WHERE voucher_code = $1', [voucherCode]).catch(() => {});
  const pool = getPool();
  if (pool) await pool.end();
}
