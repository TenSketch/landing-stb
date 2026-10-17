-- 012_surcharges_unique_name.sql
--
-- Make the 002 seed genuinely idempotent.
--
-- 002_seed_initial_data.sql inserts the two default surcharge rows with a BARE
-- `ON CONFLICT DO NOTHING`. That clause only arbitrates when a unique constraint covers the
-- conflicting columns, and `surcharges` has only ever had a PRIMARY KEY on `id` — so nothing
-- ever conflicted. scripts/migrate.js keeps no ledger: it re-executes every file in
-- migrations/ on every run, so each `npm run db:migrate` appended 2 duplicate rows. The live
-- database had accumulated 22 of them (2026-09-15 x14, 09-16 x6, 09-28 x2).
--
-- `surcharges.name` is the natural key: the table is seed-only (no application code inserts
-- into it — verified across server.js, lib/, api/ and public/), so uniqueness on `name` is safe.
-- De-duplicate the accumulated rows (keeping the lowest id, i.e. the original seed row) and
-- enforce the constraint. Once the index exists, 002's bare ON CONFLICT DO NOTHING becomes a
-- real no-op on re-runs.
--
-- Deliberately NOT changing 002 to `ON CONFLICT (name) DO NOTHING`: migrations run in filename
-- order, so 002 executes BEFORE this file on a fresh database and would fail with
-- "no unique or exclusion constraint matching the ON CONFLICT specification" (42P10).
--
-- Idempotent: re-running deletes nothing and CREATE UNIQUE INDEX IF NOT EXISTS is a no-op.

DELETE FROM surcharges a
USING surcharges b
WHERE a.name = b.name
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS surcharges_name_key ON surcharges (name);
