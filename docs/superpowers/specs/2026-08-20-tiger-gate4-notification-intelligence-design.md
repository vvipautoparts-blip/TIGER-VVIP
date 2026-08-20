# TIGER Gate 4 — Notification Intelligence Design (2026)

Status: owner-approved architecture; written specification requires explicit owner review before implementation begins.

This document is normative for Gate 4 and subordinate to `docs/tiger-sovereign-release-constitution-2026.md`.

Base exact SHA: `f914b15bb3067e8beaf5f71bd337e24d39501916` (Gate 3 evidence-closed head).

## 1. Purpose

Gate 4 builds a durable, privacy-aware, provider-neutral notification system where PostgreSQL owns notification truth, private Realtime provides low-latency in-app delivery, and background push is a best-effort transport only.

The system MUST never treat a push-provider response, device receipt, WebSocket event, badge count, or client-side state as durable truth.

Canonical chain:

`Business Event -> Durable Notification Decision -> Durable Inbox/Outbox -> In-App Realtime and/or Push Attempt -> Delivery Evidence -> Exact-SHA Gate Evidence`

## 2. Scope

In scope:
- durable per-user notification inbox;
- deterministic event deduplication;
- monotonic per-inbox sequence/cursor;
- unread/read state through bounded RPCs;
- notification preferences by category/channel;
- bounded foreground/current-view activity hints;
- private database-originated in-app Realtime Broadcast;
- background push dispatch through provider-neutral adapters;
- endpoint registration/revocation;
- TTL, collapse, quiet hours, priority and sensitivity handling;
- bounded retry, jitter, endpoint invalidation and DLQ;
- provider/category/global kill switches;
- content-safe metrics/audit evidence;
- exact-SHA local migration replay + transactional DB rehearsal + evidence artifact.

Out of scope:
- marketing campaign billing/ad delivery;
- SMS/email implementation;
- group-message semantics;
- native mobile packaging;
- production APNs/FCM/Web Push credential activation;
- production provider or database mutation;
- country activation policy (Gate 13 consumes Gate 4 capability later).

## 3. Fixed authorities

### Identity
`public.vvip_marketplace_actor_id()` remains the single signed browser actor authority. Gate 4 MUST NOT introduce a second user/session authority.

### Durable truth
PostgreSQL owns notification existence, sequence, read state, preference state, endpoint ownership, dispatch state and evidence state.

### Realtime
Supabase Realtime is transport only. Missed events are repaired by durable keyset catch-up.

### Push
APNs, FCM, Web Push, or any future provider are adapters. Provider acknowledgements are operational evidence, not proof that a human saw a notification.

## 4. Architectural units

Gate 4 contains six bounded units:
1. **Notification Authority** — creates one durable notification per eligible recipient/event.
2. **Decision Engine** — evaluates preferences, activity, sensitivity, TTL, quiet hours and kill switches.
3. **Inbox Authority** — sequence, read state, listing and badge-safe projection.
4. **Dispatch Outbox** — durable push work, retries, leases, fencing and terminal outcomes.
5. **Endpoint Registry** — service-protected provider endpoints owned by one user.
6. **Realtime Boundary** — private current-epoch in-app receive channel; no browser-originated authoritative Broadcast.

Failure in one unit MUST NOT silently transfer authority to another unit.

## 5. Durable inbox model

### `public.vvip_notification_inboxes`
One canonical inbox per user.

Fields:
- `inbox_id uuid primary key`;
- `owner_subject text unique not null`;
- `channel_epoch bigint not null default 1`;
- `next_sequence bigint not null default 1`;
- `last_sequence bigint not null default 0`;
- `unread_count bigint not null default 0`;
- `created_at timestamptz not null`;
- `updated_at timestamptz not null`.

Invariants:
- valid canonical `user_*` owner;
- one inbox per owner;
- `channel_epoch > 0`;
- `next_sequence > 0`;
- `last_sequence >= 0` and `last_sequence < next_sequence`;
- `unread_count >= 0`;
- browser direct mutations denied.

Realtime topic:

`notifications:<inbox_uuid>:epoch:<positive-bigint>`

The topic uses opaque inbox identity rather than the user subject.

### `public.vvip_notifications`

Fields:
- `notification_id uuid primary key`;
- `inbox_id uuid not null`;
- `sequence bigint not null`;
- `event_key text not null`;
- `category text not null`;
- `template_key text not null`;
- `template_args jsonb not null default '{}'`;
- `object_type text`;
- `object_id text`;
- `actor_subject text`;
- `importance text not null`;
- `sensitivity text not null`;
- `created_at timestamptz not null`;
- `expires_at timestamptz`;
- `read_at timestamptz`.

