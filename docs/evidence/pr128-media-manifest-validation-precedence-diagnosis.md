# PR #128 — Media Manifest Validation Precedence Decision Record

## Final control record

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Delivery PR: `#128`
- Delivery branch: `feat/v13-1-media-first-payload-foundation-20260806`
- Base PR branch: `feat/v13-1-authorization-query-pipeline-20260806`
- Base SHA: `088c127b438894ecf97b3e2e2a176e5b870d2db3`
- Temporary CI PR: `#129` — verification only; never merge
- Original failing candidate: `cd2a93d84bf40e6e0f88d9057274a74a526d2ac3`
- Evidence-ledger commit: `cfc1b66546d7e1377268c56a2f85d03894dcdb3e`
- Precedence-matrix RED commit: `e582727bf712f383c2f8f17af7c5dfeeb1632dab`
- Corrected code commit: `fbcbd69dc8735724251aabf10cdb99a5a4b22a40`
- Evidence-attestation commit: `250e0b2ca329a9b78c5231474bb57c51a18731ad`
- Fully verified PR head: `250e0b2ca329a9b78c5231474bb57c51a18731ad`
- Current PR merge-test SHA before final review: `78ff49745b84109d3805aff83ee97168b6eccbcc`
- Final decision: `PASS`
- Decision reason: `VALIDATION_PRECEDENCE_DRIFT_CORRECTED_AND_REGRESSION_LOCKED`
- Protocol state: `SHA_LOCKED`
- Review eligibility: `PENDING_STACK_DEPENDENCY_AND_REVIEW`
- Merge eligibility: `BLOCKED_PENDING_STACK_DEPENDENCY_AND_REQUIRED_REVIEW`
- Release eligibility: `BLOCKED_PENDING_PRODUCTION_RELEASE_ASSURANCE`

## Original failure evidence

- Quality Gate run: `31087858136`
- Quality Gate job: `92571500529`
- Cycle start: `2026-08-06T09:09:03Z`
- Cycle end: `2026-08-06T09:09:20Z`
- Node result: `224/225 PASS`
- Failing case: `countryCode: undefined`
- Expected denial: `MEDIA_COUNTRY_REQUIRED`
- Actual denial: `MEDIA_CONTRACT_INVALID`

The original failure was not a CI infrastructure defect and not a conflict between security controls. It was deterministic validation-precedence drift: structural validation rejected a known `undefined` field before domain validation could emit its stable field-specific denial.

## RED confirmation

The dedicated precedence matrix was introduced before the production fix.

- RED SHA: `e582727bf712f383c2f8f17af7c5dfeeb1632dab`
- Quality Gate run: `31093088076`
- Quality Gate job: `92588501399`
- Node result: `226/230 PASS`
- Expected failures: `4`
- Unexpected failures: `0`

The four failures proved the same root cause across:

1. the original `countryCode: undefined` case;
2. the dedicated missing-country matrix;
3. the missing-seal matrix;
4. forbidden-field precedence combined with a missing known value.

Unknown-field precedence and unsafe-structure/prototype-pollution precedence already passed in RED, proving that the correction did not require weakening structural security or unknown-field rejection.

## Correction architecture

Two-pass deterministic validation is mandatory:

1. **Structural Security Inspection**
   - Reject cycles, prototype pollution, non-plain objects, functions, symbols, bigint, non-finite numbers, excessive depth, and excessive entry counts.
   - Treat `undefined` as an intermediate field value, not as a complete structural verdict.

2. **Domain Error Classification**
   - Forbidden client-controlled fields outrank field-domain errors.
   - Unknown fields produce `MEDIA_CONTRACT_INVALID`.
   - Missing known required fields use stable field-specific codes.
   - Invalid present values use stable domain codes.
   - Lifecycle and timestamp validation follows identity and media-domain validation.

The production change was intentionally minimal: only `assertSafeStructure()` changed its treatment of `undefined`. No security gate, contract code, field allowlist, media limit, lifecycle rule, or persistence boundary was relaxed.

## Mandatory error precedence

1. Unsafe structure / prototype pollution → `MEDIA_CONTRACT_INVALID`
2. Forbidden client field → `MEDIA_CLIENT_FIELDS_DENIED`
3. Unknown field → `MEDIA_CONTRACT_INVALID`
4. Missing country → `MEDIA_COUNTRY_REQUIRED`
5. Invalid country → `MEDIA_COUNTRY_INVALID`
6. Missing or malformed seal → `MEDIA_SEAL_REQUIRED`
7. Remaining identity, media, lifecycle, and timestamp denials in canonical order

## Final GREEN evidence

### Fully verified PR head

