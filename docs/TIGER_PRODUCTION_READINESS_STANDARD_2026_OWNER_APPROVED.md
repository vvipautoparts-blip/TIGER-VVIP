# TIGER Production Readiness Standard 2026 — Owner Approved Edition

Status: **OWNER-APPROVED / RELEASE GOVERNANCE SOURCE OF TRUTH**

Approved on: 2026-08-19
Scope: VVIP TIGER launch readiness, staging, release evidence, and production eligibility.

## Governing rule

No capability is considered complete because code exists. A capability closes only through:

`Requirement -> Code -> Automated Test -> Rehearsal -> Evidence -> Exact SHA -> Release Passport`

The operational lifecycle is:

`Intent -> Policy -> Execution -> Verification -> Evidence`

Every release claim must be tied to one exact commit SHA. No Production or `main` mutation is authorized merely by this document.

## Owner-approved technical corrections

1. **Database migrations** use zero-downtime Expand/Dual-Write/Backfill/Contract where compatibility requires it. Contract/destructive cleanup is isolated to a later PR. Lock timeouts are explicit and bounded per migration; `2s` is a default guard, not an unconditional constant. Concurrent indexes use a migration path compatible with PostgreSQL transaction rules.
2. **Database performance** is judged by query plans and measured cost. Sequential scans are not categorically forbidden; unintended or materially expensive scan plans are.
3. **External social integrations** live behind an Anti-Corruption Layer with stable internal schemas and provider-specific adapters. Webhook idempotency is durable, not memory-only.
4. **Managed-first eventing** defaults to AWS SQS + DLQ + EventBridge. Kafka is introduced only when an evidenced workload requires it.
5. **Realtime** must implement reconnect, resync, deduplication, revalidation, and a documented HTTP fallback path. No release may assume an unsupported automatic protocol fallback.
6. **Presence/typing** are ephemeral channel state and must not create unnecessary durable database writes. Do not claim a CRDT guarantee unless the selected implementation actually provides it.
7. **Notifications** separate in-app realtime from push delivery. APNs/FCM differences are hidden behind a notification abstraction layer; collapse/dedupe semantics are provider-aware.
8. **Pagination/offline** uses keyset/cursor pagination for mutable large feeds. Web uses IndexedDB where safe; SQLite is reserved for a native/mobile shell that actually embeds it.
9. **Preview** must be isolated HTTPS, exact-SHA, backed by a STAGING backend with synthetic/sanitized data. User A/User B acceptance evidence is mandatory before Production eligibility.
10. **Identity** keeps the approved Identity Provider as the source of truth. VVIP TIGER must not invent a parallel refresh-token authority when rotation/revocation are already safely provided. Passkeys/2FA/session revocation are verified capabilities, not documentation claims.
11. **Marketplace scope is classified ads, search, listing lifecycle, reporting, and communication only.** VVIP TIGER is not a goods checkout, inventory reservation, fulfillment, or buyer/seller payment intermediary. Any conflicting purchase/inventory locking model is rejected.
12. **Campaign payments and ledger** apply only to platform advertising/campaign credits. Ledger is append-only double-entry with reversals, reconciliation, webhook signature verification, and idempotency. Payment methods are activated through a Country Payment Profile after legal/tax/provider approval; no single global provider is hard-coded as policy.
13. **Infrastructure and DR** target managed AWS architecture, CDN/WAF, encrypted backups/PITR, and rehearsed recovery. RPO/RTO values are SLO targets until demonstrated by an actual DR rehearsal; they must never be presented as achieved without evidence.
14. **Security release gate** does not claim "zero vulnerabilities." Production eligibility requires `P0 = 0`, `P1 = 0`, and no unaccepted/unmitigated Critical or High security finding, plus launch evidence for SAST/DAST/dependency and relevant runtime checks.

## Fourteen launch gates

### G01 — Database Rehearsal / Zero-Downtime Schema
- Expand/Contract compatibility where required.
- Bounded lock behavior.
- Query-plan evidence for material paths.
- Local/staging rehearsal succeeds before promotion.

