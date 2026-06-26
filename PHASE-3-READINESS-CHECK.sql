-- Phase 3 readiness checks
-- Goal: decide when dropping legacy parts.vehicle_catalog_id is safe.
-- Run these checks during the monitoring window (daily or before deploy).

-- 1) Data parity check between old and new columns.
SELECT
  COUNT(*) AS total_parts,
  COUNT(*) FILTER (WHERE vehicle_catalog_id IS NULL AND vehicle_registry_id IS NULL) AS both_null,
  COUNT(*) FILTER (WHERE vehicle_catalog_id IS NOT NULL AND vehicle_registry_id IS NOT NULL) AS both_present,
  COUNT(*) FILTER (
    WHERE vehicle_catalog_id IS DISTINCT FROM vehicle_registry_id
  ) AS mismatch_rows
FROM public.parts;

-- 2) Show mismatched rows (must return 0 rows before Phase 3).
SELECT id, vehicle_catalog_id, vehicle_registry_id
FROM public.parts
WHERE vehicle_catalog_id IS DISTINCT FROM vehicle_registry_id
ORDER BY id
LIMIT 100;

-- 3) Verify sync trigger exists and is enabled.
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS trigger_enabled,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'parts'
  AND t.tgname = 'parts_sync_vehicle_reference_ids_trigger';

-- 4) Verify canonical FK exists.
SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.parts'::regclass
  AND conname = 'parts_vehicle_registry_id_fkey';

-- 5) Optional: check if legacy compatibility view exists.
SELECT
  c.relname AS name,
  c.relkind AS kind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('vehicle_catalog', 'vehicle_registry')
ORDER BY c.relname;

-- Exit criteria for Phase 3 (drop legacy column):
-- - mismatch_rows = 0 for the full monitoring window.
-- - sync trigger exists and enabled.
-- - parts_vehicle_registry_id_fkey exists.
-- - application writes/reads rely on vehicle_registry_id only.
