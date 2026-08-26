# Social Core Foundation Security Review — 2026-08-18

**Migration:** `supabase/migrations/20260818125000_social_core_foundation.sql`
**Reviewed SHA-256:** `d7f15478df2ff3e244632042cf28d867eb3cea8a562050f68834d793905d2151`
**Review refreshed:** 2026-08-19
**Scope:** repository review only; this document does not authorize applying the migration to Staging or Production.

## Result

The Steel Shield scan reported **0 CRITICAL** findings and **25 HIGH review-required findings**. The HIGH findings are accepted for this exact migration only for the reasons below. Any byte change invalidates this review and must produce a new content-addressed review.

## Binding text contract

`public.vvip_social_text_normalize(text)` trims only the explicit edge-whitespace set U+0009–U+000D, U+0020, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000, and U+FEFF. It performs no NFC/NFKC rewrite. PostgreSQL `char_length` therefore enforces the 5,000 limit in Unicode code points, including astral characters as one code point. The browser contract mirrors the same edge set and count.

The helper is immutable, strict, data-independent, and exposes no table access. Its one exact `EXECUTE` grant to `authenticated` is required because authenticated post writes evaluate the constraint and write trigger; it is the one additional HIGH grant finding.

## Identity boundary

The migration does not create a second account authority and does not use `auth.uid()`.

Every browser-owned Social Core identity predicate reuses:

`public.vvip_marketplace_actor_id()`

The current implementation of that helper accepts only the converged Clerk JWT `sub` form `user_*` and resolves non-Clerk subjects to `NULL`. The new tables also constrain stored Social Core subjects to the same `user_*` form.

## NOT NULL findings

All reported `NOT_NULL_RISK` findings are on columns of **new tables created in this same unapplied migration**:

- `vvip_social_relationships`;
- `vvip_social_posts`.

There is no existing-row backfill and no alteration of a populated Social Core table. Therefore the classic NOT NULL migration risk—breaking existing rows during an in-place constraint addition—does not apply to these lines.

## UPDATE_WITHOUT_WHERE findings

The two `UPDATE_WITHOUT_WHERE` findings are scanner lexical false positives caused by SQL policy/trigger language containing `UPDATE` without a DML `UPDATE <table> SET ... WHERE ...` statement.

The migration contains no bulk data update and no data rewrite.

## Authenticated grants

The migration intentionally grants only the table operations required for the first Social Core slice to the `authenticated` role. This does **not** create open access because both Social Core tables:

1. enable Row Level Security;
2. force Row Level Security;
3. revoke all prior privileges from `public`, `anon`, and `authenticated` before regranting the bounded DML operations;
4. define per-operation policies bound to the current Clerk actor;
5. use write-guard triggers for immutable scope and relationship-state transitions.

There is no DML grant to `anon`.

## Policy review

### Relationships

- read: only either participant can see the row;
- insert: only the current Clerk actor can be the requester;
- self-relationship is denied;
- one unordered pair is enforced by generated low/high subjects plus a unique constraint;
- update: only the addressee can accept a pending request into `friends`;
- requester/addressee scope is immutable;
- delete: either participant can remove a pending or accepted relationship, which covers cancel, decline, and unfriend at this foundation stage.

### Posts

- no anonymous table privilege is granted;
- the authenticated actor can read their own posts;
- authenticated users can read `public` posts;
- `friends` posts require an accepted relationship row for the viewer/author pair;
- `only_me` therefore remains owner-only;
- insert/update/delete are owner-scoped to the current Clerk actor;
- author and creation scope cannot be reassigned by a browser update;
- post bodies are normalized by the binding text helper before storage, whitespace-only values are rejected, and size is bounded to 5,000 Unicode code points.

## Legacy feed isolation

`public.feed_posts` is explicitly not promoted into Social Core authority. Its historical open insert policy and legacy media semantics are not reused, and this migration performs no legacy feed data copy.

## Media boundary

This migration intentionally does not create a Social media table. The existing sovereign media finalization plane is Marketplace-scoped. Social image publication requires a separate reviewed bridge so the project does not create a second untrusted image authority.

## Known deferred controls

These are not treated as completed by this foundation migration:

- block/mute enforcement in feed visibility;
- rate limiting / anti-spam for friend requests;
- Social media attachment persistence;
- reactions/comments/share/save;
- moderation state for Social posts;
- public unauthenticated Social feed projection;
- Staging migration rehearsal and Production promotion.

They remain explicit later gates and are not silently inferred from this review.

## Approval boundary

This security review approves only adding the exact reviewed migration bytes to the repository's **reviewed static-scan baseline** so subsequent byte drift fails closed.

It does **not** approve:

- applying the migration to Supabase;
- changing Clerk configuration;
- changing Production data;
- bypassing the LC03 rehearsal;
- merging directly to `main`;
- claiming full Social Core completion.
