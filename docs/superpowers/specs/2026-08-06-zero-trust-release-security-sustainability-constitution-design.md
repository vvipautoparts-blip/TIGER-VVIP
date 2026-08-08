# Zero-Trust Release and Security Sustainability Constitution

## Status

Owner-approved design for a repository-native, deterministic release-governance system.

This document defines policy and executable boundaries only. It does not merge a pull request, deploy an environment, apply a remote migration, mutate production data, activate a country, or create an exception.

## 1. Purpose

TIGER-VVIP requires a release system that distinguishes technical correctness from permission to merge and permission to release. A green test run is necessary but never sufficient by itself.

The system must make release decisions from current, exact-head, machine-verifiable evidence. Missing, stale, ambiguous, contradictory, or unverifiable evidence must fail closed.

The primary objective is:

> Maximize durable platform value while minimizing legal, security, privacy, financial, operational, and reputational risk; protect users and the rights of the owner and partners; require reproducible evidence and a tested rollback path for every promoted release state.

## 2. Evaluated Approaches

### 2.1 Documentation-only charter

A prose policy is easy to understand but cannot prevent a merge or release when evidence is incomplete. It is insufficient as the final control.

### 2.2 Workflow-only gate

A collection of independent CI jobs provides enforcement but can drift because each workflow embeds its own interpretation of policy. It is stronger than documentation alone but lacks a single deterministic decision model.

### 2.3 Executable constitution with evidence attestations — selected

A versioned policy engine consumes normalized evidence attestations and produces one deterministic eligibility decision. CI workflows collect evidence; the constitution decides. Human approvals remain separate evidence inputs and cannot be synthesized by automation.

This approach is selected because it centralizes policy, supports testing, prevents silent semantic drift, creates stable denial codes, and separates merge eligibility from release eligibility.

## 3. Non-Negotiable Principles

1. **Exact-head evidence:** every technical attestation is bound to the exact candidate commit SHA.
2. **Fail closed:** missing, stale, malformed, contradictory, or inconclusive evidence is never success.
3. **Separation of duties:** the author cannot manufacture an independent approval, production authorization, legal approval, or operational sign-off.
4. **No permanent exceptions:** all non-security deviations expire automatically and return to blocked state.
5. **Zero tolerance for sovereign domains:** no deviation mechanism may bypass the protected domains listed in Section 8.
6. **No self-referential attestation:** commit SHA locks belong in PR/release metadata or external attestations, not in a tracked file that changes the SHA it claims to attest.
7. **No direct production mutation:** this slice creates no deployment credential, database connection, storage connection, or production action.
8. **Reproducible policy:** equal normalized evidence produces the same decision and denial codes.
9. **Minimal disclosure:** evidence objects contain hashes, statuses, identifiers, timestamps, and bounded summaries; they never contain secrets, tokens, raw user data, full logs, or environment values.
10. **Rollback is a first-class release artifact:** merge eligibility and release eligibility remain blocked when rollback cannot be demonstrated for the affected layer.

## 4. Scope

### 4.1 In scope

- release-state contracts;
- normalized evidence contracts;
- exact-head binding;
- dependency-chain validation;
- independent-review evidence;
- quality and security gate evidence;
- provenance and artifact-integrity evidence;
- migration and storage-change evidence;
- rollback dry-run evidence;
- canary, kill-switch, observability, and incident-readiness evidence;
- temporary non-security deviation contracts;
- deterministic decision evaluation;
- stable denial codes;
- append-only decision records;
- repository CI integration in analysis mode.

### 4.2 Out of scope

- merging any pull request;
- deploying to production;
- applying remote Supabase migrations;
- changing Clerk, DNS, storage, payments, tax, or country activation;
- inventing legal, tax, residency, payment-provider, or production-environment facts;
- creating production secrets;
- replacing GitHub branch protection;
- replacing legally required human approvals;
- accepting a security deviation.

## 5. Decision State Machine

The only valid forward states are:

```text
DIAGNOSING
  -> RED_CONFIRMED
  -> FIX_IN_PROGRESS
  -> GREEN_CANDIDATE
  -> SHA_LOCKED
  -> REVIEW_ELIGIBLE
  -> MERGE_ELIGIBLE
  -> RELEASE_CANDIDATE
  -> RELEASE_ELIGIBLE
  -> CANARY_ACTIVE
  -> RELEASED
```

Failure or evidence invalidation may move a candidate to:

```text
BLOCKED
QUARANTINED
ROLLBACK_REQUIRED
ROLLED_BACK
```

