-- ============================================================
-- 10. ALIGN VEHICLE_TYPES COLUMNS to match lib/vehicles.js
--     (luggage_capacity, sort_order, image_url)
-- ============================================================
ALTER TABLE vehicle_types
  ADD COLUMN IF NOT EXISTS luggage_capacity INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- If display_order was added in migration 009, mirror it into sort_order for backward compat
UPDATE vehicle_types
  SET sort_order = display_order
  WHERE sort_order = 0 AND display_order > 0;