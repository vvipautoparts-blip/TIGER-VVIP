# VVIP TIGER NEXUS 2026 Global Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the current PR #349 NEXUS tree from evidence-first convergence to a provable global Launch Passport without bypassing protected CI, inventing financial allocations, introducing marketplace intermediation, or converting incomplete external certifications into PASS.

**Architecture:** Use `TIGER_OWNER_BINDING_CURRENT.md` as the mandatory human authority, `config/fusion/current-authority.json` as machine product authority, `config/finance/current-distribution.json` as machine finance authority, and `config/launch/global-launch-passport.json` as the only machine global-launch eligibility source. Each remaining F05–F16 phase closes through TDD and exact-release evidence; external/device/capacity/security exercises emit evidence consumed by the passport rather than editing launch eligibility directly.

**Tech Stack:** GitHub/GitHub Actions, Node.js `node:test`, Clerk, Supabase/Postgres/RLS, browser/PWA, Web Workers/WebCodecs/WASM, PR36/F05 media stack, platform-service finance/ledger, Android/iOS thin shells, load-generation infrastructure, SLSA/GitHub artifact attestations, security/red-team and DR rehearsal tooling.

**Spec:** `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

## Global Constraints

- Current experience is `TIGER_NEXUS_2026` and the product invariant remains `ONE FEED • ONE OBJECT • ONE PULSE`.
- Ordinary eligible sector publication remains free.
- Pulse reference levels are exactly `2 / 10 / 20 / 45 JOD` and contain a 16% pricing baseline; country price is `REFERENCE / 1.16`, then verified statutory country tax is applied to the untaxed base.
- The displayed country-specific Pulse price is the final charge; there is no second tax at capture.
- VVIP TIGER marketplace intermediation role is `NONE`; user-to-user product/service payment, escrow, settlement, delivery, guarantee, brokerage/agency and dispute resolution remain forbidden.
- Platform finance may cover only VVIP TIGER's own approved services such as Pulse/advertising.
- The former internal `TAX_RESERVE 16%` is cancelled; the unresolved internal 16 percentage points remain an Owner decision and may not be assigned by engineering.
- Every DIGITAL role remains zero-financial-benefit.
- No global-launch claim is allowed until `config/launch/global-launch-passport.json` verifies every mandatory gate against the exact frozen release SHA/artifact.
- Focused/local tests are not substitutes for protected exact-head CI.
- Android/iOS certification, five red-team campaigns, 4M+4M capacity and DR/failover rehearsals require real execution evidence.
- No direct `main` mutation, Production activation, provider/credential mutation, real-money activation or protected-gate weakening from this plan.
- No product/content time expiry may be reintroduced. Synthetic test data may be disposed as test data after an exercise, but that is not a product lifetime rule.

---

### Task 1: F16 Machine Launch Passport Foundation

**Files:**
- Create: `config/launch/global-launch-passport.json`
- Create: `scripts/launch/verify-global-launch-passport.cjs`
- Create: `tests/global-launch-passport.test.cjs`
- Modify: `config/fusion/current-authority.json`
- Modify: `scripts/fusion/verify-current-authority.cjs`
- Modify: `docs/fusion/GLOBAL_LAUNCH_READINESS_2026.md`

**Interfaces:**
- Produces: `verifyGlobalLaunchPassport(passport, context) -> { ok, globalLaunchEligible, blockingGates, errors }`.
- Consumes: exact release SHA, artifact SHA-256, finance executability, per-gate evidence and Owner exact-artifact authorization.

- [x] **Step 1: Write RED contract for missing/false launch evidence.**
- [x] **Step 2: Observe RED because verifier/passport do not exist.**
- [x] **Step 3: Implement mandatory 21-gate fail-closed verifier and initial `globalLaunchEligible=false` passport.**
- [x] **Step 4: Bind Fusion authority to the passport and reject attempts to make it optional.**
- [x] **Step 5: Verify focused local contract: `node --test tests/global-launch-passport.test.cjs` => 7/7 PASS.**
- [ ] **Step 6: Obtain protected runner-executed exact-head GREEN before treating Task 1 as release evidence.**

---

### Task 2: F05 Hybrid Media Closure Audit

**Files:**
- Read/verify: `scripts/media/f05-heif-preflight.js`
- Read/verify: `scripts/media/f05-heif-policy.js`
- Read/verify: `scripts/media/f05-heif-adapter.js`
- Read/verify: `scripts/media/f05-media-passport.js`
- Read/verify: `scripts/media/f05-pr36-media-bridge.js`
- Read/verify: `scripts/media/server/f05-derivative-gate.js`
- Read/verify: `scripts/media/server/f05-production-readiness.js`
- Read/verify: `workers/media/f05-heif-worker.js`
- Read/verify: `workers/media/f05-heif-decoder.v1.wasm`
- Test: all current `tests/f05-*.test.cjs`
- Create: `config/launch/evidence/f05-hybrid-media.json`
- Create: `scripts/launch/verify-f05-launch-evidence.cjs`
- Test: `tests/f05-launch-evidence.test.cjs`

**Interfaces:**
- Produces evidence schema `TIGER_F05_LAUNCH_EVIDENCE_V1` with implementation digest, focused test evidence, real-fixture evidence, supply-chain record evidence, production-port evidence and protected exact-head evidence.
- F16 may mark `hybridMediaHeic=PASS` only when the F05 verifier returns PASS for the same release SHA/artifact.

- [ ] **Step 1: Write failing launch-evidence test that rejects missing exact-head/real-fixture/supply-chain/production-port evidence.**
- [ ] **Step 2: Run focused RED.**
- [ ] **Step 3: Inventory existing F05 modules/tests and record only observed evidence; do not rebuild PR36/F05.**
- [ ] **Step 4: Run the complete current F05 Node test set on the exact source tree.**
- [ ] **Step 5: Verify pinned real HEIC decode, hostile AVIF/truncation rejection and supply-chain checks.**
- [ ] **Step 6: Validate production media ports/config in a non-Production rehearsal environment.**
- [ ] **Step 7: Obtain protected exact-head GREEN and bind run/job/artifact references into F05 evidence.**
- [ ] **Step 8: Only then set passport `hybridMediaHeic.status=PASS` with evidence references.**

---

### Task 3: F06 Platform-Owned Money Fabric Completion

**Files:**
- Modify/verify: `config/finance/current-distribution.json`
- Verify: `project-control/finance/statutory-tax-boundary.cjs`
- Verify: `project-control/finance/human-digital-financial-firewall.cjs`
- Create after authorization: `project-control/finance/platform-service-quote.cjs`
- Create after authorization: `project-control/finance/platform-service-payment-boundary.cjs`
- Test: `tests/platform-service-quote.test.cjs`
- Test: `tests/platform-service-payment-boundary.test.cjs`
- Create: `config/launch/evidence/f06-money-fabric.json`

**Interfaces:**
- `buildPlatformServiceQuote({ referencePriceMinor, statutoryTaxQuote, salesClaim })` must return an immutable quote for VVIP TIGER services only.
- Quote must call current country-tax rebasing and Human–Digital firewall contracts.
- No function accepts marketplace item price, seller payout destination, buyer/seller escrow, marketplace settlement or user-to-user funds custody.

- [ ] **Step 1: Keep finance execution fail-closed while `pendingOwnerDecisionPercent=16`; write a regression test that rejects premature executability.**
- [ ] **Step 2: Owner resolves the internal 16% explicitly; engineering records exactly that decision without inference.**
- [ ] **Step 3: Write RED quote tests for 0/12/16/20% country tax, self-service 7%, one-human-sales-winner, digital zero-benefit and no marketplace fields.**
- [ ] **Step 4: Implement minimal server-authoritative platform-service quote.**
- [ ] **Step 5: Write RED payment-boundary tests requiring provider-authoritative result, idempotency, replay protection, immutable receipt and no stored card data.**
- [ ] **Step 6: Integrate an Owner-approved lawful provider only for platform services; do not activate real money until protected/country/legal gates pass.**
- [ ] **Step 7: Reconcile ledger and require Shadow Ledger = 0 in rehearsal.**
- [ ] **Step 8: Generate pricing/profitability and country evidence for F16.**

---

### Task 4: F07 Pulse Commercial Closure

**Files:**
- Verify: `scripts/nexus/pulse-runtime.js`
- Verify: `scripts/nexus/pulse-surface.js`
- Verify: `scripts/nexus/proofview.js`
- Verify: current Pulse migrations and ledger tests
- Create after F06 quote interface: `scripts/nexus/pulse-purchase-runtime.js`
- Create: `tests/nexus/pulse-purchase-runtime.test.cjs`
- Create: `config/launch/evidence/f07-pulse.json`

**Interfaces:**
- Pulse purchase consumes only F06 platform-service quote identity and provider-authoritative payment confirmation.
- Purchased value becomes non-money visibility allocation in Pulse Vault.
- Delivery remains `RESERVE -> SERVE -> VERIFY -> CONSUME`; unqualified delivery burns zero.

- [ ] **Step 1: RED test: Pulse purchase cannot create allocation without valid paid/zero-value authorized platform-service receipt.**
- [ ] **Step 2: RED test: marketplace seller/buyer IDs/payment fields are rejected.**
- [ ] **Step 3: Implement minimal purchase-to-vault bridge with idempotency and immutable audit identity.**
- [ ] **Step 4: Run Pulse allocation/ProofView/ledger/purchase regression suite.**
- [ ] **Step 5: Run profitability/frequency/fair-delivery rehearsal.**
- [ ] **Step 6: Bind protected exact-head evidence into F07 evidence file.**

---

### Task 5: F08 Exact 25K Synthetic Showcase

**Files:**
- Create: `scripts/showcase/generate-f08-showcase.cjs`
- Create: `scripts/showcase/verify-f08-showcase.cjs`
- Create: `tests/f08-showcase.test.cjs`
- Create generated evidence manifest only: `config/launch/evidence/f08-showcase.json`

**Interfaces:**
- Generator takes deterministic seed and current sector/country registries and emits exactly 25,000 synthetic labeled test objects.
- Objects must contain `synthetic=true`, deterministic provenance ID, no real phone/email/person identity and no product-expiry field.

- [ ] **Step 1: RED tests for exactly 25,000, deterministic replay, synthetic label, no real contact fields and no lifetime/expiry rule.**
- [ ] **Step 2: Implement bounded deterministic generator.**
- [ ] **Step 3: Verify search/media/currency/sector coverage and duplicate bounds.**
- [ ] **Step 4: Run showcase against isolated non-Production environment.**
- [ ] **Step 5: Dispose/retain synthetic test data according to test-environment policy, not a user-content lifetime.**
- [ ] **Step 6: Bind validation digest/evidence into F16.**

---

### Task 6: F09 Bounded AI Closure

**Files:**
- Verify: current `scripts/ai/*` and AI security tests
- Create: `config/launch/evidence/f09-ai.json`
- Add focused current-NEXUS AI integration tests under `tests/nexus/`

**Interfaces:**
- AI is advisory/assistive and may route owner-authorized non-beneficiary automation.
- It cannot mutate Owner authority, decide the unresolved internal 16%, move money, activate countries, weaken security gates, deploy Production or perform destructive L4 actions.

- [ ] **Step 1: RED tests for all forbidden authority/money/country/Production actions.**
- [ ] **Step 2: Bind AI suggestions to server-validated capabilities and current Living Sector Object intent model.**
- [ ] **Step 3: Run prompt/tool abuse and invalid-payload suite.**
- [ ] **Step 4: Produce security/evidence digest for F16.**

---

### Task 7: F10 Bilingual + WCAG 2.2 AA Closure

**Files:**
- Create/normalize versioned Arabic/English catalogs under `config/i18n/`
- Create: `tests/f10-i18n-accessibility.test.cjs`
- Create: `config/launch/evidence/f10-language-accessibility.json`

**Interfaces:**
- Every critical journey has stable translation keys in Arabic and English.
- Locale formatting covers currency/date/number; RTL/LTR changes presentation only, not product rules.

- [ ] **Step 1: RED contract enumerating critical NEXUS/Pulse/account/legal journeys and requiring both locales.**
- [ ] **Step 2: Remove hard-coded critical copy where it prevents parity; keep exact owner/legal wording where required.**
- [ ] **Step 3: Run keyboard/screen-reader-label/reduced-motion/contrast automated checks.**
- [ ] **Step 4: Execute manual WCAG 2.2 AA critical-journey review and record evidence.**
- [ ] **Step 5: Mark Arabic/English/accessibility passport gates only from exact-release evidence.**

---

### Task 8: F11 Android/iOS Thin Shell Certification

**Files:**
- Create/update native shell projects only after current web release contract is stable.
- Create: `config/launch/evidence/f11-mobile.json`
- Create machine-readable 20-journey certification definitions.

**Interfaces:**
- Native shells expose only required bridges: camera/photos, push, background transfer, passkeys/biometrics, share sheet and deep links.
- Product/business authority remains server/web shared model.

- [ ] **Step 1: Define exactly 20 launch journeys with expected results for both Android and iOS.**
- [ ] **Step 2: Add thin-shell bridge contract tests; no duplicated marketplace/payment business logic in native code.**
- [ ] **Step 3: Build signed non-Production candidates.**
- [ ] **Step 4: Execute Android 20/20 on physical supported devices and capture evidence.**
- [ ] **Step 5: Execute iOS 20/20 on physical supported devices and capture evidence.**
- [ ] **Step 6: Bind exact build/release identities into F16.**

---

### Task 9: F12 Five Red-Team Campaigns

**Files:**
- Create isolated campaign manifests under `security/red-team/f12/`
- Create: `config/launch/evidence/f12-red-team.json`

**Interfaces:**
- Campaigns: Owner Takeover, Delegation Escape, Financial Tampering, Media Weaponization, Release/Supply-Chain.
- PASS requires zero unresolved Critical/High after remediation and retest.

- [ ] **Step 1: Freeze isolated target scope and authorization for each campaign.**
- [ ] **Step 2: Execute campaigns without targeting third-party systems outside authorization.**
- [ ] **Step 3: Record findings with severity, reproduction evidence and affected release candidate.**
- [ ] **Step 4: Remediate Critical/High through TDD and protected review.**
- [ ] **Step 5: Retest and require zero unresolved Critical/High.**
- [ ] **Step 6: Bind campaign report digests into F16.**

---

### Task 10: F13 Digital Twin 4M + 4M

**Files:**
- Create load-model definitions under `load/f13/`
- Create deterministic actor generator and scenario manifests
- Create: `config/launch/evidence/f13-digital-twin.json`

**Interfaces:**
- Program A deterministically reproduces 4,000,000 unique actors without real PII.
- Program B ramps `10K -> 100K -> 500K -> 1M -> 2M -> 4M` simultaneous active virtual users.
- Evidence records latency, errors, saturation, provider limits, cost, financial invariants and failure-domain behavior.

- [ ] **Step 1: Verify 4M actor generator cardinality/determinism offline.**
- [ ] **Step 2: Establish cost/provider/quota approvals before high-scale execution.**
- [ ] **Step 3: Execute progressive ramps and stop automatically on safety/cost/error thresholds.**
- [ ] **Step 4: Never infer 4M PASS from a smaller test.**
- [ ] **Step 5: Require both Program A and Program B PASS before passport 4M gates may pass.**

---

### Task 11: F14 DR / Restore / Failover

**Files:**
- Create rehearsal manifests under `ops/dr/f14/`
- Create: `config/launch/evidence/f14-dr.json`

**Interfaces:**
- Evidence contains target/actual RTO and RPO, restore identity, failure domain, dependency degradation and fail-closed privileged behavior.

- [ ] **Step 1: Define measurable RTO/RPO and restore acceptance before rehearsal.**
- [ ] **Step 2: Run backup/PITR restore into isolated environment and verify application/data invariants.**
- [ ] **Step 3: Run dependency/failure-domain failover rehearsal.**
- [ ] **Step 4: Verify owner/finance/auth controls fail closed during degradation.**
- [ ] **Step 5: Bind restore/failover evidence to exact release dependencies.**

---

### Task 12: F15 Exact-Release Runtime Vacuum

**Files:**
- Extend current deletion/current-only contracts
- Create: `scripts/launch/verify-runtime-vacuum.cjs`
- Create: `tests/f15-runtime-vacuum.test.cjs`
- Create: `config/launch/evidence/f15-runtime-vacuum.json`

**Interfaces:**
- Verifier checks reachable HTML/JS/CSS/routes/manifests/dependencies and current machine authorities.
- It rejects deleted/superseded Marketplace transaction runtimes, old pricing, paid-publication gates, product expiry, duplicate current authorities and in-tree archive/trash compatibility copies.

- [ ] **Step 1: Write RED checks for current known forbidden legacy classes.**
- [ ] **Step 2: Run reachability/reference/dependency scan on exact candidate tree.**
- [ ] **Step 3: Delete only proven unreachable/conflicting current-tree material; never rewrite applied migration history.**
- [ ] **Step 4: Compare release manifests/build outputs before/after cleanup and retain rollback evidence.**
- [ ] **Step 5: Run protected exact-head gates and bind Runtime Vacuum PASS evidence.**

---

### Task 13: F16 Freeze, Assemble and Authorize Global Release

**Files:**
- Update only from evidence: `config/launch/global-launch-passport.json`
- Create final immutable evidence index under release artifacts, not as invented PASS statements.

**Interfaces:**
- `verifyGlobalLaunchPassport()` is the final machine decision before the Owner human authorization gate.

- [ ] **Step 1: Select candidate exact SHA only after F05–F15 current work is complete.**
- [ ] **Step 2: Produce release artifact and SHA-256 digest; verify provenance/attestation.**
- [ ] **Step 3: Populate each passport gate only from matching evidence.**
- [ ] **Step 4: Run full protected Quality Gate/security/release workflows on exact SHA and require runner-executed GREEN.**
- [ ] **Step 5: Require human review PASS.**
- [ ] **Step 6: Owner reviews and authorizes the exact SHA + artifact digest.**
- [ ] **Step 7: Run `verifyGlobalLaunchPassport()` with finance executable and all gates PASS; only a clean result may set `globalLaunchEligible=true`.**
- [ ] **Step 8: Only then is the sentence `نحن جاهزون للانطلاق العالمي.` allowed as a completed fact and Production/global activation may proceed through protected change control.**

---

## Self-Review

- Latest owner tax pricing and zero-intermediation decisions are carried through F06/F07/F16.
- The unresolved internal 16% is never assigned by engineering.
- The machine passport prevents documentation-only launch claims.
- F05 reuses the substantial implementation already present rather than rebuilding it.
- The old 90-day product/content lifecycle is not restored in F08 or anywhere else.
- Android/iOS, red-team, 4M+4M and DR claims require real external execution evidence.
- Protected CI failure-before-runner remains a blocker and is never converted to PASS.
- No phase may mark PASS from focused local tests alone when exact-release evidence is required.
