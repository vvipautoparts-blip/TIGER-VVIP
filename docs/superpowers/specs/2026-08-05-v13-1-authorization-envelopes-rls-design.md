# V13.1 Authorization Envelopes and RLS Design

**Status:** OWNER_APPROVED_DESIGN

**Date:** 2026-08-05

**Depends on:** PR #110 V13.1 executable constitution and PR #111 global account country context

## 1. Decision and scope

This design establishes the next V13.1 security slice for VVIP TIGER: immutable owner authority, global partner administration, short-lived server-issued authorization envelopes, country-aware scope evaluation, and a review-only PostgreSQL/Supabase RLS contract.

The owner-approved authority model is:

1. `OWNER_ROOT` is the single highest and immutable authority.
2. `PARTNER_GLOBAL_ADMIN` is a global administrative authority across the platform and all countries.
3. A partner cannot create, suspend, revoke, replace, downgrade, or otherwise mutate the owner.
4. A partner cannot create, suspend, revoke, replace, downgrade, or otherwise mutate another partner.
5. The owner may manage partner membership only through a dedicated protected command with an explicit reason, legal decision reference, trusted server enforcement, and append-only audit evidence.
6. Global governance authority does not bypass country activation state, country seal requirements, local legal constraints, operational capacity, or financial controls.

This slice does not deploy SQL, apply a remote migration, activate Jordan or another country, alter Clerk or Supabase production configuration, or claim production readiness.

## 2. Existing baseline and required extension

The existing PR35 authorization foundation already follows important security properties:

- authorization is based on active assignments and explicit permissions rather than displayed role names;
- missing identity, invalid account state, stale sessions, unknown permissions, invalid scopes, and expired assignments fail closed;
- self-elevation and unowned permission delegation are denied;
- the production repository requires verified remote enforcement and confirmed write receipts;
- current scopes are `platform`, `sector`, `region`, `area`, and `team`.

V13.1 extends this foundation rather than replacing it. The required changes are:

- introduce immutable authority classes distinct from ordinary role assignments;
- add `partner` and `country_admin` role contracts;
- add `country` as a first-class scope level;
- bind local operational authorization to an active country and valid country seal;
- issue and validate server-authored authorization envelopes;
- prevent the browser from supplying trusted authority, legal entity, residency, tax, billing, or seal fields;
- express the same invariants in a review-only RLS contract.

## 3. Authority hierarchy

The canonical hierarchy is:

```text
OWNER_ROOT
└── PARTNER_GLOBAL_ADMIN
    └── PLATFORM_ADMIN
        └── COUNTRY_ADMIN
            └── SECTOR_MANAGER
                └── REGIONAL_MANAGER
                    └── AREA_MANAGER
                        └── GROUP_MANAGER
                            └── OPERATIONAL_ROLES
                                └── REGULAR_USER
```

### 3.1 Owner root

`OWNER_ROOT` is not an ordinary assignment and is never produced by the general assignment API.

Required invariants:

- exactly one active owner root exists in the executable authority projection;
- the owner root cannot be suspended, revoked, deleted, replaced, downgraded, delegated, or self-transferred through ordinary authorization APIs;
- no partner, administrator, country role, service role, browser client, or database row policy may mutate owner-root identity or authority;
- owner-root mutation attempts return `OWNER_ROOT_IMMUTABLE`;
- owner-root reads and legitimate protected commands remain auditable;
- loss-of-access recovery is outside ordinary role management and requires a separately reviewed recovery procedure.

### 3.2 Partner global administrator

`PARTNER_GLOBAL_ADMIN` has platform-wide administrative visibility and authority over roles below partner level.

A partner may:

- read global governance state, country capsules, assignments, evidence, and audit projections permitted by explicit permissions;
- create, suspend, revoke, and modify assignments below partner level when the delegated permission and scope rules allow it;
- administer lower roles across all countries without receiving a separate per-country role;
- inspect countries that are not yet operationally active for governance and preparation purposes.

A partner may not:

- mutate the owner root;
- create or mutate another partner;
- grant partner or owner authority to a user;
- bypass country state, seal, legal, tax, payment, operational-capacity, or financial gates;
- rewrite or delete append-only audit evidence;
- supply server-controlled fields from the client.

