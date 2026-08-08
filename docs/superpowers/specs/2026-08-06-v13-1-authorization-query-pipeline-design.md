# V13.1 Trusted Authorization Query Pipeline Design

## Status

Owner-delegated approved design for a stacked read-only authorization slice above PR #124. This slice does not deploy an endpoint, connect to Supabase, apply migrations, add credentials, mutate authority records, or activate production.

## Objective

Build a trusted read pipeline for authorization assignments and audit events that enforces current identity, envelope validity, permissions, geographic scope, disclosure minimization, opaque cursor integrity, stable snapshots, and bounded output even when the injected backend returns malformed, excessive, or out-of-scope data.

## Existing Gap

The current repositories expose `listAssignments` and `listAuditEvents`, but they are not a production-grade read boundary:

- pagination uses a numeric offset cursor that can be guessed or altered;
- the caller relies on repository-side filtering without independently validating every returned row;
- audit reads can return records without delegated-scope filtering;
- record projections are broader than least-disclosure requirements;
- raw audit payload, idempotency identifiers, legal references, or authority metadata could leak if a backend adapter over-returns data;
- read consistency is not bound to a stable snapshot revision.

The new pipeline does not delete these repositories. It prevents direct production use of their broad read APIs by introducing a verified query handler and a server-only query boundary.

## Considered Approaches

### 1. Direct Repository Passthrough — Rejected

Calling `listAssignments` or `listAuditEvents` directly is simple, but it trusts backend filtering, exposes numeric cursors, and cannot prove least disclosure.

### 2. Thin Server Boundary Only — Rejected

A server-only wrapper can verify the session but still trusts the backend to return only allowed rows and fields. A compromised or defective adapter could disclose out-of-scope assignments or audit details.

### 3. Trusted Query Handler + Server Query Boundary — Selected

The query handler owns authorization, query normalization, cursor binding, row validation, scope enforcement, and disclosure projection. The server boundary owns runtime isolation and trusted session/context resolution only. This preserves one decision path and keeps infrastructure replaceable.

## Architecture

```text
untrusted query request
  -> server runtime guard
  -> exact request/query sanitizer
  -> trusted session resolver
  -> trusted authorization context resolver
       -> full V13.1 envelope
       -> server-derived resource
  -> trusted query handler
       -> fresh trusted-state reload
       -> envelope + permission + scope validation
       -> normalized semantic query
       -> SHA-256 query binding
       -> opaque authenticated cursor decode
       -> bounded backend page read
       -> every-row scope and class validation
       -> role-based least-disclosure projection
       -> opaque authenticated next cursor encode
  -> bounded deeply frozen result
```

## Supported Queries

Exactly two operations are included:

- `listAssignments`
- `listAuditEvents`

Get-by-ID, searches by arbitrary subject, exports, analytics, dashboards, and writes remain outside this slice.

## Query Handler Construction

```js
createAuthorizationQueryHandler({
  loadTrustedState,
  readAuthorizationPage,
  clock,
  digestSha256,
  cursorCodec
})
```

### `loadTrustedState(actorId)`

Returns the current trusted identity, account state, authority class, roles, permissions, effective assignment IDs, scope, policy version, assignment revision, session invalidation timestamp, and relevant country seal state.

### `readAuthorizationPage(input)`

Receives one frozen bounded request:

```js
{
  operation,
  actor,
  query,
  position,
  snapshotRevision,
  limit,
  now
}
```

Returns:

```js
{
  items,
  nextPosition,
  snapshotRevision
}
```

The handler never passes SQL, table names, RPC names, credentials, raw envelope data, or arbitrary filter objects.

### `digestSha256(canonicalJson)`

Required injected server cryptography. It must return exact lowercase 64-character SHA-256 hexadecimal output. No fallback or environment detection is allowed.

### `cursorCodec`

Required injected server implementation:

```js
{
  decode(opaqueCursor),
  encode(payload)
}
```

The codec must authenticate cursor integrity and confidentiality. The pure handler validates the decoded payload but does not choose an algorithm, key, provider, environment variable, or storage backend.

## Internal Handler Request

```js
{
  operation,
  query,
  envelope,
  authenticatedActorId,
  correlationKey,
  resource
}
```

Reads do not use idempotency keys, reasons, or write receipts.

## Permission Mapping

