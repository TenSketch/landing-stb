// Server-side validation for the existing STB booking inquiry flow.
// Browser validation is a convenience; it must not be the only booking gate.
const DAY_MS = 24 * 60 * 60 * 1000;
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function singaporeLocalDate(year, month, day, hour, minute) {
  if (![year, month, day, hour, minute].every(Number.isInteger)) return null;
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1 ||
      local.getUTCDate() !== day || local.getUTCHours() !== hour ||
      local.getUTCMinutes() !== minute) return null;
  return new Date(local.getTime() - SGT_OFFSET_MS);
}

export function parsePickupDateTimeSGT(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 100) return null;
  const raw = value.trim();
  // API/automation clients: local Singapore wall-clock timestamp.
  const isoLocal = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/);
  if (isoLocal) {
    return singaporeLocalDate(...isoLocal.slice(1, 6).map(Number));
  }
  // ISO timestamp with explicit Z or an offset.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  // Existing website: "Tue, 17 Nov 2026 at 08:30 PM".
  const display = raw.match(/^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!display) return null;
  const [, day, monthText, year, hourText, minuteText, period] = display;
  const month = MONTHS.indexOf(monthText.toLowerCase()) + 1;
  const hour12 = Number(hourText);
  const minute = Number(minuteText);
  if (!month || hour12 < 1 || hour12 > 12 || minute > 59) return null;
  const hour = (hour12 % 12) + (period.toUpperCase() === 'PM' ? 12 : 0);
  return singaporeLocalDate(Number(year), month, Number(day), hour, minute);
}

export function validateBookingInquiry(payload, now = new Date()) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'A valid booking request is required.' };
  }
  const { passengerName, passengerEmail, passengerPhone, pickup, destination, dateTime, bookingType } = payload;
  const isText = (value, min, max) => typeof value === 'string' &&
    value.trim().length >= min && value.trim().length <= max;

  if (!isText(passengerName, 1, 120)) return { valid: false, error: 'Please enter your name.' };
  if (!isText(passengerEmail, 3, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passengerEmail.trim())) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  if (!isText(passengerPhone, 7, 40)) {
    return { valid: false, error: 'Please enter a valid contact or WhatsApp number.' };
  }
  if (!isText(pickup, 2, 300)) return { valid: false, error: 'Please enter a pickup location.' };

  const mode = typeof bookingType === 'string' ? bookingType.toLowerCase() : 'one way';
  const isCharter = mode.includes('hour') || mode.includes('day') || mode.includes('tour');
  if (!isCharter && !isText(destination, 2, 300)) {
    return { valid: false, error: 'Please enter a destination.' };
  }

  const pickupTime = parsePickupDateTimeSGT(dateTime);
  if (!pickupTime) return { valid: false, error: 'Please select a valid pickup date and time.' };
  if (pickupTime.getTime() - now.getTime() < DAY_MS) {
    return { valid: false, error: 'Pickup must be at least 24 hours from now (Singapore time).' };
  }
  return { valid: true, pickupTime };
}
