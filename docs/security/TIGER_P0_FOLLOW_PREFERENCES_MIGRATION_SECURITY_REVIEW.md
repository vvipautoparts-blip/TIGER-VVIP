# TIGER P0 Follow and Feed Preferences Migration Security Review

Reviewed migration:

- `supabase/migrations/20260824133000_social_follow_preferences_surface.sql`
- SHA-256: `13b133d39845be1f753348ea61b581acab0614eb58759664c85693a35d555ef8`

## Steel Shield classification

Before content-addressed approval, these exact bytes produced:

- `CRITICAL=0`
- `HIGH=13`
- `NOT_NULL_RISK=6`
- `UPDATE_WITHOUT_WHERE=1`
- `BROAD_GRANT_TO_AUTHENTICATED=6`

Five `NOT_NULL_RISK` findings are integrity requirements on the new private preference table. The sixth is an `IS NOT NULL` branch that clears expired snooze state, not a schema tightening. The `UPDATE_WITHOUT_WHERE` finding is PostgreSQL `ON CONFLICT ... DO UPDATE` on the table's unique actor/target key, not an unbounded standalone update.

The six grant findings are exact `EXECUTE` grants on relationship controls, follow, unfollow, private preference list, fixed-action preference mutation, and the already-established block mutation. `PUBLIC` and `anon` execution is revoked first. No direct browser table `SELECT`, `INSERT`, `UPDATE`, or `DELETE` grant is introduced.

## Subject-blind follow convergence

The historical follow RPCs accepted raw subject strings. This forward migration revokes their browser execution and replaces them with active-target profile UUID RPCs. The current actor and target subject are resolved inside PostgreSQL. Self-follow, inactive targets, and blocked pairs fail closed. Follow writes are idempotent and pair-locked against concurrent block writes.

Unfollow resolves a target only through a follow row owned by the current actor. This preserves the ability to unfollow after target deactivation without turning the RPC into a lifecycle or profile-existence oracle. Responses contain profile UUID state only and never serialize Clerk subjects.

## Durable feed-preference boundary

Mute, unmute, 24-hour snooze, seven-day snooze, end-snooze, prefer, deprioritize, and normal are the only accepted actions. Snooze deadlines are server-derived. Each actor is limited to 500 stored target rows under an actor-wide advisory lock, making the complete private preference list bounded. A pair lock prevents a concurrent preference write from surviving a block.

Preferences are applied only after the server-authorized feed page is returned. They may suppress or stably reorder authorized rows but cannot introduce a post, widen audience policy, or recover an unavailable author. Failure to load or validate the durable preference payload fails the feed closed.

## Block convergence

The block RPC retains its active UUID target, advisory lock, relationship removal, and subject-blind response. In the same transaction it now removes both directional follows and both directional feed-preference rows for the blocked pair. This makes block stronger than follow, mute, snooze, and ranking preferences without modifying message history or browser authority.

## Behavioral proof requirement

`tests/sql/tiger-p0-follow-preferences-surface.sql` is wired into the exact-head, local-only TIGER Social DB Rehearsal. It proves legacy subject-RPC retirement, least privilege, UUID follow state and counts, private subject-blind preferences, all preference transitions, atomic block cleanup, lifecycle-safe unfollow, self/blocked denials, and final PASS-marker enforcement.

This review does not apply the migration to Production or Staging and does not authorize provider credentials, real-user data, or remote database mutation.

## Approval rule

This review approves only SHA-256 `13b133d39845be1f753348ea61b581acab0614eb58759664c85693a35d555ef8`. Any byte drift invalidates the approval and must re-enter Steel Shield classification, behavioral proof, and content-addressed review.