A state cannot be skipped. A new head SHA invalidates all SHA-bound states at or above `GREEN_CANDIDATE` and requires fresh evidence.

### 5.1 Technical verification

`SHA_LOCKED` requires all configured technical gates to pass on the exact candidate SHA.

### 5.2 Review eligibility

`REVIEW_ELIGIBLE` requires technical verification, bounded scope, complete change classification, and no unresolved review thread classified as blocking.

### 5.3 Merge eligibility

`MERGE_ELIGIBLE` additionally requires:

- dependency chain resolved or explicitly ordered;
- exact-head independent approval;
- branch-protection checks satisfied;
- no stale approval after head movement;
- no unresolved zero-tolerance finding;
- merge method permitted by repository policy;
- rollback path for repository changes;
- no production action embedded in the merge operation.

### 5.4 Release eligibility

`RELEASE_ELIGIBLE` additionally requires:

- artifact provenance bound to source SHA;
- artifact digest verification;
- environment configuration validation without exposing values;
- release-specific legal, privacy, tax, country, storage, and data-residency evidence where applicable;
- remote migration plan and rollback rehearsal where applicable;
- canary plan;
- kill-switch readiness;
- observability and alert readiness;
- incident owner and escalation path;
- recovery objectives and backup evidence where applicable;
- no expired deviation;
- explicit production authorization from the authorized human role.

## 6. Evidence Model

Every attestation uses a strict allowlist and includes:

```text
schemaVersion
policyVersion
evidenceType
subjectRepository
subjectPullRequest
subjectHeadSha
issuerClass
issuerIdHash
issuedAt
expiresAt
status
summaryCode
evidenceDigest
correlationId
```

Optional evidence-specific fields must be versioned and allowlisted.

### 6.1 Issuer classes

```text
CI_SYSTEM
INDEPENDENT_REVIEWER
SECURITY_REVIEWER
LEGAL_APPROVER
PRIVACY_APPROVER
COUNTRY_APPROVER
DATABASE_APPROVER
RELEASE_MANAGER
INCIDENT_COMMANDER
OWNER_ROOT
```

Automation may issue only `CI_SYSTEM` attestations. It cannot issue or impersonate human approval classes.

### 6.2 Evidence freshness

- evidence with an expired `expiresAt` is stale;
- evidence dated materially in the future is invalid;
- evidence for another head SHA is invalid;
- evidence with an unknown schema or policy version is invalid;
- duplicate evidence with contradictory status blocks the candidate;
- timeout, cancellation, neutral, skipped-required, and missing are not success.

### 6.3 Evidence minimization

Evidence must not include:

- secrets or tokens;
- raw environment variables;
- user content or personal data;
- full event payloads;
- session or authorization envelopes;
- database connection strings;
- storage URLs or object paths;
- legal documents not approved for repository storage;
- unbounded logs.

## 7. Required Technical Evidence Classes

The policy engine supports at least:

```text
QUALITY_GATE
PROJECT_CONTROL
DEPENDENCY_REVIEW
STATIC_ANALYSIS
SECRET_SCAN
DANGEROUS_SQL_SCAN
AUTHORIZATION_INTEGRITY
MEDIA_INTEGRITY
LISTING_CONTRACT
MIGRATION_LOCAL_REPEATABILITY
RLS_CONTRACT
STORAGE_ISOLATION
PROVENANCE
ARTIFACT_DIGEST
ROLLBACK_DRY_RUN
CANARY_PLAN
KILL_SWITCH
OBSERVABILITY
INCIDENT_READINESS
BACKUP_RECOVERY
PERFORMANCE_BUDGET
ACCESSIBILITY
PRIVACY_REVIEW
LEGAL_REVIEW
COUNTRY_ACTIVATION
PAYMENT_READINESS
```

The required set is derived from the classified change surface. The client cannot reduce the required set.

## 8. Zero-Tolerance Domains

No deviation, waiver, timeout acceptance, manual override, or compensating-control substitution is allowed for:

1. authentication and authorization;
2. owner and partner authority invariants;
3. privacy and personal-data confidentiality;
4. media integrity and trusted media manifests;
5. RLS and tenant isolation;
6. storage isolation and object-reference integrity;
7. secret management;
8. dangerous SQL and migration safety;
9. fail-closed behavior;
10. country boundaries and country-seal enforcement;
11. legal-entity and data-residency boundaries;
12. audit append-only integrity;
13. artifact provenance and source-to-binary binding;
14. production credential boundaries;
15. rollback capability for destructive or stateful changes.

Any failure in these domains produces `BLOCKED` or `ROLLBACK_REQUIRED`.