### G02 — Media Security Boundary
- Private media is non-public and non-guessable.
- Authenticated/authorized reads only.
- MIME/type/size/path ownership validation.
- Logout/private-cache purge verified.

### G03 — Messaging / Realtime / Presence
- Server-authoritative identity and RLS.
- Block/relationship-aware authorization.
- Reconnect/resync/dedupe without duplicate delivery.
- Ephemeral presence/typing.

### G04 — Realtime Notifications
- In-app and push paths separated.
- Offline/background delivery is asynchronous.
- Provider-aware dedupe/collapse behavior.

### G05 — Pagination / Weak-Network Resilience
- Cursor/keyset pagination for mutable feeds.
- Stable ordering and deduplication.
- Safe optimistic UI and retry semantics.
- Offline/private-data boundaries verified.

### G06 — Exact-SHA HTTPS Preview / Dual Identity
- Isolated PREVIEW surface.
- STAGING backend only.
- Synthetic/sanitized data only.
- User A/User B state and privacy isolation evidence.

### G07 — Android <-> iPhone Acceptance
- Chromium/WebKit behavior verified.
- Safe areas, keyboard, gestures, session persistence.
- Loss/latency/reconnect testing without silent duplication.

### G08 — Identity Closure
- Login, recovery, 2FA, passkeys where supported, sessions, revocation.
- Short-lived/access-token policy controlled by the approved identity authority.
- Recovery is single-use, bounded, and auditable.

### G09 — Marketplace Production Journey
- Listing create/edit/delete, media, search/filter, country/sector, status, reporting.
- No goods checkout, inventory reservation, fulfillment, or buyer/seller payment mediation.

### G10 — Campaign + Ledger Sandbox / Country Payments
- Append-only double-entry ledger.
- `sum(debits) - sum(credits) = 0` invariant.
- Idempotent signed provider callbacks.
- Reconciliation/chargeback/refund paths tested in sandbox.
- Country Payment Profile governs provider activation.

### G11 — AWS / CDN / WAF / Backup / DR
- Managed-first AWS edge and runtime controls.
- WAF/rate controls and encrypted backups/PITR.
- Cross-region strategy where justified.
- RPO/RTO claims require rehearsal evidence.

### G12 — Observability / Owner Sovereign Dashboard
- OpenTelemetry traceability for material request paths.
- P95/P99, 5xx, saturation/resource signals.
- Financial and operational owner views sourced from authoritative records.
- Critical alerting has an owner/escalation path.

### G13 — Legal / Country Activation
- Privacy/terms/cookies/deletion obligations represented as deployable controls.
- Country activation lifecycle: `Draft -> Legal_Approved -> Tax_Configured -> Active -> Suspended`.
- Geo/currency/tax/payment features are gated by country configuration.

### G14 — Load / Stress / Chaos / Security Launch Tests
- Load/stress establishes capacity and graceful degradation.
- Chaos validates recovery behavior without corrupting state.
- SAST/DAST/dependency/runtime checks are evidenced.
- Final launch gate: `P0 = 0`, `P1 = 0`, no unaccepted/unmitigated Critical/High.

## Production gate

Production eligibility requires all applicable gates to be `Verified` on the same release candidate SHA, with evidence linked in the Release Passport. A green UI, passing build, or successful isolated test is insufficient by itself.

## Execution order

`Privacy/DB Proof -> Media -> Messaging/Realtime -> Notifications -> Pagination/Resilience -> Identity -> Exact-SHA Preview/Device Tests -> Marketplace -> Campaign/Ledger Sandbox -> Infrastructure/DR -> Observability/Owner Dashboard -> Legal/Country Activation -> Load/Chaos/Security -> Production Gate`

## Non-negotiable release protections

- No direct Production mutation during feature slices.
- No silent weakening of RLS, security tests, or safety gates to obtain green CI.
- No real-money activation before ledger sandbox, reconciliation, country legal/tax/provider approval, and explicit promotion evidence.
- No live Preview URL claim without provider-backed HTTPS evidence tied to the exact source SHA.
- No legacy fallback that conflicts with the active owner-approved architecture.

This document supersedes conflicting launch-readiness wording for the covered scope and is the owner-approved release reference for VVIP TIGER 2026.
