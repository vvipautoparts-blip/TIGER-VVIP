# F02 FUSION Single Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans task-by-task with TDD. F02 does not change owner authority, money, DB, or Production deployment.

**Goal:** Replace the legacy home/marketplace presentation path with a clean FUSION Single Surface that uses Facebook-style interaction muscle memory, TIGER semantic design tokens, a compact commercial composer, dynamic sector filters, and a safe `⋮` permissions gateway shell.

**Architecture:** Keep the current auth gate untouched. `index.html` loads a new F02 scoped stylesheet and a new FUSION home/feed controller instead of the old hard-coded marketplace controller. Production has no hard-coded fake-live listing dataset; localhost preview may use clearly synthetic examples. F03 later injects server-confirmed SCG capabilities; F04 later replaces the temporary public-listings adapter with Search Fabric.

**Files**
- Create: `styles/fusion/f02-single-surface.css`
- Create: `scripts/fusion/f02-single-surface.js`
- Create: `tests/f02-single-surface-contract.test.cjs`
- Modify: `index.html`

## Constraints
- Do not restyle/rebuild the owner-approved login screen in F02.
- New FUSION CSS uses semantic tokens (`--brand-primary`, etc.), never `--fb-blue`.
- Mobile near-full-width feed; desktop feed max width in 680–720px family.
- Primary post actions: Save | Contact | Share only.
- Listing details open through media/title, not a fourth primary action.
- `⋮` shell exposes only safe ordinary-account entry `صلاحياتي`; privileged entries wait for F03 server confirmation.
- No fixed three-sector HTML; filters derive from current listing data.
- No hard-coded fake-live Production listings.
- Local preview data must be clearly synthetic/demo.
- Existing PR36/create-listing/resilience modules remain loaded as retained foundations/migration dependencies.

### Task 1 — RED static contract
Write tests that require the new CSS/JS, semantic tokens, 720px feed ceiling, composer prompt, `⋮` capability button, dynamic sector container, exactly three primary action labels, and absence of the old marketplace controller from `index.html`.

### Task 2 — Single Surface markup
Modify only the signed-in `app-shell`: compact sticky header, search strip, composer card, dynamic filters, central feed, bottom nav, capability sheet. Keep auth-gate markup unchanged.

### Task 3 — FUSION scoped CSS
Create semantic tokens scoped to `.app-shell`; implement central feed, Facebook-like card rhythm, 44px targets, reduced-motion support, weak-net class hooks, responsive mobile geometry, and capability sheet. Do not introduce a separate admin skin.

### Task 4 — FUSION controller
Implement auth view switching, localhost-only synthetic preview data, optional bounded public-listings adapter, dynamic sector filters, safe-text rendering, three-action cards, detail sheet, save state, contact/share placeholders, capability sheet toggle, search debounce, and fail-closed empty state.

### Task 5 — Verification
Run focused Node tests, then repository Quality Gate/CodeQL/CleanGuard when an exact-head validation path is available. No merge/deploy in F02.
