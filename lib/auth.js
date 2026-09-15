// Enhanced admin authentication: password + optional OTP/2FA + sessions
import crypto from 'crypto';
import { query } from './db.js';
import { getTransporter, makeBrand } from './handlers.js';
import {
  hashPassword, verifyPassword, generateSecureToken, hashToken,
  generateNumericOtp, sha256Hex, isValidEmail
} from './security.js';
import { isAllowed, resetLimit } from './ratelimit.js';
import { logAudit } from './audit.js';

const ADMIN_SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 8 * 60 * 60 * 1000); // 8 hours

// Rate-limit helpers
function limitKey(prefix, identifier) {
  return `${prefix}:${identifier.toLowerCase()}`;
}

function audit(req, actor, action, table, recordId, oldVals, newVals) {
  logAudit({ actorEmail: actor, actorType: 'admin', action, tableName: table, recordId, oldValues: oldVals, newValues: newVals, req });
}

export async function setupInitialAdminPassword(email, password) {
  if (!isValidEmail(email)) throw new Error('Invalid email');
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');
  const normalizedEmail = email.toLowerCase();

  const res = await query(
    `SELECT email, password_hash FROM admin_users WHERE email = $1 AND is_active = TRUE`,
    [normalizedEmail]
  );
  if (res.rows.length === 0) throw new Error('Email not authorized for setup');
  if (res.rows[0].password_hash) throw new Error('Password already set. Use password reset instead.');

  const hash = await hashPassword(password);
  const superAdminRoleId = (await query(`SELECT id FROM roles WHERE slug = 'SUPER_ADMIN'`)).rows[0]?.id;
  await query(
    `UPDATE admin_users SET password_hash = $1, role_id = COALESCE(role_id, $3), updated_at = NOW() WHERE email = $2`,
    [hash, normalizedEmail, superAdminRoleId]
  );
  return { success: true };
}

export async function loginAdmin(email, password, req) {
  if (!isValidEmail(email)) throw new Error('Invalid email');
  const normalizedEmail = email.toLowerCase();

  const limit = isAllowed(limitKey('admin-login', normalizedEmail), 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    throw new Error('Too many login attempts. Please try again later.');
  }

  const res = await query(
    `SELECT u.email, u.password_hash, u.name, u.is_active, u.role_id, r.slug as role_slug
     FROM admin_users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [normalizedEmail]
  );
  if (res.rows.length === 0 || !res.rows[0].is_active) {
    throw new Error('Invalid email or password');
  }

  const admin = res.rows[0];
  if (!admin.password_hash) {
    throw new Error('Password not set. Please complete first-time setup.');
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  // Optionally require OTP/2FA for SUPER_ADMIN
  const needsOtp = admin.role_slug === 'SUPER_ADMIN' && process.env.SUPER_ADMIN_OTP_REQUIRED !== 'false';
  if (needsOtp) {
    const otpResult = await createAdminOtp(normalizedEmail);
    return { success: true, requiresOtp: true, email: normalizedEmail, otpSent: otpResult.sent };
  }

  return await createAdminSession(admin, req);
}

async function createAdminOtp(email) {
  const otp = generateNumericOtp(6);
  const otpHash = sha256Hex(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate prior unverified OTPs
  await query(`UPDATE otp_sessions SET is_verified = TRUE WHERE email = $1 AND is_verified = FALSE`, [email]);
  await query(
    `INSERT INTO otp_sessions (email, otp_hash, expires_at, attempts, is_verified) VALUES ($1, $2, $3, 0, FALSE)`,
    [email, otpHash, expiresAt]
  );

  // Send OTP via email if SMTP configured
  let sent = false;
  const transporter = getTransporter();
  if (transporter) {
    const brand = makeBrand('');
    try {
      await transporter.sendMail({
        from: `"${brand.name} Security" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Your STB Admin Verification Code: ${otp}`,
        html: `<div style="font-family:Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e0deda;border-radius:12px;background:#fff;">
          <h2 style="color:#141414;margin-top:0;">STB Singapore Admin Login</h2>
          <p style="color:#555;font-size:14px;line-height:1.5;">Use the following one-time verification code to complete sign-in. This code will expire in <strong>10 minutes</strong>.</p>
          <div style="margin:28px 0;text-align:center;">
            <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:6px;color:#E31E24;padding:12px 24px;background:#FDECEC;border-radius:8px;">${otp}</span>
          </div>
          <p style="color:#888;font-size:12px;">If you did not request this code, please ignore it.</p>
        </div>`,
        text: `Your STB Admin verification code is: ${otp}\n\nThis code expires in 10 minutes.`
      });
      sent = true;
    } catch (err) {
      console.warn('[AdminAuth] OTP email failed:', err.message);
    }
  }

  // Log to console for local dev (but never in production logs)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 [ADMIN OTP for ${email}]: ${otp}\n`);
  }

  return { sent, otpHash };
}

