// Expanded audit logging service
import { query } from './db.js';

const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'passwordHash', 'otp', 'otp_hash', 'token', 'token_hash',
  'session_token_hash', 'secret', 'api_key', 'apiKey', 'api_secret', 'private_key',
  'server_key', 'client_secret', 'auth_token', 'access_token', 'refresh_token'
]);

function redactSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || SENSITIVE_KEYS.has(key) || /password|secret|token|otp|key/i.test(key)) {
      out[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      out[key] = redactSensitive(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function getClientInfo(req) {
  if (!req) return { ip: null, userAgent: null };
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  return { ip, userAgent };
}

/**
 * Log an audit event.
 * @param {Object} params
 * @param {string} params.actorEmail
 * @param {'admin'|'customer'|'system'} params.actorType
 * @param {string} params.action
 * @param {string} params.tableName
 * @param {string|number} params.recordId
 * @param {Object} params.oldValues
 * @param {Object} params.newValues
 * @param {import('express').Request} params.req
 */
export async function logAudit({
  actorEmail,
  actorType = 'system',
  action,
  tableName,
  recordId,
  oldValues = null,
  newValues = null,
  req = null
}) {
  try {
    const { ip, userAgent } = getClientInfo(req);
    const sql = `
      INSERT INTO audit_logs (actor_email, actor_type, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `;
    await query(sql, [
      actorEmail || null,
      actorType,
      action,
      tableName || null,
      recordId ? String(recordId) : null,
      oldValues ? JSON.stringify(redactSensitive(oldValues)) : null,
      newValues ? JSON.stringify(redactSensitive(newValues)) : null,
      ip,
      userAgent
    ]);
  } catch (err) {
    console.error('[Audit] Failed to log audit event:', err.message);
  }
}

/**
 * List audit logs with optional filters.
 */
export async function listAuditLogs({ limit = 100, offset = 0, actorEmail, action, tableName }) {
  const conditions = [];
  const params = [];
  if (actorEmail) {
    params.push(actorEmail);
    conditions.push(`actor_email = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (tableName) {
    params.push(tableName);
    conditions.push(`table_name = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);
  const sql = `
    SELECT id, actor_email, actor_type, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at
    FROM audit_logs
    ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const res = await query(sql, params);
  return res.rows;
}

export default { logAudit, listAuditLogs };
