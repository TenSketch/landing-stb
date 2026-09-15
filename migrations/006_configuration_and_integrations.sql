-- ============================================================
-- 006: Configuration and integrations
-- ============================================================

-- System settings (brand, contact, currency, timezone, reference prefix, etc.)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by_email VARCHAR(255)
);

-- Booking settings (modes, durations, limits, fields, cancellation, workflow)
CREATE TABLE IF NOT EXISTS booking_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by_email VARCHAR(255)
);

-- Notification settings per channel
CREATE TABLE IF NOT EXISTS notification_settings (
    channel VARCHAR(50) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by_email VARCHAR(255)
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(50) NOT NULL, -- email, sms, whatsapp, push
    event VARCHAR(50) NOT NULL,   -- booking_created, booking_confirmed, driver_assigned, etc.
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel, event, name)
);
CREATE INDEX IF NOT EXISTS idx_notification_templates_event ON notification_templates(event);

-- Integration settings (payments, SMS, WhatsApp, EFC, Firebase, email)
CREATE TABLE IF NOT EXISTS integration_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(50) NOT NULL, -- PAYMENT, SMS, WHATSAPP, EFC, FIREBASE, EMAIL
    provider_key VARCHAR(100) NOT NULL, -- e.g. stripe, gupshup, twilio, firebase, smtp
    display_name VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mode VARCHAR(50), -- e.g. sandbox/live, deposit/full
    config JSONB NOT NULL DEFAULT '{}', -- public-ish configuration (publishable keys, currency, sender id)
    secrets_encrypted TEXT, -- encrypted credentials
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider_type, provider_key)
);
CREATE INDEX IF NOT EXISTS idx_integration_settings_type ON integration_settings(provider_type);
CREATE INDEX IF NOT EXISTS idx_integration_settings_default ON integration_settings(provider_type, is_default) WHERE is_default = TRUE;

-- Trigger for integration_settings updated_at
DROP TRIGGER IF EXISTS update_integration_settings_updated_at ON integration_settings;
CREATE TRIGGER update_integration_settings_updated_at
    BEFORE UPDATE ON integration_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for notification_templates updated_at
DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for system_settings updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for booking_settings updated_at
DROP TRIGGER IF EXISTS update_booking_settings_updated_at ON booking_settings;
CREATE TRIGGER update_booking_settings_updated_at
    BEFORE UPDATE ON booking_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for notification_settings updated_at
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
