# TIGER Social Media Webhook Claim Fix — Security Review

**Date:** 2026-08-19
**Status:** `REVIEWED / BYTE-EXACT / FORWARD-ONLY REPAIR`
**Migration:** `supabase/migrations/20260819140500_social_media_webhook_claim_fix.sql`
**SHA-256:** `4a83063482a13034f4e04e15a4e964f62fa6a5138f0348d2a7d6b1d7cc376fb9`

## Evidence and root cause

The exact-head Social Media DB rehearsal rebuilt every repository migration successfully and passed the static contracts. Its behavior step then failed inside `vvip_social_media_webhook_claim()` because PostgreSQL reported that `attempt_count` was ambiguous between the function OUT column and the persisted inbox table column.

This forward-only repair replaces only the claim routine and qualifies the persisted increment as `public.vvip_social_media_webhook_inbox.attempt_count + 1`.

## Preserved invariants

- only due `pending` events are claimable;
- `FOR UPDATE SKIP LOCKED` remains the concurrency boundary;
- one claim increments the persisted attempt counter once;
- browser roles retain no webhook execution authority;
- `service_role` remains the only granted executor;
- SECURITY DEFINER search path stays pinned to `pg_catalog, public`;
- `SET LOCAL lock_timeout = '2s'` bounds lock acquisition;
- no RLS weakening, destructive drop, Production mutation, or remote database mutation.

## Content-addressed approval

Approved SHA-256 only: `4a83063482a13034f4e04e15a4e964f62fa6a5138f0348d2a7d6b1d7cc376fb9`.

**No wildcard**, path-only exception, or scanner bypass is approved. Any byte drift invalidates this review.
