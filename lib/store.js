// PostgreSQL Storage for STB Bookings & Driver Dispatches
import { query } from './db.js';

export async function saveBooking(booking) {
  const sql = `
    INSERT INTO bookings (
      id, voucher_code, passenger_name, passenger_email, passenger_phone,
      vehicle, pickup, destination, date_time, flight_no, fare,
      currency, payment_method, pax, booking_type, notes,
      pickup_place_id, pickup_coords, dest_place_id, dest_coords, distance_km,
      driver_name, driver_phone, driver_plate, driver_photo_url,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21,
      $22, $23, $24, $25,
      NOW()
    )
    ON CONFLICT (voucher_code) DO UPDATE
    SET passenger_name = EXCLUDED.passenger_name,
        passenger_email = EXCLUDED.passenger_email,
        passenger_phone = EXCLUDED.passenger_phone,
        fare = EXCLUDED.fare,
        driver_name = EXCLUDED.driver_name,
        driver_phone = EXCLUDED.driver_phone,
        driver_plate = EXCLUDED.driver_plate,
        driver_photo_url = EXCLUDED.driver_photo_url
    RETURNING *
  `;

  const params = [
    booking.id || booking.voucherCode,
    booking.voucherCode,
    booking.passengerName,
    booking.passengerEmail,
    booking.passengerPhone,
    booking.vehicle || null,
    booking.pickup,
    booking.destination || null,
    booking.dateTime || null,
    booking.flightNo || null,
    booking.fare || null,
    booking.currency || 'SGD',
    booking.paymentMethod || 'Pay After Service',
    booking.pax || null,
    booking.bookingType || null,
    booking.notes || null,
    booking.pickupPlaceId || null,
    booking.pickupCoords ? JSON.stringify(booking.pickupCoords) : null,
    booking.destPlaceId || null,
    booking.destCoords ? JSON.stringify(booking.destCoords) : null,
    booking.distanceKm ? Number(booking.distanceKm) : null,
    booking.driverName || null,
    booking.driverPhone || null,
    booking.driverPlate || null,
    booking.driverPhotoUrl || null
  ];

  await query(sql, params);
  return booking;
}

export async function getBooking(voucherCode) {
  const res = await query(`SELECT * FROM bookings WHERE voucher_code = $1`, [voucherCode]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  return {
    id: row.id,
    voucherCode: row.voucher_code,
    passengerName: row.passenger_name,
    passengerEmail: row.passenger_email,
    passengerPhone: row.passenger_phone,
    vehicle: row.vehicle,
    pickup: row.pickup,
    destination: row.destination,
    dateTime: row.date_time,
    flightNo: row.flight_no,
    fare: row.fare,
    currency: row.currency,
    paymentMethod: row.payment_method,
    pax: row.pax,
    bookingType: row.booking_type,
    notes: row.notes,
    pickupPlaceId: row.pickup_place_id,
    pickupCoords: row.pickup_coords,
    destPlaceId: row.dest_place_id,
    destCoords: row.dest_coords,
    distanceKm: row.distance_km ? parseFloat(row.distance_km) : null,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    driverPlate: row.driver_plate,
    driverPhotoUrl: row.driver_photo_url,
    driverAssignedAt: row.driver_assigned_at,
    reminderSentAt: row.reminder_sent_at,
    createdAt: row.created_at
  };
}

export async function updateBooking(voucherCode, patch) {
  const existing = await getBooking(voucherCode);
  if (!existing) return null;

  const merged = { ...existing, ...patch };

  const fields = [];
  const vals = [];
  if ('driverName' in patch)       { vals.push(merged.driverName);        fields.push(`driver_name        = $${vals.length}`); }
  if ('driverPhone' in patch)       { vals.push(merged.driverPhone);       fields.push(`driver_phone       = $${vals.length}`); }
  if ('driverPlate' in patch)       { vals.push(merged.driverPlate);       fields.push(`driver_plate       = $${vals.length}`); }
  if ('driverPhotoUrl' in patch)    { vals.push(merged.driverPhotoUrl);    fields.push(`driver_photo_url   = $${vals.length}`); }
  if ('driverAssignedAt' in patch)  { vals.push(merged.driverAssignedAt);   fields.push(`driver_assigned_at = $${vals.length}`); }
  if ('reminderSentAt' in patch)    { vals.push(merged.reminderSentAt);    fields.push(`reminder_sent_at   = $${vals.length}`); }
  if ('reminderMessageId' in patch) { vals.push(merged.reminderMessageId);  fields.push(`reminder_message_id = $${vals.length}`); }

  if (fields.length === 0) return merged;

  vals.push(voucherCode);
  const sql = `UPDATE bookings SET ${fields.join(', ')} WHERE voucher_code = $${vals.length} RETURNING *`;
  await query(sql, vals);

  return merged;
}

export async function listAllBookings() {
  const res = await query(`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100`);
  return res.rows.map(row => ({
    id: row.id,
    voucherCode: row.voucher_code,
    passengerName: row.passenger_name,
    passengerEmail: row.passenger_email,
    passengerPhone: row.passenger_phone,
    vehicle: row.vehicle,
    pickup: row.pickup,
    destination: row.destination,
    dateTime: row.date_time,
    flightNo: row.flight_no,
    fare: row.fare,
    driverName: row.driver_name,
    driverPlate: row.driver_plate,
    created_at: row.created_at
  }));
}

export const storageMode = 'postgresql';
