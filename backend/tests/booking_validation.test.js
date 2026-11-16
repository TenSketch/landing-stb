import assert from 'node:assert/strict';
import { parsePickupDateTimeSGT, validateBookingInquiry } from '../../lib/bookingValidation.js';

const now = new Date('2026-11-17T00:00:00.000Z');
const valid = {
  passengerName: 'Test Passenger',
  passengerEmail: 'passenger@example.com',
  passengerPhone: '+6500000000',
  pickup: 'Changi Airport',
  destination: 'Marina Bay Sands',
  bookingType: 'One Way',
  dateTime: '2026-11-20T11:00'
};

assert.equal(parsePickupDateTimeSGT('2026-11-18T08:00')?.toISOString(), '2026-11-18T00:00:00.000Z');
assert.equal(parsePickupDateTimeSGT('Wed, 18 Nov 2026 at 08:00 AM')?.toISOString(), '2026-11-18T00:00:00.000Z');
assert.equal(parsePickupDateTimeSGT('Wed, 18 Nov 2026 at 08:00 PM')?.toISOString(), '2026-11-18T12:00:00.000Z');
assert.equal(parsePickupDateTimeSGT('2026-11-18T08:00:00+08:00')?.toISOString(), '2026-11-18T00:00:00.000Z');
assert.equal(parsePickupDateTimeSGT('2026-02-30T09:00'), null);
assert.equal(parsePickupDateTimeSGT('garbage'), null);

assert.equal(validateBookingInquiry(valid, now).valid, true);
assert.equal(validateBookingInquiry({ ...valid, dateTime: '2026-11-18T08:00' }, now).valid, true);
assert.equal(validateBookingInquiry({ ...valid, dateTime: '2026-11-18T07:59' }, now).valid, false);
assert.equal(validateBookingInquiry({ ...valid, dateTime: 'yesterday' }, now).valid, false);
assert.equal(validateBookingInquiry({ ...valid, pickup: '' }, now).valid, false);
assert.equal(validateBookingInquiry({ ...valid, destination: '' }, now).valid, false);
assert.equal(validateBookingInquiry({ ...valid, passengerEmail: 'bad' }, now).valid, false);
assert.equal(validateBookingInquiry({ ...valid, passengerPhone: '123' }, now).valid, false);
assert.equal(validateBookingInquiry({ ...valid, bookingType: 'Hourly Chauffeur', destination: '' }, now).valid, true);
assert.equal(validateBookingInquiry({ ...valid, bookingType: 'Daily Tour Charter', destination: '' }, now).valid, true);
assert.equal(validateBookingInquiry(null, now).valid, false);

console.log('booking_validation: passed');