- Verified head SHA: `250e0b2ca329a9b78c5231474bb57c51a18731ad`
- VVIP Quality Gate run: `31093982795`
- Quality Gate job: `92591428640`
- Project Control Integrity run: `31093983148`
- Dependency Review run: `31093983057`
- CodeQL run: `31093983236`
- Quality Gate execution start: `2026-08-06T10:37:38.282Z`
- Quality Gate completion: `2026-08-06T10:37:47.795Z`

### Runner and toolchain

- GitHub Actions runner: `2.336.0`
- Runner image: `ubuntu-24.04` / `20260720.247.2`
- Operating system: Ubuntu `24.04.4 LTS`
- Git: `2.54.0`
- Node: `22.23.1`
- npm: `10.9.8`
- Python: `3.12.13`
- pytest: `9.1.1`

### Required gates

- VVIP Quality Gate: `PASS`
- Project Control Integrity: `PASS`
- Dependency Review: `PASS`
- CodeQL: `PASS`
- Node CJS: `230/230 PASS`
- Validation-precedence matrix: `5/5 PASS`
- PR35/PR36 focused suite: `110/110 PASS`
- Listing Contract: `13/13 PASS`
- Authorization integrity: `96/96 PASS`
- Project-control tests: `7/7 PASS`
- Python tests: `27 passed + 4 subtests`
- Cleanroom tests: `17 passed + 4 subtests`
- Secret findings: `0`
- Dangerous SQL: `CRITICAL 0 / HIGH 0`
- QA smoke: `PASS`
- Isolated worktree: `CLEAN`
- Official workspace: `UNCHANGED`
- Temporary workspace removed: `YES`

### Security invariants retained

- Seven-image limit remains exact and non-price-dependent.
- Video remains disabled.
- No implicit/default country was introduced.
- Client-controlled bucket, path, URL, object, residency, authority, token, session, envelope, secret, and EXIF fields remain denied.
- Prototype pollution, cycles, unsafe objects, unbounded structures, non-finite numbers, functions, symbols, and bigint remain fail-closed.
- No migration, remote Supabase write, production connection, or `main` modification occurred.

## Release Decision Assurance Protocol

### State machine

`DIAGNOSING → RED_CONFIRMED → FIX_IN_PROGRESS → GREEN_CANDIDATE → SHA_LOCKED → REVIEW_ELIGIBLE → MERGE_ELIGIBLE → RELEASE_ELIGIBLE`

No state may be skipped. A successful workflow on another SHA is not evidence for the candidate under decision.

### Result classifications

- `PASS`: all required gates pass on one locked SHA. This permits controlled progression toward review; it does not authorize merge or production release.
- `KNOWN_ACCEPTABLE_DEVIATION`: prohibited for authentication, authorization, privacy, media integrity, storage isolation, RLS, secrets, SQL safety, and fail-closed behavior. A non-security deviation requires an expiring signed waiver, compensating control, named owner, linked issue, rollback, and remediation deadline.
- `FAILURE_OR_SECURITY_DRIFT`: merge and release remain blocked; reproducible RED evidence and a technical correction are mandatory.
- `TIMEOUT_OR_INCONCLUSIVE`: never success. Rerun once on the identical SHA, then investigate infrastructure without altering product gates.

### Exception governance

Permanent exceptions are prohibited. Security and media-integrity invariants in this PR are non-waivable.

### Merge and release separation

Merge eligibility requires:

- SHA-locked green evidence;
- dependency-chain readiness;
- resolved review threads;
- required independent approval;
- exact-head merge protection.

Release eligibility additionally requires:

- production configuration review;
- artifact provenance and signed release evidence;
- rollback rehearsal;
- canary and abort criteria;
- observability and incident ownership;
- confirmation that no remote-database ambiguity exists.

## Rollback

The behavior correction is fully reversible by reverting `fbcbd69dc8735724251aabf10cdb99a5a4b22a40` or closing PR #128. No database, storage, production, or user-data rollback is required because this slice has no remote side effects.

## Non-blocking CI maintenance observation

The runner reported that `actions/setup-node@v4` and `actions/setup-python@v5` still target deprecated Node.js 20 internally and were forced by GitHub to Node.js 24. This did not affect the result and is outside PR #128. It must be handled in a separate CI-maintenance PR so that media-contract scope and rollback remain surgical.

## Final decision

`PASS — SHA_LOCKED`

PR #128 is technically green on the full attested head `250e0b2ca329a9b78c5231474bb57c51a18731ad`. It remains a draft stacked PR and is not yet merge-eligible or release-eligible. PR #129 is a verification-only lab and must be closed without merge.