export async function verifyAdminOtpAndCreateSession(email, otp, req) {
  const normalizedEmail = email.toLowerCase();
  const cleanedOtp = String(otp).trim();
  if (!cleanedOtp) throw new Error('Verification code is required');

  const res = await query(
    `SELECT id, otp_hash, attempts, expires_at FROM otp_sessions
     WHERE email = $1 AND is_verified = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );
  if (res.rows.length === 0) throw new Error('No active verification code found');

  const session = res.rows[0];
  if (session.attempts >= 3) {
    await query('UPDATE otp_sessions SET is_verified = TRUE WHERE id = $1', [session.id]);
    throw new Error('Too many incorrect attempts. Please request a new code.');
  }

  const submittedHash = sha256Hex(cleanedOtp);
  if (submittedHash !== session.otp_hash) {
    await query('UPDATE otp_sessions SET attempts = attempts + 1 WHERE id = $1', [session.id]);
    throw new Error('Invalid verification code');
  }

  await query('UPDATE otp_sessions SET is_verified = TRUE WHERE id = $1', [session.id]);

  const adminRes = await query(
    `SELECT u.email, u.name, u.is_active, u.role_id, r.slug as role_slug
     FROM admin_users u LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1 AND u.is_active = TRUE`,
    [normalizedEmail]
  );
  if (adminRes.rows.length === 0) throw new Error('Admin account not found');

  return await createAdminSession(adminRes.rows[0], req);
}

async function createAdminSession(admin, req) {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

  await query(
    `INSERT INTO admin_sessions (email, session_token_hash, expires_at) VALUES ($1, $2, $3)`,
    [admin.email, tokenHash, expiresAt]
  );
  await query('UPDATE admin_users SET last_login = NOW() WHERE email = $1', [admin.email]);

  resetLimit(limitKey('admin-login', admin.email));
  audit(req, admin.email, 'LOGIN', 'admin_sessions', tokenHash, null, { email: admin.email, role_slug: admin.role_slug });

  return {
    success: true,
    sessionToken: rawToken,
    expiresAt,
    admin: { email: admin.email, name: admin.name, roleSlug: admin.role_slug }
  };
}

export async function validateAdminSession(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const res = await query(
    `SELECT s.id, s.email, u.name, u.is_active, r.slug as role_slug, u.role_id
     FROM admin_sessions s
     JOIN admin_users u ON s.email = u.email
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE s.session_token_hash = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
    [tokenHash]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function logoutAdminSession(token, req) {
  if (!token) return { success: true };
  const tokenHash = hashToken(token);
  const session = await query('SELECT email FROM admin_sessions WHERE session_token_hash = $1', [tokenHash]);
  await query('DELETE FROM admin_sessions WHERE session_token_hash = $1', [tokenHash]);
  if (session.rows[0]) {
    audit(req, session.rows[0].email, 'LOGOUT', 'admin_sessions', tokenHash, null, null);
  }
  return { success: true };
}

export async function requestPasswordReset(email, baseUrl, req) {
  if (!isValidEmail(email)) throw new Error('Invalid email');
  const normalizedEmail = email.toLowerCase();

  const limit = isAllowed(limitKey('admin-reset', normalizedEmail), 3, 60 * 60 * 1000);
  if (!limit.allowed) throw new Error('Too many password reset requests. Please try again later.');

  const res = await query('SELECT email FROM admin_users WHERE email = $1 AND is_active = TRUE', [normalizedEmail]);
  if (res.rows.length === 0) return { success: true }; // don't reveal existence

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await query(
    `INSERT INTO admin_password_reset_tokens (email, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [normalizedEmail, tokenHash, expiresAt]
  );

  const transporter = getTransporter();
  if (transporter) {
    const brand = makeBrand(baseUrl);
    const resetUrl = `${baseUrl}/admin/reset-password?token=${rawToken}`;
    try {
      await transporter.sendMail({
        from: `"${brand.name} Security" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: normalizedEmail,
        subject: 'Reset your STB Admin password',
        html: `<p>Click the link below to reset your STB admin password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you did not request this, please ignore this email.</p>`,
        text: `Reset your STB admin password: ${resetUrl}\n\nExpires in 1 hour.`
      });
    } catch (err) {
      console.warn('[AdminAuth] reset email failed:', err.message);
    }
  }

  audit(req, normalizedEmail, 'PASSWORD_RESET_REQUESTED', 'admin_password_reset_tokens', tokenHash, null, null);

  return { success: true, rawToken };
}

