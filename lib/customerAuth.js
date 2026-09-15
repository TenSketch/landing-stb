// Customer authentication service
import { query } from './db.js';
import {
  hashPassword, verifyPassword, generateSecureToken, hashToken,
  generateNumericOtp, sha256Hex, isValidEmail
} from './security.js';

const SESSION_TTL_MS = Number(process.env.CUSTOMER_SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000); // 30 days

export async function registerCustomer({ email, password, name, phone, whatsapp = null }, req = null) {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) throw new Error('Invalid email address');
  if (!name || !name.trim()) throw new Error('Name is required');
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');

  const existing = await query('SELECT id FROM customers WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) throw new Error('An account with this email already exists');

  const passwordHash = await hashPassword(password);
  const insertRes = await query(
    `INSERT INTO customers (email, password_hash, name, phone, whatsapp, email_verified_at, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), TRUE, NOW(), NOW())
     RETURNING id, email, name, phone, whatsapp, email_verified_at, is_active`,
    [normalizedEmail, passwordHash, name.trim(), phone || null, whatsapp || null]
  );

  const customer = insertRes.rows[0];
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query(
    `INSERT INTO customer_sessions (customer_id, session_token_hash, expires_at, user_agent, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [customer.id, tokenHash, expiresAt, req?.headers?.['user-agent'] || null, req?.socket?.remoteAddress || null]
  );

  return { public: sanitizeCustomer(customer), sessionToken: rawToken, requiresEmailVerification: false };
}

export async function loginCustomer(email, password, req = null) {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) throw new Error('Invalid email address');

  const res = await query(
    `SELECT id, email, password_hash, name, phone, whatsapp, email_verified_at, is_active
     FROM customers WHERE email = $1`,
    [normalizedEmail]
  );
  if (res.rows.length === 0) throw new Error('Invalid email or password');

  const customer = res.rows[0];
  if (!customer.is_active) throw new Error('Account is inactive');

  const valid = await verifyPassword(password, customer.password_hash);
  if (!valid) throw new Error('Invalid email or password');

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await query(
    `INSERT INTO customer_sessions (customer_id, session_token_hash, expires_at, user_agent, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [customer.id, tokenHash, expiresAt, req?.headers?.['user-agent'] || null, req?.socket?.remoteAddress || null]
  );

  return { public: sanitizeCustomer(customer), sessionToken: rawToken, expiresAt };
}

export async function getCustomerBySession(rawToken) {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const res = await query(
    `SELECT c.id, c.email, c.name, c.phone, c.whatsapp, c.email_verified_at, c.is_active
     FROM customers c
     JOIN customer_sessions s ON s.customer_id = c.id
     WHERE s.session_token_hash = $1 AND s.expires_at > NOW() AND c.is_active = TRUE`,
    [tokenHash]
  );
  if (res.rows.length === 0) return null;
  return sanitizeCustomer(res.rows[0]);
}

export async function logoutCustomer(rawToken) {
  if (!rawToken) return true;
  const tokenHash = hashToken(rawToken);
  await query('DELETE FROM customer_sessions WHERE session_token_hash = $1', [tokenHash]);
  return true;
}

export async function requestPasswordReset(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const res = await query('SELECT id FROM customers WHERE email = $1', [normalizedEmail]);
  if (res.rows.length === 0) return { success: true }; // don't reveal existence

  const customerId = res.rows[0].id;
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query(
    `INSERT INTO customer_password_reset_tokens (customer_id, token_hash, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [customerId, tokenHash, expiresAt]
  );

  return { success: true, rawToken, customerId };
}

export async function resetPassword(rawToken, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  const tokenHash = hashToken(rawToken);
  const res = await query(
    `SELECT customer_id, expires_at, used_at FROM customer_password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL`,
    [tokenHash]
  );
  if (res.rows.length === 0) throw new Error('Invalid or expired reset token');
  const row = res.rows[0];
  if (new Date(row.expires_at) <= new Date()) throw new Error('Reset token has expired');

  const passwordHash = await hashPassword(newPassword);
  await query('UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, row.customer_id]);
  await query('UPDATE customer_password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [tokenHash]);
  return { success: true };
}

export async function changePassword(customerId, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  const res = await query('SELECT password_hash FROM customers WHERE id = $1 AND is_active = TRUE', [customerId]);
  if (res.rows.length === 0) throw new Error('Account not found');
  const valid = await verifyPassword(oldPassword, res.rows[0].password_hash);
  if (!valid) throw new Error('Current password is incorrect');
  const passwordHash = await hashPassword(newPassword);
  await query('UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, customerId]);
  return { success: true };
}

export async function updateCustomerProfile(customerId, { name, phone, whatsapp }) {
  const res = await query(
    `UPDATE customers SET name = COALESCE($1, name), phone = COALESCE($2, phone), whatsapp = COALESCE($3, whatsapp), updated_at = NOW()
     WHERE id = $4
     RETURNING id, email, name, phone, whatsapp, email_verified_at, is_active`,
    [name?.trim() || null, phone || null, whatsapp || null, customerId]
  );
  if (res.rows.length === 0) throw new Error('Customer not found');
  return sanitizeCustomer(res.rows[0]);
}

export async function markEmailVerified(customerId) {
  await query('UPDATE customers SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1', [customerId]);
}

export async function listCustomerBookings(customerId, { status, upcoming = false } = {}) {
  let sql = `SELECT * FROM bookings WHERE customer_id = $1`;
  const params = [customerId];
  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }
  if (upcoming) {
    sql += ` AND date_time > NOW()`;
  }
  sql += ` ORDER BY created_at DESC`;
  const res = await query(sql, params);
  return res.rows;
}

export function sanitizeCustomer(customer) {
  if (!customer) return null;
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    whatsapp: customer.whatsapp,
    emailVerified: Boolean(customer.email_verified_at),
    isActive: customer.is_active
  };
}

// Express middleware: attaches req.customer if token present, but does not require auth.
export async function optionalCustomerAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const rawToken = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.stb_customer_session;
  if (rawToken) {
    req.customer = await getCustomerBySession(rawToken);
  }
  next();
}

// Express middleware: requires customer auth.
export function requireCustomerAuth() {
  return async (req, res, next) => {
    const header = req.headers.authorization || '';
    const rawToken = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.stb_customer_session;
    if (!rawToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const customer = await getCustomerBySession(rawToken);
    if (!customer) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }
    req.customer = customer;
    next();
  };
}

export async function saveCustomerDeviceToken(customerId, token, provider = 'fcm', userAgent = null) {
  await query(
    `INSERT INTO customer_device_tokens (customer_id, token, provider, user_agent, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (customer_id, token) DO UPDATE SET updated_at = NOW()`,
    [customerId, token, provider, userAgent]
  );
  return true;
}

export async function removeCustomerDeviceToken(customerId, token) {
  await query('DELETE FROM customer_device_tokens WHERE customer_id = $1 AND token = $2', [customerId, token]);
  return true;
}

export async function getCustomerDeviceTokens(customerId) {
  const res = await query('SELECT token FROM customer_device_tokens WHERE customer_id = $1', [customerId]);
  return res.rows.map(r => r.token);
}
