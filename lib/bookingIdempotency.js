import { createHash } from 'node:crypto';
import { withTransaction } from './db.js';
import { saveBooking } from './store.js';

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function validateIdempotencyKey(key) {
  if (key == null || key === '') return { valid: true, key: null };
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
    return { valid: false, key: null };
  }
  return { valid: true, key };
}

/**
 * Persist a booking and its idempotency response atomically. Concurrent requests
 * with the same key serialize on the unique key row. A key reused with a
 * different payload receives a conflict instead of creating another booking.
 */
export async function persistBookingIdempotently({ key, payload, booking, responseBody }) {
  if (!key) {
    await withTransaction(async client => saveBooking(booking, client));
    return { kind: 'created', status: 200, body: responseBody };
  }

  const keyHash = sha256(key);
  const requestHash = sha256(JSON.stringify(stableValue(payload)));

  return withTransaction(async client => {
    // Opportunistically prune expired keys so the table stays bounded over time.
    await client.query('DELETE FROM booking_idempotency WHERE expires_at <= NOW()');
    const claimed = await client.query(
      `INSERT INTO booking_idempotency
         (key_hash, request_hash, voucher_code, response_status, response_body, created_at, updated_at, expires_at)
       VALUES ($1, $2, $3, 200, $4::jsonb, NOW(), NOW(), NOW() + INTERVAL '24 hours')
       ON CONFLICT (key_hash) DO UPDATE
         SET request_hash = EXCLUDED.request_hash,
             voucher_code = EXCLUDED.voucher_code,
             response_status = EXCLUDED.response_status,
             response_body = EXCLUDED.response_body,
             created_at = NOW(),
             updated_at = NOW(),
             expires_at = EXCLUDED.expires_at
       WHERE booking_idempotency.expires_at <= NOW()
       RETURNING key_hash`,
      [keyHash, requestHash, booking.voucherCode, JSON.stringify(responseBody)]
    );

    if (claimed.rows.length) {
      await saveBooking(booking, client);
      return { kind: 'created', status: 200, body: responseBody, keyHash };
    }

    const existing = await client.query(
      'SELECT request_hash, response_status, response_body FROM booking_idempotency WHERE key_hash = $1 FOR UPDATE',
      [keyHash]
    );
    if (!existing.rows.length) {
      throw new Error('Idempotency record disappeared during booking creation');
    }
    const record = existing.rows[0];
    if (record.request_hash !== requestHash) {
      return {
        kind: 'conflict',
        status: 409,
        body: { success: false, error: 'This Idempotency-Key was already used for a different booking request.' }
      };
    }
    if (record.response_body) {
      return { kind: 'replay', status: record.response_status || 200, body: record.response_body };
    }
    return {
      kind: 'in_progress',
      status: 409,
      body: { success: false, error: 'This booking request is still being processed. Retry with the same Idempotency-Key.' }
    };
  });
}

export async function updateIdempotencyResponse(key, responseBody) {
  if (!key) return;
  const keyHash = sha256(key);
  const { query } = await import('./db.js');
  await query(
    'UPDATE booking_idempotency SET response_body = $1::jsonb, response_status = 200, updated_at = NOW() WHERE key_hash = $2',
    [JSON.stringify(responseBody), keyHash]
  );
}
