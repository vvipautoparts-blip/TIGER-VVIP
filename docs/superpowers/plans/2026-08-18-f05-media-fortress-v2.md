# F05 TIGER Media Fortress V2 Implementation Plan

**Goal:** Implement the source-level trusted JPEG/WebP fortress behind the existing F05 `imageEngine.inspect/rewrite` ports without changing Clerk, listing ownership, AWS deployment, Supabase Production, or the no-HEIC server boundary.

**Architecture:** Add one CommonJS engine module with bounded JPEG/WebP structural parsing, checked geometry policy, injected isolated-codec worker orchestration, family-preserving canonical profiles, blind second-pass verification, and dual SHA-256 attestation. No native codec dependency is added in this PR; the deployment worker/backend remains an injected runtime responsibility and must later provide real isolation/termination.

**Files:**
- Design: `docs/superpowers/specs/2026-08-18-f05-media-fortress-v2-design.md`
- Plan: `docs/superpowers/plans/2026-08-18-f05-media-fortress-v2.md`
- Test: `tests/f05-media-fortress-v2.test.cjs`
- Implementation: `scripts/media/server/aws/f05-media-fortress-v2.js`

## Global constraints

- Preserve the existing F05 ports: `inspect(bytes, policy)` and `rewrite(bytes, policy)`.
- Accept server-side candidate bytes only when structurally JPEG or still WebP.
- Never select format from filename, extension, MIME, or request headers.
- Candidate bytes must be `Uint8Array` and `<= 15 MiB`.
- Geometry must satisfy `width <= 1600`, `height <= 1200`, `width * height <= 1,920,000`, and exact `4:3` (`width * 3 === height * 4`) using checked integer arithmetic.
- No server-side HEIC/HEIF decoder/converter/fallback.
- No repair/crop/pad/stretch of malformed or wrong-geometry input.
- Canonical rewrite preserves verified family: JPEG -> `Canonical JPEG V1`; WebP -> `Canonical WebP V1`.
- JPEG V1: quality 88, chroma 4:2:0, progressive false, metadata false, sRGB.
- WebP V1: lossy quality 86, alpha quality 100, animation false, metadata false, sRGB.
- Blind second pass is mandatory before trusted output.
- `objectSha256` hashes final encoded bytes; `pixelSha256` hashes a versioned normalized raster representation.
- `pHash/dHash` are not acceptance criteria.
- No `process.env`, credentials, network, filesystem, shell, deploy workflow, IAM, DNS, Amplify, Clerk Dashboard, or Supabase Production changes.
- A JavaScript timeout must never be described as native-process termination. This source module passes a timeout budget to the injected worker; hard worker kill/replacement is a deployment-runtime responsibility.

---

## Task 1 — Prove RED before implementation

- [ ] Create `tests/f05-media-fortress-v2.test.cjs` requiring the intentionally absent implementation.
- [ ] Cover constructor contract and at least one valid-path contract so the test is meaningful once implementation exists.
- [ ] Commit the test without creating the implementation module.
- [ ] Verify the focused/repository test fails for the intended `MODULE_NOT_FOUND` reason.
- [ ] Verify CleanGuard, Zero-Residue, and Project Control are not failing for unrelated reasons before proceeding.

## Task 2 — Implement bounded structural preflight

- [ ] Add `scripts/media/server/aws/f05-media-fortress-v2.js` as CommonJS.
- [ ] Validate injected worker (`backend`, `version`, `decode`, `encode`) and freeze the returned engine.
- [ ] Reject non-`Uint8Array`, empty, and >15 MiB candidates before parsing.
- [ ] JPEG parser: SOI, bounded marker lengths, valid SOF geometry, scan handling for byte stuffing/restart markers, expected EOI, no trailing bytes, metadata observation, malformed/truncated rejection.
- [ ] WebP parser: `RIFF`, exact RIFF-size relation, `WEBP`, bounded/padded chunks, exactly one unambiguous image payload, VP8/VP8L/VP8X geometry extraction, reject `ANIM`/`ANMF` and animation flag, detect metadata chunks, no trailing bytes.
- [ ] Reject HEIC/HEIF/unknown bytes without worker invocation.
- [ ] Enforce checked geometry and exact 4:3 before expensive worker work whenever dimensions are structurally available.