Required uniqueness:
- unique `(inbox_id, sequence)`;
- unique `(inbox_id, event_key)`.

`event_key` is server-derived or service-validated and is the durable idempotency boundary. Browser clients cannot choose recipients or mint arbitrary canonical business events.

Durable rows store semantic notification data (`template_key` + bounded arguments), not provider-specific payloads.

## 6. Exact initial category registry

Gate 4 initial category set is exactly:
- `social_message`;
- `social_relationship`;
- `social_comment`;
- `social_reaction`;
- `marketplace_activity`;
- `security_account`;
- `system_integrity`.

Free-form browser categories are forbidden. New categories require explicit forward review.

Each category has server-owned policy fields:
- `durable_required`;
- `push_allowed`;
- `user_can_disable`;
- `default_sensitivity`;
- `default_ttl_seconds`;
- `default_importance`;
- `collapse_mode`.

`security_account` and `system_integrity` are durable-required. Their durable inbox persistence cannot be disabled by a user preference.

## 7. Preferences

### `public.vvip_notification_preferences`

One row per `(owner_subject, category)`.

Fields:
- `owner_subject text not null`;
- `category text not null`;
- `in_app_enabled boolean not null`;
- `push_enabled boolean not null`;
- `quiet_hours_enabled boolean not null`;
- `quiet_start time without time zone`;
- `quiet_end time without time zone`;
- `timezone text not null`;
- `updated_at timestamptz not null`;
- primary key `(owner_subject, category)`.

Semantics:
- for optional categories, `in_app_enabled = false` means no notification is created and therefore no push is allowed;
- `push_enabled = true` requires `in_app_enabled = true` because every push MUST correspond to durable notification truth;
- durable-required categories force effective `in_app_enabled = true` regardless of attempted preference changes;
- push may still be disabled for durable-required categories unless the category policy explicitly marks a future mandatory transport requirement;
- timezone is validated against the repository/application canonical IANA timezone allow-list;
- quiet-hours calculations occur server-side.

Preferences influence notification/transport behavior only and never authorize the underlying business object.

## 8. Foreground/current-view activity hints

Gate 4 uses a short-lived activity hint lease to reduce redundant push without making presence a security authority.

### `public.vvip_notification_activity_leases`

Fields:
- `owner_subject text primary key`;
- `foreground boolean not null`;
- `view_scope text not null`;
- `view_object_id text`;
- `lease_expires_at timestamptz not null`;
- `updated_at timestamptz not null`.

Rules:
- actor can update only their own lease through a bounded RPC;
- lease lifetime is at most 90 seconds;
- client writes occur on foreground/background/view transition plus bounded renewal no more frequently than once per 60 seconds;
- `view_scope` is a constrained enum-like registry, not a URL;
- no typed text, message body, precise location or credential is stored;
- activity hints may reduce redundant push only; they cannot grant access or suppress mandatory durable security notification creation;
- missing/expired lease is treated as background/unknown.

A forged own-device hint can at worst suppress that same user's redundant push for the short lease window; it cannot affect another user.

## 9. Decision engine

The server-side decision consumes:
- canonical business event identity/type;
- server-computed recipient;
- category policy;
- user preference;
- activity lease/current view;
- sensitivity/importance;
- TTL;
- provider/category/global kill-switch state;
- active endpoint availability.

Deterministic outcomes:
- `duplicate` — return existing durable notification;
- `disabled_optional_category` — create nothing and send nothing;
- `expired_before_creation` — create no transport work;
- `persist_only` — durable inbox only;
- `persist_and_realtime`;
- `persist_realtime_and_push`;
- `persist_and_defer_push` where bounded policy permits quiet-hour deferral.

Rules:
- same-view active lease suppresses redundant push by default but does not suppress already-eligible durable persistence;
- foreground elsewhere favors durable + Realtime; push remains category/policy dependent;
- background/unknown allows push when preference/policy/endpoint permit;
- quiet hours suppress or defer low-priority push but never delay durable persistence;
- security-critical categories may bypass quiet-hour push suppression but still use privacy-safe content;
- all decisions are auditable using opaque identifiers and decision codes.

## 10. Privacy and sensitive content

Sensitivity set is exactly:
- `low`;
- `private`;
- `sensitive`;
- `security`.

Initial push preview policy:
- `low`: approved localized title/body may be rendered;
- `private`: generic category-level preview;
- `sensitive`: generic new-notification preview;
- `security`: generic security-safe preview with no secret, OTP, session token, recovery code or sensitive object data.

