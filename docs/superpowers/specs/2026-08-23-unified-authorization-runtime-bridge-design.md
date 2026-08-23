# Unified Authorization Runtime Bridge — Design

**Date:** 2026-08-23
**Status:** Owner-approved design direction; implementation not started
**PR:** #321
**Base architecture:** additive extension of the approved capability/lease, owner-step-up, disclosure, protected-view, and profile-permissions contracts.

## 1. Purpose

Create one authoritative runtime bridge between persisted authorization state and every sensitive UI/action surface.

The bridge must solve two existing integration gaps without creating a second permission system:

1. `scripts/social/permissions-control.js` can build a permission UI model but intentionally reports `dom_ready: false` because no authoritative runtime capability source is wired.
2. `scripts/security/owner-sealed-disclosure.js` expresses exact disclosure bindings but is a pure in-memory contract and therefore cannot itself provide cross-process atomic replay prevention.

The bridge makes persisted server authority the only source of truth, provides a short-lived non-authoritative UI projection, and requires exact-bound single-use leases for sensitive actions.

## 2. Architectural invariant

```text
AUTHENTICATED PRINCIPAL
        |
        v
SERVER AUTHORIZATION BOUNDARY
        |
        +--> AUTHORITATIVE GRANTS / EVENTS
        |          |
        |          v
        |    CAPABILITY RESOLUTION
        |          |
        |          +--> SHORT-LIVED UI SNAPSHOT
        |          |          |
        |          |          v
        |          |     PROFILE / OWNER UI
        |          |
        |          +--> ACTION REQUEST
        |                     |
        |                     v
        |               EXACT-BOUND LEASE
        |                     |
        |                     v
        |              ATOMIC CONSUME
        |                     |
        |                     v
        |            AUDIT / REVOKE / EXPIRE
        |
        +--> OWNER STEP-UP AUTHORITY
                   |
                   v
          OWNER-SEALED DISCLOSURE LEASE
                   |
                   v
             ATOMIC CONSUME
```

**Rule:** UI visibility is never execution authority. A capability snapshot may decide what the client may render, but a sensitive operation must re-resolve current server authority and consume a valid exact-bound lease atomically.

## 3. Non-goals

This phase does **not**:

- merge or deploy PR #321;
- apply any migration to a remote Supabase environment;
- grant browser roles direct access to sensitive authorization tables;
- authorize from role labels, DOM state, hidden buttons, local storage, client clocks, or client-provided capability arrays;
- create a second permission engine parallel to `sensitive_permission_grants` / grant events / leases;
- make the pure JavaScript disclosure model authoritative across processes;
- change CONTACT -> HANDOFF or add brokerage/payment/deal-completion behavior;
- implement payment-provider readiness, legal approval, Production activation, or mobile protected-view adapters.

## 4. Considered approaches

### A. Client capability payload as authority — rejected

The server could send capabilities to the browser and accept them back on subsequent actions. This is simple but creates trust-in-client and stale-authority problems. Revocation cannot be guaranteed immediately and UI state can be replayed.

### B. Separate permission service for UI and separate disclosure service — rejected

This would solve each surface independently but create two policy evaluators, two lease models, and eventual semantic drift.

### C. Unified server authorization bridge over existing authorities — selected

One server boundary resolves persisted grants, generates presentation-only snapshots, issues exact-bound action leases, consumes them atomically, and coordinates owner step-up for sealed disclosure. Existing grant/lease semantics remain authoritative; the bridge is an adapter/orchestrator, not a replacement engine.

## 5. Components

### 5.1 Authorization Authority Store

Existing persisted authorization primitives remain canonical:

- `sensitive_permission_grants` — immutable bounded grants;
- `sensitive_permission_grant_events` — append-only grant state events;
- `sensitive_permission_leases` — short-lived single-use sensitive-action leases;
- owner step-up authorization persistence — phishing-resistant owner authorization authority;
- server-time hardening wrappers — database time is authoritative for security decisions.