## Task 3 — Implement codec-worker orchestration and canonical profiles

- [ ] `inspect()` performs structural preflight then exactly one worker decode with `{ format, timeoutMs }`.
- [ ] Validate worker response shape, raster length, integer geometry, color state, still-image state, and parser/decoder agreement.
- [ ] Fail closed on worker throw, malformed result, disagreement, timeout-status result, or unsupported color normalization facts.
- [ ] `rewrite()` starts from untrusted bytes again, decodes, validates, and submits a metadata-free canonical raster to worker `encode()`.
- [ ] Select output family only from verified input bytes.
- [ ] Pass frozen explicit JPEG V1 / WebP V1 profile objects; no caller override of security-critical options.
- [ ] Require worker to return fresh `Uint8Array` encoded bytes and reject aliases/malformed outputs.

## Task 4 — Blind second pass and cryptographic attestation

- [ ] Re-run structural preflight on encoded output from scratch.
- [ ] Re-decode encoded output independently via the worker; do not reuse first-pass trust flags.
- [ ] Prove second-pass format, width, height, still-image state, no forbidden metadata, exact 4:3, limits, and canonical sRGB facts.
- [ ] Reject any second-pass mismatch or failure and return no trusted output.
- [ ] Compute `objectSha256` over final encoded bytes using Node `crypto`.
- [ ] Compute `pixelSha256` over a versioned deterministic raster framing (schema marker + width/height + canonical RGBA bytes), not ambiguous concatenation.
- [ ] Return frozen attestation facts with schema/profile/backend/version/geometry/MIME/policy version and both hashes.

## Task 5 — Adversarial and regression coverage

- [ ] Valid JPEG V1 path.
- [ ] Valid still WebP V1 path.
- [ ] forged MIME is irrelevant; bytes decide family.
- [ ] malformed JPEG segment length / truncation.
- [ ] JPEG trailing polyglot bytes.
- [ ] malformed/truncated RIFF and declared-size mismatch.
- [ ] animated WebP (`ANIM`, `ANMF`, or VP8X animation flag).
- [ ] parser/decoder disagreement.
- [ ] width/height/pixel overflow and non-4:3.
- [ ] metadata-bearing input can only become trusted after rewrite; canonical output with forbidden metadata is rejected on second pass.
- [ ] non-sRGB or unverifiable color state fails closed.
- [ ] worker throw/protocol failure/timeout-status failure.
- [ ] rewrite failure and second-pass failure return no trusted output.
- [ ] object and pixel hashes are stable for identical canonical output/raster.
- [ ] no executable HEIC/HEIF decode path is exported or referenced.
- [ ] existing `tests/f05-aws-production-bindings.test.cjs`, ownership, and Clerk tests remain green.
- [ ] source assertions forbid env credential reads and filesystem/network/shell imports in the engine module.

## Task 6 — Exact-head quality verification and review

- [ ] Finish all source/docs changes before declaring a final SHA.
- [ ] Freeze the final SHA: no file edits after this point.
- [ ] Verify on exactly that SHA: VVIP Quality Gate, TIGER CleanGuard, Zero-Residue Full History, Project Control Integrity.
- [ ] Record final SHA/run evidence in PR #269 body only so evidence does not move the SHA.
- [ ] Mark PR #269 Ready for review only after 4/4 green.
- [ ] Request independent review from `nzuodezuode-byte`.
- [ ] Do not merge until approval exists, head is unchanged, and 4/4 remains green.
- [ ] Merge only into `feat/f05-aws-production-media-runtime-20260817` using `expected_head_sha`; never `main`.
- [ ] Verify parent PR #264 post-merge gates on the merge SHA.

## Explicit non-claims

Passing this child PR proves the source-level fortress contract and bounded parser/orchestration behavior. It does **not** prove native codec sandboxing, hard process termination, S3 quarantine/SQS topology, deployed request-envelope enforcement, durable AWS sinks, staging/production runtime, or live bypass evidence. Those remain Gate A follow-on blockers and must not be marked complete from source tests alone.
