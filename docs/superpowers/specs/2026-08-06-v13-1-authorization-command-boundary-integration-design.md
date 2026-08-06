# V13.1 Trusted Authorization Command Boundary Integration Design

## Status

Owner-delegated approved design for a stacked integration slice above PR #119. This slice composes the trusted server boundary with the pure authorization command handler. It does not deploy an endpoint, connect to Supabase, apply migrations, introduce secrets, or activate production.

## Objective

Create one server-only write boundary that converts a bounded untrusted application request into the exact trusted request consumed by `v13-server-command-handler.js`.

The boundary authenticates the session, resolves the full authorization context from trusted server infrastructure, strips or rejects client-authored authority claims, and delegates all policy, semantic idempotency, transactional persistence, and append-only audit behavior to the command handler.

## Selected Architecture

```text
untrusted write request
  -> server runtime guard
  -> operation-aware request sanitizer
  -> trusted session resolver
  -> trusted authorization context resolver
       -> full V13.1 envelope
       -> server-derived resource
  -> actor and context consistency checks
  -> pure command handler from PR #119
       -> trusted state reload
       -> envelope validation
       -> semantic SHA-256 idempotency
       -> one transaction
       -> trusted target reload for mutation
       -> persistence + audit + receipt
  -> bounded frozen result projection
```

The boundary is an orchestration layer, not a second authorization engine. It does not duplicate role, scope, partner, owner, seal, or delegation policy.

## Rejected Approaches

### Generic RPC Proxy

Rejected because an operation-to-RPC mapping followed by a second independent authorization implementation creates policy drift, duplicate receipt semantics, and a confused-deputy risk.

### Direct Browser Privileged Calls

Rejected because browser input, tokens, role claims, and authority fields are not trusted.

### Double Authorization Decision

Rejected because a boundary-level decision plus a handler-level decision can diverge. The boundary resolves trusted data; the command handler makes the authoritative decision.

### Mixed Read/Write Boundary

Rejected for this slice. Reads use different caching, pagination, disclosure, and consistency rules. They will receive a separate query boundary.

## Supported Operations

The boundary accepts only the six write operations implemented by the command handler:

- `createAssignment`
- `suspendAssignment`
- `revokeAssignment`
- `createPartnerMembership`
- `suspendPartnerMembership`
- `revokePartnerMembership`

`listAssignments`, `listAuditEvents`, arbitrary RPC names, and all unknown operations fail closed.

## Construction Contract

```js
createAuthorizationCommandBoundary({
  runtime,
  sessionResolver,
  authorizationContextResolver,
  commandHandler
})
```

### `runtime`

Must equal `server`. Browser, client, worker, undefined, and unknown runtimes return `SERVER_RUNTIME_REQUIRED`.

### `sessionResolver(trustedContext)`

Returns a bounded trusted projection:

```js
{
  actorId,
  accountState: 'active',
  sessionIssuedAt
}
```

The untrusted request never supplies this projection.

### `authorizationContextResolver(input)`

Receives only a frozen bounded input:

```js
{
  envelopeRef,
  operation,
  actorId,
  command,
  trustedContext
}
```

It returns:

```js
{
  envelope,
  resource
}
```

The full envelope and resource are trusted server outputs. A missing, malformed, stale, or actor-mismatched context fails before the command handler.

`trustedContext` is opaque to the boundary and is not cloned, logged, hashed, returned, or forwarded to persistence.

### `commandHandler`

Must expose `execute(request)`. It is the PR #119 handler already configured with trusted state loading, transaction execution, authoritative clock, and SHA-256.

## External Request Contract

```js
{
  operation,
  command,
  envelopeRef,
  correlationKey,
  idempotencyKey,
  reason
}
```

Unknown top-level keys are rejected.

The external request never contains:

- full envelope;
- resource;
- authenticated actor ID;
- trusted state;
- session object;
- authority class;
- assignment or policy revision;
- country seal version;
- legal entity or data residency authority;
- endpoint, token, secret, RPC name, SQL, or database URL.

## Operation-Aware Command Sanitization

### Assignment Creation

Allow only:

```text
subjectId
roleId
requestedPermissionIds
scope
startsAt
expiresAt
```

All other fields are rejected. Requested role, permissions, and scope remain requests only; the handler decides whether the actor can delegate them.

### Partner Creation

Allow only:

```text
subjectId
legalDecisionReference
```

### Assignment Suspension and Revocation

Allow only:

