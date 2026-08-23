# Market Genesis Durable Replay Authority — Security Review

**Date:** 2026-08-23
**Scope:** source-only review of `supabase/migrations/20260823190000_market_genesis_durable_replay.sql`
**Reviewed SHA-256:** `484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad`
**Scanner result on exact bytes:** `CRITICAL=0 HIGH=15`

## Security objective

This migration supplies the durable cross-instance replay source of truth required by TIGER Private Market Genesis Contact/Handoff. It does not create a messaging backend and does not create any buyer/seller transaction state.

The authority has exactly two mutation capabilities:

1. issue one short-lived contact capability against one SHA-256 authorization-nonce digest;
2. atomically consume one exact-bound capability once for terminal handoff.

## Reviewed invariants

### No raw nonce persistence

The table stores `authorization_nonce_hash` only and requires exactly 64 lowercase hexadecimal characters. The raw authorization nonce is hashed in the server-side JavaScript boundary before this RPC is called and is not a database column or RPC argument.

### Minimal durable payload

The durable row contains only bounded authority bindings required to prevent cross-instance replay:

- capability/request identifiers;
- requester and owner subject references;
- advertisement/sector/country/channel bindings;
- policy and Sector Physics versions;
- reveal-policy reference/boolean;
- issue/expiry/consume timestamps;
- SHA-256 nonce digest.

It contains no raw private intent, email, phone, contact value, message body/content, checkout, order, payment, escrow, settlement, transaction, delivery, ownership-transfer, or deal-state fields.

### Cross-instance uniqueness and atomicity

`capability_id` is the primary key and `authorization_nonce_hash` is unique. Issuance uses a single `INSERT ... ON CONFLICT DO NOTHING` followed by `ROW_COUNT`; therefore concurrent duplicate nonce or capability attempts cannot both succeed.

Handoff consumption uses one bounded `UPDATE` whose `WHERE` clause binds capability ID, request ID, requester, owner, advertisement, sector, country, channel, policy version, physics version, `consumed_at IS NULL`, and unexpired server database time. `ROW_COUNT = 1` is the only success condition. Concurrent duplicate consumes collapse to the same opaque conflict result.

### Time authority

The migration uses PostgreSQL `statement_timestamp()` for current-time decisions. A capability must expire after issue, may live for no more than five minutes, must still be unexpired at insertion, and must remain unexpired when consumed.

### Browser and role boundary

The table has RLS enabled and forced. Direct table privileges are revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`.

The two mutation RPCs are `SECURITY DEFINER` with scanner-visible `search_path = pg_catalog`. Function EXECUTE is revoked from `PUBLIC`, `anon`, and `authenticated`; only `service_role` receives exact RPC EXECUTE permission. This keeps the durable replay authority server-only and prevents browser CRUD or direct replay-store access.

### Failure opacity

Issue failure returns only `CONTACT_REPLAY_OR_CONFLICT`; consume failure returns only `HANDOFF_REPLAY_OR_CONFLICT`. The RPCs intentionally do not distinguish duplicate, mismatch, not-found, expired, or malformed authority in a way that would create an enumeration oracle.

## Steel Shield classification

The exact reviewed bytes produce `CRITICAL=0 HIGH=15`.

- Fourteen HIGH findings are `NOT_NULL_RISK` lexical hits on mandatory integrity columns of a brand-new replay-authority table. No existing table is being backfilled or altered by these constraints.
- One HIGH finding is the scanner's lexical `NOT NULL` match on an `IS NOT NULL` input-validation predicate for `p_reveal_policy_ref`; it is not a schema mutation.
- The earlier scanner findings for `SECURITY_DEFINER_WITHOUT_SAFE_SEARCH_PATH` and `UPDATE_WITHOUT_WHERE` were removed by making the existing safe search path and bounded update predicate scanner-visible on the same source line. Security semantics were not weakened.

These 15 HIGH findings are accepted only for the exact SHA-256 above. Any SQL byte drift must invalidate this review automatically and re-enter Steel Shield inspection.

## Explicit non-claims

This review is repository/source evidence only.

- The migration has **not** been applied to Staging or Production by this work.
- No remote Supabase database was mutated.
- No Production Contact/Handoff activation is claimed.
- Source-level atomicity is not a substitute for real distributed environment verification.
- Market Genesis Production readiness must remain fail-closed until a separately authorized environment apply proves two or more runtime instances cannot issue the same nonce or consume the same capability twice.

The governing product laws remain unchanged:

- **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
- **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
