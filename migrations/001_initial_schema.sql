-- ============================================================
-- 1. VEHICLE TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,          -- '4-Seater', '6-Seater'
    description VARCHAR(255),
    pax_max INT NOT NULL DEFAULT 4,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PRICING RULES (KM Fallback, Hourly, Daily, Minimum Fare)
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
    id SERIAL PRIMARY KEY,
    vehicle_id INT NOT NULL REFERENCES vehicle_types(id) ON DELETE RESTRICT,
    base_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    per_km_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    minimum_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vehicle_pricing UNIQUE(vehicle_id)
);

-- ============================================================
-- 3. ROUTE OVERRIDES (Fixed-Price Route Overrides via Place IDs)
-- ============================================================
CREATE TABLE IF NOT EXISTS route_overrides (
    id SERIAL PRIMARY KEY,
    vehicle_id INT NOT NULL REFERENCES vehicle_types(id) ON DELETE RESTRICT,
    origin_place_id VARCHAR(255) NOT NULL,
    destination_place_id VARCHAR(255) NOT NULL,
    origin_display_name VARCHAR(255) NOT NULL,
    destination_display_name VARCHAR(255) NOT NULL,
    fixed_price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_route_override UNIQUE(vehicle_id, origin_place_id, destination_place_id)
);
CREATE INDEX IF NOT EXISTS idx_route_overrides_lookup 
ON route_overrides(origin_place_id, destination_place_id, vehicle_id) 
WHERE is_active = TRUE;

-- ============================================================
-- 4. SURCHARGES (Night, Peak, Flat, Percentage)
-- ============================================================
CREATE TABLE IF NOT EXISTS surcharges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                 -- 'Night Surcharge', 'Peak Surcharge'
    type VARCHAR(20) NOT NULL CHECK (type IN ('flat', 'percentage')),
    value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,    -- e.g. 15.00 ($15 or 15%)
    start_time TIME NOT NULL,                  -- '23:30:00' (Singapore SGT, UTC+8)
    end_time TIME NOT NULL,                    -- '06:00:00'
    applicable_mode VARCHAR(50) DEFAULT 'ALL',    -- 'ALL', 'ONE_WAY', 'HOURLY', 'DAILY'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. ADMIN USERS (Authorized Administrators)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    email VARCHAR(255) PRIMARY KEY,
    last_login TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. OTP SESSIONS (Authentication)
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL REFERENCES admin_users(email) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_email ON otp_sessions(email);

-- ============================================================
-- 7. ADMIN SESSIONS (Persistent HTTP-Only Cookie Sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL REFERENCES admin_users(email) ON DELETE CASCADE,
    session_token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token_hash);

-- ============================================================
-- 8. PRICING AUDIT HISTORY (Append-Only Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_audit_history (
    id SERIAL PRIMARY KEY,
    admin_email VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL,                -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_history_changed ON pricing_audit_history(changed_at DESC);
