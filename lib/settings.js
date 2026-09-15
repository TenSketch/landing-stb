// Settings / configuration service
import { query } from './db.js';

const DEFAULT_BRAND = {
  name: process.env.BRAND_NAME || 'STB Singapore',
  tagline: process.env.BRAND_TAGLINE || 'Majestic Hospitality Since 2014',
  logoUrl: process.env.LOGO_URL || '/stb-logo.png',
  favicon: '/favicon.ico'
};

const DEFAULT_CONTACT = {
  phone: process.env.CONTACT_PHONE || '+65 9062 9107',
  email: process.env.CONTACT_EMAIL || '',
  whatsapp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '',
  address: 'Singapore',
  websiteUrl: process.env.SITE_URL || 'https://singaporetourbooking.com'
};

const DEFAULT_CONTENT = {
  tollsExcludedText: 'Tolls and ERP charges are excluded from the estimated fare unless otherwise stated.',
  fareDisclaimer: 'The estimated fare is based on distance and time calculations. Final fare may vary due to traffic, route changes, tolls, waiting time, or surcharges.',
  estimatedFareText: 'Estimated Transport Fare',
  bookingInstructions: 'Enter your pickup and destination, choose your vehicle, and confirm your booking.',
  cancellationText: 'Cancellations made within 24 hours of pickup may be subject to a fee.'
};

export async function getSetting(key, defaultValue = null) {
  try {
    const res = await query('SELECT value FROM system_settings WHERE key = $1', [key]);
    if (res.rows.length === 0) return defaultValue;
    return res.rows[0].value;
  } catch (err) {
    console.error('[Settings] getSetting error:', err.message);
    return defaultValue;
  }
}

export async function setSetting(key, value, actorEmail = null) {
  await query(
    `INSERT INTO system_settings (key, value, updated_at, updated_by_email)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW(), updated_by_email = EXCLUDED.updated_by_email`,
    [key, JSON.stringify(value), actorEmail]
  );
  return true;
}

export async function getBrandConfig() {
  const [brand, contact] = await Promise.all([
    getSetting('brand', DEFAULT_BRAND),
    getSetting('contact', DEFAULT_CONTACT)
  ]);
  return { brand, contact };
}

export async function getPublicBrandConfig() {
  const cfg = await getBrandConfig();
  return {
    name: cfg.brand.name,
    tagline: cfg.brand.tagline,
    logoUrl: cfg.brand.logoUrl,
    phone: cfg.contact.phone,
    email: cfg.contact.email,
    whatsapp: cfg.contact.whatsapp,
    address: cfg.contact.address,
    websiteUrl: cfg.contact.websiteUrl
  };
}

export async function getBookingConfig() {
  const keys = ['modes', 'durations', 'advance_booking', 'passenger_limits', 'customer_fields', 'cancellation', 'status_workflow'];
  const result = {};
  for (const key of keys) {
    const value = await getBookingSetting(key);
    result[key] = value;
  }
  return result;
}

export async function getBookingSetting(key, defaultValue = null) {
  try {
    const res = await query('SELECT value FROM booking_settings WHERE key = $1', [key]);
    if (res.rows.length === 0) return defaultValue;
    return res.rows[0].value;
  } catch (err) {
    console.error('[Settings] getBookingSetting error:', err.message);
    return defaultValue;
  }
}

export async function setBookingSetting(key, value, actorEmail = null) {
  await query(
    `INSERT INTO booking_settings (key, value, updated_at, updated_by_email)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW(), updated_by_email = EXCLUDED.updated_by_email`,
    [key, JSON.stringify(value), actorEmail]
  );
  return true;
}

export async function getContentConfig() {
  return await getSetting('content', DEFAULT_CONTENT);
}

export async function getCurrencyConfig() {
  return await getSetting('currency', { code: 'SGD', symbol: 'S$' });
}

export async function getTimezoneConfig() {
  return await getSetting('timezone', { name: 'Asia/Singapore' });
}

export async function getReferencePrefix() {
  const val = await getSetting('booking_reference_prefix', { value: 'STB' });
  return val?.value || 'STB';
}

export async function getCustomerRequiredFields() {
  const cfg = await getBookingSetting('customer_fields', { required: ['name', 'email', 'phone'], optional: ['whatsapp', 'flightNo', 'notes'] });
  return cfg.required || ['name', 'email', 'phone'];
}

export async function isBookingModeEnabled(mode) {
  const cfg = await getBookingSetting('modes', { oneWay: true, hourly: true, daily: true });
  if (mode === 'ONE_WAY' || mode === 'oneWay') return cfg.oneWay !== false;
  if (mode === 'HOURLY' || mode === 'hourly') return cfg.hourly !== false;
  if (mode === 'DAILY' || mode === 'daily') return cfg.daily !== false;
  return false;
}

export async function getAllSettings() {
  try {
    const [system, booking] = await Promise.all([
      query('SELECT key, value FROM system_settings'),
      query('SELECT key, value FROM booking_settings')
    ]);
    return {
      system: Object.fromEntries(system.rows.map(r => [r.key, r.value])),
      booking: Object.fromEntries(booking.rows.map(r => [r.key, r.value]))
    };
  } catch (err) {
    console.error('[Settings] getAllSettings error:', err.message);
    return { system: {}, booking: {} };
  }
}
