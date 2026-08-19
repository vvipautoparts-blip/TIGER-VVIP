# TIGER Social Relationship Guard Authority Fix — Security Review

**Date:** 2026-08-19
**Status:** `REVIEWED / BYTE-EXACT / PRIVACY PROOF`
**Migration:** `supabase/migrations/20260819131500_social_relationship_guard_authority_fix.sql`
**SHA-256:** `866129891ada5e74517f8909a488042716530f5dad896327d064084409c10b40`

## Purpose

This forward-only migration repairs the runtime authority mismatch discovered by the Social DB rehearsal: the relationship trigger must enforce the private block-pair authority without granting browser roles direct execution of the private block oracle.

## Security invariants reviewed

- The fix is forward-only; the previously reviewed privacy migration bytes are not rewritten.
- `vvip_social_guard_relationship_write()` is `SECURITY DEFINER` with `search_path = pg_catalog, public` pinned on the function declaration.
- The trigger derives the signed actor only from `vvip_marketplace_actor_id()` and contains no `current_user` role branch whose meaning could change under definer execution.
- Insert still forbids self-relationships, requires `pending`, and binds a present signed actor to `requester_subject`.
- Update keeps relationship subjects immutable, permits only `pending -> friends`, and binds a present signed actor to the recipient.
- Delete permits a present signed actor only when that actor is a relationship participant.
- Every insert/update still checks the private `vvip_social_is_blocked_pair()` authority.
- No `GRANT EXECUTE` is added for `vvip_social_is_blocked_pair(text,text)` to `authenticated`, `anon`, or `public`.
- The migration performs no table drop, policy drop, column drop, truncate, remote mutation, seed, or Production operation.
- The migration is transactional and contains only the function replacement required to restore the intended trigger authority.

## Steel Shield findings before content-addressed review

The scanner reported:

- `CRITICAL=0`
- `HIGH=4`

All four HIGH findings were `NOT_NULL_RISK` lexical matches on `actor is not null` predicates inside PL/pgSQL control flow. They are **not schema `SET NOT NULL` operations** and do not acquire table rewrite/constraint locks. No destructive schema change is present.

The migration is accepted only at the exact SHA-256 above. Any byte drift must re-enter review automatically.

## Acceptance condition

This review is valid only when all of the following agree on the same bytes:

1. migration SHA-256;
2. this review document;
3. the byte-exact regression test;
4. Steel Shield reviewed-migration registry;
5. Social DB rehearsal on the exact PR head.

No wildcard, path-only bypass, or migration-wide scanner disable is approved.
