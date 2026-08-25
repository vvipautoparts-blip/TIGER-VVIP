# VVIP TIGER NEXUS-CLOSURE 2026 — Design

**Date:** 2026-08-25
**Status:** OWNER-APPROVED DESIGN — WRITTEN SPEC REVIEW PENDING
**Branch:** `feat/one-field-living-discovery-20260822`
**PR:** #313
**Scope:** Close only the current Discovery context-isolation failures and V14 release-state/closure-proof failures.
**Safety boundary:** No merge to `main`; no Production or Staging mutation; no weakening, skipping, silencing, or bypassing required tests/gates.

## 1. Decision

The platform adopts **NEXUS-CLOSURE 2026** as the focused closure architecture for the current RED state.

NEXUS-CLOSURE has three mandatory outcomes:

1. Discovery resolves the active temporal temple exactly once per request and propagates that authoritative context explicitly to all consumers.
2. Unscoped, stale, mismatched, or incomplete S2S discovery candidates are rejected before ranking, explanation, facets, or UI exposure.
3. Release truth becomes machine-readable and same-SHA closure is proven deterministically; a required gate that is skipped is not GREEN.

The governing formula is:

> REQUEST-SCOPED AUTHORITY + FILTER-BEFORE-RANK + MACHINE RELEASE TRUTH + SAME-SHA CLOSURE

This is intentionally a narrow closure slice. It does not redesign the whole discovery stack, CI platform, deployment platform, or security architecture.

## 2. Current repo truth and closure target

At the design baseline, PR #313 is open, Draft, mergeable, and targets `main`. The head branch is `feat/one-field-living-discovery-20260822`.

The verified head at design start is:

```text
10d0b6860db3112da6b09426f42290b0f049283b
```

On that SHA, 12 pull-request workflows completed:

- 10 SUCCESS;
- `VVIP Quality Gate` FAILURE;
- `V14 Release Candidate` FAILURE.

Therefore the closure target is **12/12 SUCCESS on one final SHA**. Greens accumulated across different SHAs are invalid evidence.

The implementation must re-read Repo Truth before every write because the branch may advance after this design commit.

## 3. Non-negotiable invariants

1. `resolve_active_temporal_temple` is invoked exactly once for each Discovery request that requires temporal authority.
2. The resolved temple is request-scoped. A process-global cache must not be used as the authority source.
3. No free, undeclared, ambient, or fallback `resolvedTempleId` variable may determine discovery authorization.
4. Every discovery consumer that needs temporal/scope authority receives an explicit immutable `DiscoveryContext`.
5. Missing required Discovery context fails closed.
6. Candidate authorization/scoping occurs before ranking, scoring, facets, explanations, or rendering.
7. Candidate data cannot self-authorize by asserting a temple, scope, stable key, epoch, or active context value.
8. The server-resolved context is authoritative.
9. Missing candidate scope data is rejection, not implicit compatibility.
10. Duplicate or replayed candidate data must not expand the bounded result set.
11. Organic discovery relevance remains independent of paid delivery.
12. A required release check that is skipped, absent, cancelled, or evaluated on another SHA cannot satisfy closure.
13. Human-readable Markdown is not the mechanical authority for release state.
14. `main`, Production, and Staging remain untouched by this slice.
15. No test may be deleted, relaxed, ignored, marked flaky, conditionally skipped, or converted to a non-blocking assertion to obtain GREEN.

## 4. Architecture

### 4.1 Temporal Authority Cell — Request-Scoped Single Flight

A Discovery request creates one temporal authority operation.

Conceptual flow:

```text
Discovery Request
  -> Temporal Authority Cell
     -> resolve_active_temporal_temple() exactly once
     -> validate resolved authority
     -> construct immutable DiscoveryContext
  -> all request consumers receive the same context object/value set
```

The single-flight boundary is per request, not global. Multiple consumers inside one request may await the same resolution promise/result, but a second independent request performs its own authority resolution.

Required behavior:

- zero resolutions when the route legitimately does not require Discovery temporal authority;
- exactly one resolution when it does;
- two consumers in the same request observe the same authoritative `templeId`, `temporalEpoch`, `scopeKey`, and fingerprint;
- failed authority resolution fails the request closed and is not replaced by a stale/global/default temple.

### 4.2 Discovery Context Capsule

Loose context variables are replaced by an explicit immutable contract.