- `listAssignments` requires `authorization.assignment.read`.
- `listAuditEvents` requires `authorization.audit.read`.
- Both are governance queries and use the current V13.1 envelope validator.
- `OWNER_ROOT` and `PARTNER_GLOBAL_ADMIN` have platform scope, subject to field-disclosure differences.
- `DELEGATED` actors may read only records contained by their effective scope and requested scope.
- A requested scope can narrow authority but never expand it.

## Query Contract

Common fields:

```js
{
  limit,
  cursor,
  scope
}
```

Rules:

- default limit: 25;
- maximum limit: 50;
- cursor: `null` or opaque bounded string up to 2,048 characters;
- scope: required normalized V13.1 scope for delegated actors; optional platform scope for owner/partner;
- unknown fields are rejected;
- no numeric offset is accepted from the external caller.

### Assignment Filters

Optional:

```js
{
  states,
  authorityClasses
}
```

- `states` is a unique sorted allowlisted set from `pending`, `active`, `suspended`, `revoked`, `expired`;
- `authorityClasses` is a unique sorted allowlisted set;
- delegated actors may request `DELEGATED` only;
- owner and partner may request broader classes, but field disclosure still differs;
- arbitrary subject IDs, role names, permission strings, SQL-like filters, and unbounded text search are excluded from this slice.

### Audit Filters

Optional:

```js
{
  actions,
  from,
  to
}
```

- `actions` is a unique sorted bounded set of exact stable action identifiers, maximum 10;
- `from` and `to` must be valid ISO timestamps;
- `from < to`;
- maximum requested window is 90 days;
- delegated actors must provide a contained scope;
- no raw JSON payload search is allowed.

## Versioned Query Binding

The handler computes SHA-256 over a canonical projection:

```js
{
  contract: {
    name: "V13.1_AUTHORIZATION_QUERY",
    version: 1
  },
  operationContractVersion,
  operation,
  actorId,
  normalizedQueryWithoutCursor,
  authorityContext: {
    authorityClass,
    policyVersion,
    assignmentRevision,
    countrySealVersion,
    roleIds,
    permissionIds,
    effectiveAssignmentIds,
    scope
  }
}
```

Set-like arrays are sorted. Country codes and scopes use the canonical country-scope module. Correlation keys, envelope IDs, issue/expiry timestamps, active-market selection, and the cursor itself are excluded.

Changing operation, actor, filters, scope, limit, policy version, assignment revision, seal version, roles, permissions, or effective assignments invalidates an existing cursor.

## Opaque Cursor Contract

Decoded payload:

```js
{
  contract: {
    name: "V13.1_AUTHORIZATION_QUERY_CURSOR",
    version: 1
  },
  operationContractVersion,
  operation,
  actorId,
  queryHash,
  snapshotRevision,
  position,
  issuedAt,
  expiresAt
}
```

Rules:

- cursor TTL is at most five minutes;
- `issuedAt <= now < expiresAt`;
- actor, operation, operation version, and query hash must match the current request;
- snapshot revision is immutable across pages;
- position is an opaque bounded backend token, never an external numeric offset requirement;
- malformed, expired, tampered, cross-actor, cross-query, cross-operation, or cross-version cursors fail closed;
- encoded cursors are bounded to 2,048 characters;
- raw filters, roles, permissions, personal data, and legal references are not embedded in cursor plaintext by the handler.

## Backend Page Validation

The handler treats backend output as untrusted data:

- result must be a plain bounded object;
- `items` must be an array no larger than the requested limit;
- every item must be a plain bounded object;
- every assignment and audit item must have a valid normalized scope;
- every item must be contained by both actor scope and requested scope;
- delegated actors must never receive owner or partner authority rows;
- a delegated audit event missing scope is rejected rather than treated as global;
- `nextPosition` and `snapshotRevision` must be stable bounded identifiers or `null` where allowed;
- if the backend over-returns, returns out-of-scope data, changes snapshot unexpectedly, or returns malformed records, the entire page fails closed. Items are never silently filtered because silent filtering can hide backend security defects.

## Disclosure Policy

### OWNER_ROOT

Assignment fields:

```text
id
subjectId
authorityClass
roleId
permissionIds
scope
state
startsAt
expiresAt
grantedBy
createdAt
legalDecisionReference
```

Audit fields:

```text
sequenceNo
eventHash
previousHash
actorId
action
targetType
targetId
reason
correlationKey
scope
createdAt
```

### PARTNER_GLOBAL_ADMIN

Assignments use the owner projection except `legalDecisionReference` is omitted. Audit projection may include reason and actor for global governance review, but never raw payload or idempotency identifiers.

