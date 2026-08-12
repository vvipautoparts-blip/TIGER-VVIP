# Production Read-Only Inspection Gate — 2026

## Status and authority

This is a reusable owner-control safety gate. It authorizes **inspection planning and read-only metadata inspection only**. It does not authorize SQL mutation, migration execution, Storage mutation, Clerk/provider changes, DNS changes, secret rotation, deployment, country activation, owner seeding, or any other Production write.

The gate is fail-closed: if target identity, access mode, evidence scope, or command semantics are uncertain, stop with `UNKNOWN_STOP`.

## Core security model

Inspection follows these rules:

1. **Exact target binding.** The intended Production target must be identified by at least two independent signals before any remote inspection.
2. **Read-only capability.** Use the narrowest account/token/interface that can satisfy the inspection. Do not reuse mutation-capable credentials when a read-only method is available.
3. **Metadata, not data.** Inspect configuration, schema metadata, policy metadata, grants, migration state, bucket metadata, and deployment identity. Do not export row data, personal data, file contents, secrets, tokens, or provider payloads.
4. **No inferred success.** Unknown, missing, conflicting, or stale evidence is not PASS.
5. **Evidence minimization.** Persist only sanitized facts needed to prove the decision. Do not commit secrets, database content, access tokens, signed URLs, cookies, JWTs, OAuth material, or screenshots containing Production data.
6. **Reproducible record.** Record the exact repository SHA, operator, UTC timestamp, approved scope, target signals, interfaces/commands used, and sanitized findings.
7. **Independent drift classification.** Every difference from repository intent is classified before any remediation is proposed.

## Preconditions

Before inspection, record all of the following:

- Operator identity.
- UTC inspection timestamp/window.
- Repository and exact `main` SHA being used as the reference truth.
- Intended Production project/account/environment identifier.
- Two independent target-verification signals.
- Approved read-only access path.
- Credential scope and expiry/session boundary, without recording the credential itself.
- Sanitized evidence-output location.
- Redaction method.
- Explicit `NO_MUTATION_AUTHORIZED` declaration.

If the two target signals disagree, stop immediately.

## Allowed inspection domains

Read-only metadata inspection may cover only the domains required by the approved review, including:

- Remote project/environment identity.
- Database engine/version metadata.
- Applied migration/version history.
- Schema/table/column inventory for approved components.
- Function inventory, owner, language, volatility/security attributes, and fixed search-path configuration where exposed safely.
- RLS enabled/forced state and policy inventory.
- Policy command/role/`USING`/`WITH CHECK` metadata.
- Grants and role privileges.
- Storage bucket inventory, public/private state, size/limit metadata, and Storage policy metadata.
- Safe identity-provider integration metadata exposed through approved management surfaces.
- Release/deployment metadata needed to bind the live environment to repository evidence.
- Drift against current owner decisions, migration contracts, and security matrices.

## Forbidden operations

The inspection must not execute or invoke any operation that can mutate state. Prohibited examples include:

- Migration apply/push/up commands.
- SQL `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `GRANT`, or `REVOKE`.
- Function/RPC calls whose write behavior is not proven absent.
- Bucket/object creation, upload, update, move, or deletion.
- Policy creation/update/deletion.
- Secret/provider/DNS changes.
- Auth-user creation, modification, impersonation, or session issuance for testing.
- Row-data export or Production-data screenshots.
- Any command whose dry-run/read-only semantics cannot be independently verified.

If an interface cannot guarantee the boundary, do not use it.

## Target verification

Use at least two independent signals, for example:

- Owner-controlled environment/project reference.
- Provider management-surface project identity.
- Previously approved deployment metadata bound to the same repository/environment.
- Read-only API metadata returning the expected immutable project/account identifier.

Do not count two views of the same unverified value as independent evidence.

## Drift classification

Every observed mismatch receives exactly one disposition:

- `EXPECTED_DOCUMENTED` — known and already owner-approved.
- `REQUIRES_REMEDIATION` — real mismatch requiring a separate plan/PR.
- `SECURITY_BLOCKER` — unsafe state; Production-sensitive progression is blocked.
- `UNKNOWN_STOP` — evidence is insufficient or contradictory; inspection stops until reviewed.

No remediation is performed inside this inspection gate.

## Evidence record

A completed inspection record must contain:

- Operator and reviewer.
- UTC timestamps.
- Exact repository SHA.
- Intended and verified target identifiers, sanitized where needed.
- The two independent target signals.
- Credential/access class, never the secret value.
- Commands/interfaces used.
- Inspection domains completed and skipped.
- Sanitized findings and drift classifications.
- Stop conditions encountered.
- Explicit declaration that no state mutation occurred.

## PASS criteria

The gate is `PASS` only when:

- Exact target binding passed using two independent signals.
- The access path was proven read-only for the executed scope.
- Every approved inspection domain was completed or explicitly blocked.
- No state mutation occurred.
- No secret, token, personal data, row data, or Production file content was captured.
- Every drift item was classified.
- No `SECURITY_BLOCKER` or `UNKNOWN_STOP` remains unresolved.
- Operator and reviewer sign the sanitized evidence record.

`PASS` means only that the inspection is trustworthy. It does **not** authorize Production mutation or deployment.