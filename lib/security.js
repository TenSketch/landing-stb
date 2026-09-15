// Security utilities: password hashing, token generation, secret encryption
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

const SECRET_KEY = process.env.STB_SECRET_KEY || '';

function ensureSecretKey() {
  if (!SECRET_KEY) {
    throw new Error('STB_SECRET_KEY environment variable is required for encryption.');
  }
  // Normalize to 32-byte Buffer from hex or utf8
  let buf = Buffer.from(SECRET_KEY, 'hex');
  if (buf.length !== 32) {
    buf = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
  }
  return buf;
}

/**
 * Hash a password using scrypt (N=16384, r=8, p=1, 64-byte output) with a random salt.
 * Returns a modular hash string: $stb-scrypt$<salt>$<hash>
 */
export async function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(plain, salt, 64, { N: 16384, r: 8, p: 1 });
  return `$stb-scrypt$${salt}$${derived.toString('hex')}`;
}

/**
 * Verify a password against a stored scrypt hash string.
 */
export async function verifyPassword(plain, storedHash) {
  if (!storedHash || !storedHash.startsWith('$stb-scrypt$')) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;
  const salt = parts[2];
  const hashHex = parts[3];
  const derived = await scrypt(plain, salt, 64, { N: 16384, r: 8, p: 1 });
  const provided = Buffer.from(hashHex, 'hex');
  return crypto.timingSafeEqual(provided, derived);
}
/**
 * Generate a cryptographically secure random token.
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token using SHA-256 (for session/reset token lookups).
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Generate a numeric OTP.
 */
export function generateNumericOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Encrypt a plaintext secret using AES-256-GCM.
 */
export function encryptSecret(plain) {
  const key = ensureSecretKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a ciphertext produced by encryptSecret.
 */
export function decryptSecret(cipherText) {
  if (!cipherText) return null;
  const key = ensureSecretKey();
  const parts = cipherText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');
  const [ivHex, authTagHex, encryptedHex] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

/**
 * Hash a value with SHA-256 (for non-password lookups).
 */
export function sha256Hex(val) {
  return crypto.createHash('sha256').update(String(val)).digest('hex');
}

/**
 * Sanitize a string for safe HTML rendering (XSS prevention).
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Basic email validation.
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

/**
 * Clamp a numeric value.
 */
export function clamp(num, min, max) {
  return Math.max(min, Math.min(max, Number(num) || 0));
}
