-- ============================================================
-- 008: Seed platform baseline (safe reference config only)
-- ============================================================

-- Bootstrap admin user from env handled in scripts/migrate.js; no hardcoded password.
-- Link existing bootstrap admin email to SUPER_ADMIN role if not already set.
DO $$
DECLARE
    super_role_id INT;
BEGIN
    SELECT id INTO super_role_id FROM roles WHERE slug = 'SUPER_ADMIN';
    IF super_role_id IS NOT NULL THEN
        UPDATE admin_users SET role_id = super_role_id WHERE role_id IS NULL;
    END IF;
END $$;

-- Default system settings (brand/contact from env or safe defaults)
INSERT INTO system_settings (key, value) VALUES
('brand', '{"name": "STB Singapore", "tagline": "Majestic Hospitality Since 2014", "logoUrl": "/stb-logo.png", "favicon": "/favicon.ico"}'),
('contact', '{"phone": "+65 9062 9107", "email": "bala@tensketch.com", "whatsapp": "+6590629107", "address": "Singapore", "websiteUrl": "https://singaporetourbooking.com"}'),
('currency', '{"code": "SGD", "symbol": "S$"}'),
('timezone', '{"name": "Asia/Singapore"}'),
('booking_reference_prefix', '{"value": "STB"}'),
('content', '{"tollsExcludedText": "Tolls and ERP charges are excluded from the estimated fare unless otherwise stated.", "fareDisclaimer": "The estimated fare is based on distance and time calculations. Final fare may vary due to traffic, route changes, tolls, waiting time, or surcharges.", "estimatedFareText": "Estimated Transport Fare", "bookingInstructions": "Enter your pickup and destination, choose your vehicle, and confirm your booking."}')
ON CONFLICT (key) DO NOTHING;

-- Default booking settings
INSERT INTO booking_settings (key, value) VALUES
('modes', '{"oneWay": true, "hourly": true, "daily": true}'),
('durations', '{"minHours": 1, "maxHours": 12, "minDays": 1, "maxDays": 30}'),
('advance_booking', '{"minHoursAdvance": 1, "maxMonthsAdvance": 12, "cutoffTime": "23:59"}'),
('passenger_limits', '{"minPax": 1, "maxPax": 20}'),
('customer_fields', '{"required": ["name", "email", "phone"], "optional": ["whatsapp", "flightNo", "notes"]}'),
('cancellation', '{"enabled": true, "allowedUntilHours": 24, "policyText": "Cancellations made within 24 hours of pickup may be subject to a fee."}'),
('status_workflow', '{"default": "PENDING", "customerVisible": ["PENDING", "CONFIRMED", "ASSIGNED", "DRIVER_EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]}')
ON CONFLICT (key) DO NOTHING;

-- Default notification settings
INSERT INTO notification_settings (channel, enabled, config) VALUES
('email', TRUE, '{"defaultFrom": "STB Singapore <noreply@singaporetourbooking.com>"}'),
('sms', FALSE, '{}'),
('whatsapp', FALSE, '{}'),
('push', FALSE, '{}')
ON CONFLICT (channel) DO NOTHING;

-- Default notification templates
INSERT INTO notification_templates (channel, event, name, subject, body) VALUES
('email', 'booking_created', 'Booking Confirmation', 'Your STB Booking Confirmation - {{voucherCode}}',
 '<p>Hi {{passengerName}},</p><p>Thank you for booking with STB Singapore. Your reference is <strong>{{voucherCode}}</strong>.</p><p>Pickup: {{pickup}}<br>Destination: {{destination}}<br>Date/Time: {{dateTime}}<br>Vehicle: {{vehicle}}<br>Fare: {{fare}}</p><p>Tolls and ERP charges are excluded unless otherwise stated.</p>'),
('email', 'booking_confirmed', 'Booking Confirmed', 'Your STB Booking is Confirmed - {{voucherCode}}',
 '<p>Hi {{passengerName}},</p><p>Your booking <strong>{{voucherCode}}</strong> has been confirmed.</p>'),
('email', 'driver_assigned', 'Driver Assigned', 'Your STB Driver Details - {{voucherCode}}',
 '<p>Hi {{passengerName}},</p><p>Your driver {{driverName}} ({{driverPhone}}) has been assigned for booking {{voucherCode}}.</p>'),
('email', 'booking_cancelled', 'Booking Cancelled', 'Your STB Booking Cancelled - {{voucherCode}}',
 '<p>Hi {{passengerName}},</p><p>Your booking <strong>{{voucherCode}}</strong> has been cancelled.</p>')
ON CONFLICT (channel, event, name) DO NOTHING;

-- Default integration placeholders
INSERT INTO integration_settings (provider_type, provider_key, display_name, enabled, mode, config) VALUES
('EMAIL', 'smtp', 'SMTP Email', FALSE, 'live', '{}'),
('PAYMENT', 'stripe', 'Stripe', FALSE, 'sandbox', '{"currency": "SGD"}'),
('SMS', 'twilio', 'Twilio', FALSE, 'sandbox', '{}'),
('WHATSAPP', 'gupshup', 'Gupshup', FALSE, 'sandbox', '{}'),
('FIREBASE', 'fcm', 'Firebase Cloud Messaging', FALSE, 'sandbox', '{}'),
('EFC', 'efc', 'EFC Provider', FALSE, 'sandbox', '{}')
ON CONFLICT (provider_type, provider_key) DO NOTHING;

-- Update existing vehicle types with image/luggage/sort fields if missing
ALTER TABLE vehicle_types
    ADD COLUMN IF NOT EXISTS luggage_capacity INT DEFAULT 2,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Seed default driver records only if none exist (safe reference)
INSERT INTO drivers (name, phone, email, is_active)
SELECT 'Sample Driver (Inactive)', '+65 0000 0000', 'driver@example.com', FALSE
WHERE NOT EXISTS (SELECT 1 FROM drivers)
ON CONFLICT (id) DO NOTHING;
