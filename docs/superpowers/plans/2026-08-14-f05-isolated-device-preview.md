# F05 Isolated Device Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one HTTPS preview URL pinned to PR #239 exact head for real-device F05 HEIC/HEIF verification without touching Production.

**Architecture:** A dedicated temporary Replit web app mirrors the exact PR head and serves the existing static application and pinned Worker/WASM assets. The preview server adds only the required browser-isolation/static-asset headers and does not provide media upload or conversion APIs.

**Tech Stack:** Existing TIGER VVIP static web surface, ES module Web Worker, Emscripten/libheif WASM, HTTPS static preview host on Replit, GitHub exact-head evidence.

## Global Constraints

- Do not deploy or mutate `main`, GitHub Pages Production, `tigerautoparts.shop`, or `www.tigerautoparts.shop`.
- Keep PR #239 Draft and unmerged while collecting device evidence.
- Original HEIC/HEIF stays on-device; no server conversion and no hidden fallback.
- Preview source must be pinned to the exact PR head SHA used for evidence.
- Require HTTPS, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, and WebAssembly MIME support.
- Preview must not receive Production secrets or Production deployment authority.

---

### Task 1: Pin exact source and create isolated preview app

**Files:**
- Reference: `docs/superpowers/specs/2026-08-14-f05-isolated-device-preview-design.md`
- Reference: `workers/media/f05-heif-worker.js`
- Reference: `workers/media/f05-heif-decoder.v1.js`
- Reference: pinned F05 WASM asset under `workers/media/`

**Interfaces:**
- Consumes: PR #239 head SHA from GitHub.
- Produces: one dedicated Replit app ID and preview URL tied to that SHA.

- [ ] **Step 1: Read PR #239 and record the exact current head SHA.**

Run: GitHub `get_pr_info` for `vvipautoparts-blip/TIGER-VVIP#239`.

Expected: PR is open, Draft, unmerged; capture `head_sha`.

- [ ] **Step 2: Create a dedicated Replit web preview.**

Create a Replit web app whose sole job is to mirror the exact repository/branch/SHA and serve the existing application over HTTPS. Instruct the Replit Agent not to redesign application code and not to add upload/conversion APIs.

Expected: Replit returns a real app ID and preview/app URL; do not invent a URL.

- [ ] **Step 3: Verify preview source identity.**

Ask the Replit Agent to report the repository, branch, and SHA it is serving.

Expected: all three match PR #239 exact head. If SHA differs, stop and resync before device testing.

### Task 2: Enforce browser-isolation/static delivery requirements

**Files:**
- Existing Worker/WASM assets only; no Production deployment files are changed.

**Interfaces:**
- Consumes: preview app from Task 1.
- Produces: HTTPS origin suitable for Worker/WASM device testing.

- [ ] **Step 1: Configure static responses for isolation.**

Require the preview to serve application responses with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, and `.wasm` with `application/wasm`.

- [ ] **Step 2: Confirm no media server path exists.**

Ask the Replit Agent to verify that the preview has no API route for HEIC/HEIF upload, conversion, persistence, or fallback and that its server is static-delivery only.

Expected: explicit confirmation of no original-media server path.

- [ ] **Step 3: Smoke-test application asset loading.**

Expected: page loads over HTTPS, Worker script loads, WASM loads, and no missing-path errors are reported by the preview runtime.

### Task 3: Freeze preview evidence before phone testing

**Files:**
- Modify after evidence: `docs/release/F05-HEIC-DEVICE-EVIDENCE.md`

**Interfaces:**
- Consumes: exact SHA and preview URL.
- Produces: reproducible test identity.

- [ ] **Step 1: Record preview identity.**

Record exact SHA, branch, preview URL, provider (`Replit temporary preview only`), and current timestamp in the F05 evidence ledger.

- [ ] **Step 2: Re-run exact-head GitHub gates if repository head moved during preview setup.**

Run: GitHub `fetch_commit_workflow_runs` for the new exact SHA.

Expected: Quality, V14, CodeQL, Dependency Review, CleanGuard, Project Control, LC03, and F05 HEIF WASM Build complete successfully before device evidence is accepted.

### Task 4: Real-device F05 HEIC verification

**Files:**
- Modify after evidence: `docs/release/F05-HEIC-DEVICE-EVIDENCE.md`

**Interfaces:**
- Consumes: pinned HTTPS preview URL.
- Produces: physical-device PASS/FAIL evidence and any reproducible defect.

- [ ] **Step 1: iPhone Safari.**

Open the preview in Safari, select one non-sensitive original `.HEIC`/`.HEIF`, and run the normal listing/media path.

Expected: local Worker/WASM processing succeeds or returns a bounded F05 error; the original is not sent to a server conversion path.

- [ ] **Step 2: Android Chrome.**

Open the same exact-SHA preview in Chrome and exercise HEIC/HEIF input when the device/browser exposes that format.

Expected: same fail-closed/local-processing guarantees.

- [ ] **Step 3: Verify visible correctness.**

Check orientation, crop geometry, dimensions, and resulting JPEG/WebP display against the selected source.

- [ ] **Step 4: Record result, browser/device version, and exact SHA.**

Any failure becomes a new TDD regression test before production code is changed.

### Task 5: Privacy and release closure

**Files:**
- Modify: `docs/release/F05-HEIC-DEVICE-EVIDENCE.md`
- Modify if appropriate: PR #239 body to remove stale blocker text only after proof exists.

**Interfaces:**
- Consumes: device evidence and exact-head CI.
- Produces: truthful F05 launch-readiness status.

- [ ] **Step 1: Inspect final derivative metadata/privacy evidence.**

Expected: no source EXIF/GPS/XMP survives in the sanitized output; original HEIC/HEIF is not observed on a server path.

- [ ] **Step 2: Run exact-head gates after any device-driven code fix.**

Expected: all required gates PASS on the exact evidence SHA.

- [ ] **Step 3: Close only claims actually proven.**

Keep legal/HEVC launch-scope review explicitly open unless separately completed. Do not mark global launch ready while any mandatory release gate remains open.

- [ ] **Step 4: Final engineering declaration.**

Only when device evidence, privacy evidence, legal/HEVC review, and exact-head release gates are complete may the owner-facing status use: `جاهز للانطلاق العالمي`.
