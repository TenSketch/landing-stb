// Simple in-memory rate limiter for login/reset/OTP endpoints
// Stores are process-local; sufficient for single-node deployments.

const store = new Map();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 5;

function cleanup(key, now) {
  const entry = store.get(key);
  if (entry && entry.resetAt <= now) {
    store.delete(key);
  }
}

/**
 * Check if an action is allowed for a given identifier.
 * @param {string} key - identifier (e.g. `login:${email}` or `otp:${email}`)
 * @param {number} maxAttempts - maximum allowed attempts within window
 * @param {number} windowMs - window duration in milliseconds
 * @returns {{allowed: boolean, remaining: number, resetAt: Date}}
 */
export function isAllowed(key, maxAttempts = DEFAULT_MAX_ATTEMPTS, windowMs = DEFAULT_WINDOW_MS) {
  const now = Date.now();
  cleanup(key, now);

  let entry = store.get(key);
  if (!entry) {
    entry = { attempts: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  if (entry.attempts >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.resetAt) };
  }

  entry.attempts += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - entry.attempts),
    resetAt: new Date(entry.resetAt)
  };
}

/**
 * Reset rate limit for a key (e.g. after successful login).
 */
export function resetLimit(key) {
  store.delete(key);
}

/**
 * Get remaining attempts.
 */
export function getStatus(key, maxAttempts = DEFAULT_MAX_ATTEMPTS, windowMs = DEFAULT_WINDOW_MS) {
  const now = Date.now();
  cleanup(key, now);
  const entry = store.get(key);
  if (!entry) return { allowed: true, remaining: maxAttempts };
  return {
    allowed: entry.attempts < maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.attempts),
    resetAt: new Date(entry.resetAt)
  };
}
