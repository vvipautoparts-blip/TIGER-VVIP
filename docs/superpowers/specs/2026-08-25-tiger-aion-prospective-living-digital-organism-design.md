# TIGER AION ∞ — Prospective Living Digital Organism Design

**Status:** `OWNER_APPROVED / CURRENT_ONLY in post-launch-autonomy domain`

**Owner authority:** `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

## 1. Goal

Build a post-launch operating fabric that does not merely observe or heal TIGER after failure, but continuously models plausible futures, rehearses them in isolated twins, converts verified lessons into bounded operational knowledge, and permits only evidence-carrying actions that respect TIGER's deterministic authority boundaries.

## 2. Non-goals

- No claim of 100% security or zero failure.
- No unrestricted AI mutation of Production.
- No custom cryptography.
- No mandatory Kubernetes/service mesh/vendor lock-in.
- No direct LLM-to-legal-policy production path.
- No destructive cleanup without lifecycle, dependency, backup/recovery, and evidence gates.
- No replacement of SYNAPSE or VERITY; AION consumes their authority/evidence model.

## 3. Core architectural invariant

All sensitive operational changes use the following closed loop:

`PERCEIVE → IMAGINE → BRANCH → ATTACK → EXPERIENCE → PROVE → CHOOSE → ACT → VERIFY → REMEMBER`

The authorization law is:

`ActionAllowed = Constitution ∧ Policy ∧ Identity ∧ Capability ∧ Provenance ∧ Evidence ∧ RecoveryPath ∧ RiskBudget`

If any mandatory term is false or stale, the operation fails closed.

## 4. Logical planes

### 4.1 Sensory Plane

Inputs:

- OpenTelemetry metrics/logs/traces;
- profiles where production maturity is sufficient;
- eBPF/zero-code telemetry where overhead budgets allow;
- runtime/kernel security events;
- network signals;
- Supabase/PostgreSQL metrics, query health, RLS/security signals;
- real-user experience and client errors;
- fraud/abuse signals;
- business/ad metrics;
- cost/capacity signals;
- release/SBOM/provenance/CI evidence.

Output: normalized events with identity, timestamp, source freshness, confidence, sensitivity, and correlation keys.

### 4.2 Proof Graph

The graph links:

`user/session → request → trace → service/process → network → DB/RPC → release artifact → source SHA → policy → incident → remediation → verification`

Each edge records provenance and freshness. Historical evidence never silently becomes current runtime truth.

### 4.3 Prospective Memory Plane

Stores counterfactual futures, assumptions, probability/confidence, model version, generated scenario, affected domains, candidate preventive actions, Twin results, and expiry.

It never marks a simulated event as factual production history.

### 4.4 Dream Orchestrator

Generates scenarios from:

- current topology and capacity;
- prior incidents and Digital Antibodies;
- threat/fraud models;
- planned releases;
- growth forecasts;
- jurisdiction deltas;
- dependency/provider failure modes;
- entropy and recovery weaknesses.

Every Dream run is bounded by compute/cost budgets and isolation policies.

### 4.5 Twin Swarm

Required twin classes:

`performance`, `security`, `fraud`, `database`, `population`, `economic`, `growth`, `jurisdiction`, `recovery`, `release`.

Twins consume sanitized or synthetic data by default. Production secrets and write capabilities are denied unless an explicitly attested read-only diagnostic flow requires them.

### 4.6 Synthetic Society

Synthetic personas simulate normal and adversarial journeys. Success gates evaluate technical, security, human, economic, legal, and social dimensions together.

A feature that is technically healthy but creates unacceptable fraud, abuse, cost, retention damage, or legal exposure is rejected.

### 4.7 Jurisdiction Genome

Canonical pipeline:

`Source change → legal interpretation → human legal approval → versioned machine policy → tests → jurisdiction twin → controlled runtime enforcement`

Policy records require jurisdiction, source reference, effective date, approver, tests, migration/rollback rules, and status.

### 4.8 Digital Metabolism

Every managed digital asset receives a lifecycle state:

`BIRTH | ACTIVE | AGING | QUARANTINED | DISPOSED`

Managed classes include code, flags, routes, sessions, tokens, secrets references, service accounts, dependencies, uploads, DB rows, caches, artifacts, previews, generated files, and configuration.

Deletion workflow:

`Detect → Prove stale → Dependency check → Quarantine → Shadow observation → Delete → Verify → Evidence seal`.

### 4.9 Entropy Control

A Digital Entropy Score aggregates weighted stale/legacy/duplicate/orphaned/unowned/expired assets. Entropy has SLO budgets and trends. The score is diagnostic and cannot autonomously authorize destructive deletion.

### 4.10 Always-Recovering Twin

Recovery jobs periodically reconstruct an isolated TIGER environment from authoritative source, sealed artifacts, infrastructure definitions, backup/PITR checkpoints, configuration references, and secret references.

Output includes RTO, RPO, restore integrity, missing dependencies, and proof links. Backup Health is GREEN only after a fresh successful restoration within policy.

### 4.11 Immune Memory

Confirmed incidents create versioned Digital Antibodies with causal graph, indicators, impact, successful/failed defenses, safe remediation, rollback, confidence, freshness, and expiry.

Antibodies are advisory until deterministic policy permits reuse.

### 4.12 Red/Blue Swarm

Operates only in authorized isolated security twins/cyber ranges. Red agents have no production credentials or external-target permission. Blue agents generate candidate detections, containment, and recovery steps that must pass normal proof gates.

### 4.13 Agent Capability Cells

Each agent receives least-privilege, short-lived, auditable capabilities. WASI/WebAssembly component sandboxing may be used where suitable; equivalent sandboxing is acceptable when required by the task.

No single agent may combine repository merge authority, production deploy authority, production DB administration, and secrets administration.

### 4.14 Agent Immune System

Monitors goal hijack, prompt/tool injection, privilege escalation, data exfiltration, unexpected code execution, runaway loops, abnormal spend, and agent-to-agent trust abuse.

Agent behavior itself enters the Proof Graph.

### 4.15 Dual Brain

**Probabilistic Brain:** LLM/ML/forecasting/counterfactual reasoning proposes hypotheses, futures, and remediations.

**Deterministic Brain:** constitution, policies, signatures, identity, capabilities, invariants, test gates, risk budgets, and approvals determine permission.

A probabilistic output never grants authority.

### 4.16 Adaptive Autonomy

Autonomy score increases with verified evidence, freshness, reversibility, prior success, and limited blast radius; decreases with privilege, data sensitivity, legal/financial impact, irreversibility, uncertainty, and novelty.

Policy maps the score to levels:

- `L0 OBSERVE`
- `L1 DIAGNOSE`
- `L2 PROPOSE`
- `L3 CREATE_PR_OR_RUNBOOK`
- `L4 CONTROLLED_CANARY`
- `L5 PREAPPROVED_REVERSIBLE_REMEDIATION`
- `L6 UNRESTRICTED_PRODUCTION_MUTATION = FORBIDDEN`

### 4.17 Proof-Carrying Action

An Action Passport is immutable evidence metadata, not a free-form LLM explanation.

Minimum fields by policy include:

- action type and requested capability;
- causal/evidence references;
- confidence and freshness;
- source/release identity;
- Twin/simulation results;
- security and jurisdiction decisions where relevant;
- expected blast radius;
- artifact digest/SBOM/provenance/attestation;
- rollback and recovery checkpoint;
- required approvals;
- verification and abort conditions.

### 4.18 Release DNA

Every production artifact is bound to source SHA, builder identity, dependencies, SBOM, provenance, signing/attestation, tests, security evidence, and policy version.

`NO_PROVENANCE_NO_PRODUCTION` is fail-closed.

### 4.19 Progressive Immune Delivery

Delivery state machine:

`SHADOW → CANARY → COHORT_1 → COHORT_N → FULL`

Promotion requires health comparison against the previous baseline. Policy may automatically abort/rollback only when rollback is tested, reversible, and preauthorized.

### 4.20 Crypto Genome

Maintain a cryptographic inventory of protocols, algorithms, certificates/keys, owners, protected data, expiry, rotation, and migration capability.

PQC adoption follows standardized, provider-supported production paths; no custom algorithm or premature readiness claim.

### 4.21 TIGER Constitution

Machine-enforced immutable-from-agents boundaries include:

- `CURRENT_ONLY` owner authority;
- user privacy and deletion guarantees;
- no-intermediation marketplace boundary;
- advertising/payment boundaries;
- identity/RLS invariants;
- protected branch and production boundaries;
- evidence/provenance requirements;
- legal human-approval boundary;
- destructive-operation safeguards;
- unrestricted autonomous production mutation forbidden.

## 5. Primary state models

### 5.1 Scenario

```text
Scenario {
  id
  created_at
  source_state_ref
  assumptions[]
  generator_version
  confidence
  horizon
  domains[]
  sensitivity
  expires_at
}
```

### 5.2 Action Passport

```text
ActionPassport {
  id
  action_type
  requested_capabilities[]
  exact_source_ref
  evidence_refs[]
  confidence
  freshness_deadline
  simulation_refs[]
  policy_decisions[]
  blast_radius
  artifact_attestations[]
  rollback_ref
  recovery_checkpoint_ref
  required_approvals[]
  verification_conditions[]
  abort_conditions[]
}
```

### 5.3 Digital Antibody

```text
DigitalAntibody {
  id
  incident_ref
  causal_graph_ref
  indicators[]
  successful_defenses[]
  failed_defenses[]
  remediation_refs[]
  rollback_ref
  confidence
  valid_until
}
```

### 5.4 Metabolic Asset

```text
MetabolicAsset {
  id
  class
  authority_ref
  lifecycle_state
  owner
  last_used_at
  dependencies[]
  sensitivity
  retention_policy_ref
  quarantine_until
  disposal_evidence_ref
}
```

## 6. Failure behavior

- Missing/stale evidence: deny action.
- Conflicting current authority: deny and raise governance incident.
- Twin unavailable for a high-risk action: deny autonomous execution.
- Recovery checkpoint unavailable: deny destructive/irreversible action.
- Legal policy uncertain: hold for human review.
- Agent tool anomaly: revoke capability, quarantine session, preserve evidence.
- Telemetry loss: degrade autonomy before availability; never assume healthy state.

## 7. Security model

- short-lived identities/capabilities;
- least privilege;
- separation of duties;
- signed/attested release evidence;
- policy-as-code and human legal approval where required;
- secret values never stored in Proof Graph;
- sanitized/synthetic twin data by default;
- immutable audit/evidence references;
- continuous secret/credential and supply-chain scanning;
- runtime enforcement introduced monitor-first, then narrowly enforced.

## 8. Standards and technology direction

Preferred open standards/components when justified:

- OpenTelemetry for telemetry normalization;
- eBPF/OBI for measured zero-code observability where mature enough;
- Tetragon or equivalent for runtime eBPF security/enforcement;
- SLSA provenance + Sigstore/GitHub attestations for Release DNA;
- SPIFFE/SPIRE or equivalent workload identity when distributed scale requires it;
- WASI/WebAssembly capability sandboxing where suitable;
- OPA or equivalent policy-as-code;
- OWASP ASVS 5 and OWASP Agentic Application security guidance;
- NIST CSF/SSDF guidance and standardized PQC migration readiness.

These technologies are implementation choices, not product identity. AION remains vendor-neutral.

## 9. Rollout program

- `A0` Authority & machine contract.
- `A1` Sensory Proof Graph.
- `A2` Recovery + Digital Metabolism + Entropy.
- `A3` Twin Swarm core.
- `A4` Synthetic Society + fraud/abuse futures.
- `A5` Agentic Dual Brain + Capability Cells + Action Passport.
- `A6` Immune Memory + Red/Blue Swarm.
- `A7` Jurisdiction Genome.
- `A8` Progressive bounded autonomous remediation.
- `A9` Crypto Genome + optional attested high-security execution cells.

Each stage follows `APPROVED → IMPLEMENTED → VERIFIED`; no stage may inherit verification from another stage or an old SHA.

## 10. Acceptance criteria

AION authority baseline is accepted when:

1. exactly one CURRENT authority exists for `post-launch-autonomy`;
2. the owner entrypoint points to it;
3. the machine handover contract points to it and encodes fail-closed invariants;
4. AEGIS/ORACLE/post-launch legacy aliases are explicitly non-authoritative;
5. automated tests detect authority resurrection, missing AION concepts, or contract drift;
6. CI runs those tests on changes to the relevant governance surfaces;
7. no change touches main or Production during A0.