## 9. Temporary Non-Security Deviation Framework

A temporary deviation is permitted only for a classified non-security, non-privacy, non-legal, non-financial-integrity, and non-sovereign-domain condition.

A valid deviation requires:

```text
deviationId
schemaVersion
policyVersion
subjectHeadSha
scopePaths
scopeCapability
reasonCode
riskOwner
approvedByClass
issuedAt
expiresAt
compensatingControl
remediationTicket
rollbackPlan
verificationPlan
maximumBlastRadius
automaticFailClosedAtExpiry
```

Rules:

- permanent deviations are invalid;
- automatic renewal is invalid;
- open-ended scope is invalid;
- wildcard repository scope is invalid;
- a deviation cannot change required evidence for a zero-tolerance domain;
- expiry immediately returns the candidate to `BLOCKED`;
- changing the head SHA invalidates the deviation;
- a deviation cannot authorize merge or release by itself;
- the decision record must list every active deviation.

## 10. Pull-Request Dependency Train

A stacked PR is evaluated as a dependency graph, not as an isolated diff.

The evaluator must:

- detect cycles;
- require every parent PR to exist and remain open or merged as declared;
- require exact parent head/base relationships;
- invalidate descendants when a parent head changes;
- prevent a child from becoming merge-eligible before required parents;
- prevent a documentation-only parent from silently carrying runtime changes;
- classify obsolete sibling or predecessor PRs for closure without merge;
- preserve verification-only PRs as non-mergeable records.

## 11. Exact-Head Merge Protection

An approval or technical attestation is valid only for its subject head SHA.

A merge attempt must be blocked when:

- the PR head moved after approval;
- the base changed without recomputation;
- required checks ran on a different SHA;
- a merge queue synthesized a new commit without fresh required checks;
- the artifact digest does not correspond to the approved source SHA;
- the provenance subject differs from the release artifact.

## 12. Provenance and Supply-Chain Controls

Release artifacts must be generated by an approved workflow and accompanied by provenance containing:

- source repository;
- source SHA;
- workflow identity;
- build invocation identity;
- artifact digest;
- dependency lock digest;
- policy version;
- build timestamp;
- reproducibility or verification result.

The policy rejects unsigned, unverifiable, mismatched, mutable-tag-only, or locally substituted release artifacts.

The constitution does not create signing keys or production credentials. Key management remains a separately reviewed production-control slice.

## 13. Migration and Stateful-Change Controls

A database, storage, payment, ledger, country, or identity migration cannot become release-eligible without:

- classified state impact;
- forward plan;
- rollback or compensating recovery plan;
- local repeatability evidence;
- backup and restore evidence when destructive or stateful;
- migration-lock and order validation;
- dangerous SQL scan;
- RLS and privilege validation;
- exact environment targeting;
- explicit remote execution authorization;
- post-change verification plan;
- abort thresholds.

A review-only SQL file is never treated as authorization to apply it.

## 14. Canary and Kill-Switch Policy

A release requiring canary must define:

```text
canaryPopulation
canaryDuration
successMetrics
errorBudget
abortThresholds
rollbackTrigger
killSwitchOwner
killSwitchVerification
promotionSteps
```

The release blocks when thresholds are absent, unbounded, unverifiable, or dependent on unavailable telemetry.

The kill switch must be reversible, least-privilege, audited, and tested without requiring an application redeploy where the architecture permits.

## 15. Observability and Incident Readiness

Required evidence may include:

- service-level indicators;
- error, latency, saturation, and availability signals;
- audit-log health;
- security-event routing;
- alert ownership;
- escalation path;
- incident severity model;
- runbook reference;
- rollback authority;
- recovery objectives;
- status communication path.

A dashboard existing without alert ownership and tested routing is not sufficient.

## 16. Decision Record

The evaluator returns a deeply frozen, bounded decision object:

```text
schemaVersion
policyVersion
subjectHeadSha
state
decisionCode
requiredEvidence
acceptedEvidence
rejectedEvidence
missingEvidence
activeDeviations
blockingReasons
nextEligibleState
decisionDigest
```

The record must not contain secrets, raw logs, user data, environment values, session material, or full attestation payloads.

The decision digest is a SHA-256 over canonicalized semantic content. Timestamps that do not affect meaning are excluded from the semantic digest.

## 17. Stable Decision and Denial Codes

At minimum:

```text
RELEASE_EVIDENCE_REQUIRED
RELEASE_EVIDENCE_INVALID
RELEASE_EVIDENCE_STALE
RELEASE_EVIDENCE_CONFLICT
RELEASE_HEAD_MISMATCH
RELEASE_BASE_CHANGED
RELEASE_DEPENDENCY_BLOCKED
RELEASE_DEPENDENCY_CYCLE
RELEASE_REVIEW_REQUIRED
RELEASE_REVIEW_STALE
RELEASE_ZERO_TOLERANCE_FAILURE
RELEASE_DEVIATION_FORBIDDEN
RELEASE_DEVIATION_INVALID
RELEASE_DEVIATION_EXPIRED
RELEASE_PROVENANCE_REQUIRED
RELEASE_ARTIFACT_MISMATCH
RELEASE_ROLLBACK_REQUIRED
RELEASE_CANARY_REQUIRED
RELEASE_KILL_SWITCH_REQUIRED
RELEASE_OBSERVABILITY_REQUIRED
RELEASE_INCIDENT_READINESS_REQUIRED
RELEASE_PRODUCTION_APPROVAL_REQUIRED
RELEASE_TIMEOUT_INCONCLUSIVE
RELEASE_BLOCKED
```

## 18. Trust Boundaries

Untrusted:

- pull-request body claims;
- browser input;
- client-authored approvals;
- mutable branch names without SHA resolution;
- unchecked workflow output;
- copied logs;
- manually typed test counts;
- release tags without digest binding.

Trusted only after validation:

- GitHub check results bound to exact SHA;
- repository policy and contract files on the evaluated SHA;
- normalized attestations from allowlisted issuer classes;
- independent reviews obtained through the repository review system;
- artifact digests and provenance verified by approved workflows;
- local migration and rollback evidence generated by approved scripts.

## 19. Architecture

```text
Evidence Collectors
  -> Strict Evidence Normalizer
  -> Change-Surface Classifier
  -> Required-Evidence Resolver
  -> Dependency-Train Validator
  -> Zero-Tolerance Validator
  -> Temporary-Deviation Validator
  -> Exact-Head Validator
  -> Deterministic Release Decision Engine
  -> Bounded Decision Record
  -> CI Gate / PR Metadata / Release Gate
```

The decision engine is pure and dependency-injected. It performs no network access, environment lookup, GitHub mutation, database connection, storage call, or deployment action.

Adapters collect evidence and pass normalized objects to the pure engine. Adapters cannot override the engine's result.

## 20. Initial Repository Slice

The first implementation slice is analysis-only and includes:

- versioned release contracts;
- evidence and deviation validators;
- deterministic state evaluation;
- exact-head and dependency inputs as explicit data;
- stable denial codes;
- semantic decision hashing through an injected SHA-256 dependency;
- tests for zero-tolerance behavior, stale evidence, head movement, contradictory evidence, deviation expiry, dependency blocking, and release-state progression;
- a focused quality-gate test suite;
- no GitHub API mutation inside runtime code;
- no remote environment action.

## 21. Test Strategy

Strict TDD applies to every unit:

1. RED contract tests;
2. minimal GREEN implementation;
3. security regression tests;
4. mutation and precedence tests;
5. deterministic-output tests;
6. stale/future/contradictory evidence tests;
7. exact-head invalidation tests;
8. dependency-cycle and parent-movement tests;
9. deviation expiry and forbidden-domain tests;
10. same-SHA full Quality Gate, Project Control, Dependency Review, and CodeQL.

Required negative tests include:

- missing evidence;
- skipped required workflow;
- cancelled workflow;
- timeout;
- evidence from another SHA;
- stale review;
- conflicting attestations;
- future-dated evidence;
- unknown issuer class;
- security deviation attempt;
- permanent deviation attempt;
- expired deviation;
- missing rollback;
- artifact digest mismatch;
- provenance mismatch;
- canary without abort thresholds;
- observability without owner;
- release without production authorization.

## 22. Rollback

The initial slice is repository-only and analysis-only. Rollback is closing the PR or reverting its files and Quality Gate registration.

No production resource, database, storage object, user record, country seal, payment, credential, or remote configuration is created or modified.

## 23. Acceptance Criteria

The design is accepted only when:

- the policy distinguishes technical, review, merge, and release eligibility;
- all zero-tolerance domains are non-waivable;
- deviations are temporary, bounded, expiring, and non-authorizing;
- exact-head binding invalidates stale evidence;
- dependency graphs are validated;
- provenance, rollback, canary, kill-switch, observability, and incident readiness are represented;
- the evaluator is deterministic and pure;
- no secrets or raw sensitive data enter decision records;
- no production or remote mutation occurs;
- all focused and repository-wide gates pass on one final SHA.
