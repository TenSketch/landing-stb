// Admin authentication module: Email OTP, Session management, and Middleware
import crypto from 'crypto';
import { query } from './db.js';
import { getTransporter, makeBrand } from './handlers.js';

function hashValue(val) {
  return crypto.createHash('sha256').update(String(val)).digest('hex');
}

function generateNumericOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Request OTP for an admin email
 */
export async function requestAdminOtp(email, baseUrl = '') {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return { status: 400, body: { error: 'Email address is required.' } };
  }

  // 1. Verify that email is registered in admin_users
  const userCheck = await query(
    'SELECT email, is_active FROM admin_users WHERE email = $1',
    [normalizedEmail]
  );

  if (userCheck.rows.length === 0 || !userCheck.rows[0].is_active) {
    // Return standard generic message to prevent email enumeration or return 403
    return { status: 403, body: { error: 'This email address is not authorized for administrative access.' } };
  }

  // 2. Rate limiting: Check if an OTP was created in the last 60 seconds
  const recentCheck = await query(
    `SELECT created_at FROM otp_sessions 
     WHERE email = $1 AND created_at > NOW() - INTERVAL '60 seconds'
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );

  if (recentCheck.rows.length > 0) {
    return { status: 429, body: { error: 'Please wait 60 seconds before requesting another verification code.' } };
  }

  // 3. Generate 6-digit OTP and compute hash
  const otp = generateNumericOtp();
  const otpHash = hashValue(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate previous unverified OTP sessions for this email
  await query(
    `UPDATE otp_sessions SET is_verified = TRUE WHERE email = $1 AND is_verified = FALSE`,
    [normalizedEmail]
  );

  // Insert new session
  await query(
    `INSERT INTO otp_sessions (email, otp_hash, expires_at, attempts, is_verified)
     VALUES ($1, $2, $3, 0, FALSE)`,
    [normalizedEmail, otpHash, expiresAt]
  );

  // 4. Always log OTP to server console for local dev convenience
  console.log(`\n========================================`);
  console.log(`🔑 [ADMIN OTP CODE] for ${normalizedEmail}: ${otp}`);
  console.log(`========================================\n`);

  // 5. Attempt sending OTP via SMTP
  const transporter = getTransporter();
  if (transporter) {
    const brand = makeBrand(baseUrl);
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const mailOptions = {
      from: `"${brand.name} Security" <${fromAddress}>`,
      to: normalizedEmail,
      subject: `Your STB Admin Verification Code: ${otp}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0deda; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #141414; margin-top: 0;">STB Singapore Admin Login</h2>
          <p style="color: #555555; font-size: 14px; line-height: 1.5;">Use the following one-time verification code to sign in to the STB Singapore Pricing Admin Panel. This code will expire in <strong>10 minutes</strong>.</p>
          <div style="margin: 28px 0; text-align: center;">
            <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #E31E24; padding: 12px 24px; background: #FDECEC; border-radius: 8px;">${otp}</span>
          </div>
          <p style="color: #888888; font-size: 12px; line-height: 1.4;">If you did not request this verification code, please ignore this email. Do not share this code with anyone.</p>
        </div>
      `,
      text: `Your STB Admin verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore.`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[AUTH] OTP email successfully dispatched to ${normalizedEmail}`);
    } catch (err) {
      console.warn(`[AUTH] SMTP delivery skipped (${err.message}). Use the console OTP code above.`);
    }
  }

  return { status: 200, body: { success: true, message: 'Verification code generated. (Check your terminal console or email inbox).' } };
}

/**
 * Verify OTP and create an authenticated session
 */
export async function verifyAdminOtp(email, otp) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanedOtp = (otp || '').trim();

  if (!normalizedEmail || !cleanedOtp) {
    return { status: 400, body: { error: 'Email and verification code are required.' } };
  }

  // 1. Find active OTP session
  const res = await query(
    `SELECT id, otp_hash, attempts, expires_at, is_verified 
     FROM otp_sessions 
     WHERE email = $1 AND is_verified = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );

  if (res.rows.length === 0) {
    return { status: 400, body: { error: 'No active verification code found or it has expired. Please request a new code.' } };
  }

  const session = res.rows[0];

  // 2. Check attempt limits (max 3)
  if (session.attempts >= 3) {
    await query(`UPDATE otp_sessions SET is_verified = TRUE WHERE id = $1`, [session.id]);
    return { status: 429, body: { error: 'Too many incorrect attempts. Please request a new code.' } };
  }

  // 3. Verify hash
  const submittedHash = hashValue(cleanedOtp);
  if (submittedHash !== session.otp_hash) {
    const newAttempts = session.attempts + 1;
    await query(`UPDATE otp_sessions SET attempts = $1 WHERE id = $2`, [newAttempts, session.id]);
    const remaining = 3 - newAttempts;
    return {
      status: 400,
      body: { 
        error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}` 
      }
    };
  }

  // 4. Mark OTP session as verified
  await query(`UPDATE otp_sessions SET is_verified = TRUE WHERE id = $1`, [session.id]);
  await query(`UPDATE admin_users SET last_login = NOW() WHERE email = $1`, [normalizedEmail]);

  // 5. Create secure session token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashValue(rawToken);
  const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await query(
    `INSERT INTO admin_sessions (email, session_token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [normalizedEmail, tokenHash, sessionExpiresAt]
  );

  return {
    status: 200,
    body: { success: true, message: 'Authentication successful.', email: normalizedEmail },
    sessionToken: rawToken,
    expiresAt: sessionExpiresAt
  };
}

/**
 * Validate session token from cookie/header
 */
export async function validateAdminSession(token) {
  if (!token) return null;
  const tokenHash = hashValue(token);

  const res = await query(
    `SELECT s.id, s.email, u.is_active 
     FROM admin_sessions s
     JOIN admin_users u ON s.email = u.email
     WHERE s.session_token_hash = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
    [tokenHash]
  );

  if (res.rows.length === 0) return null;
  return { id: res.rows[0].id, email: res.rows[0].email };
}

/**
 * Logout admin session
 */
export async function logoutAdminSession(token) {
  if (!token) return { success: true };
  const tokenHash = hashValue(token);
  await query(`DELETE FROM admin_sessions WHERE session_token_hash = $1`, [tokenHash]);
  return { success: true };
}

/**
 * Express Middleware for protecting admin routes
 */
export function requireAdminAuth() {
  return async (req, res, next) => {
    const token = req.cookies?.stb_admin_session || 
                  (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in to the admin panel.' });
    }

    try {
      const session = await validateAdminSession(token);
      if (!session) {
        return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
      }
      req.admin = session;
      next();
    } catch (err) {
      console.error('[AUTH MIDDLEWARE ERROR]:', err.message);
      return res.status(500).json({ error: 'Internal security authentication failure.' });
    }
  };
}
