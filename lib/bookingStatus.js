// Booking status lifecycle service
import { query } from './db.js';
import { getBooking, updateBooking } from './store.js';
import { logAudit } from './audit.js';
import { notify, buildRoutingFromBooking } from './notifications.js';

const VALID_STATUSES = new Set([
  'PENDING', 'CONFIRMED', 'ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
]);

const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
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
  const booking = await getBooking(voucherCode);
  if (!booking) throw new Error('Booking not found');

  const previousStatus = booking.status || 'PENDING';
  if (!canTransition(previousStatus, newStatus)) {
    throw new Error(`Cannot transition booking from ${previousStatus} to ${newStatus}`);
  }

  await query(
    `UPDATE bookings SET status = $1, updated_at = NOW() WHERE voucher_code = $2`,
    [newStatus, voucherCode]
  );

  await query(
    `INSERT INTO booking_status_history (booking_id, status, previous_status, changed_by_email, changed_by_type, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [booking.id, newStatus, previousStatus, changedByEmail, changedByType, notes]
  );

  await logAudit({
    actorEmail: changedByEmail,
    actorType: changedByType,
    action: 'UPDATE',
    tableName: 'bookings',
    recordId: voucherCode,
    oldValues: { status: previousStatus },
    newValues: { status: newStatus, notes },
    req
  });

  const updated = await getBooking(voucherCode);
  await sendStatusNotification(updated, newStatus);
  return updated;
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
  const booking = await getBooking(voucherCode);
  if (!booking) throw new Error('Booking not found');

  const { driverName, driverPhone, driverPlate, driverPhotoUrl, driverId } = driverData || {};

  const patch = {
    driverName: (driverName || '').trim() || null,
    driverPhone: (driverPhone || '').trim() || null,
    driverPlate: (driverPlate || '').trim().toUpperCase() || null,
    driverPhotoUrl: (driverPhotoUrl || '').trim() || null,
    driverAssignedAt: new Date().toISOString()
  };

  const updated = await updateBooking(voucherCode, patch);
  const statusToSet = (booking.status === 'PENDING' || booking.status === 'CONFIRMED') ? 'ASSIGNED' : booking.status;
  if (statusToSet !== booking.status) {
    await updateBookingStatus(voucherCode, statusToSet, { changedByEmail, changedByType, notes: `Driver assigned: ${driverName}`, req });
  }

  await logAudit({
    actorEmail: changedByEmail,
    actorType: changedByType,
    action: 'ASSIGN_DRIVER',
    tableName: 'bookings',
    recordId: voucherCode,
    oldValues: { driverName: booking.driverName, driverPhone: booking.driverPhone },
    newValues: patch,
    req
  });

  return await getBooking(voucherCode);
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