The bridge reads or invokes these authorities through server-only paths. Browser roles receive no direct table mutation authority.

### 5.2 Capability Resolver

A server-side resolver computes effective capabilities for the authenticated principal against an explicit target and context.

Inputs are server-established or validated:

- authenticated principal id;
- target principal/entity/resource id;
- requested surface identifier;
- sector/entity/geo/resource scope;
- current policy version;
- database-authoritative time.

Resolution rules:

1. default deny;
2. role labels are display metadata only;
3. grant must be active now;
4. requested action and every scope dimension must fit the grant;
5. revoked/expired grants authorize nothing;
6. delegated authority may never exceed the grant's actual authority or delegability ceiling;
7. owner root identity is not delegable;
8. policy and jurisdiction constraints can further reduce authority but never widen it.

### 5.3 Capability Snapshot

The bridge returns a **presentation-only snapshot** for UI composition.

Minimum snapshot shape:

```text
snapshot_id
principal
surface
subject_or_target
visible_capabilities[]
management_capabilities[]
scope_projection[]
policy_version
authority_version
issued_at
expires_at
```

Properties:

- generated server-side;
- short-lived;
- database-time bounded;
- contains the minimum projection needed by the UI;
- excludes raw grant internals and audit-sensitive evidence unless the viewer is explicitly authorized to see them;
- may be cached only until `expires_at`;
- never accepted as proof for a sensitive mutation.

Recommended configuration:

- default snapshot TTL: 30 seconds;
- hard maximum snapshot TTL: 60 seconds;
- TTL is configuration, not hard-coded into UI code.

A stale or missing snapshot causes the UI to refresh or fail closed; it does not cause the client to infer authority.

### 5.4 Profile Permissions Projection

`permissions-control.js` becomes a presentation adapter fed by the server snapshot rather than caller-provided `viewer_capabilities` and raw `target_grants`.

Target behavior:

```text
PROFILE MORE MENU (•••)
        |
        v
FETCH SERVER SNAPSHOT
        |
        +--> cannot view -> omit permission surface
        |
        +--> can view -> render read-only permission state
        |
        +--> can manage -> render grant/revoke controls
                              |
                              v
                       ACTION REQUEST
```

The DOM never decides whether a grant/revoke operation is legal. It only renders the server projection.

The existing `integration.dom_ready` flag becomes `true` only after an authoritative snapshot endpoint is connected and integration tests prove fail-closed behavior. Until then it stays false.

### 5.5 Sensitive Action Lease Issuance

A sensitive mutation is a two-stage operation:

1. request an action lease;
2. consume that lease while performing the action.

Lease issuance re-resolves current authority from persisted state; it does **not** trust the UI snapshot.

A lease must bind at minimum:

- grant id;
- principal;
- action;
- canonical verified resource/sector/entity/geo scope;
- database-derived scope digest;
- purpose;
- nonce hash;
- policy version;
- audit evidence reference;
- server issued/not-before/expiry times.

Lease lifetime is the minimum of:

- configured lease TTL;
- parent grant expiry;
- policy-specific maximum.

Recommended default sensitive-action lease TTL: 30 seconds, hard maximum 60 seconds unless a narrower action policy requires less.

### 5.6 Atomic Lease Consumption

Consumption must be database-atomic and replay-safe.

Required pattern:

```text
SELECT lease FOR UPDATE
  -> verify ISSUED
  -> verify principal/action/scope/nonce bindings
  -> verify database time window
  -> re-check parent grant active
  -> perform protected state transition
  -> mark lease CONSUMED
COMMIT
```

If the protected action and lease consumption affect database state, they must occur in the same transaction or under an equivalent atomic server operation so that neither can succeed alone.

Replay, mismatched binding, expired lease, revoked grant, changed scope, or stale policy fails closed.

### 5.7 Owner-Sealed Disclosure Persistence

