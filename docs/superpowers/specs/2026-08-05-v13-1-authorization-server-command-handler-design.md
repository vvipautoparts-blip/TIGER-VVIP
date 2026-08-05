# V13.1 Trusted Authorization Server Command Handler Design

## Status

Approved implementation design for the next stacked authorization slice. This slice is server-boundary code only. It does not deploy, connect to Supabase, apply migrations, seed authority records, or activate production.

## Objective

Provide a pure, dependency-injected server command handler that receives an already authenticated server request, validates the V13.1 authorization envelope and trusted state, enforces command-specific authority policy, and returns success only after an injected transaction reports committed persistence and append-only audit evidence.

## Chosen Architecture

The handler is a pure Node-compatible module under `scripts/authorization`. It has no endpoint, URL, service key, project reference, database driver, environment lookup, browser integration, or environmental cryptography selection. Infrastructure supplies four trusted dependencies:

1. `loadTrustedState(actorId)` — loads current identity, account, assignment revision, policy version, and country seal state.
2. `runTransaction(work)` — provides a bounded transaction port and returns only after commit.
3. `clock()` — supplies the authoritative current timestamp.
4. `digestSha256(canonicalJson)` — returns an exact lowercase 64-character SHA-256 hexadecimal digest from the trusted server cryptography implementation.

The transaction port exposes bounded operation methods. The handler never accepts a generic SQL function and never constructs SQL.

## Security Boundary

- `authenticatedActorId` comes from the server authentication layer, never from request JSON.
- The envelope actor must equal `authenticatedActorId`.
- Create commands reject client-authored authority fields before policy evaluation.
- Suspend and revoke commands discard client-authored role, permission, and scope claims and load the existing authority target from trusted persistence inside the same transaction.
- Prototype-polluting keys are rejected recursively.
- Trusted actor state is loaded by the authenticated actor ID.
- The V13.1 envelope must be current, unexpired, revision-matched, account-active, scope-contained, and country-sealed when operational.
- Ordinary assignment operations cannot create or mutate owner or partner authority.
- Partner membership operations are a separate owner-root path and require a bounded legal decision reference.
- Mutation targets are checked against owner immutability, peer-partner isolation, self-elevation, role rank, and scope containment before persistence.
- Every write is idempotent. Same key and same canonical semantic command replays the committed receipt; same key with changed content fails.
- Persistence, audit append, and idempotency receipt storage happen in one injected transaction.
- Success requires an explicit committed transaction result plus a persisted record ID and audit hash.
- Any dependency exception, partial result, malformed result, rollback, missing cryptographic dependency, or malformed digest returns a stable fail-closed error.

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
  loadAuthorizationTarget({ operation, family, targetId }),
  persistAuthorizationCommand({ operation, command, actorId, trustedTarget, now }),
  appendAuthorizationAudit({ ... }),
  storeIdempotencyReceipt({ idempotencyKey, requestHash, result })
}
```

`loadAuthorizationTarget` is required for suspend and revoke operations and executes after the idempotency lookup but before policy evaluation or persistence, within the same transaction. Create operations do not require an existing target.

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

- Assignment creation requires `authorization.assignment.manage`, governance scope, and delegated targets only.
- Assignment suspension and revocation require the same management authority, but never accept role, permission, or scope authority from the request; these are derived from the trusted target.
- Partner membership writes require `authorization.partner.manage`, governance scope, owner-root authority, trusted online enforcement, and legal decision reference.
- Country-local operational checks are supported by the envelope validator but no operational business command is introduced in this slice.

## Cryptographic Idempotency

The handler canonicalizes a bounded allowlisted request projection and passes its canonical JSON string to the injected `digestSha256` function.

The cryptographic contract is strict:

- `digestSha256` is required configuration.
- The returned digest must match `^[a-f0-9]{64}$` exactly.
- Missing, throwing, uppercase, truncated, extended, or otherwise malformed results fail closed before any transaction begins.
- The pure handler does not inspect `globalThis.crypto`, import a runtime-specific cryptography package, or select cryptography based on its environment.
- No FNV, checksum, deterministic non-cryptographic hash, or other fallback is permitted.

A prior receipt is accepted only when its stored request hash matches and its result is a valid committed stable result.

## Failure Semantics

- Missing configuration, including `digestSha256`: `CONFIGURATION_REQUIRED`
- Missing identity: `IDENTITY_REQUIRED`
- Actor mismatch or inactive identity: `IDENTITY_DENIED`
- Client authority fields on create: `CLIENT_AUTHORITY_FIELDS_DENIED`
- Invalid operation/command/result: `INVALID_ASSIGNMENT`
- Envelope/policy denials: preserve their stable V13.1 code
- Reused key with changed request: `IDEMPOTENCY_CONFLICT`
- Transaction/dependency/cryptographic/partial commit failure: `REMOTE_ENFORCEMENT_FAILED`
- Missing commit/persistence confirmation: fail closed without exposing success

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
2. Create-time client authority fields and all prototype-pollution keys are rejected.
3. Expired, stale, unsealed, or permission-deficient envelopes are denied.
4. Ordinary commands cannot target owner or partner authority.
5. Partner membership remains owner-root-only with legal reference.
6. Mutation targets are loaded and evaluated transactionally from trusted storage.
7. Ignored client authority fields cannot influence a mutation decision or persistence command.
8. Idempotent replay is exact; changed semantic payload conflicts.
9. SHA-256 is injected, exact, and has no non-cryptographic fallback.
10. Persistence and audit are transactional; partial outcomes never report success.
11. Output is a frozen allowlisted stable projection.
12. The module contains no endpoint, credentials, project reference, remote command, database driver, environment lookup, or browser dependency.
13. All focused and repository quality gates pass on the exact final commit.
