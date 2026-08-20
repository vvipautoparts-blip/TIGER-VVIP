# TIGER SOVEREIGN RELEASE CONSTITUTION 2026

**Master Standard v2.0**
**Status:** OWNER-APPROVED / NORMATIVE
**Adopted:** 2026-08-20
**Scope:** Gates 2–14 and all promotion decisions derived from them.

## 1. Constitutional release law

No gate, environment, artifact, or release may be promoted by narrative assertion alone. Every promotion MUST satisfy the exact chain:

`Requirement -> Code -> Test -> Rehearsal -> Evidence -> Exact SHA -> Gate Sign-off`

The machine release predicate is:

`ReleaseAllowed = RequirementsFrozen && CodeVerified && TestsGreen && RehearsalsGreen && EvidenceBoundToExactSHA && P0EqualsZero && P1EqualsZero && ArtifactIdentityVerified`

If any term is false, unknown, stale, unbound, or derived from a different source SHA, release is denied fail-closed.

## 2. Eight sovereign constitutions

Every Gate 2–14 MUST comply with all of the following cross-cutting constitutions:

1. **Evidence Constitution** — no PASS without machine-verifiable evidence bound to the exact source SHA.
2. **Identity Constitution** — one canonical identity authority; caches and accelerators may not become competing identity systems.
3. **Data Constitution** — every sensitive datum has an owner, classification, retention policy, residency policy, and deletion authority.
4. **Mutation Constitution** — every externally retryable write has authorization, idempotency, auditability, and deterministic conflict behavior.
5. **Failure Constitution** — every remote boundary defines timeout, retry budget, exponential backoff with jitter, dead-letter behavior, circuit breaking, and a safe terminal state where applicable.
6. **Supply-Chain Constitution** — deployable artifacts require dependency locking, secret scanning, provenance, SBOM evidence, and digest identity.
7. **Release Constitution** — every promotion binds source SHA, artifact digest, migration identity, evidence identity, rollback authority, and environment identity.
8. **Sovereign Kill-Switch Constitution** — the Owner can disable a country, feature, campaign/payment capability, or high-risk integration without taking down unrelated platform capabilities.

## 3. Mandatory gate contract

Each Gate MUST define and prove:

- security invariants;
- correctness invariants;
- SLOs and measurement boundaries;
- explicit failure modes and blast radius;
- rollback/compensation plan;
- kill-switch or containment path where relevant;
- test suite;
- rehearsal procedure;
- evidence manifest;
- exact source SHA;
- unresolved P0/P1 count;
- sign-off decision.

A green unit test suite alone is never sufficient.

## 4. Gate 2 — TIGER Media Fortress

### 4.1 Strict reservation authority

The browser-facing reservation contract accepts only:

- `post_id`
- `idempotency_key`

It MUST reject or ignore client-asserted canonical metadata including MIME, byte count, dimensions, SHA-256, canonical storage path, verifier identity, or verification timestamp.

A reservation produces a server-derived `ticket_id` and a bounded upload capability to an isolated private quarantine path:

`quarantine/{user_id}/{ticket_id}`

The TIGER reservation lease is 300 seconds. If the underlying storage provider cannot cryptographically enforce the same expiry, the application MUST still enforce a 300-second acceptance lease and purge or reject late quarantine objects. Provider behavior MUST be proven in rehearsal; it may not be assumed.

### 4.2 Trusted finalizer

Only a trusted service/worker authority may convert quarantine bytes into canonical media facts. The finalizer MUST derive from the actual stored bytes:

- magic-byte media type;
- decoded dimensions;
- byte length;
- SHA-256;
- canonicalization/sanitization result;
- canonical private object path.

Filename extension and browser metadata are never canonical evidence.

The processing lifecycle is:

`UPLOADING -> QUARANTINED -> INSPECTING -> VERIFIED -> PROMOTING -> READY`

Failure paths terminate as one of:

`REJECTED | DEAD_LETTER | PURGED`

