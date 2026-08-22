# TIGER P0-D Edge Clean Convergence — Design

## Status

Approved-scope convergence design for issue #299. This design preserves the already approved P0-D behavior from PR #302 while replacing stale Gate5 technical assumptions with the verified current integration authority at base SHA `a5ae22f9b608f5c30776060492b69f1fafd2e45c`.

No `main`, Production, Staging provider, payment, remote database, or real-user mutation is authorized.

## Why PR #302 cannot be merged

PR #302 head `51fc5bbb1593cc37d2fde4147a22eb9c5d6bb43c` is not a safe integration candidate. Compared with the current integration head it is `191` commits ahead and `56` commits behind, with merge base `5422d144632ca6396f4599732d1359f5d3b4abbe`. Its inherited stack contains older Privacy/Gate2/Gate3/Gate4/Gate5 migrations and runtime code that conflict with the current P0-A/P0-B/Messaging convergence.

The P0-D behavioral delta is therefore reimplemented RED-first on a fresh integration child. PR #302 remains evidence/reference only until this clean lane supersedes it.

## Current authorities that must not regress

1. Safe post/comment/profile presentation from P0-B: browser surfaces do not serialize Clerk `user_*` subjects and unavailable authors render as `عضو غير متاح`.
2. Block precedence from the integrated privacy prerequisite: every feed page must still call the current `vvip_social_can_view_post` authority.
3. P0-A replay reconciliation in `scripts/social/post-domain.js`: bookmark/follow/repost replay uses mutation-id dedupe, deterministic sequence ordering, fail-closed idempotency conflicts, and applied-outcome semantics. P0-D must not add a second browser replay authority.
4. PostgreSQL remains durable authorization truth. Browser pagination state is navigation state only.
5. NO_VISITOR_MODE and lifecycle boundaries remain fail-closed; deactivated/deleted actors cannot gain mutation authority through edge handling.
6. Messaging convergence and its runtime adapter surface must remain intact.

## Gate5 convergence rule

P0-D preserves the Gate5 invariant — actor/context-bound keyset cursors and no offset pagination — but does **not** import the old Gate5 implementation.

The old Gate5 feed cursor encoded the raw Clerk subject inside a reversible Base64 payload and depended on the stale `vvip_social_mutes` table. Both conflict with current authority. The clean convergence therefore introduces a V2-compatible implementation with the same server-authoritative concept but a safe identity binding.

### Cursor V2

The browser receives an opaque URL-safe text cursor. The decoded payload contains only:

- `v = 2`;
- `kind = social_feed`;
- `actor_profile_id` — the current opaque profile UUID, never the Clerk subject;
- `created_at`;
- `id` — the last post UUID.

The encoding is transport opacity, not a secrecy or authorization mechanism. Every use is checked server-side against the current active actor profile and every returned post is independently filtered by `vvip_social_can_view_post`. Cursor tampering can change a navigation boundary but cannot widen visibility.

Cross-profile cursor reuse raises `GATE5_CURSOR_CONTEXT_MISMATCH`; malformed cursor state raises `GATE5_CURSOR_INVALID`. The browser receives only bounded application error codes, never raw database/provider details.

## Persistence surface

Add one forward migration after the current Messaging migrations:

`supabase/migrations/20260821133000_social_edge_keyset_convergence.sql`

It will:

- add the `(created_at DESC, post_id DESC)` feed index if absent;
- define internal `vvip_gate5_cursor_encode(jsonb)` / `vvip_gate5_cursor_decode(text)` helpers with no browser EXECUTE privilege;
- define `vvip_social_feed_read_keyset(text, integer)` as the bounded authenticated feed RPC;
- resolve the current actor and active `profile_id` internally;
- return safe author projection fields only (`author_profile_id`, display name, avatar, availability), never `author_subject`;
- preserve orphan-safe tombstones dynamically;
- re-evaluate `vvip_social_can_view_post` on every page so block/privacy changes take effect immediately;
- return at most the requested bounded page plus a server-created next cursor;
- expose EXECUTE only on the bounded feed RPC to `authenticated`;
- use FORCE-RLS-compatible current tables and no old `vvip_social_mutes` dependency.

Mute/snooze/preference behavior remains a presentation policy in the current feed read model after authorized rows are returned. It never becomes a database authorization rule.

## Runtime adapter behavior

`runtime.posts.readFeed({ limit, cursor })` moves to `vvip_social_feed_read_keyset`.

