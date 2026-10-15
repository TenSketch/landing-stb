-- 008: Booking creation idempotency
-- Idempotency records are written in the same transaction as the booking.
-- Only a SHA-256 digest of the client key is stored; raw keys never enter the database.
CREATE TABLE IF NOT EXISTS booking_idempotency (
    key_hash CHAR(64) PRIMARY KEY,
    request_hash CHAR(64) NOT NULL,
    voucher_code VARCHAR(50),
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_booking_idempotency_expiry ON booking_idempotency(expires_at);