The pure `owner-sealed-disclosure.js` contract remains useful as a deterministic validation/reference model, but cross-process authority moves to persistent atomic storage.

A new persisted disclosure request/lease authority must bind:

- disclosure request id;
- requester;
- artifact id;
- classification;
- artifact scope digest;
- purpose;
- nonce digest;
- challenge digest;
- owner step-up authorization id when required;
- status;
- database-issued/not-before/expiry times;
- consumed/revoked timestamps;
- audit evidence reference.

For `CONFIDENTIAL` and `OWNER_ONLY`:

1. create or resolve an exact disclosure request;
2. obtain fresh phishing-resistant owner step-up authority;
3. atomically consume that owner step-up authorization while issuing the disclosure lease;
4. cap disclosure lease expiry by both request expiry and owner authorization expiry;
5. atomically consume disclosure lease when releasing the protected artifact.

One owner step-up authorization cannot approve multiple independent disclosure requests.

For non-owner-sealed classes, the runtime still performs normal authorization and exact artifact binding; it simply does not invent an owner step-up requirement.

### 5.8 Idempotency

Network retries must not create duplicate authorities.

Lease/disclosure issuance uses an idempotency key or unique request id bound to the complete canonical request.

- same id + exact same binding -> return the same current result;
- same id + different binding -> conflict / fail closed;
- consumed/revoked/expired authority is never resurrected by retry.

### 5.9 Revocation and Expiry

Revocation is authoritative immediately at execution time.

- capability snapshots may visually lag only until their short expiry;
- action execution always re-checks current authority, so a stale snapshot cannot bypass revocation;
- grant revocation invalidates/revokes outstanding issued leases;
- expiry uses database time;
- terminal lease states are non-reversible;
- append-only audit events record security-relevant transitions.

### 5.10 Audit and Provenance

Every sensitive issuance/consume/deny path emits structured audit evidence without raw secrets.

Audit fields should include:

- correlation id;
- actor principal;
- target/resource;
- action;
- decision;
- reason code;
- grant/lease/request references;
- canonical scope digest;
- policy version;
- server timestamp;
- environment/release binding where relevant.

Never write raw OTPs, passwords, approval codes, access tokens, private prompts, or reusable owner secrets into authorization evidence.

## 6. Server API boundary

The preferred implementation is one internal server/edge authorization runtime boundary rather than direct browser access to sensitive tables.

Conceptual endpoints/actions:

```text
GET/POST authorization/snapshot
POST     authorization/lease
POST     authorization/lease/consume
POST     authorization/grant
POST     authorization/revoke
POST     disclosure/request
POST     disclosure/lease
POST     disclosure/consume
```

These names are conceptual contracts, not public branding and may change during implementation.

The authenticated principal is derived from the verified server session/token. A request body may identify the target/resource but may not assert the caller's own principal or capabilities as authority.

## 7. Trust boundaries

### Browser / client

Untrusted for:

- current time;
- capabilities;
- role authority;
- grant state;
- lease state;
- scope digest generation;
- owner approval state;
- protected-view security state unless backed by an attested native signal accepted by server policy.

### Server runtime

Trusted to:

- bind authenticated identity;
- normalize request context;
- call server-only database functions;
- return minimal UI projections;
- coordinate exact-bound lease issuance/consumption.

### Database authority

Authoritative for:

- grant/event/lease persistence;
- atomicity;
- replay state;
- server time;
- scope subset enforcement;
- revocation/expiry transitions;
- uniqueness/idempotency constraints where persisted.

## 8. Failure behavior

All security-critical ambiguity fails closed.

Examples:

- no authenticated principal -> deny;
- snapshot unavailable -> omit/disable sensitive UI and retry through normal error state;
- unknown capability -> deny;
- malformed or unbounded scope -> deny;
- expired snapshot -> refresh, never execute from it;
- revoked parent grant -> deny/mark outstanding lease revoked;
- lease binding mismatch -> deny and audit;
- lease replay -> deny and audit;
- owner-sealed disclosure without fresh exact owner step-up -> deny;
- database/server authority unavailable -> do not fall back to client authority.

