# V13.1 Trusted Authorization Server Command Handler Design

## Status

Approved implementation design for the next stacked authorization slice. This slice is server-boundary code only. It does not deploy, connect to Supabase, apply migrations, seed authority records, or activate production.

## Objective

Provide a pure, dependency-injected server command handler that receives an already authenticated server request, validates the V13.1 authorization envelope and trusted state, enforces command-specific authority policy, and returns success only after an injected transaction reports committed persistence and append-only audit evidence.

## Chosen Architecture

The handler is a pure Node-compatible module under `scripts/authorization`. It has no endpoint, URL, service key, project reference, database driver, environment lookup, or browser integration. Infrastructure supplies three trusted dependencies:

1. `loadTrustedState(actorId)` — loads current identity, account, assignment revision, policy version, and country seal state.
2. `runTransaction(work)` — provides a transaction port and returns only after commit.
3. `clock()` — supplies the authoritative current timestamp.

The transaction port exposes bounded operation methods. The handler never accepts a generic SQL function and never constructs SQL.

## Security Boundary

- `authenticatedActorId` comes from the server authentication layer, never from request JSON.
- The envelope actor must equal `authenticatedActorId`.
- Client-authored authority fields are rejected before policy evaluation.
- Prototype-polluting keys are rejected recursively.
- Trusted state is loaded by the authenticated actor ID.
- The V13.1 envelope must be current, unexpired, revision-matched, account-active, scope-contained, and country-sealed when operational.
- Ordinary assignment operations cannot create or mutate owner or partner authority.
- Partner membership operations are a separate owner-root path and require a bounded legal decision reference.
- Every write is idempotent. Same key and same canonical command replays the committed receipt; same key with changed content fails.
- Persistence and audit append happen in one injected transaction.
- Success requires an explicit committed transaction result plus a persisted record ID and audit hash.
- Any dependency exception, partial result, malformed result, or rollback returns a stable fail-closed error.

## Supported Operations

Write operations only in this slice:

- `createAssignment`
- `suspendAssignment`
- `revokeAssignment`
- `createPartnerMembership`
- `suspendPartnerMembership`
- `revokePartnerMembership`

Reads and HTTP routing remain outside this slice.

## Request Contract

```js
{
  operation,
  command,
  envelope,
  authenticatedActorId,
  correlationKey,
  idempotencyKey,
  reason,
  resource
}
```

`resource` is a server-derived authorization resource descriptor. It is not a grant source. The operation mapping determines the required permission and whether the envelope check is governance or operational.

## Transaction Port

Within `runTransaction(async (tx) => ...)`, the port must expose:

```js
{
  findIdempotencyReceipt(idempotencyKey),
  persistAuthorizationCommand({ operation, command, actorId, now }),
  appendAuthorizationAudit({ ... }),
  storeIdempotencyReceipt({ idempotencyKey, requestHash, result })
}
```

All methods must return explicit bounded objects. Missing methods or malformed responses fail closed.

## Stable Result Contract

Success:

```js
{
  ok: true,
  code,
  data: { id, state, authorityClass },
  receipt: {
    confirmed: true,
    persisted: true,
    correlationKey,
    idempotencyKey,
    auditHash
  }
}
```

Failure:

```js
{ ok: false, code }
```

No raw exception, database message, stack trace, trusted state, token, envelope internals, or unrestricted persistence object is returned.

## Operation Policy Mapping

- Assignment writes require `authorization.assignment.manage`, governance scope, and delegated targets only.
- Partner membership writes require `authorization.partner.manage`, governance scope, owner-root authority, trusted online enforcement, and legal decision reference.
- Country-local operational checks are supported by the envelope validator but no operational business command is introduced in this slice.

## Idempotency

The handler canonicalizes only the allowlisted request projection and hashes it with SHA-256 when Web Crypto is available. The same canonical fallback used by the existing authorization repository is permitted only for isolated runtimes without Web Crypto. A prior receipt is accepted only when its stored request hash matches and its result is a valid committed stable result.

## Failure Semantics

- Missing configuration: `CONFIGURATION_REQUIRED`
- Missing identity: `IDENTITY_REQUIRED`
- Actor mismatch or inactive identity: `IDENTITY_DENIED`
- Client authority fields: `CLIENT_AUTHORITY_FIELDS_DENIED`
- Invalid operation/command/result: `INVALID_ASSIGNMENT`
- Envelope/policy denials: preserve their stable V13.1 code
- Reused key with changed request: `IDEMPOTENCY_CONFLICT`
- Transaction/dependency/partial commit failure: `REMOTE_ENFORCEMENT_FAILED`
- Missing commit/persistence confirmation: `REMOTE_CONFIRMATION_REQUIRED`

## Non-Goals

- No HTTP endpoint or Edge Function.
- No Supabase client or database connection.
- No service-role key or environment secret.
- No migration application or seed data.
- No browser invocation.
- No production activation.
- No change to the V13.1 constitutional decisions.

## Acceptance Criteria

1. Unauthenticated and actor-mismatched requests fail closed before persistence.
2. Client authority fields and prototype-pollution keys are rejected.
3. Expired, stale, unsealed, or permission-deficient envelopes are denied.
4. Ordinary commands cannot target owner or partner authority.
5. Partner membership remains owner-root-only with legal reference.
6. Idempotent replay is exact; changed payload conflicts.
7. Persistence and audit are transactional; partial outcomes never report success.
8. Output is a frozen allowlisted stable projection.
9. The module contains no endpoint, credentials, project reference, remote command, or database driver.
10. All focused and repository quality gates pass on the exact final commit.
