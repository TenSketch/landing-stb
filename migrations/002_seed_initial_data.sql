-- ============================================================
-- SEED INITIAL VEHICLE TYPES & PRICING RULES
-- ============================================================

INSERT INTO vehicle_types (id, name, description, pax_max, is_active)
VALUES 
  (1, '4-Seater', 'Toyota / Honda / similar executive sedan', 4, TRUE),
  (2, '6-Seater', 'Toyota / Hyundai / similar premium MPV', 6, TRUE)
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, pax_max = EXCLUDED.pax_max;

-- Reset sequence for vehicle_types if needed
SELECT setval('vehicle_types_id_seq', (SELECT MAX(id) FROM vehicle_types));

-- Seed base rates (from verified configuration)
INSERT INTO pricing_rules (vehicle_id, base_fare, per_km_rate, minimum_fare, hourly_rate, daily_rate, is_active)
VALUES
  (1, 40.00, 2.20, 40.00, 60.00, 450.00, TRUE),
  (2, 45.00, 2.50, 45.00, 70.00, 550.00, TRUE)
ON CONFLICT (vehicle_id) DO NOTHING;

-- Seed default surcharges
INSERT INTO surcharges (name, type, value, start_time, end_time, applicable_mode, is_active)
VALUES
  ('Night Surcharge', 'flat', 15.00, '23:30:00', '06:00:00', 'ALL', FALSE),
  ('Peak Surcharge', 'percentage', 15.00, '07:30:00', '09:30:00', 'ONE_WAY', FALSE)
ON CONFLICT DO NOTHING;

-- Seed bootstrap admin user
INSERT INTO admin_users (email, is_active)
VALUES 
  ('bala@tensketch.com', TRUE)
ON CONFLICT (email) DO NOTHING;
