# Booking Creation Idempotency

**Status:** Implemented in the open `fix/booking-idempotency` branch; pending CI and review.  
**Scope:** `POST /api/bookings` only.

## Contract

- The customer client sends an `Idempotency-Key` request header for each logical booking submission.
- The client retains the key for retries of the same payload. If the payload changes, it generates a new key. After confirmed success, the client clears the key.
- Keys must be 8–200 characters and contain only letters, numbers, dots, underscores, colons or hyphens. Invalid keys receive HTTP 400.
- The server stores only a SHA-256 digest of the key, plus a SHA-256 digest of a canonicalized request payload. Raw keys are not persisted.
- The booking row and initial idempotency response are persisted in one PostgreSQL transaction. A unique key row serializes concurrent requests with the same key.
- Repeating the same key and same payload returns the original booking response and voucher; it does not create another booking or repeat email side effects.
- Reusing a key for a different payload returns HTTP 409.
- Records expire after 24 hours. After expiry, the same key can be claimed again; clients should create a fresh key for a new logical booking.
- Requests without the header preserve backward compatibility but do not receive idempotency protection. The first-party customer form now sends the header.

## Transaction and failure behavior

- If booking persistence fails, the booking and idempotency record roll back together.
- A concurrent request waits for the unique-key transaction to settle; it then replays the stored response or reports a conflict.
- Email notifications occur after booking persistence to avoid holding a database transaction open during network I/O. The initial response is cached before email sends complete, and the cache is updated with final email results afterward. A very fast concurrent replay can therefore receive the initial response with null email results; it still receives the same voucher and never triggers duplicate email sends.
- A process failure after booking commit but before notification completion may leave notification delivery incomplete. A durable transactional outbox is a separate follow-up; idempotency guarantees booking deduplication, not exactly-once delivery across external providers.

## Verification requirements

The isolated E2E suite checks:
- normal booking returns a voucher;
- repeated same-key/same-payload request returns the same voucher;
- same key with a changed payload returns 409;
- exactly one booking row exists for the voucher after replay;
- simultaneous same-key requests return the same voucher and create one row;
- malformed key returns 400.

The full PR CI must pass before this is considered verified. Real provider delivery and production behavior are outside the isolated CI scope. Do not run this mutation suite against production.
