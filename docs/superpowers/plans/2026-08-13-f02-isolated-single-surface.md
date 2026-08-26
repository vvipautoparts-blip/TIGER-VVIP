# F02 Isolated Single Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans with TDD and verification. Protected entrypoint/auth integration is a separate closure step and must not be bypassed.

**Goal:** Produce and verify the VVIP TIGER FUSION 2026 Single Surface presentation independently from protected entrypoint code, preserving the final interaction grammar while the protected route integration remains gated.

**Architecture:** F02 owns presentation only. `fusion-home-f02.html` is an isolated implementation surface using `styles/fusion/f02-single-surface.css` and `scripts/fusion/f02-feed.js`. It contains no authentication implementation and no privileged capability logic. Local preview data is synthetic and visibly labeled. F03 supplies server-confirmed capability data; F04 supplies launch-grade search; F05 supplies media pipeline; protected entrypoint integration occurs only through an approved write path.

## Invariants
- No clutter: one central surface, progressive disclosure.
- Desktop content width <=720px family; mobile near-full width.
- TIGER semantic tokens, no `--fb-blue` in F02 CSS.
- Familiar social feed grammar without copying external brand assets.
- Primary card actions exactly Save / Contact / Share.
- `⋮` exists as the future capability gateway; F02 does not decide privileged authority.
- No fixed three-sector UI.
- No fake-live Production listings.
- Preview data is localhost-only and `syntheticDemo=true`.
- Do not alter or weaken protected login/authentication code in F02.

## Tasks
1. Verify isolated HTML/CSS/feed assets exist and no legacy marketplace controller is loaded by the isolated surface.
2. Verify dynamic filters, search, composer prompt, post header, detail sheet, and three primary actions.
3. Verify reduced-motion and data-saver hooks.
4. Verify synthetic preview labeling and no real contact data.
5. Record protected integration blocker in `docs/fusion/F02_SINGLE_SURFACE_STATUS.md`.
6. Keep F02 Draft until exact-head verification available; do not merge/deploy.
