# Production Recovery Readiness Plan

**Goal:** Prove that VVIP TIGER Production can be recovered before any destructive or irreversible release action.

## Platform baseline

Supabase documentation states that hosted projects may have daily backups depending on plan, with PITR available as an add-on. Backup availability and retention for this exact Production project have not been exposed by the connected tool surface and therefore are **not assumed**.

The Production project currently runs Postgres 17.6, which is within the modern physical-backup generation described by Supabase documentation, but this does not prove an accessible backup exists for this specific project/plan.

## Required evidence

1. Open Production **Database > Backups** and record whether scheduled backups or PITR are enabled and the available recovery window.
2. If no provider backup is available, create an off-site logical backup using the supported Supabase CLI / pg_dump procedure before Production mutation.
3. Never test a destructive restore against the live Production project merely to prove the button works.
4. Prefer a restore/clone rehearsal into a non-Production disposable project where available.
5. After restore, verify at minimum:
   - Phase A migration ledger;
   - profile row count and RLS/FORCE RLS;
   - fail-closed profile resolver;
   - no unexpected browser privileges;
   - Auth/user state accounted for according to the credential-retirement gate;
   - Storage limitation explicitly accounted for, because database backup restores Storage metadata but does not restore deleted Storage objects themselves.
6. Record restore source timestamp, destination project ref, schema/data fingerprints, and teardown evidence for disposable recovery project.

## Release boundary

A provider backup listing is useful but is not equivalent to a tested restore. Before the first destructive Production security operation, at minimum provider backup availability or an off-site logical backup must be verified. Before claiming disaster-recovery readiness, a non-Production restore drill must pass.

No restore, clone, PITR purchase or Production downtime is authorized by this document.