The implementation MUST include bounded parser/resource controls including pixel-count limits and decompression-bomb resistance, and MUST strip sensitive metadata when the canonical media contract requires it.

### 4.3 Media Passport

Every READY canonical object MUST have an immutable evidence record containing at minimum:

- media identifier;
- owner and parent post identity;
- source ticket identity;
- canonical SHA-256;
- canonical MIME;
- canonical bytes;
- canonical dimensions;
- verifier/worker version;
- verified timestamp;
- security state.

### 4.4 Queue reliability

Worker delivery MUST be idempotent. Queue claiming MUST prevent duplicate concurrent ownership, using database-safe locking semantics such as `FOR UPDATE SKIP LOCKED` where the database owns the queue. Failures MUST use bounded exponential backoff with jitter and deterministic DLQ transition after the retry budget is exhausted.

## 5. Gate 3 — TIGER Conversation Sovereignty

Durable messages and ephemeral realtime state are separate authorities.

- message rows are durable, RLS-protected, participant-authorized, idempotent, and sequence/cursor addressable;
- sender identity is derived server-side and cannot be forged;
- block/privacy changes invalidate access immediately;
- private Realtime channels are authorized against conversation membership;
- typing and presence are ephemeral and may use CRDT/presence state, but must not generate persistent write amplification;
- reconnect performs deterministic catch-up from a durable cursor;
- fallback transport may be used where WebSockets are unavailable, but transport claims MUST be proven for the deployed stack rather than assumed.

## 6. Gate 4 — TIGER Notification Intelligence

In-app realtime and background push are distinct delivery paths.

The notification decision engine MUST consider online/background state, current view, user preferences, TTL, sensitivity, and duplicate identity. Push delivery MUST support bounded collapse semantics and deduplication without treating push as the durable source of truth.

## 7. Gate 5 — TIGER Adaptive Network Fabric

User-facing pagination MUST use stable cursor/keyset semantics for unbounded timelines; offset pagination is prohibited for those paths.

Local-first behavior MUST support:

- IndexedDB on web and SQLite-compatible storage on mobile where applicable;
- optimistic UI with idempotent mutation identifiers;
- durable retry queue;
- conflict resolution;
- reconnection catch-up;
- explicit states for excellent/good/degraded/poor/offline/recovering network quality.

Weak-network rehearsals MUST include latency, jitter, reconnect, duplication, reordering, and up to 20% packet loss where the test harness supports it.

## 8. Gates 6–7 — TIGER Reality Lab

Staging MUST be isolated from Production by data, credentials, storage, queues, analytics, push credentials, and payment credentials. Synthetic data is the default evidence source.

Dual-user scenarios MUST prove no session/state leakage. Android/iPhone validation MUST cover Chromium/WebKit behavioral differences, background/foreground transitions, reconnect, keyboard/safe-area behavior, message delivery, and read receipts.

Latency SLOs MUST define the measured boundary. No global device-to-device `<250 ms` guarantee may be claimed for networks outside TIGER control. Server/API and realtime fan-out latency may have independent P95/P99 SLOs, while constrained-network end-to-end latency is measured separately.

## 9. Gate 8 — TIGER Identity Fortress

Passkeys/WebAuthn are the preferred phishing-resistant authentication path, with recovery and step-up controls.

Identity MUST remain single-authority. Short-lived JWTs, rotating refresh tokens, session identifiers, and revocation/risk caches may be combined, but Redis or another cache MUST NOT silently become a second independent refresh-token authority unless an explicit migration and threat model replaces the existing authority.

Sensitive actions MAY require live session/revocation validation and adaptive reauthentication. TOTP, one-time encrypted recovery flows, and cryptographically hashed backup codes are supported recovery/step-up mechanisms.

## 10. Gate 9 — Marketplace Listing Integrity Gate

The Marketplace is governed as a listing/classifieds system unless the Owner explicitly adopts a separate goods-checkout model.

