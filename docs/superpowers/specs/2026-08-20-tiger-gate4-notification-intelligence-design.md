# TIGER Gate 4 — Notification Intelligence Design (2026)

Status: owner-approved architecture; written specification requires explicit owner review before implementation begins.

This document is normative for Gate 4 and subordinate to `docs/tiger-sovereign-release-constitution-2026.md`.

Base exact SHA: `f914b15bb3067e8beaf5f71bd337e24d39501916` (Gate 3 evidence-closed head).

## 1. Purpose

Gate 4 builds a durable, privacy-aware, provider-neutral notification system where PostgreSQL owns notification truth, private Realtime provides low-latency in-app delivery, and background push is a best-effort transport only.

The system MUST never treat a push-provider response, device receipt, WebSocket event, badge count, or client-side state as the durable source of truth.

The canonical chain is:

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
- endpoint registration and revocation;
- TTL, collapse, quiet-hours, suppression, priority and sensitivity handling;
- retry, backoff, jitter, terminal failure, endpoint invalidation and DLQ;
- provider/category/global kill switches;
- metrics/audit evidence without leaking notification contents or endpoint credentials;
- exact-SHA local migration replay + transactional DB rehearsal + workflow artifact.

Out of scope:
- marketing campaign billing or ad delivery (Gate 10 / campaign bounded context);
- SMS/email channel implementation;
- group-message semantics;
- full mobile native application packaging;
- production APNs/FCM/Web Push credential activation;
- production push-provider mutation;
- production database application;
- country activation policy (Gate 13 consumes Gate 4 capability later).

## 3. Fixed authorities

### Identity

`public.vvip_marketplace_actor_id()` remains the single signed browser actor authority. Gate 4 MUST NOT introduce a second user/session authority.

### Durable truth

PostgreSQL owns notification existence, sequence, read state, preference state, endpoint ownership, dispatch state and evidence state.

### Realtime

Supabase Realtime is transport only. A missed Realtime event is repaired by durable keyset catch-up.

### Push

APNs, FCM, Web Push, or any future provider are adapters. Provider acknowledgements are operational evidence, not proof that the human saw a notification.

## 4. Architectural components

Gate 4 is one bounded subsystem with six explicit units:

1. **Notification Authority** — creates one durable notification per eligible recipient/event.
2. **Decision Engine** — determines in-app surface, push eligibility, quiet-hours behavior, sensitivity redaction and TTL.
3. **Inbox Authority** — sequence, read cursor, listing and badge-safe projections.
4. **Dispatch Outbox** — durable push work with retries, fencing and terminal outcomes.
5. **Endpoint Registry** — service-protected push endpoints/capabilities owned by one user.
6. **Realtime Transport Boundary** — private current-epoch in-app events; no browser-originated authoritative Broadcast.

Each unit has a narrow interface and can fail without changing another unit's authority.

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
- timestamps.

Invariants:
- owner is a valid canonical `user_*` subject;
- one inbox per owner;
- `last_sequence < next_sequence`;
- sequence and epoch are positive/monotonic;
- browser direct table mutations are denied.

Realtime topic uses opaque inbox identity rather than user subject:

`notifications:<inbox_uuid>:epoch:<positive-bigint>`

This avoids embedding account identifiers in topic names and gives Gate 4 a revocable epoch boundary.

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
- `actor_subject text` optional;
- `importance text`;
- `sensitivity text`;
- `created_at timestamptz not null`;
- `expires_at timestamptz` optional;
- `read_at timestamptz` optional.

Required uniqueness:
- unique `(inbox_id, sequence)`;
- unique `(inbox_id, event_key)`.

`event_key` is server-derived or server-validated and is the durable idempotency boundary. External callers MUST NOT be able to mint arbitrary recipient notifications by passing only client-asserted identity/event payloads.

Durable rows store semantic notification data (`template_key` + bounded args), not provider-specific push payloads.

## 6. Notification categories

Gate 4 initially supports a constrained category registry, for example:
- `social_message`;
- `social_relationship`;
- `social_comment`;
- `social_reaction`;
- `marketplace_activity`;
- `security_account`;
- `system_integrity`.

New categories require an explicit forward migration/config review. Free-form category strings from browser clients are forbidden.

