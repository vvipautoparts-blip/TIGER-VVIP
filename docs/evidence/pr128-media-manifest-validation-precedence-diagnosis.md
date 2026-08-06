# PR #128 — Media Manifest Validation Precedence Diagnosis

## Control record

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Delivery PR: `#128`
- Temporary CI PR: `#129` — verification only; never merge
- Diagnosed delivery head: `cd2a93d84bf40e6e0f88d9057274a74a526d2ac3`
- Evidence-ledger commit: `cfc1b66546d7e1377268c56a2f85d03894dcdb3e`
- Precedence-matrix RED commit: `e582727bf712f383c2f8f17af7c5dfeeb1632dab`
- Original failing Quality Gate run: `31087858136`
- Original failing Quality Gate job: `92571500529`
- Original cycle start: `2026-08-06T09:09:03Z`
- Original cycle end: `2026-08-06T09:09:20Z`
- Current decision state: `RED_VERIFICATION_RUNNING`
- Merge eligibility: `BLOCKED`
- Release eligibility: `BLOCKED`

## Verified result

The isolated Quality Gate executed 225 Node CJS tests. Result: 224 passed and one failed.

The single failure occurred in `tests/v13-1-media-manifest.test.cjs` while validating an asset manifest with `countryCode: undefined`.

Expected denial:

`MEDIA_COUNTRY_REQUIRED`

Actual denial:

`MEDIA_CONTRACT_INVALID`

All unrelated controls remained green:

- Project Control Integrity: PASS
- Dependency Review: PASS
- CodeQL: PASS
- PR35/PR36 focused suite: 110/110 PASS
- Listing Contract: 13/13 PASS
- Authorization integrity: 96/96 PASS
- Secret findings: 0
- Dangerous SQL: CRITICAL 0 / HIGH 0
- Isolated worktree: CLEAN
- Official workspace: UNCHANGED

## Root cause

`createMediaAssetManifest()` invokes structural validation before required-field classification. The structural validator currently treats any `undefined` value as a generic unsafe structure. Consequently, a known required field whose value is `undefined` is rejected before the domain validator can emit its stable field-specific denial.

This is not a CI infrastructure failure and not a security-rule conflict. It is deterministic error-precedence drift between structural safety and domain classification.

## Approved correction architecture

Use two-pass deterministic validation:

1. **Structural Security Inspection**
   - Reject cycles, prototype pollution, non-plain objects, functions, symbols, bigint, non-finite numbers, excessive depth, and excessive entry counts.
   - Permit `undefined` only as an intermediate representation for a known allowlisted field so that required-field semantics can classify it.

2. **Domain Error Classification**
   - Forbidden client-controlled fields have highest domain precedence.
   - Unknown fields produce `MEDIA_CONTRACT_INVALID`.
   - Missing known required fields use stable field-specific codes.
   - Invalid present values use stable format/domain codes.
   - Lifecycle and timestamp validation runs after identity and media-domain validation.

## Mandatory precedence

1. Unsafe structure / prototype pollution → `MEDIA_CONTRACT_INVALID`
2. Forbidden client field → `MEDIA_CLIENT_FIELDS_DENIED`
3. Unknown field → `MEDIA_CONTRACT_INVALID`
4. Missing country → `MEDIA_COUNTRY_REQUIRED`
5. Invalid country → `MEDIA_COUNTRY_INVALID`
6. Missing or malformed seal → `MEDIA_SEAL_REQUIRED`
7. Remaining identifiers, media values, lifecycle, and timestamps in canonical order

## Release Decision Assurance Protocol

### State machine

`DIAGNOSING → RED_CONFIRMED → FIX_IN_PROGRESS → GREEN_CANDIDATE → SHA_LOCKED → REVIEW_ELIGIBLE → MERGE_ELIGIBLE → RELEASE_ELIGIBLE`

No state may be skipped. A successful workflow on a different SHA is not evidence for the current candidate.

### Evidence ledger requirements

Every decision record must include:

- PR number and delivery branch
- exact head SHA and merge SHA when applicable
- workflow, run, job, and attempt identifiers
- runner/toolchain versions
- start and end timestamps
- test counts and failing test names
- CodeQL, dependency, secret, and SQL scan results
- root cause and affected trust boundary
- changed-file scope
- rollback method
- final decision and named reason code

### Result classifications

- `PASS`: every required gate passes on one locked SHA. This permits review; it does not automatically authorize merge or production release.
- `KNOWN_ACCEPTABLE_DEVIATION`: prohibited for authentication, authorization, privacy, media integrity, storage isolation, RLS, secrets, SQL safety, or fail-closed behavior. For non-security matters it requires an expiring signed waiver, compensating control, named owner, rollback, and remediation deadline.
- `FAILURE_OR_SECURITY_DRIFT`: merge and release remain blocked; a reproducible RED test and technical correction are mandatory.
- `TIMEOUT_OR_INCONCLUSIVE`: never treated as success. Rerun once on the identical SHA, then investigate infrastructure without altering product gates.

### Exception governance

No permanent exception is permitted. Any non-security waiver must contain:

- scope limited to one invariant
- explicit business justification
- risk owner
- compensating control
- issue reference
- hard expiry
- automatic fail-closed after expiry

Security and integrity invariants in this PR are non-waivable.

### Merge and release separation

Merge eligibility requires green SHA-locked evidence, dependency-chain readiness, resolved review threads, and required approval.

Release eligibility additionally requires production configuration review, signed release evidence, artifact provenance, rollback rehearsal, canary criteria, and no remote-database ambiguity.

No production or remote Supabase action is authorized by this document.

## Exit criteria

PR #128 remains blocked until all of the following succeed on the same final SHA:

- Complete Node CJS suite, including the validation-precedence matrix
- Authorization integrity suite
- PR35/PR36 focused suite
- Listing Contract suite
- Project Control Integrity
- Dependency Review
- CodeQL
- Secret scan: 0
- Dangerous SQL: CRITICAL 0 / HIGH 0
- Clean isolated worktree
- No changes to `main`, remote Supabase, or production