Required E2E integrity includes create/edit/media/publish/search/filter/country/sector/pause/status/report/moderation/delete/authorization/race-safe state transitions. Platform advertising/campaign financial inventory belongs to Gate 10 and MUST NOT be conflated with purchase of listed goods.

## 11. Gate 10 — TIGER Financial Atomicity

Financial journals are append-only and use integer minor units or an equivalent exact decimal representation; binary floating-point money is prohibited.

Every posting MUST balance:

`sum(debits) - sum(credits) = 0`

Reversals, refunds, disputes, and chargebacks create compensating entries rather than mutating history. Provider webhooks require signature verification, provider event identity, idempotency, replay protection, delayed-event rehearsal, and reconciliation.

Payment providers are adapters activated per Country Payment Profile; the global core MUST NOT become permanently coupled to one provider.

## 12. Gate 11 — TIGER Global Resilience Shield

CloudFront/WAF/edge controls, origin non-bypass, rate/abuse controls, immutable infrastructure-as-code, backup restore, secrets rotation, DNS/failover, and disaster rehearsal are mandatory before Production sign-off.

DR targets are evidence objectives, not marketing claims:

- planned switchover: target RPO = 0 where architecture supports it;
- unplanned regional disaster: objective RPO < 60 seconds, measured;
- RTO < 15 minutes, measured by rehearsal.

No statement of zero data loss is permitted for an unplanned regional failure unless the deployed architecture and an exact rehearsal prove it.

## 13. Gate 12 — TIGER Nervous System

OpenTelemetry-compatible traces, logs, metrics, and correlation identifiers MUST expose both technical and business integrity.

The Owner plane MUST surface at minimum:

- latency including P95/P99;
- traffic;
- error rate;
- saturation;
- realtime integrity;
- security integrity;
- campaign/ledger integrity;
- alert state and incident linkage.

HTTP success alone is not evidence of business correctness.

## 14. Gate 13 — TIGER Country Sovereignty Engine

Each country has a versioned activation manifest covering legal, privacy, tax, payments, currency, residency, moderation, retention, feature flags, and launch approval.

The activation state machine is fail-closed:

`DRAFT -> TECH_READY -> LEGAL_READY -> TAX_READY -> PAYMENT_READY -> SECURITY_READY -> OWNER_APPROVED -> ACTIVE`

No shortcut to ACTIVE is permitted.

## 15. Gate 14 — TIGER Zero-Day Launch Trial

The final launch trial includes bounded and observable exercises for:

- load and soak;
- dependency failure;
- database/service interruption;
- region/provider failure where architecture supports rehearsal;
- backup restoration;
- credential rotation;
- rollback;
- abuse controls;
- SAST;
- DAST;
- dependency and secret scanning;
- chaos/unknown-failure containment.

The system MUST fail closed on authorization and financial integrity, contain blast radius, preserve durable ledgers, and recover deterministically.

Final launch eligibility requires:

`P0 = 0` and `P1 = 0` and exact-SHA evidence completeness = 100%.

## 16. Final TIGER Release Passport

The final passport MUST include or hash-bind:

- Release ID;
- exact Git source SHA;
- build artifact digest;
- container/image digest where applicable;
- migration identity/digest;
- SBOM digest;
- dependency lock digest;
- SAST/DAST/dependency/secret-scan evidence;
- database rehearsal evidence;
- realtime/privacy/media evidence;
- load/chaos/DR evidence;
- unresolved P0/P1 counts;
- explicitly accepted P2/P3 risks;
- country activation manifest identity;
- rollback source/artifact identity;
- environment identity;
- Owner approval;
- generated timestamp.

The passport has a cryptographic evidence root that binds requirements, source, tests, rehearsals, and artifacts. Evidence from another SHA may not satisfy the current release.

## 17. Supersession rule

This document is the normative Master Standard for Gates 2–14. Any older document, PR narrative, test assumption, or implementation that conflicts with this Constitution is subordinate and MUST be corrected, superseded, or retired before sign-off.

No Gate is considered closed merely because its PR is green. Closure requires the constitutional evidence contract above.