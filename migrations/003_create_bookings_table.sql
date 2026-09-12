-- ============================================================
-- 9. BOOKINGS / INQUIRIES (PostgreSQL Primary Storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY,
    voucher_code VARCHAR(50) NOT NULL UNIQUE,
    passenger_name VARCHAR(255) NOT NULL,
    passenger_email VARCHAR(255) NOT NULL,
    passenger_phone VARCHAR(50) NOT NULL,
    vehicle VARCHAR(100),
    pickup TEXT NOT NULL,
    destination TEXT,
    date_time VARCHAR(100),
    flight_no VARCHAR(100),
    fare VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'SGD',
    payment_method VARCHAR(100),
    pax VARCHAR(100),
    booking_type VARCHAR(100),
    notes TEXT,
    pickup_place_id VARCHAR(255),
    pickup_coords JSONB,
    dest_place_id VARCHAR(255),
    dest_coords JSONB,
    distance_km NUMERIC(10, 2),
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    driver_plate VARCHAR(50),
    driver_photo_url TEXT,
    driver_assigned_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    reminder_message_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_voucher ON bookings(voucher_code);
