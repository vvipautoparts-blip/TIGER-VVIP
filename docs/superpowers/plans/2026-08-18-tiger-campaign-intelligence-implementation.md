# TIGER Campaign Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the owner-approved TIGER Campaign Intelligence model the single current advertising campaign UX/runtime authority while preserving TigerPay fail-closed financial boundaries.

**Architecture:** Add one browser-safe campaign presentation/state module that consumes trusted server quote/payment facts and never computes authoritative advertising economics or activation client-side. Wire it only into owned ACTIVE listings through the existing My Listings surface, keep payment/provider execution server-authoritative, and bind the behavior to one owner reference plus one machine-readable contract.

**Tech Stack:** Static HTML/CSS/JavaScript, Node `node:test`, existing Clerk/Supabase runtime bridge, TigerPay server/provider boundary.

**Spec:** `docs/owner-control/TIGER_CAMPAIGN_INTELLIGENCE_2026_CURRENT_OWNER_AUTHORITY.md`

## Global Constraints

- One current advertising product: verified distribution credits / qualified verified impressions.
- Ordinary compliant publication is not a paid subscription gate.
- No fixed global price, fixed global duration, paid visual privilege, hidden rank purchase, or guaranteed human-view claim.
- User surface is simple; DIDE/eCPM/margin/op-cost/internal risk math is never exposed.
- A browser payment success screen is never financial or activation authority.
- Campaign activation requires trusted server payment confirmation plus ledger posting plus campaign activation state.
- Country payment methods are shown only when active and verified for that country/session.
- Missing quote, payment transport, country activation, delivery economics, or capacity fails closed.
- No general-purpose stored-value user money wallet is introduced.

---

### Task 1: Lock the public campaign contract with RED tests

**Files:**
- Create: `tests/tiger-campaign-intelligence.test.cjs`

**Interfaces:**
- Consumes: future `scripts/advertising/vvip-tiger-campaign-intelligence.js`
- Produces: executable contract for quote projection, safe activation state, and internal-field suppression.

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `node --test tests/tiger-campaign-intelligence.test.cjs` and confirm RED because the module does not exist**
- [ ] **Step 3: Commit the RED contract**

### Task 2: Implement the deterministic campaign presentation kernel

**Files:**
- Create: `scripts/advertising/vvip-tiger-campaign-intelligence.js`

**Interfaces:**
- Produces: `normalizeCampaignQuote`, `campaignSuccessAllowed`, `publicCampaignStatus`, `GOALS`, `STRATEGIES`.

- [ ] **Step 1: Implement only the behavior required by the RED tests**
- [ ] **Step 2: Run the focused test and confirm GREEN**
- [ ] **Step 3: Commit the kernel**

### Task 3: Add the low-clutter campaign drawer

**Files:**
- Create: `styles/vvip-tiger-campaign-intelligence.css`
- Modify: `index.html`
- Modify: `scripts/runtime/vvip-my-listings.js`

**Interfaces:**
- Consumes: trusted `window.VVIP_CAMPAIGN_TRANSPORT` if present.
- Produces: one `روّج إعلانك` action on owned ACTIVE listings and one four-stage drawer: goal -> budget/quote -> review/payment -> verified result.

- [ ] **Step 1: Add DOM contract tests for one campaign trigger and required script/style loading**
- [ ] **Step 2: Confirm RED**
- [ ] **Step 3: Wire the campaign trigger only for ACTIVE owned listings**
- [ ] **Step 4: Render the drawer with progressive disclosure and fail-closed unavailable state**
- [ ] **Step 5: Confirm focused tests GREEN**

### Task 4: Bind owner and machine authority

**Files:**
- Create: `docs/owner-control/TIGER_CAMPAIGN_INTELLIGENCE_2026_CURRENT_OWNER_AUTHORITY.md`
- Create: `project-control/advertising/campaign-intelligence-current-authority.v1.json`

**Interfaces:**
- Supersedes conflicting fixed-tier/fixed-duration/publishing-subscription/paid-visual-priority campaign authority.
- Preserves historical evidence only as non-operative provenance.

- [ ] **Step 1: Add the owner reference with CURRENT_ONLY supersession language**
- [ ] **Step 2: Add the machine-readable contract with fail-closed defaults**
- [ ] **Step 3: Add regression assertions that legacy concepts cannot re-enter the public campaign module**

### Task 5: Verify and checkpoint

**Files:**
- Update tests/documentation only as required by exact failures.

- [ ] **Step 1: Run focused campaign tests**
- [ ] **Step 2: Run `./scripts/qa-smoke.sh`**
- [ ] **Step 3: Run `bash scripts/quality-gate.sh`**
- [ ] **Step 4: Record exact-head CI evidence in the PR**
- [ ] **Step 5: Do not claim Production real-money activation until country/provider/financial gates are separately proven**