export async function resetPassword(rawToken, newPassword, req) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  const tokenHash = hashToken(rawToken);
  const res = await query(
    `SELECT email, expires_at, used_at FROM admin_password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL`,
    [tokenHash]
  );
  if (res.rows.length === 0) throw new Error('Invalid or expired reset token');
  const row = res.rows[0];
  if (new Date(row.expires_at) <= new Date()) throw new Error('Reset token has expired');

  const hash = await hashPassword(newPassword);
  await query('UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [hash, row.email]);
  await query('UPDATE admin_password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [tokenHash]);

  audit(req, row.email, 'PASSWORD_RESET_COMPLETED', 'admin_users', row.email, null, null);
  return { success: true };
}

export async function changeAdminPassword(email, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  const normalizedEmail = email.toLowerCase();
  const res = await query('SELECT password_hash FROM admin_users WHERE email = $1 AND is_active = TRUE', [normalizedEmail]);
  if (res.rows.length === 0) throw new Error('Admin not found');

  const valid = await verifyPassword(oldPassword, res.rows[0].password_hash);
  if (!valid) throw new Error('Current password is incorrect');

  const hash = await hashPassword(newPassword);
  await query('UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [hash, normalizedEmail]);
  return { success: true };
}

/**
 * Express middleware: require valid admin session and attach req.admin.
 */
export function requireAdminAuth() {
  return async (req, res, next) => {
    const token = req.cookies?.stb_admin_session ||
                  (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const session = await validateAdminSession(token);
    if (!session) return res.status(401).json({ error: 'Session expired or invalid' });
    req.admin = session;
    next();
  };
}

// Legacy OTP-only compatibility wrappers (deprecated — kept for server.js import compatibility)
export async function requestAdminOtp(email) {
  const otp = generateNumericOtp(6);
  const otpHash = sha256Hex(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const normalizedEmail = String(email).trim().toLowerCase();
  const res = await query('SELECT email FROM admin_users WHERE email = $1 AND is_active = TRUE', [normalizedEmail]);
  if (res.rows.length === 0) return { status: 400, body: { success: false, error: 'Email not authorized' } };
  await query('DELETE FROM otp_sessions WHERE email = $1 AND is_verified = FALSE', [normalizedEmail]);
  await query('INSERT INTO otp_sessions (email, otp_hash, expires_at, attempts, is_verified) VALUES ($1, $2, $3, 0, FALSE)', [normalizedEmail, otpHash, expiresAt]);
  if (process.env.NODE_ENV !== 'production') console.log(`\n🔑 [ADMIN OTP for ${normalizedEmail}]: ${otp}\n`);
  return { status: 200, body: { success: true, message: 'OTP generated (dev mode — see server console or email).' } };
}

export async function verifyAdminOtp(email, otp) {
  try {
    const session = await verifyAdminOtpAndCreateSession(email, otp, null);
    return { status: 200, body: { success: true, sessionToken: session.sessionToken, admin: session.admin } };
  } catch (err) {
    return { status: 401, body: { success: false, error: err.message } };
  }
}
