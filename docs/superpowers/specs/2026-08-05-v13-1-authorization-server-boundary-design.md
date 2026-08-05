# V13.1 Authorization Server Boundary Design

**Status:** OWNER_DELEGATED_APPROVED_DESIGN

**Date:** 2026-08-05

**Depends on:** PR #110 → #111 → #112 → #113 → #115

## 1. Purpose

This slice creates a server-only authorization boundary between application commands and a future trusted RPC implementation. It prevents browser code from executing privileged authorization operations, rejects client-authored authority fields, requires a verified server session and a short-lived envelope reference, and exposes success only after a confirmed server receipt.

This slice does not apply the authorization migration remotely, create database policies, add owner or partner identities, activate a country, embed a Supabase service-role key, or claim production connectivity.

## 2. Selected architecture

The selected design is a small pure module plus an injected server transport:

```text
trusted server request
  -> runtime guard
  -> command sanitizer and allowlist
  -> verified session resolver
  -> envelope verifier
  -> injected RPC transport
  -> confirmed receipt validator
  -> bounded result projection
```

Rejected alternatives:

- Direct browser-to-Supabase privileged calls: rejected because browser credentials and client-authored authority are not trusted.
- A local-success fallback: rejected because privileged writes must never appear persisted when the backend is absent.
- An embedded endpoint or service-role credential: rejected because repository code must contain no production secret or deployment binding.
- A generic arbitrary RPC proxy: rejected because only explicitly named authorization operations may cross the boundary.

## 3. Runtime boundary

Construction uses:

```js
createAuthorizationServerBoundary({
  runtime,
  sessionResolver,
  envelopeVerifier,
  transport,
  clock
})
```

`runtime` must equal `server`. Construction or invocation in `browser`, `client`, `worker`, or an unknown runtime fails with `SERVER_RUNTIME_REQUIRED`.

The module must not read `window`, `document`, `localStorage`, cookies, environment variables, or network endpoints directly. All trusted dependencies are injected.

## 4. Allowed operations

The initial allowlist is intentionally narrow:

```text
createAssignment
suspendAssignment
revokeAssignment
createPartnerMembership
suspendPartnerMembership
revokePartnerMembership
listAssignments
listAuditEvents
```

Unknown operations fail with `UNKNOWN_AUTHORIZATION_OPERATION`. The transport receives no arbitrary method name from an untrusted request.

## 5. Request contract

A request has this shape:

```js
{
  operation: 'createAssignment',
  command: { ...bounded operation fields },
  envelopeRef: 'authz_env_ref_<id>',
  correlationKey: 'corr_<id>',
  idempotencyKey: 'idem_<id>',
  reason: 'required for privileged writes'
}
```

Rules:

- `envelopeRef`, correlation key, and idempotency key are bounded stable identifiers.
- Privileged writes require a non-empty bounded reason.
- Reads do not require an idempotency key or reason, but remain bounded and verified.
- Unknown request keys are rejected.
- Prototype-polluting keys are rejected recursively.
- Client-authored authority fields are rejected recursively, including `authorityClass`, `roleIds`, `permissionIds`, `assignmentRevision`, `policyVersion`, `countrySealVersion`, legal entity, residency, billing, and tax fields.
- Raw tokens, session objects, secrets, service-role keys, database URLs, and endpoint values never enter the transport request.

## 6. Trusted session and envelope flow

1. `sessionResolver` receives only the opaque request context supplied by trusted server integration.
2. It returns a frozen projection containing actor ID, active account state, session issuance time, and current authorization revision.
3. `envelopeVerifier` receives the envelope reference, resolved session projection, operation, and sanitized command.
4. It returns a deterministic decision with `allowed`, stable `code`, `authorityClass`, and effective assignment IDs.
5. A denial stops before transport.
6. An allowed request is sent to the injected transport with a bounded canonical payload.

No client role or permission list is accepted as trusted input.

## 7. Transport and receipt

The transport interface is:

```js
transport({
  rpcName,
  operation,
  actorId,
  command,
  correlationKey,
  idempotencyKey,
  reason,
  envelopeRef
}): Promise<Result>
```

The operation-to-RPC mapping is static and internal. The returned result must include:

```js
{
  ok: true,
  code: '<stable success code>',
  data: <bounded projection>,
  receipt: {
    confirmed: true,
    persistence: 'remote',
    correlationKey: 'corr_<id>',
    idempotencyKey: 'idem_<id>'
  }
}
```

Writes without `confirmed: true` and `persistence: remote` fail with `REMOTE_CONFIRMATION_REQUIRED`. Reads require a valid bounded result but no persistence receipt.

## 8. Fail-closed behavior

Stable failures include:

```text
SERVER_RUNTIME_REQUIRED
CONFIGURATION_REQUIRED
IDENTITY_DENIED
SESSION_INVALIDATED
CLIENT_AUTHORITY_FIELDS_DENIED
UNKNOWN_AUTHORIZATION_OPERATION
INVALID_COMMAND
INVALID_CORRELATION_KEY
INVALID_IDEMPOTENCY_KEY
REASON_REQUIRED
AUTHORIZATION_DENIED
REMOTE_CONFIRMATION_REQUIRED
REMOTE_ENFORCEMENT_FAILED
RESPONSE_TOO_LARGE
```

A failure never queues privileged work, mutates local state, retries a non-idempotent write automatically, or exposes raw exception text.

## 9. Bounded data

- Command depth: at most 8.
- Object keys: at most 50 per object.
- Arrays: at most 50 entries.
- Strings: at most 2,000 characters unless a narrower field rule applies.
- Result JSON: at most 128 KiB.
- No functions, symbols, bigint, non-finite numbers, cyclic objects, class instances, maps, sets, buffers, or typed arrays.

Sanitized payloads and returned projections are deeply frozen.

## 10. Auditability and determinism

The boundary creates no independent audit record; the trusted RPC is responsible for persistence and append-only audit in the same transaction. The boundary forwards correlation and idempotency keys and requires the confirmed receipt to echo them exactly.

The same normalized request and deterministic injected dependencies produce the same transport payload and result projection.

## 11. Modules and tests

Create:

```text
scripts/authorization/v13-authorization-server-boundary.js
tests/v13-1-authorization-server-boundary.test.cjs
```

Update:

```text
scripts/quality-gate.sh
tests/v13-1-authorization-quality-gate.test.cjs
```

Tests prove runtime isolation, operation allowlisting, recursive authority-field rejection, prototype-pollution rejection, session and envelope denial, transport non-invocation on denial, exact RPC mapping, receipt confirmation, bounded projections, deterministic freezing, no secret/endpoint literals, and no offline/local-success fallback.

## 12. Completion state

```text
Server boundary: IMPLEMENTED_AND_TESTED
Production RPC: NOT_CONNECTED
Remote migration: NOT_APPLIED
Service-role credential: NOT_PRESENT
Browser privileged access: DENIED
Owner/partner identities: NOT_CREATED
Country activation: NONE
PR state: DRAFT_STACKED
```
