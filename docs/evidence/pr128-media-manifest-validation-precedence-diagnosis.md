# PR #128 — Media Manifest Validation Precedence Decision Record

> **Evidence model:** This tracked record documents the diagnosis, RED→GREEN correction, controls, and release-governance policy. The exact final SHA lock and workflow identities are maintained in PR #128 metadata after verification so that this file does not create a self-referential attestation loop.

## Control record

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Delivery PR: `#128`
- Temporary CI PR: `#129` — verification only; never merge
- Original failing candidate: `cd2a93d84bf40e6e0f88d9057274a74a526d2ac3`
- RED matrix commit: `e582727bf712f383c2f8f17af7c5dfeeb1632dab`
- Corrected code commit: `fbcbd69dc8735724251aabf10cdb99a5a4b22a40`
- Decision: `PASS`
- Reason: `VALIDATION_PRECEDENCE_DRIFT_CORRECTED_AND_REGRESSION_LOCKED`
- Protocol state: `SHA_LOCKED`
- Merge eligibility: `BLOCKED_PENDING_STACK_DEPENDENCY_AND_REQUIRED_REVIEW`
- Release eligibility: `BLOCKED_PENDING_PRODUCTION_RELEASE_ASSURANCE`

## Original failure

The initial manifest implementation passed 224 of 225 Node CJS tests. The single failure occurred when `countryCode` was present with an `undefined` value.

- Expected: `MEDIA_COUNTRY_REQUIRED`
- Actual: `MEDIA_CONTRACT_INVALID`

The cause was deterministic validation-precedence drift. Structural validation treated `undefined` as a complete generic structural failure before the domain validator could emit its stable required-field denial.

## RED confirmation

A dedicated validation-precedence matrix was committed before the production correction. The RED execution produced 226/230 PASS with four expected failures and no unexpected failures.

The failing cases covered the original missing-country scenario, the country missing-value matrix, the country-seal missing-value matrix, and forbidden-field precedence combined with a missing known value.

Unknown-field precedence and unsafe-structure/prototype-pollution precedence already passed during RED, proving that the correction did not require weakening structural protections.

## Correction architecture

The approved model is two-pass deterministic validation:

1. **Structural Security Inspection**
   - Reject cycles, prototype pollution, non-plain objects, functions, symbols, bigint, non-finite numbers, excessive depth, and excessive entry counts.
   - Treat `undefined` only as an intermediate field value.

2. **Domain Error Classification**
   - Forbidden client-controlled fields have highest domain precedence.
   - Unknown fields remain contract errors.
   - Missing known required fields receive stable field-specific codes.
   - Invalid present values receive stable domain codes.
   - Lifecycle and timestamp validation follow identity and media-domain validation.

The production correction changed only the treatment of `undefined` inside `assertSafeStructure()`. No gate, allowlist, media limit, lifecycle invariant, storage boundary, or denial code was weakened.

## Mandatory error precedence

1. Unsafe structure or prototype pollution → `MEDIA_CONTRACT_INVALID`
2. Forbidden client field → `MEDIA_CLIENT_FIELDS_DENIED`
3. Unknown field → `MEDIA_CONTRACT_INVALID`
4. Missing country → `MEDIA_COUNTRY_REQUIRED`
5. Invalid country → `MEDIA_COUNTRY_INVALID`
6. Missing or malformed country seal → `MEDIA_SEAL_REQUIRED`
7. Remaining identity, media, lifecycle, and timestamp denials in canonical order

## Security invariants

- The image limit remains exactly seven and is never price-dependent.
- Video remains disabled.
- No implicit/default country is permitted.
- Client-controlled bucket, path, URL, object, residency, authority, token, session, envelope, secret, and EXIF fields remain denied.
- Prototype pollution, cycles, unsafe objects, unbounded structures, non-finite numbers, functions, symbols, and bigint remain fail-closed.
- No migration, remote Supabase write, production connection, or direct `main` modification is authorized by this slice.

## Release Decision Assurance Protocol

`DIAGNOSING → RED_CONFIRMED → FIX_IN_PROGRESS → GREEN_CANDIDATE → SHA_LOCKED → REVIEW_ELIGIBLE → MERGE_ELIGIBLE → RELEASE_ELIGIBLE`

No state may be skipped. A successful workflow on another SHA is not evidence for the candidate under decision.

- `PASS`: all mandatory gates pass on one locked SHA. This allows progression toward review; it does not authorize merge or production release.
- `KNOWN_ACCEPTABLE_DEVIATION`: prohibited for authentication, authorization, privacy, media integrity, storage isolation, RLS, secrets, SQL safety, and fail-closed behavior. Any non-security deviation requires an expiring signed waiver, named risk owner, compensating control, linked issue, rollback method, and remediation deadline.
- `FAILURE_OR_SECURITY_DRIFT`: merge and release remain blocked; reproducible RED evidence and a technical correction are mandatory.
- `TIMEOUT_OR_INCONCLUSIVE`: never success. Rerun once on the identical SHA, then investigate infrastructure without altering product gates.

Permanent exceptions are prohibited. Media-integrity and security invariants are non-waivable.

## Merge and release separation

Merge eligibility requires SHA-locked evidence, dependency-chain readiness, resolved review threads, independent approval, and exact-head merge protection.

Release eligibility additionally requires production-configuration review, artifact provenance, signed release evidence, rollback rehearsal, canary and abort criteria, observability, incident ownership, and confirmation that no remote-database ambiguity exists.

## Rollback

The behavior correction is reversible by reverting `fbcbd69dc8735724251aabf10cdb99a5a4b22a40` or closing PR #128. No database, storage, production, or user-data rollback is required because this slice has no remote side effects.

## Separate CI-maintenance observation

The runner reports that older setup actions internally target deprecated Node.js 20 and are forced to Node.js 24. This is non-blocking for PR #128 and must be corrected in a separate CI-maintenance PR to preserve surgical scope and rollback.
