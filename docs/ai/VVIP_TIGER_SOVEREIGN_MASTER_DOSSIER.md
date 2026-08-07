# VVIP TIGER SOVEREIGN MASTER SYSTEM DOSSIER

Status: **AI-16 documentation truth foundation implemented; production readiness not proven**

## 0. Constitutional rule

`NO EVIDENCE -> NO VERIFIED CLAIM -> NO RELEASE AUTHORITY`

This dossier is part of the TIGER SOVEREIGN proof architecture. It is not a marketing document and it is not an independent source of release authority.

A statement may be represented as `VERIFIED` only when the corresponding truth engine accepts evidence appropriate to that claim type and bound to the same Release DNA.

The documentation layer must never infer or synthesize:

- owner merge approval;
- database promotion approval;
- production activation approval;
- staging or production runtime success from repository source code;
- manual acceptance from automated tests;
- measured performance from a performance target;
- a deployed API from a proposed route;
- a production Golden Release Passport from a passport implementation.

## 1. Canonical dossier structure

The executable dossier model contains exactly eight top-level sections:

1. `00_Executive_Truth`
2. `01_Architecture_Data_Paths`
3. `02_UI_UX_User_Journeys`
4. `03_Automated_Ops_Load_Security`
5. `04_Operations_DR_Production_Activation`
6. `05_Evidence_Graph`
7. `06_Gap_Register`
8. `07_Release_Passport`

The implementation lives in:

- `scripts/ai/sovereign-master-dossier.js`
- `scripts/ai/sovereign-master-dossier-catalog.js`
- `scripts/ai/sovereign-master-dossier-enterprise.js`
- `scripts/ai/sovereign-master-dossier-renderer.js`

The automated contracts live in:

- `tests/sovereign-master-dossier.test.cjs`
- `tests/sovereign-master-dossier-enterprise.test.cjs`

## 2. Truth-state model

The dossier uses five explicit truth states.

### `VERIFIED`

The claim has evidence accepted by the implemented claim-type verifier for the exact release context.

In AI-16, repository-implementation claims may be `VERIFIED` only from trusted repository-byte facts created by the dossier engine itself. Governance invariants may also be verified as code-level constitutional rules.

### `DESIGNED`

The element is an approved design or target architecture but is not represented as an implemented or deployed fact.

### `PENDING`

The claim requires real evidence that does not yet exist in the current proof set, such as manual QA, staging runtime evidence, measurement evidence or a recovery drill.

### `STALE`

The claim was previously bound to another Release DNA and requires reverification. The engine never silently rebinds an old verified claim to a changed release.

### `BLOCKED`

The claim is intentionally prevented from being represented as complete until protected dependencies or authority gates are satisfied.

## 3. Repository evidence boundary

`createRepositorySourceFact` hashes the actual bytes of a file in the current repository checkout and binds that fact to a Release DNA digest.

Security properties include:

- repository root is determined internally;
- absolute paths are rejected;
- `..` traversal is rejected;
- Windows-style backslash traversal is rejected;
- normalized-path changes are rejected;
- `realpath` must remain inside the repository root, preventing symlink escape;
- only regular files are accepted;
- source size is bounded;
- SHA-256 is calculated from the actual file bytes;
- the source fact is branded in-process and a JSON clone does not preserve trusted-source status;
- source facts are deeply immutable.

Current provenance boundary:

`CURRENT_CHECKOUT_BYTES`

This is deliberately narrower than full release provenance. It does **not** by itself prove that the checked-out bytes correspond to a signed Git release, a particular build artifact, a deployed staging instance or production.

A trusted Release Provenance Builder is therefore the next dedicated layer.

## 4. Architecture and data paths

### 4.1 Current AI server boundary

The current repository implementation uses:

`supabase/functions/tiger-sovereign-ai/index.ts`

as the TIGER AI server boundary.

Its repository contract includes a bounded request shape containing:

- `agentId`
- `input`
- `correlationId`
- `locale`

The server boundary owns model/prompt configuration, verifies identity through the protected identity-verifier boundary and does not treat client-supplied model/tool authority as trusted.

The dossier therefore treats the following desired interfaces as **DESIGNED**, not deployed facts:

- `/v1/ai/execute`
- `/v1/ai/approval-requests`
- `/v1/ai/audit-events`

They may later become canonical façade routes over the protected server/runtime contracts, but only implementation plus runtime evidence can move them to a verified deployed state.

### 4.2 `public.ai_approval_requests`

Source contract:

`supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql`

The Enterprise registry is field-complete against the actual `CREATE TABLE` statement. CI fails if the documented field list diverges from the migration definition.

Documented fields:

- `id`
- `owner_subject`
- `requesting_agent`
- `action`
- `payload_digest`
- `scope_digest`
- `scope`
- `decision_passport_id`
- `reason`
- `status`
- `created_at`
- `expires_at`
- `approved_at`
- `rejected_at`
- `revoked_at`
- `consumed_at`
- `updated_at`