## 9. Testing strategy

Implementation must proceed RED -> GREEN in isolated slices.

Minimum test families:

1. **Snapshot authority tests** — client-supplied capabilities/roles/time cannot widen result.
2. **Projection tests** — own-view, authorized-other-view, manage, and deny states map correctly into the profile menu model.
3. **Revocation race tests** — snapshot says visible but grant is revoked before mutation; mutation must fail.
4. **Lease exact-binding tests** — principal/action/scope/nonce/policy mismatches fail.
5. **Lease replay/concurrency tests** — two consumers race; exactly one may succeed.
6. **Disclosure persistence tests** — original `ISSUED` object replay from another process cannot succeed after persistent consumption.
7. **Owner step-up tests** — one authorization cannot issue two owner-sealed disclosure leases.
8. **Server-time tests** — no security decision accepts caller-controlled `now`.
9. **Idempotency tests** — exact retry returns stable result; changed binding conflicts.
10. **Browser-authority tests** — anon/authenticated roles have no direct sensitive-table mutation privileges.
11. **Audit-secret tests** — raw reusable secrets never enter audit rows.
12. **Existing repository gates** — VVIP Quality Gate, TIGER CleanGuard, Project Control Integrity, and Zero-Residue Full History remain GREEN at exact implementation SHA.

## 10. Proposed implementation slices

This design intentionally avoids one large migration or UI rewrite.

1. Define capability snapshot contract and RED tests.
2. Add server-side snapshot resolver over persisted grants/events.
3. Adapt `permissions-control.js` to consume server projection; keep DOM integration disabled.
4. Add profile-menu integration RED tests, then wire the `•••` surface and set `dom_ready` true only when authoritative data is present.
5. Define persistent owner-sealed disclosure request/lease schema and RED tests.
6. Implement atomic owner-step-up consume + disclosure-lease issue.
7. Implement atomic disclosure-lease consume and replay tests.
8. Add sensitive action lease issuance/consume bridge and revocation-race tests.
9. Add structured audit linkage and secret-exclusion tests.
10. Run exact-SHA full repository gates and document residual non-claims.

Each slice must be independently reviewable and must not weaken existing gates to obtain GREEN.

## 11. Migration strategy

All database work in PR #321 remains **source-only forward migration artifacts** until separately authorized for an environment.

Rules:

- never rewrite historical migrations merely to hide old semantics;
- harden through forward migrations;
- revoke obsolete execution signatures before granting secure replacements;
- no browser-role direct authority;
- no remote `db push`, Production activation, or Staging mutation in this design phase;
- exact database application order must be tested on a clean schema before any later deployment authorization.

## 12. Compatibility and evolution

The bridge is intentionally internal and brand-neutral.

- public/commercial naming can change without changing canonical capability IDs;
- sector display names can change without changing authorization contracts;
- new sectors add scopes/capabilities through registries/contracts rather than forking authorization architecture;
- future native/agentic/generative surfaces consume the same server authorization projection and lease boundary;
- the internal cognitive system may propose improvements, but it cannot bypass the Constitutional/Policy authority, owner gates, or runtime authorization bridge.

## 13. Definition of done for this integration phase

The phase is complete only when all of the following are evidenced at an exact SHA:

- the profile permission surface receives authority from the server bridge, not caller-supplied capabilities;
- sensitive UI state is a short-lived projection only;
- every sensitive mutation re-resolves authority and uses an exact-bound single-use lease;
- revocation between render and action prevents the action;
- owner-sealed disclosure has persistent atomic cross-process replay protection;
- owner step-up is consumed exactly once for the disclosure it approves;
- database time controls security windows;
- browser roles cannot mutate sensitive authority tables directly;
- audit evidence is structured and secret-safe;
- all four repository gates are GREEN;
- PR remains Draft until the owner chooses the later integration/merge path.
