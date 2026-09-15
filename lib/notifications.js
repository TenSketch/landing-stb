// Central notification engine
import { query } from './db.js';
import { decryptSecret } from './security.js';
import { EmailProvider } from './providers/email.js';
import { SmsProvider } from './providers/sms.js';
import { WhatsAppProvider } from './providers/whatsapp.js';
import { FirebaseProvider } from './providers/firebase.js';

const providerInstances = {
  email: null,
  sms: null,
  whatsapp: null,
  push: null
};

const EVENT_NAMES = new Set([
  'booking_created',
  'booking_confirmed',
  'booking_cancelled',
  'driver_assigned',
  'driver_en_route',
  'driver_arrived',
  'trip_started',
  'trip_completed',
  'reminder',
  'payment_success',
  'payment_failure'
]);

function substituteTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

async function loadIntegrationSettings(type) {
  const res = await query(
    `SELECT provider_key, enabled, mode, config, secrets_encrypted
     FROM integration_settings
     WHERE provider_type = $1 AND enabled = TRUE
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [type]
  );
  return res.rows[0] || null;
}

function buildConfig(row) {
  const config = { ...row.config, providerKey: row.provider_key, enabled: row.enabled, mode: row.mode };
  if (row.secrets_encrypted) {
    try {
      const decrypted = JSON.parse(decryptSecret(row.secrets_encrypted));
      Object.assign(config, decrypted);
    } catch (err) {
      console.error('[NotificationEngine] failed to decrypt secrets:', err.message);
    }
  }
  return config;
}

export async function refreshProviders() {
  const [emailRow, smsRow, whatsappRow, firebaseRow] = await Promise.all([
    loadIntegrationSettings('EMAIL'),
    loadIntegrationSettings('SMS'),
    loadIntegrationSettings('WHATSAPP'),
    loadIntegrationSettings('FIREBASE')
  ]);

  providerInstances.email = emailRow ? new EmailProvider(buildConfig(emailRow)) : new EmailProvider();
  providerInstances.sms = smsRow ? new SmsProvider(buildConfig(smsRow)) : new SmsProvider();
  providerInstances.whatsapp = whatsappRow ? new WhatsAppProvider(buildConfig(whatsappRow)) : new WhatsAppProvider();
  providerInstances.push = firebaseRow ? new FirebaseProvider(buildConfig(firebaseRow)) : new FirebaseProvider();
}

export function getProvider(channel) {
  return providerInstances[channel] || null;
}

async function getTemplates(event, channel) {
  const res = await query(
    `SELECT channel, event, name, subject, body
     FROM notification_templates
     WHERE event = $1 AND channel = $2 AND is_active = TRUE`,
    [event, channel]
  );
  return res.rows;
}

async function isChannelEnabled(channel) {
  const res = await query('SELECT enabled FROM notification_settings WHERE channel = $1', [channel]);
  return res.rows.length === 0 || res.rows[0].enabled === true;
}

/**
 * Send notifications for an event.
 * @param {string} event - one of EVENT_NAMES
 * @param {Object} data - variables for templates
 * @param {Object} routing - { email: '...', sms: '...', whatsapp: '...', pushTokens: [...] }
 * @returns {Object} results per channel
 */
export async function notify(event, data, routing = {}) {
  if (!EVENT_NAMES.has(event)) {
    throw new Error(`Unknown notification event: ${event}`);
  }

  await refreshProviders();

  const results = { email: [], sms: [], whatsapp: [], push: [] };

  // Email
  if (providerInstances.email?.isEnabled() && routing.email && await isChannelEnabled('email')) {
    const templates = await getTemplates(event, 'email');
    for (const tmpl of templates) {
      const body = substituteTemplate(tmpl.body, data);
      const subject = substituteTemplate(tmpl.subject || '', data);
      const r = await providerInstances.email.send({
        to: routing.email,
        subject,
        html: body,
        text: body.replace(/<\/?[^>]+>/g, ' ')
      });
      results.email.push({ name: tmpl.name, success: r.success, error: r.error });
    }
  }

  // SMS
  if (providerInstances.sms?.isEnabled() && routing.sms && await isChannelEnabled('sms')) {
    const templates = await getTemplates(event, 'sms');
    for (const tmpl of templates) {
      const body = substituteTemplate(tmpl.body, data);
      const r = await providerInstances.sms.send({ to: routing.sms, body });
      results.sms.push({ name: tmpl.name, success: r.success, error: r.error });
    }
  }

  // WhatsApp
  if (providerInstances.whatsapp?.isEnabled() && routing.whatsapp && await isChannelEnabled('whatsapp')) {
    const templates = await getTemplates(event, 'whatsapp');
    for (const tmpl of templates) {
      const body = substituteTemplate(tmpl.body, data);
      const r = await providerInstances.whatsapp.send({ to: routing.whatsapp, body });
      results.whatsapp.push({ name: tmpl.name, success: r.success, error: r.error });
    }
  }

  // Push
  if (providerInstances.push?.isEnabled() && routing.pushTokens?.length && await isChannelEnabled('push')) {
    const templates = await getTemplates(event, 'push');
    for (const tmpl of templates) {
      const title = substituteTemplate(tmpl.subject || 'STB Notification', data);
      const body = substituteTemplate(tmpl.body, data);
      for (const token of routing.pushTokens) {
        const r = await providerInstances.push.send({ token, title, body, data });
        results.push.push({ token, success: r.success, error: r.error });
      }
    }
  }

  return results;
}

/**
 * Build notification routing from a booking row and customer row.
 */
export function buildRoutingFromBooking(booking, customer) {
  return {
    email: booking.passenger_email || customer?.email || null,
    sms: booking.passenger_phone || customer?.phone || null,
    whatsapp: customer?.whatsapp || booking.passenger_phone || null,
    pushTokens: []
  };
}

export const NotificationEvents = Array.from(EVENT_NAMES);

// Admin notification template helpers
export async function listNotificationTemplates({ channel, event } = {}) {
  let sql = `SELECT id, channel, event, name, subject, body, is_active, created_at, updated_at FROM notification_templates`;
  const params = [];
  const conditions = [];
  if (channel) { params.push(channel); conditions.push(`channel = $${params.length}`); }
  if (event) { params.push(event); conditions.push(`event = $${params.length}`); }
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ` ORDER BY event, channel`;
  const res = await query(sql, params);
  return res.rows;
}

export async function upsertNotificationTemplate({ id, channel, event, name, subject, body, isActive }) {
  if (id) {
    await query(
      `UPDATE notification_templates
       SET channel = $1, event = $2, name = $3, subject = $4, body = $5, is_active = $6, updated_at = NOW()
       WHERE id = $7`,
      [channel, event, name, subject, body, isActive, id]
    );
    return await getTemplateById(id);
  }
  const res = await query(
    `INSERT INTO notification_templates (channel, event, name, subject, body, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id`,
    [channel, event, name, subject, body, isActive]
  );
  return await getTemplateById(res.rows[0].id);
}

async function getTemplateById(id) {
  const res = await query('SELECT * FROM notification_templates WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getNotificationSettings() {
  const res = await query('SELECT channel, enabled, config FROM notification_settings');
  return Object.fromEntries(res.rows.map(r => [r.channel, { enabled: r.enabled, config: r.config }]));
}

export async function updateNotificationSettings(settings) {
  for (const [channel, cfg] of Object.entries(settings || {})) {
    await query(
      `INSERT INTO notification_settings (channel, enabled, config, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (channel) DO UPDATE
       SET enabled = EXCLUDED.enabled, config = EXCLUDED.config, updated_at = NOW()`,
      [channel, Boolean(cfg.enabled), JSON.stringify(cfg.config || {})]
    );
  }
  return await getNotificationSettings();
}