Each category declares:
- default in-app behavior;
- whether push is allowed;
- default sensitivity;
- default TTL;
- collapse strategy;
- whether user may disable push;
- whether in-app persistence is mandatory.

Security/account integrity notifications may remain mandatory in the durable inbox even if push is disabled.

## 7. Preferences

### `public.vvip_notification_preferences`

One row per `(owner_subject, category)` with bounded values:
- `in_app_enabled boolean`;
- `push_enabled boolean`;
- `quiet_hours_enabled boolean`;
- `quiet_start local-time`;
- `quiet_end local-time`;
- `timezone text`;
- `updated_at`.

Rules:
- actor may update only own preferences through an RPC;
- category policy may override attempts to disable mandatory in-app security notifications;
- preferences influence transport/presentation only and MUST NOT grant access to business objects;
- timezone values are validated against an allow-listed canonical timezone set;
- quiet-hours calculations occur server-side.

## 8. Foreground/current-view activity hints

To satisfy online/background/current-view decisions without turning presence into a security authority, Gate 4 uses a short-lived **activity hint lease**.

### `public.vvip_notification_activity_leases`

Fields:
- `owner_subject primary key`;
- `foreground boolean`;
- `view_scope text`;
- `view_object_id text` optional;
- `lease_expires_at timestamptz`;
- `updated_at`.

Rules:
- actor can update only own lease through a bounded RPC;
- lease max lifetime is 90 seconds;
- clients update on foreground/background/view transition and may renew at a bounded cadence;
- no fine-grained URL, typed text, precise location, message body or credential is stored;
- lease may only **reduce** redundant push/surface behavior; it can never grant access or suppress mandatory security persistence;
- missing/stale lease is treated conservatively as background/unknown.

A forged own-device hint can at worst suppress that user's own redundant push temporarily; it cannot alter another user's data or authorization.

## 9. Decision engine

The server-side decision function consumes:
- canonical business event type/id;
- recipient;
- category registry;
- user preferences;
- activity lease;
- current view scope/object;
- notification sensitivity;
- TTL/expiry;
- global/provider/category kill-switch state;
- endpoint availability.

It produces a deterministic decision:
- create durable inbox item or suppress as duplicate/ineligible;
- emit in-app Realtime event or only persist;
- enqueue background push or suppress/defer;
- push priority;
- safe push preview policy;
- collapse key;
- expiry time.

Decision semantics are explicit:
- if duplicate `event_key`: return the existing durable notification;
- if expired before decision: do not create transport work;
- if recipient is actively viewing the same object: persist, but suppress redundant push by default;
- if foreground elsewhere: persist + Realtime; push is category/policy dependent;
- if background/unknown: persist + push if enabled/allowed;
- if quiet hours: persist immediately, while low-priority push is suppressed or deferred according to category policy;
- security-critical categories may bypass quiet-hours suppression but still use privacy-safe content.

The exact decision result is auditable without storing secret provider credentials or full sensitive rendered payloads.

## 10. Privacy and sensitive content

Sensitivity values are constrained to:
- `low`;
- `private`;
- `sensitive`;
- `security`.

Default push policy is conservative:
- `low`: localized title/body may be rendered from approved template data;
- `private`: generic category-level preview unless an explicit future user setting permits more;
- `sensitive`: generic `You have a new notification`-style preview;
- `security`: security-safe generic text with no secret, OTP, session token, recovery code or sensitive object data.

For `social_message`, Gate 4 initial default MUST NOT put the durable message body into push payloads.

Deep links contain only routing identifiers. They are never bearer credentials. Authorization is re-evaluated when the app opens.

Provider endpoint tokens/URLs are treated as credentials:
- no browser read access;
- no logs;
- no CI artifact content;
- no analytics export;
- no PR/test fixture using real tokens.

## 11. Endpoint registry

### `public.vvip_notification_endpoints`

Fields:
- `endpoint_id uuid primary key`;
- `owner_subject text not null`;
- `provider text not null`;
- `platform text not null`;
- `endpoint_fingerprint text not null`;
- `endpoint_secret text not null` or equivalent service-only opaque capability;
- `state text not null` (`active`, `revoked`, `invalid`);
- `last_success_at`;
- `last_failure_at`;
- timestamps.

