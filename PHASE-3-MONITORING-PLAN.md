# Phase 3 Monitoring Plan (Legacy Column Removal)

This plan prepares safe removal of `public.parts.vehicle_catalog_id` without downtime.

## Monitoring Window

- Recommended: 7-14 days in production traffic.
- Run checks from `PHASE-3-READINESS-CHECK.sql` daily and before release.

## Pass Criteria

- `mismatch_rows = 0` for the full window.
- Trigger `parts_sync_vehicle_reference_ids_trigger` exists and enabled.
- FK `parts_vehicle_registry_id_fkey` exists.
- No app code depends on `vehicle_catalog_id` anymore.

## When Criteria Pass

1. Create Phase 3 migration to:
   - Drop sync trigger.
   - Drop legacy FK (if still present).
   - Drop `vehicle_catalog_id`.
   - Keep `vehicle_registry_id` as canonical.
2. Deploy in low-risk window.
3. Re-run smoke checks for parts create/update flows.

## Rollback Strategy

- If an issue appears before dropping the old column:
  - Keep trigger + both columns active.
  - Continue reading from `vehicle_registry_id` and writing both via trigger.
- If issue appears after drop migration:
  - Roll forward with hotfix migration re-introducing the old column from canonical data.
