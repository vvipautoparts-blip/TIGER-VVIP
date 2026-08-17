# F03 — SOA + Sovereign Capability Graph Design

**Status:** OWNER-DIRECTED IMPLEMENTATION DESIGN

**Base:** F02 exact-head `48466f5838d51b6a90223144899f5b7389ec6441`

## Goal

Extend the existing V13 authorization foundation into the FUSION Single Surface without creating a second authority system or a separate admin application.

## Architecture

F03 is an authorization presentation and capability-contract layer on top of the existing SOA/V13 authorization stack.

The browser is never an authority source. It receives a server-confirmed capability snapshot, validates its shape and freshness, and renders only the capabilities represented by that snapshot. Missing, malformed, expired, client-invented, or unknown capability state fails closed.

`OWNER_ROOT` remains sovereign and immutable under SOA. SCG does not replace SOA.

## Core invariants

1. No privileged capability is derived from DOM state, local storage, query parameters, role labels, or client-supplied fields.
2. Privileged capability presentation requires a server-confirmed snapshot tied to actor, policy version, assignment revision, scope, and expiry.
3. Delegated authority cannot expand beyond the exact confirmed permissions and scope.
4. Unknown permissions fail closed.
5. The `⋮` menu is one surface for ordinary users, employees, partners, and OWNER; visibility differs only through confirmed capability data.
6. No separate final-state admin/owner interface is introduced.
7. Existing V13 authorization contracts remain the source of truth for authority classes, permissions, scope, and enforcement.
8. F03 does not apply SQL, change Production RLS, move money, activate countries, or weaken Clerk/SOA authentication.

## Owner marketplace boundary

`docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md` is binding.

F03 must reject any capability namespace intended to make VVIP TIGER a transaction intermediary, including capability prefixes for checkout, escrow, delivery/shipping, transaction settlement, transaction commission, or buyer/seller dispute resolution.

Platform billing capabilities for VVIP TIGER's own advertising services are a separate platform concern and are not transaction execution between marketplace parties.

## Capability snapshot

Minimum accepted snapshot fields:

- `schemaVersion = VVIP_TIGER_SCG_SNAPSHOT_V1`
- `serverConfirmed = true`
- `actorId`
- `authorityClass` from the existing V13 `AUTHORITY_CLASSES`
- `permissionIds` from the existing V13 `PERMISSION_IDS`
- `scope`
- `policyVersion`
- `assignmentRevision`
- `issuedAt`
- `expiresAt`

The client rejects expired snapshots and snapshots whose lifetime exceeds the existing V13 authorization envelope TTL.

## Presentation mapping

F03 initially exposes only UI entries backed by existing V13 permissions:

- `authorization.assignment.read` -> My capabilities
- `authorization.assignment.manage` -> Capability assignments
- `authorization.permission.delegate` -> Delegation
- `authorization.partner.manage` -> Partners
- `authorization.audit.read` -> Decision / audit history
- `country.governance.read` -> Countries
- `country.governance.manage` -> Country governance
- `country.operation.execute` -> Country operations

The client may hide entries it cannot prove. It may never invent an entry to make the menu look complete.

## Error behavior

Expected fail-closed outcomes include:

- `REMOTE_CONFIRMATION_REQUIRED`
- `MALFORMED_CAPABILITY_SNAPSHOT`
- `CAPABILITY_SNAPSHOT_EXPIRED`
- `CAPABILITY_SNAPSHOT_TTL_EXCEEDED`
- `UNKNOWN_PERMISSION`
- `MARKETPLACE_INTERMEDIARY_CAPABILITY_DENIED`

Errors do not reveal hidden privileged capability details.

## Testing

Contract tests must prove:

- no snapshot -> no privileged entries;
- `serverConfirmed=false` -> denied;
- expired/overlong snapshot -> denied;
- unknown permission -> denied;
- forbidden intermediary namespaces -> denied;
- exact confirmed permission -> exact menu entry only;
- delegated snapshot cannot gain capabilities not present in the confirmed permission list;
- returned structures are immutable.

## F03 completion boundary

F03 is complete only when the capability contract and Single Surface menu integration are exact-head verified. It does not claim Production privilege integration until the protected authentication/entrypoint route is separately integrated and verified.