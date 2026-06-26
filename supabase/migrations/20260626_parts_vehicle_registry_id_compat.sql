-- Phase 2 compatibility migration for parts vehicle reference column rename.
-- Goals:
-- 1) Introduce canonical parts.vehicle_registry_id.
-- 2) Keep legacy parts.vehicle_catalog_id working during transition.
-- 3) Keep both columns synchronized to avoid downtime.

BEGIN;

DO $$
DECLARE
  target_table text;
BEGIN
  IF to_regclass('public.parts') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.parts
    ADD COLUMN IF NOT EXISTS vehicle_registry_id bigint;

  -- Backfill in both directions for safe partial rollouts.
  UPDATE public.parts
  SET vehicle_registry_id = vehicle_catalog_id
  WHERE vehicle_registry_id IS NULL
    AND vehicle_catalog_id IS NOT NULL;

  UPDATE public.parts
  SET vehicle_catalog_id = vehicle_registry_id
  WHERE vehicle_catalog_id IS NULL
    AND vehicle_registry_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS parts_vehicle_registry_id_idx
    ON public.parts (vehicle_registry_id);

  -- Prefer canonical table when present.
  IF to_regclass('public.vehicle_registry') IS NOT NULL THEN
    target_table := 'vehicle_registry';
  ELSIF to_regclass('public.vehicle_catalog') IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = 'vehicle_catalog'
            AND c.relkind = 'r'
        ) THEN
    -- Fallback for environments where phase 1 did not run yet.
    target_table := 'vehicle_catalog';
  END IF;

  IF target_table IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'parts_vehicle_registry_id_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.parts ADD CONSTRAINT parts_vehicle_registry_id_fkey FOREIGN KEY (vehicle_registry_id) REFERENCES public.%I(id) ON DELETE SET NULL',
        target_table
      );
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.parts_sync_vehicle_reference_ids()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.vehicle_registry_id := COALESCE(NEW.vehicle_registry_id, NEW.vehicle_catalog_id);
  NEW.vehicle_catalog_id := COALESCE(NEW.vehicle_catalog_id, NEW.vehicle_registry_id);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.parts') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'parts_sync_vehicle_reference_ids_trigger'
  ) THEN
    CREATE TRIGGER parts_sync_vehicle_reference_ids_trigger
    BEFORE INSERT OR UPDATE ON public.parts
    FOR EACH ROW
    EXECUTE FUNCTION public.parts_sync_vehicle_reference_ids();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.parts') IS NOT NULL THEN
    COMMENT ON COLUMN public.parts.vehicle_registry_id IS 'Canonical vehicle registry reference. Keep in sync with legacy vehicle_catalog_id during transition.';
  END IF;
END $$;

COMMIT;