Conceptual contract:

```text
DiscoveryContext {
  templeId
  temporalEpoch
  stableKey
  scopeKey
  activeContext
  requestId
  contextFingerprint
}
```

Rules:

- `templeId`, `temporalEpoch`, `stableKey`, `scopeKey`, and `activeContext` are authorization/scoping inputs and must be server-derived or server-validated according to the existing discovery authority model;
- `requestId` is correlation metadata, not authorization;
- `contextFingerprint` is diagnostic/correlation metadata, not authorization;
- the context is immutable after creation;
- consumers must accept the context explicitly rather than reading ambient globals;
- absence of a required field returns a deterministic blocked outcome such as `DISCOVERY_CONTEXT_BLOCKED`.

No compatibility fallback may recreate the old ambient behavior.

### 4.3 Context Fingerprint

A canonical fingerprint is derived from the authoritative context dimensions required for correlation:

```text
fingerprint = H(canonical(templeId, temporalEpoch, stableKey, scopeKey, activeContext))
```

The exact hash primitive and encoding must reuse an existing secure project primitive where available; the implementation plan must not introduce a new cryptographic dependency unless necessary.

The fingerprint exists to:

- correlate scope decisions across internal stages;
- detect accidental context divergence;
- support safe diagnostics without logging raw sensitive context where avoidable.

It must never replace direct field-by-field scope validation.

### 4.4 Candidate Scope Firewall — CSF

The Candidate Scope Firewall is the mandatory boundary between S2S/RPC discovery results and ranking.

Data flow:

```text
S2S / RPC candidate set
  -> Candidate Scope Firewall
     -> normalize candidate scope metadata
     -> validate against authoritative DiscoveryContext
     -> deduplicate within bounded request scope
     -> ACCEPT or REJECT with deterministic reason
  -> accepted candidates only
  -> ranking / scoring
  -> facets / explanations
  -> UI projection
```

The order is mandatory: **Filter Before Rank**.

A candidate is rejected when any required dimension is missing or mismatched, including:

- temple;
- temporal epoch/boundary;
- stable key;
- scope key;
- active context.

A rejected candidate must be structurally unable to enter later ranking/scoring/facet/explanation/render stages.

The firewall must not trust a candidate-provided field merely because it equals a client-provided value. Comparison is against the authoritative server-resolved `DiscoveryContext`.

### 4.5 Bounded deterministic discovery

The current discovery contract requires stable bounded behavior across first-run/second-run resolution.

Required properties:

- the first run may establish or resolve the stable context required by the existing discovery contract;
- the second run returns only candidates inside the same authoritative scope;
- unscoped RPC data cannot increase the candidate count;
- duplicates do not become additional visible results;
- deterministic tie-breaking remains unchanged unless the existing failure proves it depends on invalid pre-filter data;
- this slice does not alter proprietary ranking weights.

## 5. Failure DNA

NEXUS-CLOSURE standardizes deterministic failure identifiers for the new boundaries.

```text
DISC-TEMP-001   active temporal authority resolution invariant failed
DISC-CTX-002    required DiscoveryContext missing/incomplete
DISC-SCOPE-003  candidate scope mismatch or unscoped candidate rejected
DISC-TIME-004   temporal epoch/boundary mismatch
DISC-STABLE-005 stable-key mismatch
DISC-DUP-006    duplicate/replay candidate invariant failed
REL-STATE-001   release state invalid, stale, or inconsistent
REL-TRANS-002   illegal release-state transition
SHA-CLOSE-001   required closure evidence does not share one source SHA
EVIDENCE-001    required release/closure evidence absent
```

Failure DNA must improve diagnostics without leaking secrets or proprietary ranking internals.

## 6. Testing architecture

Implementation proceeds in strict TDD. Existing RED evidence is preserved; new tests add invariant coverage rather than replacing current failing tests.

### 6.1 Temporal authority tests

Required assertions:

1. one Discovery request invokes `resolve_active_temporal_temple` exactly once;
2. multiple consumers in one request receive the same resolved authority;
3. independent requests do not share a mutable/global authority cache;
4. resolver failure blocks the request rather than falling back.

### 6.2 DiscoveryContext tests

Required assertions:

- missing required context blocks;
- context is immutable after construction;
- consumers receive context explicitly;
- no undeclared/ambient `resolvedTempleId` dependency exists in the changed path.