### DELEGATED

Assignment fields:

```text
id
subjectId
roleId
permissionIds
scope
state
startsAt
expiresAt
```

Audit fields:

```text
sequenceNo
eventHash
previousHash
action
targetType
targetId
scope
createdAt
```

Delegated results omit `authorityClass`, `grantedBy`, legal references, actor IDs, reasons, correlation keys, idempotency keys, and raw payload.

### Never Disclosed

No role receives:

- raw `event_payload`;
- idempotency keys;
- session or envelope data;
- token or credential material;
- legal-entity or residency configuration;
- database internals;
- exception text or stack traces;
- fields not explicitly allowlisted above.

## Stable Query Result

Success:

```js
{
  ok: true,
  code: "AUTHORIZATION_QUERY_OK",
  items,
  page: {
    nextCursor,
    snapshotRevision,
    hasMore
  },
  correlationKey
}
```

Failure:

```js
{ ok: false, code }
```

Maximum encoded response size: 128 KiB. Results and nested records are deeply frozen.

## Server Query Boundary

Construction:

```js
createAuthorizationQueryBoundary({
  runtime,
  sessionResolver,
  authorizationContextResolver,
  queryHandler
})
```

External request:

```js
{
  operation,
  query,
  envelopeRef,
  correlationKey
}
```

The boundary:

1. requires `runtime === "server"`;
2. accepts only the two query operations;
3. validates exact top-level keys and bounded query structure;
4. resolves the trusted active session;
5. resolves full envelope and resource from the server using `envelopeRef`;
6. verifies envelope actor equals session actor;
7. invokes the query handler once;
8. returns only its stable bounded result.

It does not implement permission, scope, cursor, disclosure, or backend-row policy itself.

## Failure Codes

Boundary and handler use stable codes:

```text
SERVER_RUNTIME_REQUIRED
CONFIGURATION_REQUIRED
UNKNOWN_AUTHORIZATION_QUERY
INVALID_QUERY
INVALID_CORRELATION_KEY
IDENTITY_DENIED
AUTHORIZATION_CONTEXT_INVALID
PERMISSION_DENIED
QUERY_SCOPE_DENIED
INVALID_CURSOR
CURSOR_EXPIRED
CURSOR_CONTEXT_MISMATCH
RESPONSE_TOO_LARGE
REMOTE_ENFORCEMENT_FAILED
```

Existing V13.1 envelope denials are preserved.

## No Shared Cache in This Slice

Authorization queries default to no shared cache. Cursor-bound snapshot consistency is included; response caching is deferred because authority data changes rapidly and stale disclosure is a security risk. A future cache may be actor-private, revision-keyed, and explicitly invalidated.

## Files

Create:

```text
scripts/authorization/v13-authorization-query-handler.js
scripts/authorization/v13-authorization-query-boundary.js
tests/v13-1-authorization-query-handler.test.cjs
tests/v13-1-authorization-query-boundary.test.cjs
```

Update:

```text
scripts/quality-gate.sh
tests/v13-1-authorization-quality-gate.test.cjs
```

## TDD Acceptance Criteria

1. Missing dependencies and non-server boundaries fail before external calls.
2. Exactly two query operations are accepted.
3. Unknown request and query fields fail closed.
4. Fresh trusted state and valid current envelope are required.
5. Permission and scope are enforced independently of backend filtering.
6. Delegated actors cannot request or receive owner/partner assignments.
7. Delegated audit rows must carry contained scope.
8. Backend over-return, malformed rows, out-of-scope rows, and snapshot drift fail the whole page.
9. Query hashes are exact SHA-256 with no fallback.
10. Cursors are opaque, authenticated by injected codec, versioned, actor-bound, query-bound, snapshot-bound, and short-lived.
11. Tampered, expired, or context-mismatched cursors fail closed.
12. Disclosure projections match owner, partner, and delegated tiers exactly.
13. Raw audit payload, idempotency key, and non-allowlisted fields are never returned.
14. Output is deeply frozen, bounded, and stable.
15. No browser, endpoint, network, environment, credential, SQL, RPC map, transport, queue, mutation, or local-success surface exists.
16. Focused query tests and all repository quality gates pass on one exact final SHA.

## Rollback

The query pipeline is isolated on a stacked branch above PR #124. Rollback is closing the query PR without merge. No schema, data, credential, remote service, or production repair is required.