Partner peer-mutation attempts return `PEER_PARTNER_MUTATION_DENIED`.

### 3.3 Lower roles

Lower roles are ordinary scoped assignments. Their effective authority is the intersection of:

```text
active identity
∩ active assignment window
∩ explicit permission
∩ normalized scope containment
∩ country-context match when local
∩ valid country seal when operational
∩ current assignment revision
∩ verified server enforcement
```

A role name alone never authorizes an action.

## 4. Governance versus operations

Global governance and local operations are separate dimensions.

A partner may review and prepare a country in `DRAFT`, `LEGAL_APPROVED`, `TAX_CONFIGURED`, `ACTIVE`, or `SUSPENDED` state when an explicit governance permission allows the action.

An operational action bound to a country is authorized only when:

```text
country_state = ACTIVE
country_seal_status = VALID
country_seal_version matches the trusted server context
```

Examples of operational actions include listing publication, country-local financial operations, delivery activation, mediation activation, local support routing, and any feature whose contract explicitly requires an active country seal.

The owner and partners are not exempt from this operational invariant. Their authority controls governance; it does not falsify legal or operational readiness.

## 5. Authorization envelope

A protected server operation consumes a short-lived immutable authorization envelope created by trusted server code.

Canonical shape:

```js
{
  envelopeId: 'authz_env_<id>',
  actorId: 'user-id',
  authorityClass: 'OWNER_ROOT | PARTNER_GLOBAL_ADMIN | DELEGATED',
  roleIds: ['role-id'],
  permissionIds: ['permission-id'],
  scope: {
    level: 'platform | country | sector | region | area | team',
    countryCode: null,
    sectorId: null,
    regionId: null,
    areaId: null,
    teamId: null
  },
  activeMarketCountry: null,
  countrySealVersion: null,
  policyVersion: 'V13.1',
  assignmentRevision: 1,
  sessionIssuedAt: 'ISO-8601',
  issuedAt: 'ISO-8601',
  expiresAt: 'ISO-8601',
  correlationId: 'corr_<id>'
}
```

### 5.1 Trusted source

The envelope is derived from trusted identity, assignment, country, seal, and session sources. The client may send an envelope token or reference, but it may not author or override trusted fields.

The following client-supplied authority fields are rejected:

```text
authorityClass
roleIds
permissionIds
legalEntityCountry
dataResidencyRegion
billingCountry
taxCountry
countrySealVersion
assignmentRevision
policyVersion
```

A violation returns `CLIENT_AUTHORITY_FIELDS_DENIED`.

### 5.2 Lifetime and invalidation

The envelope is short-lived and invalid when any of the following is true:

- `expiresAt <= now`;
- the actor account is not active;
- `sessionIssuedAt` predates the actor's server-side invalidation threshold;
- `assignmentRevision` does not match the current trusted revision;
- `policyVersion` is not `V13.1`;
- a required country seal is missing, invalid, suspended, or version-mismatched;
- the envelope scope does not contain the resource scope;
- the resource country differs from the envelope country for a local operation.

A revision or policy mismatch returns `STALE_AUTHORIZATION_ENVELOPE`.

### 5.3 Deterministic result

Authorization returns a deterministic frozen projection:

```js
{
  allowed: boolean,
  code: 'AUTHORIZED | <stable error code>',
  effectiveAssignmentIds: ['assignment-id'],
  authorityClass: 'OWNER_ROOT | PARTNER_GLOBAL_ADMIN | DELEGATED | NONE'
}
```

No raw exception string is exposed to the UI.

## 6. Country-aware scope model

The canonical scope levels become:

```text
platform
country
sector
region
area
team
```

Normalized scope fields are cumulative:

- `platform`: no geographic identifiers;
- `country`: `countryCode`;
- `sector`: `countryCode`, `sectorId`;
- `region`: `countryCode`, `sectorId`, `regionId`;
- `area`: `countryCode`, `sectorId`, `regionId`, `areaId`;
- `team`: `countryCode`, `sectorId`, `regionId`, `areaId`, `teamId`.

Containment rules:

- `platform` contains every valid lower scope;
- `country` contains only descendants in the same `countryCode`;
- each lower scope must match every ancestor identifier;
- missing identifiers are invalid, not wildcards;
- extra identifiers are invalid;
- `activeMarketCountry` is user context and never substitutes for authorization scope;
- country-local resources must carry a trusted country identifier;
- cross-country access requires platform authority or an explicit cross-country permission contract.

