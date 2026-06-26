-- Phase 1 compatibility migration for replacing legacy vehicle_catalog naming.
-- Goals:
-- 1) Canonical table name becomes public.vehicle_registry.
-- 2) Legacy name public.vehicle_catalog remains available as a compatibility view.
-- 3) No breaking change for existing queries, FK relationships, or RLS behavior.

BEGIN;

DO $$
BEGIN
  -- If legacy table exists and new table does not, rename the base table.
  IF to_regclass('public.vehicle_registry') IS NULL
     AND to_regclass('public.vehicle_catalog') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = 'vehicle_catalog'
         AND c.relkind = 'r'
     ) THEN
    EXECUTE 'ALTER TABLE public.vehicle_catalog RENAME TO vehicle_registry';
  END IF;
END $$;

-- Normalize legacy index names if they still exist after rename.
ALTER INDEX IF EXISTS public.vehicle_catalog_brand_idx RENAME TO vehicle_registry_brand_idx;
ALTER INDEX IF EXISTS public.vehicle_catalog_model_idx RENAME TO vehicle_registry_model_idx;
ALTER INDEX IF EXISTS public.vehicle_catalog_year_idx RENAME TO vehicle_registry_year_idx;

DO $$
BEGIN
  -- Normalize legacy unique constraint name on the renamed table.
  IF to_regclass('public.vehicle_registry') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'vehicle_catalog_unique_vehicle'
    ) THEN
      ALTER TABLE public.vehicle_registry
        RENAME CONSTRAINT vehicle_catalog_unique_vehicle TO vehicle_registry_unique_vehicle;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  -- If vehicle_registry exists and vehicle_catalog name is free,
  -- create a compatibility view with invoker security.
  IF to_regclass('public.vehicle_registry') IS NOT NULL
     AND to_regclass('public.vehicle_catalog') IS NULL THEN
    EXECUTE '
      CREATE VIEW public.vehicle_catalog
      WITH (security_invoker = true)
      AS
      SELECT * FROM public.vehicle_registry
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.vehicle_registry') IS NOT NULL THEN
    COMMENT ON TABLE public.vehicle_registry IS 'Canonical vehicle reference table (replaces legacy vehicle_catalog).';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'vehicle_catalog'
      AND c.relkind = 'v'
  ) THEN
    COMMENT ON VIEW public.vehicle_catalog IS 'Compatibility view for legacy name; backed by public.vehicle_registry.';
  END IF;
END $$;

COMMIT;
