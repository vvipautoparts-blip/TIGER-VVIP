# TIGER AION ∞ — A5 Agentic Dual Brain, Capability Cells & Action Passport

**Status:** `OWNER_APPROVED / IMPLEMENTATION_SLICE`

**Authority:** `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

**Parent spec:** `docs/superpowers/specs/2026-08-25-tiger-aion-prospective-living-digital-organism-design.md`

## 1. Goal

Create the deterministic control substrate that allows probabilistic AI/ML agents to propose work without ever becoming their own authority. A5 separates:

- **Probabilistic Brain:** hypotheses, diagnosis, forecasts, remediation proposals;
- **Deterministic Brain:** constitution, identity, capabilities, provenance, evidence, freshness, recovery, approvals, risk limits, and separation of duties.

A probabilistic output can request an action. Only the deterministic brain can authorize a bounded action.

## 2. Autonomy levels

- `L0_OBSERVE`
- `L1_DIAGNOSE`
- `L2_PROPOSE`
- `L3_CREATE_PR_OR_RUNBOOK`
- `L4_CONTROLLED_CANARY`
- `L5_PREAPPROVED_REVERSIBLE_REMEDIATION`
- `L6_UNRESTRICTED_PRODUCTION_MUTATION` — **FORBIDDEN**

No A5 code path may authorize L6.

## 3. Capability Cell

A Capability Cell is a short-lived, content-addressed permission envelope for one agent identity. It contains:

- `cell_id`, `agent_id`, issue/expiry times;
- exact capability allowlist;
- autonomy ceiling;
- target scopes;
- action/tool/cost/loop budgets;
- sandbox profile;
- immutable denied boundaries.

Critical administrative capabilities are separated. One cell may not combine two or more of:

- `REPOSITORY_MERGE`
- `PRODUCTION_DEPLOY`
- `PRODUCTION_DB_ADMIN`
- `SECRETS_ADMIN`

A5 itself grants none of these capabilities for current PR execution.

## 4. Capability sandbox pilot

A5 implements the policy contract for a WASI/WebAssembly-style capability sandbox; it does not claim a deployed WASI runtime.

Allowed profiles:

- `WASI_COMPONENT`
- `EQUIVALENT_CAPABILITY_SANDBOX`

The profile is deny-by-default for network/filesystem/environment and exposes only explicitly listed interfaces. The policy record is tamper-evident and auditable.

## 5. Action Passport

An Action Passport is immutable machine evidence, not free-form AI justification.

Required fields:

- passport/action identity and requested autonomy level;
- requested capabilities;
- exact 40-character source SHA;
- evidence references;
- confidence;
- freshness deadline;
- simulation/twin references where required;
- deterministic policy decisions;
- blast-radius class;
- provenance/attestation references;
- rollback and recovery checkpoint where required;
- required approvals and satisfied approvals;
- verification and abort conditions;
- reversibility/preapproval declarations for L5.

Every passport is SHA-256 sealed.

## 6. Authorization law

A bounded action may be authorized only when all applicable terms are true and fresh:

`Constitution ∧ Policy ∧ Identity ∧ Capability ∧ Provenance ∧ Evidence ∧ RecoveryPath ∧ RiskBudget`

Authorization fails closed when:

- passport or cell integrity fails;
- cell/passport is stale;
- requested capability is not in the cell;
- requested autonomy exceeds the cell ceiling;
- source identity/provenance/evidence is absent;
- a required approval is absent;
- L4 lacks Twin/simulation + rollback + recovery checkpoint;
- L5 is not explicitly preapproved and reversible;
- any deterministic policy decision is false;
- the behavior monitor has quarantined/revoked the cell;
- L6 is requested.

## 7. Adaptive autonomy

A5 computes a deterministic recommended ceiling from bounded factors rather than letting an LLM choose its own authority. Positive factors include fresh evidence, reversibility, prior verified success, and small blast radius. Negative factors include privilege, sensitive data, legal/financial impact, irreversibility, uncertainty, and novelty.

The computed recommendation can only reduce authority relative to the cell ceiling; it cannot mint a capability.

## 8. Agent behavior containment

Agent behavior is evaluated against cell budgets:

- action count;
- tool-call count;
- loop count;
- cost units;
- denied-boundary attempts.

A denied-boundary attempt or severe budget breach causes `REVOKED`; approaching/exceeding bounded operational budgets causes `QUARANTINED`. Such state denies subsequent authorization.

## 9. No Production authorization in this slice

A5 is a control-plane foundation on the PR branch. It does not deploy an agent runtime and does not authorize Production mutation, merge, money movement, Production DB mutation, secrets administration, or branch-protection changes.

## 10. Acceptance criteria

A5 is `IMPLEMENTED` when:

1. autonomy levels L0-L5 exist and L6 is hard-denied;
2. Capability Cells are expiring, sealed, least-privilege, and separation-of-duties enforced;
3. sandbox policy is deny-by-default and interface allowlisted;
4. Action Passports are sealed and contain deterministic evidence/provenance fields;
5. authorization verifies integrity, freshness, capability, approvals, recovery, and policy terms;
6. L4/L5 additional safeguards fail closed;
7. adaptive autonomy can only reduce authority;
8. runaway/denied behavior quarantines or revokes the cell;
9. repository gates pass on one exact SHA before A5 is called `VERIFIED`.