`social_message` MUST NOT place durable message body content in push payloads in Gate 4.

Deep links carry only routing identifiers and are never bearer credentials. Underlying object authorization is re-evaluated after app open.

## 11. Endpoint registry

### `public.vvip_notification_endpoints`

Fields:
- `endpoint_id uuid primary key`;
- `owner_subject text not null`;
- `provider text not null`;
- `platform text not null`;
- `endpoint_fingerprint text not null`;
- `endpoint_capability text not null`;
- `state text not null` constrained to `active|revoked|invalid`;
- `last_success_at timestamptz`;
- `last_failure_at timestamptz`;
- `created_at timestamptz not null`;
- `updated_at timestamptz not null`.

Rules:
- endpoint capability is treated as credential-like sensitive data even when the provider calls it a token/URL;
- table is service-protected and raw capability is never browser-readable;
- managed database encryption-at-rest is the Gate 4 baseline; provider activation may impose stronger envelope-encryption requirements before Production and must be proven in the provider-specific production gate;
- endpoint capability/fingerprint never appears in application logs, CI artifacts or analytics exports;
- registration actor is server-derived;
- browser registers/revokes only its own endpoint through bounded RPC/service flow;
- unique active fingerprint prevents duplicate ownership ambiguity;
- cross-account reuse requires deterministic revoke/rebind; silent reassignment is forbidden;
- account/session logout can revoke endpoint transport without deleting durable notification history.

No real provider credential or real endpoint is used in repository fixtures.

## 12. Durable dispatch outbox

### `public.vvip_notification_dispatches`

Fields:
- `dispatch_id uuid primary key`;
- `notification_id uuid not null`;
- `endpoint_id uuid not null`;
- `provider text not null`;
- `collapse_key text`;
- `state text not null` constrained to `pending|leased|accepted|retry_wait|invalid_endpoint|permanent_failure|expired|dead_letter|suppressed`;
- `attempt_count integer not null default 0`;
- `next_attempt_at timestamptz`;
- `lease_owner text`;
- `lease_expires_at timestamptz`;
- `generation bigint not null default 1`;
- `last_error_class text`;
- `provider_message_ref text`;
- `expires_at timestamptz not null`;
- `created_at timestamptz not null`;
- `updated_at timestamptz not null`.

Unique `(notification_id, endpoint_id)` prevents duplicate dispatch rows for one target.

Claims use `FOR UPDATE SKIP LOCKED` (or equivalent database-safe locking), a bounded lease and generation fencing. A stale worker generation cannot settle a newer claim.

## 13. Retry and terminal semantics

Push is at-least-once transport. Duplicate device presentation can occur outside TIGER control, so clients deduplicate by stable `notification_id`.

Attempt budget is exactly 5.

Classification:
- network timeout/provider 5xx -> retryable with exponential backoff + jitter;
- 429/rate-limited -> retryable, respecting bounded valid `Retry-After`;
- endpoint gone/invalid -> terminal `invalid_endpoint`, endpoint state becomes `invalid`;
- malformed/unsupported provider request -> terminal `permanent_failure`;
- TTL elapsed before send/settlement -> terminal `expired`;
- fifth failed retryable attempt -> terminal `dead_letter`.

No infinite retry loop is permitted.

## 14. Collapse semantics

Collapse changes push transport only; durable inbox history is never rewritten/deleted by collapse.

A server-derived bounded collapse key may cause a newer pending dispatch to supersede an older unsent dispatch in the same scope. Superseded transport rows become `suppressed`; their durable notifications remain governed by normal retention.

Clients cannot choose arbitrary provider collapse identifiers.

## 15. Provider-neutral adapter

Internal interface:

`send(push_request) -> normalized_provider_result`

`push_request` contains only:
- endpoint capability;
- notification id;
- approved localized preview;
- deep-link routing data;
- TTL;
- priority;
- collapse key.

Normalized result set is exactly:
- `accepted`;
- `retryable`;
- `rate_limited`;
- `endpoint_invalid`;
- `permanent_failure`.

Provider-specific statuses/headers/message IDs are normalized inside the adapter.

Repository rehearsal uses a deterministic fake/local adapter. Production providers/credentials require separate environment-specific authorization and evidence.

## 16. Kill switches

Owner-controlled fail-closed switches are required for:
- all background push;
- one provider;
- one notification category;
- high-risk/sensitive preview rendering.

Switches affect transport/presentation only. They never delete durable notification truth.

