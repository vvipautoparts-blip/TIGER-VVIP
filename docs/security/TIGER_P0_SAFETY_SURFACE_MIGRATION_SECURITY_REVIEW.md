# TIGER P0 Safety Surface Migration Security Review

Reviewed migration:

- `supabase/migrations/20260824130000_social_safety_surface.sql`
- SHA-256: `c856c0bcc57bea9116273a4dcecc4b1e8ec807fada7ceb3d57e77a0a103d09e1`

## Steel Shield classification

Before content-addressed approval, these exact bytes produced:

- `CRITICAL=0`
- `HIGH=12`
- `NOT_NULL_RISK=7`
- `BROAD_GRANT_TO_AUTHENTICATED=5`

The seven `NOT_NULL_RISK` findings are integrity requirements on the new append-only report table: reporter, target kind, target UUID, target subject, reason, moderation status, and creation time. The five grant findings are exact `EXECUTE` grants on the bounded block-state, block-list, block, unblock, and report RPCs. `PUBLIC` and `anon` execution is revoked before these grants. No direct browser `SELECT`, `INSERT`, `UPDATE`, or `DELETE` authority is granted on the report table.

## Block privacy and lifecycle boundary

The block-state RPC accepts and echoes only a profile UUID and returns only whether the current actor created the directional block. It never reveals whether the peer blocked the viewer, a Clerk subject, or a lifecycle state. The private block list returns safe profile presentation, uses a tombstone for inactive profiles, and is capped at 100 rows.

The replacement unblock RPC resolves a target only through a block owned by the current actor. It therefore supports unblock after target deactivation or deletion without becoming a profile-existence oracle. Missing and already-unblocked targets converge to the same unchanged result.

## Append-only report boundary

Reports accept only profile or post UUID targets, seven fixed reason codes, and optional trimmed details capped at 1,000 characters. Profile targets must be active. Post targets must pass `vvip_social_can_view_post` at submission time, so private posts cannot be reported by unauthorized viewers. Self-reporting is denied.

The actor is derived internally. An actor-wide advisory lock serializes report submissions before the 20-per-hour limit, preventing parallel requests against different targets from exceeding the cap. The uniqueness key and idempotent receipt prevent repeated same-reason submissions from creating duplicate moderation records. RPC responses contain only the report UUID, receipt status, and duplicate flag; reporter and target subjects remain internal.

## Behavioral proof requirement

`tests/sql/tiger-p0-safety-surface.sql` is wired into the exact-head, local-only TIGER Social DB Rehearsal. It proves the RPC-only privilege boundary, directional block state, block-list subject blindness, blocked-profile collapse, lifecycle-safe unblock, visible profile/post reporting, deterministic deduplication, self/private-post denials, and exact report persistence. The workflow requires the final PASS marker and rejects every Safety FAIL marker.

This review does not apply the migration to Production or Staging and does not authorize provider credentials, real-user data, moderation access, or remote database mutation.

## Approval rule

This review approves only SHA-256 `c856c0bcc57bea9116273a4dcecc4b1e8ec807fada7ceb3d57e77a0a103d09e1`. Any byte drift invalidates the approval and must re-enter Steel Shield classification, behavioral proof, and content-addressed review.
