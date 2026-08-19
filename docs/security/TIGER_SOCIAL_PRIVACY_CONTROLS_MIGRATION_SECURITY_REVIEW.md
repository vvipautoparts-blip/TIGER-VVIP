# TIGER Social Privacy Controls — Security Review

## Review identity

- Migration: `supabase/migrations/20260819130000_social_privacy_controls.sql`
- Reviewed SHA-256: `a6dca63b5b2775af7c6f0eb0a7b3f252e6d21e1cbbca224984498c1664a04490`
- Scope: repository/local rehearsal only. No remote Staging or Production apply is authorized by this review.
- Status: **REVIEWED / CONTENT-ADDRESSED / LOCAL-REHEARSAL REQUIRED**

Any byte change to the migration invalidates this review and must re-enter Steel Shield review and local DB rehearsal.

## Steel Shield result before review baseline

The exact migration above was scanned while still unreviewed. The scanner reported:

- `CRITICAL=0`
- `HIGH=24`
- `NOT_NULL_RISK = 16`
- `POLICY_CHANGE_REVIEW_REQUIRED = 1`
- `BROAD_GRANT_TO_AUTHENTICATED = 7`

No CRITICAL finding is accepted or suppressed by this review.

### NOT_NULL_RISK = 16

All 16 findings belong to three **new tables created empty in this same migration**: block, mute, and report authorities. They do not convert an existing nullable production column, perform a destructive backfill, or impose a new NOT NULL constraint on pre-existing rows. The constraints are intentional integrity boundaries for identifiers, timestamps, reason/state fields, and actor/target ownership.

### POLICY_CHANGE_REVIEW_REQUIRED = 1

The existing `vvip_social_post_visible_read` policy is hardened **in place** with `ALTER POLICY`; no `DROP POLICY`, `DISABLE RLS`, or widening fallback exists. The policy delegates to `vvip_social_can_view_post_current(post_id)`, which derives the actor from the current server-side identity authority and then applies the existing owner/public/friends/only_me semantics plus the new two-way block check.

This is a tightening change: a currently blocked pair loses cross-party post visibility while the post author retains owner access. `only_me` remains owner-only and friendship remains required for `friends` visibility.

### BROAD_GRANT_TO_AUTHENTICATED = 7

All seven findings are exact `GRANT EXECUTE` statements on bounded functions. They are **not** table CRUD grants and they do not grant anonymous access:

1. current-view helper for the authenticated RLS policy;
2. block user RPC;
3. unblock user RPC;
4. mute user RPC;
5. unmute user RPC;
6. report user RPC;
7. bounded feed-read RPC.

Direct privileges on `vvip_social_blocks`, `vvip_social_mutes`, and `vvip_social_reports` remain revoked from `public`, `anon`, and `authenticated`. Report rows are not browser-readable; normal users can only submit a report through the bounded RPC.

## Security invariants reviewed

- All three privacy tables use `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- Browser roles receive no direct table CRUD authority.
- All user-facing privacy RPCs derive the actor from `public.vvip_marketplace_actor_id()`; caller-supplied actor identity is not trusted.
- All SECURITY DEFINER privacy functions pin `search_path` to `pg_catalog, public`.
- Block is a **two-way authorization boundary**: either party blocking the other prevents cross-party post visibility and social interaction while active.
- Creating a block removes the existing relationship row for the pair. Unblocking never recreates friendship automatically.
- Relationship creation/acceptance consults the block authority and fails closed while a block is active.
- Reaction and comment RPCs remain bound to `vvip_social_can_view_post()`, so block-driven invisibility also denies those interactions.
- Mute is deliberately **not** an authorization boundary. It suppresses an author only from the bounded feed-read RPC and does not change direct post visibility.
- Reports are accepted through a bounded write RPC; normal browser roles cannot read the report table.
- No anonymous EXECUTE grant, service-role secret, remote credential, or provider token is introduced.
- No Production, `main`, or remote database mutation is performed by this repository review.

## Required behavioral proof

`tests/sql/tiger-social-privacy-controls.sql` must run against an isolated local Supabase/PostgreSQL rebuild from repository migrations and must prove, at minimum:

- `ONLY_ME_PRIVACY_PRESERVED=PASS`
- `BLOCK_SEVERS_FRIENDSHIP=PASS`
- `BLOCK_HIDES_ALL_CROSS_PARTY_POSTS=PASS`
- blocked relationship creation is denied;
- blocked reaction is denied;
- blocked comment is denied;
- `UNBLOCK_NO_FRIENDSHIP_RESURRECTION=PASS`
- `MUTE_SUPPRESSES_FEED=PASS`
- `MUTE_IS_NOT_AUTHORIZATION_BOUNDARY=PASS`
- report-table browser read is denied;
- `TIGER_SOCIAL_PRIVACY_PROOF=PASS`

Content-addressed review is necessary but not sufficient: this migration is not VERIFIED until the exact-head `TIGER Social DB Rehearsal` and the repository quality/security gates pass on the same source.
