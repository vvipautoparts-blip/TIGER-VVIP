# Unified Authorization Runtime Bridge — Source Integration Evidence

Date: 2026-08-23
PR: #321
Branch: `design/universal-rendezvous-platform-20260822`
Integration checkpoint SHA: `1f26a9656faa9e4a5b193f75814d24cea3b880f5`

## Scope of this evidence

This document records source-level evidence for the owner-approved Unified Authorization Runtime Bridge integration. It does not claim that source migrations have been applied to a remote database or that any Production/Staging deployment occurred.

The integration checkpoint above completed the four required repository gates successfully:

- VVIP Quality Gate — SUCCESS (run 2261)
- TIGER CleanGuard — SUCCESS (run 1787)
- Project Control Integrity — SUCCESS (run 2423)
- Zero-Residue Full History — SUCCESS (run 879)

## Proven source integration

### 1. Presentation is not execution authority

The profile permission surface consumes a short-lived server capability snapshot for presentation. The snapshot explicitly carries `execution_authority: false`. A visible or manageable UI projection cannot by itself authorize a protected mutation.

The profile controller refreshes the capability snapshot on menu-open and fails closed when the snapshot is missing/invalid. The browser-side controller does not directly call sensitive permission persistence or hold service-role authority.

### 2. Sensitive mutations require persistent leases

Protected mutations use the Sensitive Action Lease bridge. The JavaScript bridge validates canonical request bindings but does not create the authoritative grant/lease state itself.

The persistent source contract binds:

- principal;
- action;
- bounded resource/sector/entity/geo scope;
- database-derived scope digest;
- nonce;
- policy version;
- grant identity;
- database-authoritative time.

Client-provided scope digests are rejected.

### 3. Revocation race is fail-closed

The source migration serializes sensitive lease issuance versus grant revocation through database row locking. Grant state is revalidated by persistent authority rather than trusting a previously rendered browser snapshot.

A stale presentation snapshot can therefore remain visually present while execution is denied after persistent revocation.

### 4. Sensitive lease replay prevention

Sensitive action leases are single-use persistent authority artifacts. Consumption uses row locking and atomic state transition. A second consume attempt resolves to replay/conflict rather than restoring an old browser state.

Lease lifetime is bounded to at most 60 seconds and cannot outlive the grant.

### 5. Owner-Sealed Disclosure is persistent and single-use

`CONFIDENTIAL` and `OWNER_ONLY` disclosure issuance is bound to persistent Owner Step-Up authorization using the explicit `APPROVE_DISCLOSURE` action.

The owner authorization is locked and consumed in the same database transaction as disclosure issuance. One authorization cannot approve multiple different disclosure leases. JavaScript objects containing an old `ISSUED` state are not authoritative and cannot resurrect a consumed persistent lease.

### 6. Database time is authoritative

The active source contracts for sensitive action leases and owner-sealed disclosure use database statement time for validity/expiry decisions. Caller-supplied `p_now` is absent from these new authoritative flows.

### 7. Browser privilege denial

Browser-facing profile/permission code has no service-role credential path, no direct mutation of sensitive permission tables, and no direct RPC invocation for protected authority state.

Sensitive persistence/RPC authority remains server/service-role constrained by the source migrations and RLS/revoke rules.

### 8. Authorization audit reuses the existing audit chain

The integration does not create a second authorization ledger. `authorization-runtime-audit.js` maps authorization decisions into the existing AI audit-chain append contract.

Structured events carry bounded authorization metadata such as actor, target, action, decision, reason code, authority references, scope digest, policy version, environment/release binding, and correlation identity.

Raw reusable credentials/secrets are rejected recursively, including raw OTP/password/authorization-token/bearer-token/approval-code/raw-prompt material. Browser-shaped role/grant/capability fields are not accepted as proof of authority in audit metadata.

## Integration test coverage

`tests/unified-authorization-runtime-bridge-integration.test.cjs` covers the joined source path rather than one module in isolation:

1. profile capability projection with `execution_authority: false`;
2. presentation-management visibility versus persistent mutation authority;
3. stale snapshot + revoked grant denial;
4. sensitive lease issuance/consume and replay conflict;
5. rejection of client-generated scope digests;
6. one-time owner authorization for disclosure;
7. inability to resurrect a consumed disclosure lease from an old JavaScript object;
8. structured authorization audit and recursive secret exclusion;
9. database-time and locking source invariants;
10. browser privilege denial;
11. absence of deployment/remote-apply commands in the integrated source path.

## Architectural convergence / no parallel authority

The integrated design intentionally keeps one authority hierarchy:

- server capability snapshot = presentation projection only;
- persistent grants = durable permission authority;
- short-lived persistent leases = execution authority;
- persistent Owner Step-Up authorization = owner-sealed disclosure approval authority;
- existing append-only audit chain = authorization audit authority.

No JavaScript in-memory lease state is treated as a second source of truth.

## Explicit non-claims

This PR and this evidence do **not** claim any of the following:

- no remote Supabase migration apply has been performed;
- no Production database mutation has been performed;
- no Staging database mutation has been performed;
- no Production deployment has been performed;
- no Staging deployment has been performed;
- no merge has been performed;
- PR #321 is not made ready-for-review solely by this source integration and remains Draft;
- no native mobile adapter activation is claimed;
- no payment-provider readiness is claimed;
- no legal/regulatory approval is claimed;
- no protected-view mechanism is claimed to prevent external physical-camera capture;
- source-level GREEN does not by itself prove remote runtime/database behavior until separately authorized migrations/deployment and environment-specific verification occur.

## HANDOFF / commercial boundary

Nothing in this authorization integration changes the platform commercial boundary. CONTACT -> HANDOFF remains intact. Authorization controls access to platform capabilities/artifacts; it does not introduce brokerage, escrow, negotiation, buyer/seller transaction processing, or post-HANDOFF external-deal observation.

## Final repository state rule

The containing commit must independently pass the same four repository gates before Task 9 is considered complete. The PR must remain Draft and unmerged unless the owner makes a later explicit integration/merge decision.
