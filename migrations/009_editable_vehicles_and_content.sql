-- ============================================================
-- 9. EXTEND VEHICLE TYPES — admin-editable fleet (image, features, display)
-- ============================================================
ALTER TABLE vehicle_types
  ADD COLUMN IF NOT EXISTS slug VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS category VARCHAR(32),
  ADD COLUMN IF NOT EXISTS tag VARCHAR(48),
  ADD COLUMN IF NOT EXISTS tag_style VARCHAR(24),
  ADD COLUMN IF NOT EXISTS pax INT,
  ADD COLUMN IF NOT EXISTS luggage INT,
  ADD COLUMN IF NOT EXISTS base_fare_sgd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS per_km_sgd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS min_fare_sgd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hourly_sgd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS fallback_image_url TEXT,
  ADD COLUMN IF NOT EXISTS description_html TEXT,
  ADD COLUMN IF NOT EXISTS features_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- Seed display data from existing hardcoded VEHICLES (idempotent: only fills NULLs)
UPDATE vehicle_types SET
  slug = CASE id
    WHEN 1 THEN 'sedan-4'
    WHEN 2 THEN 'mpv-6'
    WHEN 3 THEN 'luxury-3'
    ELSE LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
  END,
  full_name = name,
  category = CASE WHEN name ILIKE '%mpv%' OR name ILIKE '%6%' THEN 'mpv'
                  WHEN name ILIKE '%luxury%' OR name ILIKE '%vip%' THEN 'luxury'
                  ELSE 'sedan' END,
  pax = pax_max
WHERE slug IS NULL;

UPDATE vehicle_types SET
  base_fare_sgd = COALESCE(base_fare_sgd, 40),
  per_km_sgd = COALESCE(per_km_sgd, 2.2),
  min_fare_sgd = COALESCE(min_fare_sgd, 55),
  hourly_sgd = COALESCE(hourly_sgd, 60);

-- ============================================================
-- 10. EDITABLE LANDING CONTENT (FAQ, hero, services)
-- ============================================================
CREATE TABLE IF NOT EXISTS content_blocks (
  id SERIAL PRIMARY KEY,
  block_key VARCHAR(64) UNIQUE NOT NULL,           -- 'hero.title', 'faq.booking', etc.
  category VARCHAR(32) NOT NULL DEFAULT 'misc',    -- 'hero' | 'faq' | 'service' | 'footer' | 'misc'
  title VARCHAR(255),
  body TEXT,
  icon VARCHAR(64),
  image_url TEXT,
  meta_json JSONB DEFAULT '{}'::jsonb,             -- arbitrary key/value (price, link, sort order, etc.)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_blocks_category ON content_blocks(category, sort_order);

-- Seed FAQ block from hardcoded FAQS array
INSERT INTO content_blocks (block_key, category, title, body, sort_order) VALUES
  ('faq.booking', 'faq', 'How do I book a transfer?',
   'You can book instantly through our website — pick your pickup, destination, vehicle, and time. Confirmation arrives by email within seconds, and your chauffeur details follow once assigned.', 1),
  ('faq.payment', 'faq', 'How does payment work?',
   'We accept all major credit/debit cards and corporate billing accounts. Payment is taken securely at the time of booking; receipts are emailed automatically.', 2),
  ('faq.cancel', 'faq', 'What is the cancellation policy?',
   'Free cancellation up to 24 hours before pickup. Within 24 hours, a 50% fee applies. No-shows are charged in full. See terms at the bottom of the booking page.', 3),
  ('faq.fleet', 'faq', 'Which vehicles are available?',
   'We operate executive sedans, luxury MPVs, and VIP limousines — each with a professional English-speaking chauffeur, complimentary water, and in-car WiFi.', 4),
  ('faq.flight', 'faq', 'Do you track flight landings?',
   'Yes. For airport pickups we monitor your flight in real time and adjust pickup automatically for delays — at no extra charge.', 5),
  ('faq.childseat', 'faq', 'Are child seats available?',
   'Yes — baby seats, toddler seats, and booster seats are available on request at no charge. Just mention it in the special instructions.', 6)
ON CONFLICT (block_key) DO NOTHING;

-- Seed services block from services.json
INSERT INTO content_blocks (block_key, category, title, body, icon, meta_json, sort_order) VALUES
  ('service.airport_transfer', 'service', 'Airport Transfer', 'Flat-rate sedan/MPV to Changi, Seletar, and Cruise Centre.', 'flight_takeoff', '{"priceSGD":55}'::jsonb, 1),
  ('service.point_to_point', 'service', 'Point-to-Point', 'City rides between any two addresses in Singapore.', 'directions_car', '{"priceSGD":45}'::jsonb, 2),
  ('service.hourly_disposal', 'service', 'Hourly Disposal', 'Dedicated chauffeur by the hour — minimum 3 hours.', 'schedule', '{"priceSGD":60}'::jsonb, 3),
  ('service.daily_booking', 'service', 'Full-Day Tour', '8 hours of private chauffeured touring across Singapore.', 'calendar_today', '{"priceSGD":350}'::jsonb, 4),
  ('service.cross_border', 'service', 'Cross-Border', 'Day trips to Johor Bahru, Legoland, or Malacca with paperwork.', 'commute', '{"priceSGD":120}'::jsonb, 5)
ON CONFLICT (block_key) DO NOTHING;

-- Seed hero content block
INSERT INTO content_blocks (block_key, category, title, body, image_url, meta_json) VALUES
  ('hero.main', 'hero', 'Majestic Hospitality Since 2014',
   'Singapore''s most trusted chauffeured transport — executive sedans, luxury MPVs, and VIP limousines for every occasion.',
   '/hero-bg.jpg',
   '{"tagline":"Airport • City • Cross-Border","cta":"Book Now"}'::jsonb)
ON CONFLICT (block_key) DO NOTHING;