Rules:
- unique endpoint fingerprint per canonical ownership boundary;
- registration actor is server-derived;
- browser may register/revoke only its own endpoint through RPCs;
- browser cannot list raw endpoint capabilities;
- changing ownership of an existing endpoint requires deterministic revocation/rebind semantics; silent cross-account reuse is forbidden;
- logout/account revocation can revoke the endpoint without deleting durable notification history.

No production provider credentials are stored in migration files or repository source.

## 12. Durable dispatch outbox

### `public.vvip_notification_dispatches`

One durable row per intended push delivery target.

Fields:
- `dispatch_id uuid primary key`;
- `notification_id uuid not null`;
- `endpoint_id uuid not null`;
- `provider text not null`;
- `collapse_key text`;
- `state text not null`;
- `attempt_count integer not null default 0`;
- `next_attempt_at timestamptz`;
- `lease_owner text` optional;
- `lease_expires_at timestamptz` optional;
- `generation bigint not null default 1`;
- `last_error_class text` optional;
- `provider_message_ref text` optional;
- `expires_at timestamptz not null`;
- timestamps.

Unique identity prevents duplicate dispatch rows for the same `(notification_id, endpoint_id)`.

Worker claims use database-safe locking (`FOR UPDATE SKIP LOCKED` or equivalent) plus lease/generation fencing so stale workers cannot settle a newer claim.

## 13. Retry and failure semantics

Push delivery is at-least-once transport; duplicate device presentation is possible at provider/network boundaries. Gate 4 therefore makes notification identity stable so clients can deduplicate by `notification_id`.

Retry policy:
- network timeout / provider 5xx: exponential backoff with jitter;
- provider 429: respect bounded `Retry-After` when valid;
- endpoint gone/invalid (for example Web Push 404/410 or provider equivalent): mark endpoint invalid and stop retries;
- malformed request/unsupported token: permanent failure;
- maximum attempt budget: 5;
- expired TTL: terminal `expired` without send;
- exhausted retry budget: terminal `dead_letter`.

No infinite retry loop is permitted.

Terminal states are deterministic and auditable.

## 14. Collapse semantics

Collapse affects **background push transport only**. It never deletes or rewrites durable inbox history.

Example:
- many reaction notifications may share a bounded collapse key for provider transport;
- the newest pending push may supersede an older unsent push for the same collapse scope;
- both durable notifications remain available according to product policy.

A collapse key is server-derived and bounded in size; clients do not control arbitrary provider collapse identifiers.

## 15. Provider-neutral adapter contract

Global core exposes an internal adapter interface:

`send(push_request) -> normalized_provider_result`

`push_request` contains only:
- endpoint capability;
- notification id;
- approved localized preview;
- deep-link routing data;
- TTL;
- priority;
- collapse key.

Normalized result classes:
- `accepted`;
- `retryable`;
- `rate_limited`;
- `endpoint_invalid`;
- `permanent_failure`.

Provider-specific HTTP status codes, headers and message ids are normalized inside the adapter.

Production credentials/config are external secrets/configuration. Gate 4 repository implementation and rehearsal use a deterministic fake/local adapter unless a separately authorized non-production provider test is approved.

## 16. Kill switches and containment

Gate 4 MUST support owner-controlled fail-closed switches for:
- all background push;
- one provider;
- one notification category;
- high-risk/sensitive push preview rendering.

Kill switches do not delete durable inbox rows. They only prevent or sanitize transport behavior.

If push is globally disabled, durable notifications and in-app catch-up continue.

## 17. In-app Realtime boundary

Gate 4 creates private Realtime authorization for the current notification inbox topic only.

Authorization requires:
- authenticated role;
- current signed actor;
- actor owns the inbox;
- topic inbox UUID matches actor inbox;
- topic epoch matches current `channel_epoch`;
- extension explicitly allowed for Gate 4 receive semantics.

Database-originated Broadcast events may include:
- `notification_created`;
- `notification_read`;
- `badge_changed`;
- `notification_channel_revoked`.

Payloads are sanitized and contain stable notification identifiers/sequence, not endpoint credentials.

Browser/client Broadcast INSERT for authoritative notification events is forbidden.

## 18. Reconnect and catch-up