The table is designed to bind owner identity, requesting agent, protected action, exact payload digest, exact scope digest and approval lifecycle. Expiry and one-time consumption fields support replay-resistant persistent approval semantics.

### 4.3 `public.ai_audit_events`

The Enterprise registry is also field-complete against the migration for:

- `id`
- `correlation_id`
- `actor_subject`
- `agent_id`
- `action`
- `decision`
- `reason_code`
- `country_code`
- `sector_code`
- `resource`
- `tool_id`
- `approval_id`
- `model_id`
- `prompt_version`
- `metadata`
- `previous_hash`
- `event_hash`
- `created_at`

The repository contract provides correlation, actor/agent attribution, approval linkage, model/prompt provenance metadata and tamper-evident hash-chain fields.

### 4.4 RLS and browser authority

The trust-fabric migration enables RLS and revokes direct browser-role authority from privileged trust data. Privileged approval/audit operations remain a trusted server/service-role responsibility.

This is a **verified repository contract**, not proof that the migration has been applied in staging or production. Executable RLS/privilege probes against a non-production database remain a real-evidence gate.

## 5. UI/UX and user journeys

### 5.1 Owner Control Panel

Existing repository surfaces include:

- `owner-control.html`
- `scripts/ai/vvip-ai-owner-console.js`
- `scripts/ai/vvip-ai-command-center.js`

The current owner surface and four approved TIGER AI roles are repository-implemented facts.

Planned enterprise owner controls include richer budget, rate, concurrency, provider-health, pending-approval, audit and kill-switch visualization. Where those richer controls are not yet implemented, the dossier labels them `DESIGNED` rather than verified.

### 5.2 Four TIGER AI workspaces

The approved role set remains:

1. `general_manager`
2. `technical_manager`
3. `financial_analytics_manager`
4. `user_assistant`

The documentation architecture must not invent unrestricted additional autonomous agents.

### 5.3 PR36 media journey

Automated PR36 integration contracts exist under `tests/pr36` and remain part of the quality baseline.

The real manual acceptance path remains separately pending:

`choose -> read -> process -> preview -> upload -> storage -> display`

Automated CI cannot promote that manual acceptance claim to verified.

### 5.4 RTL/LTR and accessibility

Repository structure may support RTL/LTR and accessibility contracts, but final multi-browser visual, keyboard/focus and accessibility acceptance require real evidence and remain separate truth claims.

## 6. Automated operations, load and security

### 6.1 Quality and security baseline

The dossier records the repository controls for:

- VVIP Quality Gate;
- CodeQL;
- dependency review;
- secret scanning;
- dangerous SQL scanning;
- project-control integrity;
- PR35/PR36 automated tests;
- AI security-kernel and security-operations contracts;
- isolated QA smoke.

A green CI result proves only the tested repository slice on the exact tested commit. It does not independently prove production runtime behavior.

### 6.2 AI red-team evidence

Repository adversarial contracts are documented separately from a live staging red-team campaign.

A future real campaign must include protected probes for:

- prompt injection;
- forged owner authority;
- cross-agent scope escalation;
- secret extraction;
- tool smuggling;
- malformed structured output;
- unsafe URL/SSRF attempts;
- replay attempts;
- country/tenant isolation;
- context overflow and denial-of-service behavior;
- audit and kill-switch behavior under attack.

### 6.3 k6 and latency

A production-representative k6 ramp/spike/soak/failure suite is currently a designed work item.

`p95 < 150 ms` is treated as a **target**, not as a measured result.

To become verified, performance evidence must identify at minimum:

- exact Release DNA;
- environment;
- region;
- endpoint/workload;
- virtual-user/concurrency profile;
- dataset;
- test duration;
- p50/p95/p99;
- error rate;
- timeout rate;
- resource saturation;
- provider latency where applicable;
- measurement artifact hash and trusted collector attestation.

## 7. Operations, disaster recovery and production activation

### 7.1 Backup and restore

Repository backup/rollback contracts are useful design and automated evidence, but they do not replace an actual restore drill.

The real drill must record:

- backup source and timestamp;
- isolated restore target;
- restoration duration;
- integrity checks;
- RPO/RTO observations;
- application/database smoke probes;
- audit/approval-chain integrity after restore;
- cleanup and evidence artifact hashes.

### 7.2 Rollback

Rollback readiness remains pending until the release candidate is exercised in a controlled non-production rollback scenario.

### 7.3 Protected owner decisions

The cryptographic proof architecture keeps three protected decisions separate:

1. `MERGE_RELEASE`
2. `PROMOTE_DATABASE`
3. `ACTIVATE_PRODUCTION`

Documentation, AI output, CI success or a Golden Passport implementation cannot synthesize these decisions.

## 8. Evidence Graph and release proof

Existing implemented proof layers include:

- deterministic Release DNA;
- Evidence Capsules;
- canonical 45-gate Truth Engine integration;
- Evidence Root;
- Golden Release Passport implementation;
- release change-impact/revalidation plan;
- Ed25519 evidence attestation;
- separate Ed25519 owner-decision verification;
- attested 45-gate readiness;
- Attested Golden Release Passport implementation.

The long-term persistent Evidence Graph remains a designed layer:

`Requirement -> Code -> Test -> Threat -> Gate -> Evidence -> Decision/Incident -> Release`

Its persistence must remain append-oriented/tamper-evident and must not allow browser roles to manufacture privileged proof.

## 9. Derived Gap Register

The gap register is generated from claim truth states rather than maintained as a second independent checklist.

Every claim not in `VERIFIED` state is included as a gap. This includes `DESIGNED`, `PENDING`, `STALE` and `BLOCKED` claims.

This prevents a documentation editor from manually deleting an inconvenient pending requirement while leaving the underlying truth registry unchanged.

## 10. Complete implementation plan

### DOSSIER-P1 — Documentation Truth Core

Status: **implemented repository slice**

Scope:

- release-bound claims;
- trusted repository-byte facts;
- truth states;
- stale invalidation;
- derived gaps;
- deterministic Markdown renderer;
- field-complete Enterprise registry.

Exit rule: automated AI-16 contracts green and no design/target/manual claim can self-promote to verified.

### DOSSIER-P2 — Trusted Release Provenance Builder

Status: **next**

Build Release DNA from actual Git/build/migration/policy/prompt/model/tool/RLS/security artifacts instead of accepting untrusted caller-supplied component hashes.

Required properties:

- exact commit and tree relationship;
- explicit dirty-worktree state;
- deterministic artifact manifest;
- content-addressed migration manifest;
- content-addressed policy/prompt/model/tool/RLS/security manifests;
- no browser authority to mint provenance;
- later compatibility with signed CI/build provenance.

### DOSSIER-P3 — Trusted Evidence Collectors

Source-specific collectors for:

- CI/security workflows;
- manual QA;
- staging runtime;
- measurements;
- legal/privacy review;
- protected owner decisions.

Collectors must bind evidence to Release DNA and prevent stale, duplicate or replayed proof.

### DOSSIER-P4 — Load and Security Evidence

Implement and execute:

- k6 ramp;
- spike;
- soak;
- failure/degraded-mode tests;
- signed latency/error/cost evidence;
- live staging red-team campaign.

### DOSSIER-P5 — UI and Manual Acceptance

Close real evidence for:

- PR36 real image flow;
- Owner AI panel;
- browser/device matrix;
- RTL/LTR;
- keyboard/focus;
- accessibility.

### DOSSIER-P6 — Deterministic DOCX/PDF Export

Generate Word/PDF from the same claim model rather than creating a second manually edited document.

The export must preserve:

- Release DNA;
- truth labels;
- evidence hashes/references;
- gap register;
- work-plan status;
- release-authority boundary.

A beautiful export must never make a pending claim look verified.

### DOSSIER-P7 — Staging Proof Campaign

Requires approved non-production execution for:

- migrations;
- RLS/privilege probes;
- concurrency/race tests;
- AI runtime;
- prompt-injection/security probes;
- backup/restore;
- rollback;
- observability;
- load testing;
- BLACKBOX/security review.

### DOSSIER-P8 — Production Passport Campaign

Protected owner-gated phase.

Required before actual production-passport truth:

- all 45 canonical gates have accepted real evidence for one exact Release DNA;
- cryptographic proof covers all required gates;
- merge approval is independently verified;
- DB-promotion approval is independently verified;
- production-activation approval is independently verified;
- production apply/deploy sequence is correct;
- post-deploy smoke is complete;
- production monitoring/alerts are verified;
- production backup is verified.

## 11. Definition of 100 percent

The Master Dossier itself never creates 100% readiness.

The platform may expose a true completed release state only when the canonical proof system establishes, for the exact Release DNA:

- 45 required gates;
- 45 accepted real PASS proofs;
- 0 missing gates;
- 0 blocked gates;
- 0 stale proofs used as authority;
- 0 fixture/simulated production proofs;
- required cryptographic proof validity;
- three separate protected owner decisions;
- correct production sequence;
- completed post-deploy verification.

Until then the truthful platform-level statement remains:

`PRODUCTION READINESS = NOT PROVEN`

## 12. AI-16 safety boundary

AI-16 does not perform or authorize:

- PR merge;
- Supabase staging or production apply;
- production deployment;
- production activation;
- owner approval synthesis;
- KMS/HSM private-key operations;
- manual PR36 acceptance;
- live load results;
- live red-team results;
- restore/rollback drill results;
- legal/privacy approval;
- actual production Golden Release Passport issuance.

The purpose of AI-16 is to make those distinctions impossible to hide in the documentation layer.
