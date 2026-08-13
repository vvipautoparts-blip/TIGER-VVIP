# F14A Sovereign Portability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build provider-neutral portability and recovery-evidence contracts without inventing provider choices or recovery targets.

**Architecture:** A pure CommonJS module validates infrastructure adapters against a minimal portable capability contract, applies country-level suspend/resume transitions without affecting other countries, and evaluates measured recovery evidence only against explicitly supplied targets. No default RTO/RPO values are invented.

**Tech Stack:** Node.js 22, CommonJS, `node:test`.

## Global Constraints
- No single-provider or single-jurisdiction capture.
- Portability requires export/import contracts for database, object storage, and configuration plus health probes and country-granular control.
- Country suspension must not imply a global shutdown.
- RTO/RPO claims require measured restore/failover evidence against explicit targets.
- Missing evidence is `BLOCKED`, never PASS.
- No provider migration, Production failover, or country activation in F14A.

### Task 1: Provider-neutral adapter and country control
**Files:** Test `tests/f14a-sovereign-portability.test.cjs`; create `scripts/reliability/f14a-portability-contract.js`.
**Interfaces:** `REQUIRED_PORTABILITY_CAPABILITIES`, `validatePortabilityAdapter()`, `transitionCountryAvailability()`, `evaluateRecoveryEvidence()`.
- [ ] Write failing tests for exact capability coverage, default deny on missing capability, one-country-only suspension/resume, and measured recovery evaluation.
- [ ] Verify RED because the module does not exist.
- [ ] Implement the minimal pure contract without provider names or default RTO/RPO.
- [ ] Verify GREEN.

### Task 2: Recovery evidence schema
**Files:** Test `tests/f14a-recovery-evidence-schema.test.cjs`; create `config/fusion/f14-recovery-evidence-schema.json`.
- [ ] Write failing test requiring exact SHA/digest, backup/restore/failover timestamps, explicit targets, measured RTO/RPO, provider-adapter identifier, data-integrity result, and country scope.
- [ ] Verify RED.
- [ ] Add schema with `PLANNED|PASS|FAIL|BLOCKED` and no default target values.
- [ ] Verify GREEN.

## Verification
Run `node --test tests/f14a-sovereign-portability.test.cjs tests/f14a-recovery-evidence-schema.test.cjs` and require zero failures. Passing this contract does not prove that a real restore/failover rehearsal has run.