Client algorithm:
1. authenticate with existing application JWT;
2. fetch current inbox channel ticket;
3. subscribe to private topic;
4. call `vvip_notification_list(after_sequence, limit)`;
5. merge by immutable `(inbox_id, sequence)`;
6. deduplicate Realtime events by notification id/sequence;
7. repair sequence gaps through keyset catch-up;
8. compute badge/unread UI from durable server projection, not from counting local push events.

Offset pagination is prohibited for the unbounded notification stream.

## 19. Browser RPC boundary

Expected bounded RPCs:
- `vvip_notification_list(after_sequence bigint, limit integer)`;
- `vvip_notification_mark_read(notification_id uuid)`;
- `vvip_notification_mark_all_read(up_to_sequence bigint)`;
- `vvip_notification_get_channel_ticket()`;
- `vvip_notification_get_preferences()`;
- `vvip_notification_update_preference(category, ...)`;
- `vvip_notification_update_activity_hint(...)`;
- `vvip_notification_register_endpoint(...)`;
- `vvip_notification_revoke_endpoint(endpoint_id uuid)`.

Internal/service-only functions own:
- canonical business-event ingestion;
- recipient computation;
- notification creation;
- push decision/enqueue;
- outbox claim/settlement;
- endpoint invalidation;
- kill-switch mutation.

Authenticated users MUST NOT receive direct UPDATE/DELETE rights on durable authority tables merely for convenience.

## 20. Security properties

Mandatory properties:
- FORCE RLS on user-facing durable tables where appropriate;
- browser direct mutation revoked;
- SECURITY DEFINER functions pin safe `search_path`;
- no `service_role` credential in browser;
- no raw push endpoint/token readable by authenticated clients;
- no client-selected recipient;
- no client-selected authoritative actor;
- no client-generated push/provider payload accepted as canonical;
- no notification business object access inferred merely from notification ownership;
- object authorization is rechecked when opened;
- no push-provider callback can mutate durable business state without independent authorization/idempotency;
- exact-byte migration review through Steel Shield after DB rehearsal.

## 21. Observability

Metrics MUST be content-safe and keyed by category/provider/result, not notification body.

Minimum metrics:
- durable notifications created/suppressed/deduplicated;
- unread count integrity failures;
- Realtime emit success/failure;
- dispatch queue depth/age;
- attempts by provider/result class;
- endpoint invalidation rate;
- retry count;
- DLQ count;
- expired-before-send count;
- push disabled by kill switch;
- decision latency P50/P95/P99;
- outbox claim-to-settlement latency P50/P95/P99.

Trace/log correlation uses stable opaque ids (`notification_id`, `dispatch_id`) and MUST redact endpoint capabilities and notification content classified private/sensitive/security.

## 22. SLO objectives

Gate 4 SLOs are measured boundaries, not global delivery guarantees.

Initial Staging objectives:
- notification decision + durable inbox commit: P95 <= 150 ms under rehearsal load;
- durable dispatch enqueue after eligible event: P95 <= 250 ms;
- Realtime database-originated event handoff: separately measured, target P95 <= 500 ms inside controlled Staging boundary;
- provider acceptance latency: observed per provider, no universal guarantee;
- human/device display latency: measured only, never claimed as a hard platform guarantee because OS/network/provider scheduling is outside TIGER control.

Any future stricter SLO requires exact deployed-stack evidence.

## 23. Data retention and deletion

Gate 4 distinguishes:
- durable notification history;
- dispatch operational evidence;
- endpoint credentials/capabilities;
- short-lived activity hints.

Baseline rules:
- activity hints expire automatically and are purged after a short operational window;
- revoked/invalid endpoint capabilities are deleted or cryptographically destroyed according to the account/privacy deletion workflow;
- dispatch logs retain only bounded operational metadata;
- notification retention follows future country/account data policy and must be deletable under account-deletion authority where legally required;
- no retention policy may preserve endpoint bearer capabilities merely for analytics.

## 24. Race and abuse defenses

DB rehearsal and implementation MUST address:
- duplicate business events arriving concurrently;
- duplicate endpoint registration;
- notification/read race;
- endpoint revoke while worker holds a lease;
- kill switch toggled while work is queued;
- TTL expiring while work is claimed;
- collapse replacement race;
- stale worker settlement;
- actor switching accounts on the same device;
- forged endpoint ownership;
- fake foreground lease used to suppress another user's push (must be impossible);
- browser attempt to emit authoritative Realtime notification Broadcast.