If push is globally disabled, durable inbox + in-app catch-up continue.

## 17. In-app Realtime boundary

Gate 4 authorizes only the current private inbox topic.

Authorization requires:
- authenticated role;
- current signed actor from existing identity authority;
- actor owns the inbox;
- topic UUID matches actor inbox;
- topic epoch equals current inbox `channel_epoch`;
- extension explicitly allowed for Gate 4 receive semantics.

Database-originated Broadcast event names are bounded to:
- `notification_created`;
- `notification_read`;
- `badge_changed`;
- `notification_channel_revoked`.

Payloads contain stable notification/inbox sequence metadata and approved presentation fields only. Endpoint capabilities are forbidden.

Authenticated/browser authoritative Broadcast INSERT is forbidden.

## 18. Reconnect and keyset catch-up

Client flow:
1. authenticate using existing application JWT;
2. obtain current notification channel ticket;
3. subscribe to private current-epoch topic;
4. call `vvip_notification_list(after_sequence, limit)`;
5. merge by immutable `(inbox_id, sequence)`;
6. deduplicate by notification id/sequence;
7. repair gaps through keyset catch-up;
8. use durable server unread projection for badge state.

Offset pagination is prohibited for the unbounded notification stream.

## 19. Browser RPC boundary

Bounded browser RPCs:
- `vvip_notification_list(after_sequence bigint, limit integer)`;
- `vvip_notification_mark_read(notification_id uuid)`;
- `vvip_notification_mark_all_read(up_to_sequence bigint)`;
- `vvip_notification_get_channel_ticket()`;
- `vvip_notification_get_preferences()`;
- `vvip_notification_update_preference(category text, in_app_enabled boolean, push_enabled boolean, quiet_hours_enabled boolean, quiet_start time, quiet_end time, timezone text)`;
- `vvip_notification_update_activity_hint(foreground boolean, view_scope text, view_object_id text)`;
- `vvip_notification_register_endpoint(provider text, platform text, endpoint_capability text)`;
- `vvip_notification_revoke_endpoint(endpoint_id uuid)`.

Internal/service-only functions own:
- business-event ingestion;
- recipient computation;
- canonical notification creation;
- decision/enqueue;
- dispatch claim/settlement;
- endpoint invalidation;
- kill-switch mutation.

Authenticated roles MUST NOT receive direct UPDATE/DELETE authority-table privileges for convenience.

## 20. Security properties

Mandatory:
- FORCE RLS on user-facing durable tables where applicable;
- browser direct authority-table mutation revoked;
- SECURITY DEFINER functions use a pinned safe search path;
- no `service_role` token in browser;
- no raw endpoint capability readable by authenticated users;
- no client-selected recipient or authoritative actor;
- no client-generated provider payload accepted as canonical;
- notification ownership does not imply authorization to the referenced business object;
- object authorization is rechecked on open;
- provider callbacks cannot mutate durable business state without independent authorization/idempotency;
- Steel Shield exact-byte review only after DB rehearsal.

## 21. Observability

Content-safe metrics:
- notifications created/suppressed/deduplicated;
- unread-count integrity failures;
- Realtime emit success/failure;
- dispatch queue depth/age;
- attempts by provider/result class;
- endpoint invalidation rate;
- retry/DLQ/expired counts;
- kill-switch suppressions;
- decision latency P50/P95/P99;
- claim-to-settlement latency P50/P95/P99.

Logs/traces use opaque `notification_id`/`dispatch_id`. Endpoint capabilities and private/sensitive/security content are redacted.

## 22. SLO objectives

Staging measurement objectives, not universal delivery guarantees:
- decision + durable inbox commit: P95 <= 150 ms under defined rehearsal load;
- eligible dispatch enqueue: P95 <= 250 ms;
- database-originated Realtime handoff within controlled Staging boundary: target P95 <= 500 ms;
- provider acceptance latency: measured per provider, no universal guarantee;
- device/human display latency: measured only because OS/network/provider scheduling is outside TIGER control.

Stricter claims require deployed-stack evidence.

## 23. Retention and deletion

Separate classes:
- durable notification history;
- dispatch operational evidence;
- endpoint capability data;
- short-lived activity hints.

Baseline:
- activity hints expire automatically and are purged after a short operational window;
- revoked/invalid endpoint capabilities are removed under account/privacy deletion authority and are never retained for analytics;
- dispatch evidence keeps bounded operational metadata only;
- notification retention follows account/country policy and supports lawful account-data deletion;
- no retention rule preserves endpoint bearer capability for analytics.

## 24. Race/abuse defenses