A mismatch returns `COUNTRY_SCOPE_MISMATCH` or `SCOPE_ESCALATION_DENIED` as appropriate.

## 7. Delegation policy

The delegation policy preserves the existing no-self-elevation and no-unowned-permission rules and adds immutable authority classes.

### 7.1 Owner operations

The general assignment API cannot create or mutate `OWNER_ROOT`.

Dedicated owner-only partner membership commands are:

```js
createPartnerMembership(command, context)
suspendPartnerMembership(command, context)
revokePartnerMembership(command, context)
```

Each command requires:

- an active `OWNER_ROOT` actor;
- `authorization.partner.manage`;
- trusted online enforcement;
- explicit reason;
- non-empty legal decision reference;
- idempotency key and correlation key;
- confirmed persistence receipt;
- append-only audit event.

### 7.2 Partner operations

A partner may delegate only to lower roles. The requested role rank must be strictly lower than partner rank, and requested permissions must be owned by the partner's effective contract.

Attempts to target `owner` or `partner` return:

```text
OWNER_ROOT_IMMUTABLE
PEER_PARTNER_MUTATION_DENIED
```

### 7.3 Lower-role operations

Lower roles remain constrained by their explicit delegation permission, rank ceiling, owned permissions, normalized scope, assignment window, and current revision.

The stable delegation failures include:

```text
SELF_ELEVATION_DENIED
UNOWNED_PERMISSION_DENIED
DELEGATION_SCOPE_EXCEEDED
DELEGATION_AUTHORITY_EXCEEDED
SCOPE_ESCALATION_DENIED
COUNTRY_SCOPE_MISMATCH
```

## 8. Repository boundary

Two repositories are required.

### 8.1 Volatile review repository

The volatile repository is for deterministic tests and local review only. It must label persistence as volatile and may not claim production success.

It enforces all authority invariants in memory, including immutable owner root, partner peer protection, assignment revision, country scope, and append-only audit events.

### 8.2 Remote production repository

The production repository is fail closed.

Construction requires:

```js
createRemoteAuthorizationRepository({
  transport,
  verified: true,
  online,
  envelopeVerifier
})
```

Protected writes require a confirmed server receipt. Missing configuration, offline state, malformed response, unconfirmed write, stale envelope, or transport failure returns a stable denial code. No local-success fallback is permitted.

## 9. RLS review contract

A review-only SQL file will be created under:

```text
docs/security/sql-review/v13.1/v13_1_authorization_rls_review.sql
```

It will define, without applying remotely:

- authority principals and immutable authority classes;
- role and permission catalogs;
- scoped assignments with country-aware scope fields;
- assignment revision tracking;
- authorization envelope audit projections;
- country activation and seal references;
- append-only authorization audit events;
- protected RPC boundaries for owner and partner membership operations;
- RLS policies for owner, partner, delegated staff, and ordinary users.

Required RLS invariants:

1. The owner-root principal cannot be inserted, updated, suspended, revoked, or deleted through ordinary table policies.
2. Partner principals cannot mutate owner-root or peer-partner rows.
3. Browser-facing roles cannot set server-controlled authority fields.
4. Delegated access requires permission, active assignment, valid time window, scope containment, country match, and current revision.
5. Country-local operational writes require an active country and valid seal.
6. Users access only their own allowed records.
7. Audit records are append-only and cannot be updated or deleted by browser roles.
8. Security-definer functions use a fixed `search_path`, validate all inputs, and are revoked from `public` unless explicitly granted.

The SQL remains review-only in this slice. No migration is added to `supabase/migrations` and no remote command is executed.

## 10. Module boundaries

The implementation plan will use focused modules:

| File | Responsibility |
|---|---|
| `scripts/authorization/v13-authority-contracts.js` | authority classes, roles, permissions, states, stable error codes, ranks |
| `scripts/authorization/v13-country-scope.js` | normalization and containment for platform/country/sector/region/area/team |
| `scripts/authorization/v13-authorization-envelope.js` | envelope creation from trusted inputs and deterministic validation |
| `scripts/authorization/v13-delegation-policy.js` | owner immutability, partner peer protection, rank and permission delegation rules |
| `scripts/authorization/v13-authorization-repository.js` | volatile review repository and fail-closed remote repository |
| `docs/security/sql-review/v13.1/v13_1_authorization_rls_review.sql` | review-only relational and RLS contract |