### 6.3 Scope mutation invariant tests

Start with one valid candidate that is accepted. Mutate exactly one context dimension per test. Each mutation must flip ACCEPT to REJECT:

- wrong temple;
- missing temple;
- wrong temporal epoch;
- wrong stable key;
- wrong scope key;
- missing scope key;
- wrong active context.

Also test:

- a fully valid candidate passes;
- a duplicate candidate does not produce two visible candidates;
- an unscoped extra RPC candidate cannot leak into the second-run bounded set.

### 6.4 Ranking isolation test

Use a spy/stub or equivalent existing project testing technique to prove that a rejected candidate is never passed to ranking/scoring. Counting only final UI results is insufficient because a leak into ranking is itself a boundary violation.

### 6.5 Focused-to-full regression sequence

The implementation plan must preserve this verification order:

```text
new focused RED test
-> minimal implementation
-> focused GREEN
-> related discovery regression
-> full VVIP Quality Gate
-> zero-residue / workspace cleanliness verification
```

## 7. Release Truth Manifest — RTM

V14 release state becomes machine-readable.

The canonical logical authority is a JSON manifest owned by release-control code, not prose. The implementation plan must bind the existing V14 validator to one canonical repository path and must not create two competing release-state authorities.

Preferred canonical path for this design:

```text
project-control/release/v14/release-state.json
```

If current repository structure already has an authoritative machine release-state location, the implementation plan must reuse it and record that choice explicitly rather than introducing the preferred path above.

Conceptual schema:

```json
{
  "schemaVersion": 1,
  "releaseState": "PRODUCTION_COUNTRY_GO_LIVE_CLOSED",
  "sourceSha": "<40-char git sha>",
  "previousState": "<previous legal state>",
  "transition": "<legal transition id>",
  "evidence": ["<deterministic evidence reference>"],
  "authority": "V14_RELEASE_CONTROL",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

The actual allowed state vocabulary must reuse the repository's existing V14 state machine where defined. This design does not authorize inventing a parallel set of deployment states.

### 7.1 Markdown projection

`docs/launch/PRODUCTION_DEPLOYMENT_STATUS.md`, if required by the current workflow or documentation contract, becomes a human-readable projection of the machine authority.

Rules:

- the validator does not infer authoritative state from stale prose markers;
- generated/readable Markdown may include the current state and source SHA;
- Markdown and manifest divergence is a hard validation failure, not a warning;
- no stale marker such as `VVIP_RELEASE_CANDIDATE_GATE_PASSED` may remain authoritative after a state transition.

Before changing any release-status file, the implementation plan must confirm the exact current path from V14 workflow source and failing job logs. A user-reported or historical path must not be blindly created if the current validator uses another path.

## 8. Release state machine

V14 validates a legal state transition, not merely the presence of a string.

Validation order:

```text
parse manifest
-> validate schema
-> validate sourceSha
-> validate previousState
-> validate transition legality
-> validate evidence presence
-> validate Markdown projection if one is required
-> execute Release Candidate Gate
-> produce gate evidence
```

An illegal transition fails with `REL-TRANS-002`.

A stale/mismatched state fails with `REL-STATE-001`.

A missing evidence reference fails with `EVIDENCE-001`.

Most importantly, correcting release-state validation is not sufficient by itself: the **Release Candidate Gate must actually execute and conclude SUCCESS**. A skipped RC gate is BLOCKED.

## 9. Same-SHA Closure Proof

Closure is a deterministic AND over the complete required workflow set attached to one source SHA.

Conceptual proof object:

```text
ClosureProof {
  sourceSha
  requiredChecks[]
  observedChecks[]
  allRequiredPresent
  allRequiredSuccess
  noRequiredSkipped
  sameSha
  decision
}
```

Decision rules:

- different source SHA among required evidence -> `SHA-CLOSE-001` / BLOCKED;
- missing required check -> BLOCKED;
- skipped required check -> BLOCKED;
- cancelled required check -> BLOCKED;
- any required FAILURE -> RED;
- all required checks present + SUCCESS + same SHA -> CLOSED.

At the current design baseline, the expected closure count is 12 required PR workflows. The implementation must derive the final required set from the actual workflow/run policy on the final SHA and must not force a stale numeric count if the repository's required check set legitimately changes during the slice.

No platform-wide 100% readiness claim follows automatically from this closure proof; it proves only the required closure set for this slice on that SHA.

## 10. Implementation boundaries

### In scope

- exact current root cause of the active-temple single-resolution failure;
- explicit request-scoped DiscoveryContext propagation;
- S2S candidate scope firewall and duplicate/bounded-set protection;
- invariant/mutation/ranking-isolation tests;
- machine-readable V14 release truth;
- legal transition validation;
- proof that Release Candidate Gate executes;
- same-SHA required-check closure evidence;
- secret-safe diagnostics and zero-residue verification for changed paths.

### Out of scope

Do not add or redesign in this slice:

- Kubernetes;
- service mesh;
- SPIFFE/SPIRE;
- distributed OPA;
- AI governance agents;
- post-quantum cryptography rollout;
- SBOM architecture redesign;
- whole CI/CD rebuild;
- ranking-weight redesign;
- new advertising logic;
- new payment or transaction flows;
- broad UI redesign;
- unrelated refactors.

These may belong to the wider Sovereign Trust Fabric but are not dependencies for closing the present RED state.

## 11. Expected implementation touch surface

The implementation plan must first resolve exact paths from the current branch and failing logs. It may then touch only the smallest necessary subset of:

- current Discovery runtime/wrapper code that resolves active temporal temple and consumes the result;
- current S2S/RPC discovery candidate normalization/filtering path;
- corresponding focused Node/CJS/MJS tests already used by the Quality Gate;
- V14 release-state validator/workflow support code;
- one canonical machine-readable release-state manifest;
- human-readable deployment-status projection only if the current workflow requires it;
- focused release-state/closure tests.

The plan must not create a guessed replacement file merely because a historical error message names a path. Exact current workflow source and job logs are the authority for locating implementation files.

## 12. Execution sequence after written-spec approval

No implementation starts until the owner approves this written spec.

After approval:

1. re-read PR #313 Repo Truth and capture current head SHA;
2. invoke the implementation-planning workflow;
3. locate exact current failing tests, runtime files, V14 validator, and workflow paths from source/logs;
4. RED-1: preserve/add single-flight temporal authority test;
5. GREEN-1: minimal request-scoped temporal authority fix;
6. RED-2: DiscoveryContext invariant tests;
7. GREEN-2: explicit immutable context propagation;
8. RED-3: candidate scope mutation + ranking-isolation tests;
9. GREEN-3: Candidate Scope Firewall;
10. run focused discovery regressions;
11. run full VVIP Quality Gate and require GREEN;
12. RED-4: release-state machine/manifest contract test;
13. GREEN-4: machine release truth + projection validation;
14. rerun V14 and prove Release Candidate Gate executed and SUCCESS;
15. perform zero-residue, secret-safe, and workspace-cleanliness checks;
16. commit/push the final implementation SHA;
17. obtain all required PR workflow conclusions for that exact SHA;
18. emit Closure Proof only if every required check is SUCCESS on the same SHA.

## 13. Acceptance criteria

NEXUS-CLOSURE is implementation-complete only when all of the following are true:

- active temporal temple resolves exactly once per applicable Discovery request;
- all consumers use the same explicit immutable DiscoveryContext;
- no undeclared `resolvedTempleId` runtime failure remains in the affected path;
- unscoped/mismatched candidates are rejected before ranking;
- first/second-run bounded discovery tests pass without leaking extra RPC candidates;
- mutation invariants and duplicate isolation tests pass;
- ranking isolation is proven;
- VVIP Quality Gate concludes SUCCESS on the candidate final SHA;
- V14 validates machine release truth;
- Release Candidate Gate executes rather than being skipped;
- V14 concludes SUCCESS on the candidate final SHA;
- no required workflow is missing/skipped/cancelled/failing;
- all required workflows conclude SUCCESS on the same final SHA;
- no `main`, Production, or Staging mutation occurred;
- no test weakening or bypass was used;
- zero-residue and secret-safe diagnostics remain GREEN.

## 14. Owner sovereignty and evidence rule

The owner retains final authority over merging or deployment. This design authorizes work only on the existing PR feature branch.

Evidence hierarchy for this slice is:

```text
exact repository source + exact failing logs
  > focused test evidence
  > full gate evidence
  > same-SHA workflow evidence
  > human-readable status prose
```

If evidence conflicts, execution stops at the earliest authoritative contradiction and the state remains RED/BLOCKED until the contradiction is resolved.