The adapter classifies only a fixed allowlist of transport/database states:

- cursor invalid/context mismatch -> `SOCIAL_FEED_STALE_CURSOR`;
- inactive actor/session -> `SOCIAL_FEED_SESSION_STALE`;
- HTTP 429 -> `SOCIAL_RATE_LIMITED` with fixed opaque `retryAfterMs = 5000`;
- thrown/transient/5xx feed read -> `SOCIAL_FEED_RETRYABLE`;
- all other failures -> `SOCIAL_PERSISTENCE_FAILED`.

Raw provider/database messages never leave the adapter.

Generic Social mutations also translate HTTP 429 to the same bounded opaque rate-limit result. No automatic durable mutation retry is introduced.

## Feed read model

The read model remains the safe presentation boundary. It:

- validates existing safe author projection rows exactly as today;
- accepts only a bounded opaque cursor string supplied by the trusted runtime result;
- forwards the cursor without decoding it in browser code;
- preserves the server `next_cursor` after applying presentation preferences;
- never adds `authorSubject` or decodes actor identity;
- permits a filtered page with zero visible presentation items to retain `hasMore`, avoiding a false terminal empty state when muted/snoozed authors consumed a server page.

## Feed controller

The controller implements the already approved P0-D behavior without creating durable authority:

- initial load plus keyset `loadNext()`;
- same-cursor transient retry only, maximum three attempts total with `250ms` then `500ms` delays;
- no automatic retry for 429, stale cursor, stale session, or durable mutation failures;
- one in-flight next-page operation at a time;
- rendered-post ID dedupe;
- stale cursor preserves already rendered content and requires an explicit clean reconnect;
- `IntersectionObserver` tail loading with a real keyboard-accessible load-more button fallback;
- semantic post labelling using the safe displayed author;
- keyboard focus moves to the first newly appended post only when the load-more control disappears at the terminal page;
- failed pagination cannot leak a pending focus request into a later automatic attempt;
- appended posts receive the same reactions/comments mounting path as the initial page;
- reduced-motion CSS disables transition/scroll motion for the affected controls.

## Comment rate-limit behavior

Comment create/reply/update/remove remains RPC-first. On a bounded `SOCIAL_RATE_LIMITED` result:

- the confirmed comment list stays visible;
- no provider detail is rendered;
- the controller enters an explicit cooldown;
- repeated user actions during the cooldown do not call the durable adapter again;
- retry occurs only after the cooldown and only from a new explicit user action;
- no automatic durable retry is added.

The controller accepts `retryAfterMs` only within a local maximum of 60 seconds; missing/invalid values use 5 seconds. The runtime adapter itself exposes the fixed 5-second value for provider 429 responses.

## Search boundary

Issue #298 is an independently assigned discovery/search lane. This P0-D convergence does not edit search-lane files or invent search-provider behavior. Search-specific normalization, budgets, actor-bound cursors, and abuse/rate-limit proof remain owned by #298. Issue #299 must remain open after this merge if #298 has not yet supplied the search-specific edge evidence.

## TDD and security evidence

Implementation is RED-first.

Required focused evidence:

1. Cursor SQL/static contract fails before the forward migration exists.
2. DB behavior proves same-actor keyset pagination, cross-profile cursor rejection, safe-author output, block/privacy re-evaluation, no subject leakage, and lifecycle failure behavior.
3. Feed read-model/controller tests prove current safe presentation plus retry/dedupe/reconnect/observer/keyboard/focus behavior.
4. Comment tests prove deterministic cooldown and no duplicate durable mutation.
5. Runtime adapter tests prove opaque 429/transient/cursor/session classification and preserve Messaging regressions.
6. Content-addressed migration review is added only after exact migration bytes pass behavioral proof and Steel Shield review.
7. `TIGER Social DB Rehearsal`, VVIP Quality Gate, CleanGuard, Zero-Residue, Project Control, LC03/04/05/06 and any path-triggered current gates must be GREEN on one exact PR head before integration merge.
8. After squash merge, current integration exact SHA must be verified again before any closure claim.

## Explicit exclusions

- no old Gate2/Gate3/Gate4/Gate5 stack import;
- no old `vvip_social_mutes` dependency;
- no raw subject in cursor, feed rows, browser adapter result, or rendered DOM;
- no offset pagination;
- no browser authorization decision;
- no automatic durable mutation retry;
- no search implementation in this lane;
- no Production/Staging/provider/payment/main mutation.
