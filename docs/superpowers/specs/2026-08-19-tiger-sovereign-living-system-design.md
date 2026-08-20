# TIGER Sovereign Living System 2026 — Design

## Status

`CURRENT_ONLY / OWNER APPROVED / IMPLEMENTATION IN PROGRESS`

## Purpose

TIGER Sovereign Living System 2026 (TSLS) is the release, runtime-assurance, privacy-proof, resilience, and owner-control architecture for VVIP TIGER. It does not replace TIGER Social Core, TIGER SYNAPSE v2, or TIGER VERITY FABRIC. It binds them into one provable operating model so that a feature is not considered ready merely because it renders in a browser.

The governing invariant is:

`Intent -> Policy -> Execution -> Verification -> Evidence`

A user-visible success state is valid only when the trusted server/data boundary has accepted the operation and required evidence has been produced.

## Relationship to existing authority

- `SOCIAL_NETWORK_FIRST` remains the primary product identity.
- TIGER ONE remains the living surface.
- TIGER SYNAPSE v2 remains the temporal-intent architecture.
- TIGER VERITY FABRIC remains the authority/provenance/evidence fabric.
- TSLS adds release rings, privacy proof, twin-user verification, mobile chaos resilience, feature cells, owner release passport, and financial-domain isolation.
- Marketplace remains advertising/discovery/direct-contact only; TIGER is not a party to marketplace transactions.
- The financial boundary applies only to TIGER-owned financial scope such as advertising billing, recognized platform revenue, approved commissions, refunds, reconciliation, and accounting.

## Core principles

### 1. Proof-native runtime

Every sensitive operation follows explicit phases:

1. identity and session resolution;
2. policy evaluation;
3. server-side execution;
4. durable persistence where applicable;
5. realtime propagation where applicable;
6. client acknowledgement;
7. evidence emission.

Optimistic UI is presentation only and must never be the source of final truth.

### 2. Zero-trust social fabric

Authentication alone never grants data access. Authorization evaluates the smallest sufficient combination of verified subject, session state, account status, relationship state, block/mute state, content audience, country/legal policy where applicable, and operation-specific capability.

Browser code is not a trusted policy authority.

### 3. TIGER Privacy Firewall

Private data must be protected at multiple independent boundaries:

- PostgreSQL RLS / RPC policy;
- API or server adapter authorization;
- Realtime channel filtering;
- media/storage authorization;
- cache and offline-storage isolation.

For `only_me`, success means the unauthorized actor receives zero rows, zero realtime delivery, zero private-media access, and zero retained private cache bytes attributable to that actor.

### 4. TIGER Digital Twin Lab

Staging maintains deterministic synthetic actors with no real personal data. The minimum social twin set is:

- `TIGER_TEST_A`;
- `TIGER_TEST_B`;
- `TIGER_TEST_BLOCKED`;
- `TIGER_TEST_PRIVATE`;
- `TIGER_TEST_MODERATOR`.

The twin lab executes friendship, publishing, reaction, comment/reply, privacy, block/mute, messaging, reconnect, and session-resume scenarios. Manual Android/iPhone testing is the final acceptance layer, not the first defect-discovery layer.

### 5. Temporal truth

Security- and money-sensitive evidence records the policy/version and relevant relationship or assignment epoch that governed the event at execution time. Historical evidence is append-only and never grants current authority.

### 6. Verified realtime

Realtime-sensitive operations expose a lifecycle compatible with:

`CREATED -> SERVER_ACCEPTED -> PERSISTED -> AUTHORIZED -> BROADCAST -> DELIVERED -> ACKNOWLEDGED`

Not every UI needs to show every phase, but evidence and tests must distinguish local optimistic state from trusted confirmation.

Reconnect handling must be idempotent and deduplicate repeated deliveries.

### 7. Invisible resilience

Network loss must degrade gracefully. Safe cached public/non-sensitive content may remain available according to existing cache policy. Private authenticated responses must not be promoted into a broad static cache. On reconnect the runtime must revalidate session/policy, resynchronize, deduplicate, and resume.

### 8. TIGER Chaos Mobile Lab

Release candidates are tested against:

- short and extended offline windows;
- Wi-Fi/mobile-network transitions;
- browser suspend/resume;
- token refresh boundaries;
- duplicate/reordered realtime events;
- media upload interruption;
- low-resource/mobile viewport constraints;
- iPhone safe-area insets and Android touch/navigation behavior.

A release must not claim mobile readiness solely from desktop emulation.

### 9. Sovereign Release Rings

Promotion follows ordered rings:

- `R0_CODE`: static/unit/security/build proof;
- `R1_DATA`: migrations/RLS/database rehearsal proof;
- `R2_TWIN`: deterministic two-way synthetic-user proof;
- `R3_DEVICE`: Android/iPhone + degraded-network proof;
- `R4_OWNER_PREVIEW`: isolated exact-SHA owner preview;
- `R5_CANDIDATE`: release-candidate/canary proof under production-like controls;
- `R6_PRODUCTION`: exact sealed artifact promotion.

No later ring may compensate for a failed earlier fail-closed ring.

### 10. Atomic Feature Cells

