# VVIP TIGER NEXUS 2026 — Current Global Launch Execution Plan

**Status:** `CURRENT / EVIDENCE-FIRST / FAIL-CLOSED / PR-349 ONLY`
**Reconciled:** 2026-09-01

**Goal:** move the current PR #349 NEXUS tree to a provable global Launch Passport without bypassing protected CI, inventing financial allocations, introducing marketplace intermediation, or promoting incomplete external evidence to PASS.

## Mandatory authority order

1. `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
2. `docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md`
3. `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`
4. `docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md`
5. `docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md`
6. `config/fusion/current-authority.json`
7. `config/finance/current-distribution.json`
8. `config/launch/global-launch-passport.json`
9. exact Git SHA/artifact + matching verification evidence.

## Current product and finance invariants

- Current experience: `TIGER_NEXUS_2026`.
- Product invariant: `ONE FEED • ONE OBJECT • ONE PULSE`.
- Ordinary eligible sector publication is free.
- Pulse is optional paid visibility for TIGER's own platform service.
- Pulse **platform base prices** are exactly `2 / 10 / 20 / 45 JOD`.
- Those values do **not** contain a 16% tax baseline.
- Applicable verified statutory tax is added on top of the TIGER platform base price:

  `FINAL USER TOTAL = PLATFORM BASE PRICE + VERIFIED STATUTORY TAX`

- There is no universal 16% rate and no 16% tax ceiling.
- Statutory tax remains outside TIGER distributions and commissions.
- The former internal `TAX_RESERVE 16%` remains cancelled. Its unresolved internal 16 percentage points are a separate Owner-allocation decision and may not be assigned by engineering.
- Current finance remains fail-closed while that internal 16% is unresolved.
- One sale has at most one eligible HUMAN sales-commission winner.
- Every DIGITAL actor remains permanently zero-financial-benefit.
- `marketplaceIntermediationRole = NONE`.
- VVIP TIGER does not provide marketplace-party checkout, escrow, custody, settlement, delivery, guarantee, brokerage/agency, or dispute resolution.
- Any future real-money Pulse path is payment only for VVIP TIGER's own platform service and requires separate protected/provider/country/legal evidence.
- No product/content lifetime may be reintroduced.

## Launch truth

`config/launch/global-launch-passport.json` is the sole machine global-launch eligibility source.

A gate may become PASS only when its evidence contract passes against the exact frozen release SHA/artifact. Focused/local tests are implementation evidence, not protected release evidence.

No direct `main` mutation, Production activation, provider/credential mutation, database mutation, real-money activation, country activation, or protected-gate weakening is authorized by this plan.

## Current phase contracts

### F05 — Hybrid Media

Evidence:
- `config/launch/evidence/f05-hybrid-media.json`
- `scripts/launch/verify-f05-launch-evidence.cjs`

Closure requires real HEIC/HEIF fixtures, supply-chain evidence, production-port rehearsal, browser/device verification, and protected exact-head GREEN.

### F06 — Finance / Shadow Ledger

Evidence:
- `config/launch/evidence/f06-finance.json`
- `scripts/launch/verify-f06-launch-evidence.cjs`

Current state is BLOCKED because the cancelled internal 16% is still pending Owner allocation.

Closure requires:
1. explicit Owner reallocation of that internal 16% without inference;
2. executable current distribution;
3. statutory-tax separation preserved;
4. Human–Digital Financial Firewall preserved;
5. Shadow Ledger imbalance exactly zero;
6. protected exact-head GREEN.

This phase does **not** use `referencePrice / 1.16`, does not restore `TAX_RESERVE`, and does not treat statutory tax as internal revenue.

### F07 — Pulse / Country / Profitability

Evidence:
- `config/launch/evidence/f07-pulse-country.json`
- `scripts/launch/verify-f07-launch-evidence.cjs`

Current Pulse visibility runtime is a foundation. Real-money payment runtime is not presently evidenced/activated.

Closure requires:
1. lawful provider-backed payment runtime for VVIP TIGER's own service only;
2. server-authoritative quote using platform base price + verified statutory tax;
3. idempotency/replay protection/provider-authoritative result/auditable receipt;
4. zero marketplace intermediation;
5. every launch-country gate PASS;
6. pricing/profitability certificate;
7. protected exact-head GREEN.

### F08 — 25K Synthetic Showcase

Evidence:
- deterministic exactly-25,000 synthetic generator/verifier;
- `config/launch/evidence/f08-showcase.json`.

Closure requires isolated rehearsal and protected exact-head evidence. Synthetic fixture disposal is test-data cleanup, not a product lifetime.

### F09 — Bounded AI

Evidence:
- sovereign security kernel;
- digital financial/owner boundary;
- `config/launch/evidence/f09-bounded-ai.json`.

Digital actors may analyze/recommend/execute only within owner-authorized non-beneficiary capabilities. They cannot allocate the pending 16%, transfer funds, activate countries/real money, deploy Production, weaken Owner authority, or declare global launch.

### F10 — Arabic / English / Accessibility

Evidence:
- `config/i18n/critical-journeys.json`;
- `scripts/i18n/critical-catalog.cjs`;
- `config/launch/evidence/f10-i18n-accessibility.json`;
- `scripts/launch/verify-f10-launch-evidence.cjs`.

Closure requires runtime integration, automated accessibility checks, manual WCAG 2.2 AA review, RTL/LTR visual review, and protected exact-head GREEN.

### F11 — Android / iOS

Evidence:
- `config/launch/evidence/f11-mobile.json`;
- `scripts/launch/verify-f11-launch-evidence.cjs`.

Closure requires physical-device certification: Android `20/20` and iOS `20/20`, plus exact-head evidence.

### F12 — Security / Red Team

Evidence:
- `config/launch/evidence/f12-red-team.json`;
- `scripts/launch/verify-f12-launch-evidence.cjs`.

Closure requires at least five authorized isolated Red-Team campaigns, remediation/retest, zero unresolved Critical/High, security evidence bundle, and protected exact-head GREEN.

### F13 — Digital Twin

Evidence:
- `config/launch/evidence/f13-digital-twin.json`;
- `scripts/launch/verify-f13-launch-evidence.cjs`.

Closure requires both:
- at least `4,000,000` reproducible unique actors;
- at least `4,000,000` simultaneous active users;

plus latency/error/saturation/cost evidence and exact-head proof.

### F14 — Restore / Failover

Evidence:
- `config/launch/evidence/f14-recovery.json`;
- `scripts/launch/verify-f14-launch-evidence.cjs`.

Closure requires measured RTO/RPO, restore rehearsal, failover rehearsal, rollback evidence, data-integrity verification, and protected exact-head GREEN.

### F15 — Runtime Vacuum

Evidence:
- active-runtime scanner;
- `config/launch/evidence/f15-runtime-vacuum.json`.

Closure requires exact-release scan and artifact verification proving no restored legacy marketplace runtime, no paid ordinary-publication path, no `PULSE_25`, no `requestPublication(` path, no superseded content lifetime/quota, no 16%-baseline tax rebasing, and protected GREEN.

### F16 — Global Launch Passport

The passport may become globally eligible only when:
- every mandatory gate is PASS with evidence;
- every subordinate F05–F15 verifier required by that gate passes;
- release SHA is frozen;
- artifact SHA-256 is frozen;
- finance is executable and pending Owner decision percent is zero;
- human review passes;
- Owner authorization is bound to the exact same release SHA + artifact digest.

## Current hard blockers

These are not software-documentation bugs and must not be fabricated away:

1. protected GitHub runner-executed exact-head GREEN;
2. explicit Owner allocation of the unresolved internal 16%;
3. lawful platform-service payment provider/runtime and country activation evidence;
4. Android/iOS physical-device certification;
5. five Red-Team campaigns and zero unresolved Critical/High;
6. 4M unique + 4M simultaneous load evidence;
7. measured restore/failover evidence;
8. manual WCAG 2.2 AA and RTL/LTR visual review;
9. final human review and Owner exact-artifact authorization.

Until all of these become real evidence on the exact release, `GLOBAL_LAUNCH_ELIGIBLE` remains FALSE and the statement **«نحن جاهزون للانطلاق العالمي»** is not authorized as a completed fact.