Implementation/rehearsal MUST address:
- concurrent duplicate business events;
- duplicate endpoint registration;
- mark-read/unread-count race;
- endpoint revoke while worker is leased;
- kill switch toggled while work is queued;
- TTL expiry during claim;
- collapse replacement race;
- stale worker settlement;
- same device switches accounts;
- forged endpoint ownership;
- one user's activity lease attempting to affect another user's push;
- browser attempt to emit authoritative notification Broadcast.

## 25. TDD requirements

Implementation begins RED.

Static contracts MUST require before migration/workflow exists:
- inbox/notification/preferences/activity/endpoint/dispatch boundaries;
- FORCE RLS + least privilege;
- unique event idempotency;
- keyset sequence pagination;
- no authenticated direct authority-table mutation;
- no raw endpoint read grant;
- private topic/epoch parser;
- no authenticated authoritative Broadcast INSERT;
- attempt budget = 5;
- TTL terminal behavior;
- kill-switch checks;
- exact-SHA workflow contract.

Transactional DB rehearsal MUST prove at minimum:
- one event -> one durable notification;
- concurrent/idempotent duplicate event -> one notification;
- monotonic per-inbox sequence;
- third party cannot list/read/update another inbox;
- unread count and mark-read are transactionally consistent;
- mark-all-read is bounded by durable tail and never moves state backward;
- mandatory security/system durable persistence cannot be disabled;
- `push_enabled=true` cannot exist effectively while optional category `in_app_enabled=false`;
- active same-view lease suppresses redundant push but not eligible durable persistence;
- stale activity lease does not suppress background push;
- quiet-hours behavior follows category policy;
- private/sensitive/message push previews are redacted as specified;
- endpoint registration is owner-bound and raw capability is not browser-readable;
- endpoint revoke invalidates pending/future dispatch;
- stale worker generation cannot settle;
- retry budget reaches deterministic DLQ;
- invalid endpoint stops retries;
- expired TTL never dispatches;
- kill switch blocks transport without deleting durable notification;
- current Realtime topic authorizes owner only;
- browser authoritative Broadcast INSERT remains denied;
- keyset reconnect produces no gap/duplicate;
- fixture transaction rolls back and emits `TIGER_GATE4_DB_REHEARSAL=PASS`.

## 26. Exact-SHA workflow/evidence

Dedicated local-only workflow MUST:
- checkout `github.event.pull_request.head.sha` exactly;
- pin Actions by immutable SHA;
- pin Supabase CLI version;
- reject remote Supabase credentials/environment variables;
- run static contracts;
- start isolated local Supabase;
- run clean `supabase db reset --local`;
- execute transactional rehearsal;
- hash migration/tests/workflow/evidence inputs;
- upload artifact named with exact source SHA;
- include SOURCE_SHA/WORKTREE_SHA and `TIGER_GATE4_DB_REHEARSAL=PASS`.

Only after exact-byte static + clean replay + DB rehearsal may Gate 4 migration SHA256 values enter Steel Shield reviewed baseline.

The Steel Shield baseline commit creates a new SHA, so all required checks MUST rerun on that new SHA before closure.

## 27. Gate close criteria

Gate 4 closes only when one exact PR head SHA has:
- static contracts GREEN;
- clean local migration replay GREEN;
- transactional Gate 4 DB rehearsal GREEN;
- exact-SHA Gate 4 artifact independently verified for head SHA + PASS marker;
- VVIP Quality Gate GREEN;
- TIGER CleanGuard GREEN;
- Zero-Residue Full History GREEN;
- Project Control Integrity GREEN;
- Exact-SHA Preview Evidence GREEN;
- Social DB rehearsal GREEN;
- LC04/LC05/LC06 regressions GREEN;
- required Gate 2/Gate 3 regressions GREEN where triggered;
- Steel Shield reviewed exact Gate 4 migration bytes;
- unresolved Gate 4 P0 = 0;
- unresolved Gate 4 P1 = 0.

## 28. Production barricade

Gate 4 repository closure does NOT authorize:
- merge to `main`;
- Production database migration;
- Production Realtime policy apply;
- Production APNs/FCM/Web Push credentials;
- real-user endpoint registration;
- real push sends;
- Production promotion.

Production remains governed by the TIGER Release Constitution, exact environment identity, Release Passport, owner approval and later Gates 5–14.

## 29. Supersession

The legacy P19 Notifications Center package is historical design/review material only. After owner review, this Gate 4 specification supersedes conflicting P19 notification architecture while remaining subordinate to the 2026 Release Constitution.