Major runtime capabilities are independently operable cells with explicit health, version, kill-switch eligibility, and dependency boundaries. Initial cells:

- Social Feed;
- Friends;
- Comments/Reactions;
- Messaging;
- Notifications;
- Media Upload;
- Marketplace;
- TIGER-owned Advertising/Financial integration.

A feature switch may disable new behavior, but must never re-enable retired insecure authority or bypass RLS/identity.

### 11. Safe self-healing

Automatic degradation is allowed only to a pre-approved, less-capable safe mode. Examples:

- realtime delivery -> bounded polling fallback;
- high-resolution media path -> reduced-media path;
- expensive decorative motion -> reduced-motion/low-resource mode.

Self-healing may not weaken privacy, identity, financial, or audit invariants.

### 12. Sovereign financial boundary

The Social/Marketplace UI cannot directly mutate financial balances. It emits a typed, idempotent, server-validated economic intent into the platform-owned financial domain. Only the financial core may post ledger entries.

Marketplace transaction value between buyer/seller or provider/beneficiary remains outside TIGER financial scope.

### 13. No-Silent-Money Rule

No platform-owned financial posting is accepted without, at minimum:

- evidence/event identifier;
- actor/beneficiary identity under the applicable domain contract;
- operation purpose/type;
- policy/version;
- country scope where applicable;
- currency;
- integer minor-unit amount;
- source event;
- idempotency key;
- timezone-qualified timestamp;
- ledger/policy version.

Missing required provenance fails closed.

### 14. Owner Sovereign Cockpit

The owner receives a simplified decision surface derived from machine evidence rather than manually maintained prose. Core states are:

- `SAFE`;
- `DEGRADED`;
- `BLOCKED`.

The cockpit must identify the affected feature cell and whether financial/privacy/identity domains are affected.

### 15. TIGER Release Passport

Each candidate produces a machine-readable release passport bound to exact source identity. It contains:

- release/passport schema version;
- exact commit SHA;
- exact tree SHA when available at generation time;
- PR/base/head identity when applicable;
- release ring statuses;
- required gate statuses;
- evidence references, never secrets;
- feature-cell health declarations;
- eligibility decision.

The passport is evidence, not a second source of authority. It must be generated from CI/runtime proof and must never claim a pass for missing evidence.

### 16. Elegant motion and adaptive presentation

Visual behavior is restrained and functional. Motion communicates state and continuity, respects `prefers-reduced-motion`, safe areas, low-resource mode, and degraded-network mode. Decorative effects must not delay or obscure security-critical state.

### 17. Trust Halo

A `Verified` visual indicator may appear only when backed by current trusted evidence for that exact object/action. It is forbidden as a decorative badge without backend evidence.

### 18. No Dark Magic

Security-, privacy-, moderation-, and money-sensitive decisions must be explainable, traceable, and reproducible from the responsible policy/version and evidence. AI may recommend or classify, but it cannot silently bypass deterministic policy authority.

## Exact-SHA Preview contract

A valid owner preview must:

1. be built from an exact commit SHA of the intended PR/branch;
2. expose non-secret build identity sufficient to verify the SHA;
3. use staging/sandbox services isolated from Production;
4. contain only synthetic/sanitized data;
5. preserve all active Production URLs and references;
6. never require merging to `main` merely to preview;
7. fail closed if the source SHA cannot be proven;
8. remain distinguishable from Production in visible environment labeling.

A preview URL is not evidence unless its deployed bytes can be tied to the intended exact source state.

## Two-device acceptance contract

Minimum Android/iPhone acceptance scenarios:

1. friendship request/accept with realtime convergence;
2. public post + image + cross-device reaction confirmation;
3. threaded comment/reply with correct authorship;
4. `only_me` privacy isolation with zero unauthorized row/event/cache exposure;
5. short and extended offline/reconnect recovery;
6. PWA install/safe-area/bottom-nav behavior;
7. session close/reopen and trusted refresh;
8. logout invalidation and private-cache non-recovery;
9. block/mute enforcement;
10. interrupted media upload recovery/abort semantics.

## Initial implementation sequence

The first implementation program is dependency-gated:

`Authority/Proof Plane -> Exact-SHA Preview Guard -> Privacy Proof -> Media Boundary -> Messaging/Realtime -> Pagination/Resilience -> Device Chaos -> Ledger Sandbox Boundary -> Owner Passport -> Candidate Ring`

This order is intentionally different from a feature-list sequence: deeper trust boundaries are closed before features that depend on them.

## Non-goals for the first slice

The first slice does not:

- deploy Production;
- mutate Production databases;
- activate real money movement;
- create first-party password auth;
- expose secrets or service-role credentials;
- replace existing Social Core UI;
- claim a live Preview URL before exact-head deployment proof exists.

## Success criteria for Slice 1 — Authority/Proof Plane

Slice 1 is complete only when:

1. TSLS is linked from the owner current reference and project current state;
2. machine authority records the new assurance architecture without creating a second conflicting product authority;
3. a release-passport schema/validator is covered by tests;
4. missing required evidence produces `BLOCKED`, never an optimistic pass;
5. CI runs the passport contract on pull requests;
6. current repository quality/security gates remain green after integration.