The new modules may consume the global account country-context contracts from PR #111, but they may not mutate those modules or infer official country seals from fixtures.

## 11. Data flow

### 11.1 Protected read

1. The server authenticates the actor.
2. The server loads authority class, active assignments, current assignment revision, country state, and seal state.
3. The server issues or validates a short-lived envelope.
4. The policy evaluates permission and scope.
5. The repository or RLS policy applies the same trusted constraints.
6. The caller receives a bounded projection without sensitive authorization internals.

### 11.2 Protected write

1. The client submits a command, idempotency key, correlation key, reason, and resource identifier.
2. Trusted server code rejects client-authored authority fields.
3. The envelope is validated.
4. Delegation or operation policy is evaluated.
5. The database RPC and RLS layer enforce the same invariants.
6. A confirmed persistence receipt and append-only audit event are required before success is exposed.

### 11.3 Failure behavior

All protected failures are fail closed. A denial does not mutate local state, update the UI optimistically, queue privileged work offline, or expose raw backend details.

## 12. Testing strategy

### 12.1 Owner-root tests

Tests prove:

- the ordinary assignment API cannot create an owner root;
- owner root cannot be suspended, revoked, deleted, downgraded, or delegated;
- partner and lower roles receive `OWNER_ROOT_IMMUTABLE` for owner mutation attempts;
- owner recovery is not silently implemented by the ordinary API.

### 12.2 Partner tests

Tests prove:

- partner authority is global for governance;
- a partner can manage lower roles across multiple countries;
- a partner cannot create or mutate a partner;
- a partner cannot grant owner or partner permissions;
- country operational gates still apply to partner actions.

### 12.3 Envelope tests

Tests prove:

- trusted fields are derived server-side;
- client authority fields are denied;
- expired, stale-revision, stale-policy, invalid-session, and invalid-seal envelopes fail;
- deterministic inputs produce deterministic authorization decisions;
- active-market changes do not grant authority.

### 12.4 Country-scope tests

Tests prove:

- platform contains all valid scopes;
- country contains only descendants in the same country;
- sibling countries, sectors, regions, areas, and teams are isolated;
- missing and extra identifiers are invalid;
- local resource country mismatch fails.

### 12.5 Repository tests

Tests prove:

- the volatile repository labels persistence honestly;
- remote construction without verified dependencies fails;
- offline privileged operations fail;
- unconfirmed remote writes fail;
- no privileged command is queued offline;
- idempotency and audit behavior are deterministic.

### 12.6 RLS contract tests

Static contract tests prove the review SQL contains:

- RLS enabled on protected tables;
- no browser policy that can mutate owner-root or peer-partner principals;
- fixed `search_path` on security-definer functions;
- explicit revocation from `public`;
- append-only audit protections;
- country and seal checks on operational writes;
- no executable migration placement or production-application instruction.

## 13. Acceptance criteria

The design slice is accepted when:

- the authority model matches decisions A and A1 exactly;
- the written design contains no unresolved placeholder, contradictory authority rule, or production-readiness claim;
- owner root is immutable in JavaScript policy, repository behavior, SQL review contract, and tests;
- partner authority is global for governance and prohibited from peer or owner mutation;
- country operations remain bound to active state and valid seal;
- browser-authored trusted fields are rejected;
- the remote repository remains fail closed;
- all new tests are observed RED before implementation and GREEN after minimal implementation;
- all existing project, security, and V13.1 gates remain green;
- no remote SQL, database mutation, country activation, or production deployment occurs.

## 14. Explicit exclusions

This design does not include:

- remote database deployment;
- production Clerk or Supabase configuration changes;
- owner recovery implementation;
- partner share-transfer or company-law workflow;
- financial ledger implementation;
- listing publication implementation;
- chat, delivery, mediation, or WhatsApp runtime implementation;
- country activation;
- final UI for owner or partner administration.

Those capabilities require separate specs, plans, tests, and approval gates.
