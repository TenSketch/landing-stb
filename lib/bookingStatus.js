// Booking status lifecycle service
import { query, withTransaction } from './db.js';
import { getBooking, updateBooking } from './store.js';
import { logAudit } from './audit.js';
import { notify, buildRoutingFromBooking } from './notifications.js';

const VALID_STATUSES = new Set([
  'PENDING', 'CONFIRMED', 'ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
]);

const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'ASSIGNED', 'CANCELLED'],
  CONFIRMED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['DRIVER_EN_ROUTE', 'CANCELLED'],
  DRIVER_EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: []
};

export function isValidStatus(status) {
  return VALID_STATUSES.has(status);
}

export function canTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) return false;
  if (from === to) return true;
  const allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export async function updateBookingStatus(voucherCode, newStatus, { changedByEmail, changedByType = 'system', notes = null, req = null }) {
  const result = await withTransaction(async (client) => {
    const lockRes = await query(
      'SELECT id FROM bookings WHERE voucher_code = $1 FOR UPDATE',
      [voucherCode],
      client
    );
    if (!lockRes.rows.length) throw new Error('Booking not found');

    const booking = await getBooking(voucherCode, client);
    const previousStatus = booking.status || 'PENDING';
    if (!canTransition(previousStatus, newStatus)) {
      throw new Error(`Cannot transition booking from ${previousStatus} to ${newStatus}`);
    }
    if (previousStatus === newStatus) return { booking, changed: false };

    await query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE voucher_code = $2',
      [newStatus, voucherCode],
      client
    );
    await query(
      `INSERT INTO booking_status_history (booking_id, status, previous_status, changed_by_email, changed_by_type, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [booking.id, newStatus, previousStatus, changedByEmail, changedByType, notes],
      client
    );
    await logAudit({
      actorEmail: changedByEmail,
      actorType: changedByType,
      action: 'UPDATE',
      tableName: 'bookings',
      recordId: voucherCode,
      oldValues: { status: previousStatus },
      newValues: { status: newStatus, notes },
      req,
      client
    });

    return { booking: await getBooking(voucherCode, client), changed: true };
  });

  if (result.changed) await sendStatusNotification(result.booking, newStatus);
  return result.booking;
}

async function sendStatusNotification(booking, status) {
  const routing = buildRoutingFromBooking(booking, null);
  if (!routing.email && !routing.whatsapp) return;

  const eventMap = {
    CONFIRMED: 'booking_confirmed',
    ASSIGNED: 'driver_assigned',
    DRIVER_EN_ROUTE: 'driver_en_route',
    ARRIVED: 'driver_arrived',
    IN_PROGRESS: 'trip_started',
    COMPLETED: 'trip_completed',
    CANCELLED: 'booking_cancelled'
  };

  const event = eventMap[status];
  if (!event) return;

  try {
    await notify(event, booking, routing);
  } catch (err) {
    console.error('[BookingStatus] notification failed:', err.message);
  }
}

export async function assignDriver(voucherCode, driverData, { changedByEmail, changedByType = 'system', req = null }) {
  const { driverId, driverName, driverPhone, driverPlate, driverPhotoUrl } = driverData || {};
  const patch = {
    driverName: (driverName || '').trim() || null,
    driverPhone: (driverPhone || '').trim() || null,
    driverPlate: (driverPlate || '').trim().toUpperCase() || null,
    driverPhotoUrl: (driverPhotoUrl || '').trim() || null,
    driverAssignedAt: new Date().toISOString()
  };

  const result = await withTransaction(async (client) => {
    const lockRes = await query(
      'SELECT id FROM bookings WHERE voucher_code = $1 FOR UPDATE',
      [voucherCode],
      client
    );
    if (!lockRes.rows.length) throw new Error('Booking not found');

    // Read the locked row through the same connection so status decisions cannot
    // race with another dispatcher or status transition.
    const booking = await getBooking(voucherCode, client);

    // Authoritative driver re-validation on the same transaction (PR #9 review P2):
    // FOR SHARE blocks a concurrent driver deactivation until this assignment
    // commits, so an inactive driver can never be assigned by a racing request.
    if (driverId) {
      const driverRes = await query(
        'SELECT name, phone, plate_number, photo_url, is_active FROM drivers WHERE id = $1 FOR SHARE',
        [driverId],
        client
      );
      const activeDriver = driverRes.rows[0];
      if (!activeDriver || activeDriver.is_active !== true) {
        throw new Error('The selected driver is unavailable. Refresh the list and choose an active driver.');
      }
      patch.driverName = activeDriver.name;
      patch.driverPhone = activeDriver.phone;
      patch.driverPlate = (activeDriver.plate_number || '').toUpperCase() || null;
      patch.driverPhotoUrl = activeDriver.photo_url || null;
    }

    const previousStatus = booking.status || 'PENDING';
    if (!['PENDING', 'CONFIRMED', 'ASSIGNED'].includes(previousStatus)) {
      throw new Error(`Cannot assign driver while booking is ${previousStatus}`);
    }
    const statusToSet = (previousStatus === 'PENDING' || previousStatus === 'CONFIRMED')
      ? 'ASSIGNED'
      : previousStatus;

    if (!canTransition(previousStatus, statusToSet)) {
      throw new Error(`Cannot assign driver while booking is ${previousStatus}`);
    }

    await updateBooking(voucherCode, patch, client);

    if (statusToSet !== previousStatus) {
      await query(
        'UPDATE bookings SET status = $1, updated_at = NOW() WHERE voucher_code = $2',
        [statusToSet, voucherCode],
        client
      );
      await query(
        `INSERT INTO booking_status_history (booking_id, status, previous_status, changed_by_email, changed_by_type, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [booking.id, statusToSet, previousStatus, changedByEmail, changedByType, `Driver assigned: ${patch.driverName || 'unassigned'}`],
        client
      );
      await logAudit({
        actorEmail: changedByEmail,
        actorType: changedByType,
        action: 'UPDATE',
        tableName: 'bookings',
        recordId: voucherCode,
        oldValues: { status: previousStatus },
        newValues: { status: statusToSet },
        req,
        client
      });
    }

    await logAudit({
      actorEmail: changedByEmail,
      actorType: changedByType,
      action: 'ASSIGN_DRIVER',
      tableName: 'bookings',
      recordId: voucherCode,
      oldValues: { driverName: booking.driverName, driverPhone: booking.driverPhone, driverPlate: booking.driverPlate },
      newValues: patch,
      req,
      client
    });

    return {
      booking: await getBooking(voucherCode, client),
      changed: statusToSet !== previousStatus,
      status: statusToSet
    };
  });

  // Send notifications only after the transaction commits; never announce a
  // status change that could still roll back.
  if (result.changed) await sendStatusNotification(result.booking, result.status);
  return result.booking;
}

export async function getBookingStatusHistory(voucherCode) {
  const res = await query(
    `SELECT id, status, previous_status, changed_by_email, changed_by_type, notes, created_at
     FROM booking_status_history
     WHERE booking_id = (SELECT id FROM bookings WHERE voucher_code = $1)
     ORDER BY created_at DESC`,
    [voucherCode]
  );
  return res.rows;
}
