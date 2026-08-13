# F05A Hybrid Media Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Preserve PR36 media safety while adding a fail-closed HEIC/HEIF intake route to private server quarantine.

**Architecture:** JPEG/PNG/WebP remain on the existing PR36 local validation/processing route. HEIC/HEIF files are never decoded or trusted client-side in F05A; they are accepted only for bounded intake metadata and routed to a private quarantine server path that must perform the full secure processing pipeline before any derivative can be committed.

**Tech Stack:** Node.js 22, CommonJS, `node:test`.

## Global Constraints
- Preserve PR36 limits exactly: 7 photos, 15 MiB per file, 60 MiB per selection.
- Preserve JPEG/PNG/WebP as PR36 local media types.
- HEIC/HEIF uses server quarantine and remains untrusted until server validation.
- Original media is never directly public.
- No extension-based trust.
- No HEIC codec implementation, malware engine, storage write, Production deploy, or CDN publication in F05A.

### Task 1: Hybrid routing and bounded selection
**Files:** Test `tests/f05a-hybrid-media-intake.test.cjs`; create `scripts/media/f05a-hybrid-intake.js`.
- [ ] Write failing tests for exact PR36 limits, accepted MIME routes, unsupported MIME denial, 7/15MiB/60MiB enforcement, and non-public originals.
- [ ] Verify RED because the module does not exist.
- [ ] Implement the minimal pure routing/selection contract.
- [ ] Verify GREEN.

### Task 2: HEIC private quarantine request
**Files:** Same test/module.
- [ ] Add failing tests requiring the exact secure processing stage sequence and `PENDING_SERVER_VALIDATION` state.
- [ ] Verify RED.
- [ ] Implement metadata-only quarantine request construction for HEIC/HEIF routes.
- [ ] Verify GREEN.

## Verification
Run `node --test tests/f05a-hybrid-media-intake.test.cjs` and require zero failures. Passing F05A proves only intake/routing policy, not server-side HEIC decode or media publication.