```text
assignmentId
```

Any role, permission, scope, owner, partner, or authority fields are discarded before the handler. They cannot affect authorization, idempotency, persistence, or audit.

### Partner Suspension and Revocation

Allow only:

```text
membershipId
legalDecisionReference
```

The legal reference is required by the handler and remains part of semantic idempotency.

All command values remain bounded. Prototype-polluting keys, cyclic objects, class instances, functions, symbols, bigint, non-finite numbers, oversized arrays, excessive depth, and excessive strings fail closed.

## Internal Handler Request

After trusted resolution, the boundary constructs exactly:

```js
{
  operation,
  command: sanitizedOperationCommand,
  envelope: resolvedEnvelope,
  authenticatedActorId: session.actorId,
  correlationKey,
  idempotencyKey,
  reason,
  resource: resolvedResource
}
```

The boundary verifies `resolvedEnvelope.actorId === session.actorId` before invocation. The handler independently reloads trusted state and validates the envelope again against current revisions and country seals.

## Result Contract

The command handler's stable result is accepted only when it is a bounded plain object with:

```js
{ ok: false, code }
```

or a successful write:

```js
{
  ok: true,
  code: 'AUTHORIZATION_COMMAND_COMMITTED',
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

For success, the echoed correlation and idempotency keys must match the request exactly. Missing persistence confirmation, malformed audit hash, oversized response, or unexpected fields fail closed.

The boundary returns a deeply frozen allowlisted projection and never exposes envelope, session, trusted resource, transaction data, exception text, stack traces, or raw persistence output.

## Failure Semantics

Stable boundary failures:

```text
SERVER_RUNTIME_REQUIRED
CONFIGURATION_REQUIRED
UNKNOWN_AUTHORIZATION_OPERATION
INVALID_COMMAND
INVALID_CORRELATION_KEY
INVALID_IDEMPOTENCY_KEY
REASON_REQUIRED
IDENTITY_DENIED
AUTHORIZATION_CONTEXT_INVALID
REMOTE_CONFIRMATION_REQUIRED
RESPONSE_TOO_LARGE
REMOTE_ENFORCEMENT_FAILED
```

Stable denials returned by the command handler are preserved without raw details.

## Security Properties

- Server-only.
- Write-only and operation-allowlisted.
- No generic RPC or method forwarding.
- No environment lookup, browser API, direct network call, endpoint, credential, database driver, or Service Role.
- No queue, retry loop, optimistic success, volatile privileged success, or offline fallback.
- Trusted context is resolved server-side and remains opaque.
- Mutation commands are reduced before hashing and persistence.
- One authoritative policy engine.
- One semantic idempotency contract.
- One transaction for persistence, audit, and receipt.
- Production remains fail-closed until real infrastructure is explicitly configured and independently approved.

## Files

Create:

```text
scripts/authorization/v13-authorization-command-boundary.js
tests/v13-1-authorization-command-boundary.test.cjs
```

Update only when necessary:

```text
scripts/quality-gate.sh
tests/v13-1-authorization-quality-gate.test.cjs
```

The existing PR #117 module remains unchanged until this integration is proven. After successful verification, PR #117 may be closed as superseded by the composed boundary, preserving its history.

## TDD Acceptance Criteria

1. Non-server runtimes fail before any resolver or handler call.
2. Missing dependencies fail closed.
3. Only the six write operations are accepted.
4. Unknown request keys and malformed structures are rejected.
5. Create commands preserve only their explicit request allowlist.
6. Mutation commands discard client authority and irrelevant fields.
7. Session failure stops before authorization context resolution.
8. Context resolution failure stops before handler execution.
9. Envelope actor mismatch stops before handler execution.
10. The handler receives the exact full trusted envelope and resource.
11. The handler receives the authenticated session actor, never a client actor.
12. Trusted context is not serialized, returned, logged, hashed, or persisted.
13. Handler denial is preserved as a stable bounded failure.
14. Successful receipt must match correlation and idempotency keys and confirm persistence.
15. Oversized or malformed results fail closed.
16. Returned results are deeply frozen and allowlisted.
17. No browser, endpoint, credential, environment, queue, transport, RPC-map, or local-success surface exists.
18. Focused tests and all repository gates pass on the exact final SHA.

## Rollback

The integration is isolated in a stacked branch. Rollback consists of closing the integration PR without merge. It does not require schema rollback, data repair, secret rotation, or production action because this slice has no live connectivity or migration.
