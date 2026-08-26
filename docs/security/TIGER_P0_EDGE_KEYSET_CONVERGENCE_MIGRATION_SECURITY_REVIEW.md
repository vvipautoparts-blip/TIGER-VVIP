# TIGER P0-D Edge Keyset Convergence Migration Security Review

Reviewed migration:

- `supabase/migrations/20260821133000_social_edge_keyset_convergence.sql`
  - SHA-256: `6a2195497edb441f4e0525d14c608e5934ae55e7b388937f189a777aeb6ba3cb`

Behavioral review source:

- exact PR head before hash approval: `1ec29d99a9e4701b7dce35dca8bc92e5b4d7cec1`
- TIGER Social DB Rehearsal run `32486047324`
- fresh `supabase db reset --local`: PASS
- all pre-existing Social/Profile/P0 Messaging SQL proofs: PASS
- `Prove P0-D actor-bound keyset and privacy behavior`: PASS
- content-addressed review intentionally remained RED because this exact migration hash was not yet in Steel Shield.

## Steel Shield classification

Before approval, these exact bytes produced:

- `CRITICAL=0`
- `HIGH=2`

The two HIGH findings were reviewed individually and are expected lexical findings, not destructive SQL or broad browser table authority.

### `NOT_NULL_RISK=1`

The scanner matched `p_cursor IS NOT NULL` inside the bounded read RPC. This is an input-control predicate only. The migration does not add a `NOT NULL` constraint to an existing populated column and does not rewrite existing data.

### `BROAD_GRANT_TO_AUTHENTICATED=1`

The only authenticated grant is exact `EXECUTE` on:

- `vvip_social_feed_read_keyset(text, integer)`

`PUBLIC` and `anon` execute are revoked. The internal cursor helpers `vvip_gate5_cursor_encode(jsonb)` and `vvip_gate5_cursor_decode(text)` are not executable by `authenticated`. Direct authenticated SELECT on `vvip_social_posts` remains denied by the current orphan-safe presentation boundary.

## Cursor authority

The cursor is opaque transport state, not authorization state. Version 2 binds to the current active `profile_id` and carries only:

- `v`
- `kind = social_feed`
- `actor_profile_id`
- `created_at`
- `id`

It does not carry Clerk subjects. A cursor minted for one active profile is rejected for another with `GATE5_CURSOR_CONTEXT_MISMATCH`.

The encoder canonicalizes PostgreSQL Base64 by removing CR/LF before URL-safe conversion. This was required because PostgreSQL `encode(..., 'base64')` may insert line breaks in longer payloads; the behavioral rehearsal demonstrated that the corrected encoder now emits values accepted by the strict decoder.

## Privacy and lifecycle re-evaluation

Every page derives the current actor server-side and requires `vvip_social_actor_active()`. The keyset query calls the current `vvip_social_can_view_post(post_id, actor)` for each candidate row, so block/friendship/privacy authority is re-evaluated on every page instead of being frozen into the cursor.

The rehearsal proves:

- same-actor keyset continuation works without duplicate rows;
- cross-profile cursor reuse fails closed;
- a newly created block removes the author from subsequent reads;
- deactivated authors render with the current orphan-safe tombstone (`عضو غير متاح`) and no subject serialization;
- a deactivated viewer cannot continue reading.

## Pagination and integrity

Pagination uses `(created_at DESC, post_id DESC)` keyset ordering and the supporting composite index `vvip_social_posts_feed_keyset_idx`. It does not use `OFFSET` and does not import the historical Gate5 stack or its raw-subject cursor shape.

The RPC validates `p_limit` in the range 1..100 and validates cursor structure, version, kind, UUIDs, and timestamp before use. Invalid values fail closed as `GATE5_CURSOR_INVALID`.

## Destructive SQL and authority review

The migration contains no `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, `DROP COLUMN`, `DISABLE ROW LEVEL SECURITY`, `DROP POLICY`, anonymous grant, unbounded DELETE, or raw authenticated table grant. The SECURITY DEFINER read RPC pins `search_path = pg_catalog, public`.

No Production/Staging database, provider credential, payment surface, or real-user data was touched. Behavioral verification ran only in the repository's isolated local Supabase rehearsal.

## Approval rule

This review approves **only** SHA-256:

`6a2195497edb441f4e0525d14c608e5934ae55e7b388937f189a777aeb6ba3cb`

Any byte drift invalidates this approval and must re-enter Steel Shield classification, local database behavioral proof, and content-addressed review before merge.