## 25. TDD requirements

Implementation begins RED.

Static tests MUST require, before migration exists:
- durable inbox/notification/preferences/activity/endpoint/dispatch boundaries;
- FORCE RLS / least privilege;
- unique event idempotency;
- keyset sequence pagination;
- no authenticated direct authority-table mutation;
- no raw endpoint read grant;
- private Realtime topic/epoch parser;
- no authenticated authoritative Broadcast INSERT;
- bounded retry budget;
- TTL terminal behavior;
- kill-switch checks;
- exact-SHA workflow contract.

Transactional DB rehearsal MUST prove at minimum:
- one event -> one durable notification;
- concurrent/idempotent duplicate event -> one notification;
- monotonic per-inbox sequences;
- unauthorized third party cannot list/read/update another inbox;
- unread count and mark-read remain transactionally consistent;
- mark-all-read is bounded by durable tail and cannot move backward;
- mandatory security in-app persistence cannot be disabled by preference RPC;
- active same-view lease suppresses redundant push but not durable persistence;
- stale/expired lease does not suppress background push;
- quiet-hours low-priority behavior follows policy;
- sensitive/message notification push preview is redacted;
- endpoint registration is owner-bound and raw capability is not browser-readable;
- endpoint revoke invalidates pending/future dispatch;
- worker claim uses fencing; stale generation cannot settle;
- retry budget reaches deterministic DLQ;
- invalid endpoint becomes terminal and no longer retries;
- expired TTL never dispatches;
- kill switch blocks transport without deleting durable notification;
- Realtime current topic authorizes owner only;
- browser authoritative Broadcast INSERT remains denied;
- reconnect keyset catch-up yields no gap/duplicate;
- all fixtures roll back and emit `TIGER_GATE4_DB_REHEARSAL=PASS`.

## 26. Exact-SHA workflow and evidence

Gate 4 gets a dedicated local-only workflow that:
- checks out `github.event.pull_request.head.sha` exactly;
- pins all Actions by immutable SHA;
- pins the Supabase CLI version;
- rejects remote Supabase credentials/environment variables;
- runs static contracts;
- starts isolated local Supabase;
- performs clean `supabase db reset --local`;
- runs transactional DB rehearsal;
- hashes migrations/tests/workflow/evidence inputs;
- uploads an artifact named with exact source SHA;
- emits source/worktree SHA and `TIGER_GATE4_DB_REHEARSAL=PASS`.

Only after static + clean migration replay + transactional DB proof on exact bytes may Gate 4 migration SHA256 values be added to Steel Shield's reviewed baseline.

A baseline change creates a new head SHA and therefore MUST rerun Gate 4 and the required repository workflows on that new SHA before closure.

## 27. Gate close criteria

Gate 4 can be marked evidence-closed only when, on one exact PR head SHA:
- static contracts GREEN;
- clean local migration replay GREEN;
- transactional Gate 4 DB rehearsal GREEN;
- exact-SHA Gate 4 artifact exists and independently confirms PASS marker + source SHA;
- VVIP Quality Gate GREEN;
- TIGER CleanGuard GREEN;
- Zero-Residue Full History GREEN;
- Project Control Integrity GREEN;
- Exact-SHA Preview Evidence GREEN;
- Social DB rehearsal GREEN;
- LC04/LC05/LC06 regressions GREEN;
- Gate 2 and Gate 3 required regressions remain GREEN where triggered;
- Steel Shield sees Gate 4 reviewed exact migration bytes;
- unresolved Gate 4 P0 = 0;
- unresolved Gate 4 P1 = 0.

## 28. Production barricade

Gate 4 repository closure does **not** authorize:
- merge to `main`;
- production database migration;
- production Realtime policy application;
- production APNs/FCM/Web Push credentials;
- real-user endpoint registration;
- real push sends;
- production promotion.

Production remains governed by the TIGER Release Constitution, owner approval, environment identity, Release Passport and later Gates 5–14.

## 29. Supersession

The legacy P19 Notifications Center repository package is historical design/review material only. Where it conflicts with this Gate 4 specification or the 2026 Release Constitution, this Gate 4 specification is authoritative after owner review.
