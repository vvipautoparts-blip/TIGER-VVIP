# Market Genesis Contact/Handoff Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded, privacy-preserving Market Genesis contact authorization and handoff boundary that reuses the platform's existing one-to-one communication model and terminates TIGER's market role before any transaction state.

**Architecture:** Implement one CommonJS authority module under `scripts/marketplace/` and one focused Node test file. The module never creates a messaging backend, conversation store, checkout, payment, order, settlement, or deal state; it only authorizes an opaque one-to-one contact capability, rechecks current Ad Genome/Sector Physics policy, and emits a single-use handoff receipt.

**Tech Stack:** Node.js CommonJS, `node:test`, existing Market Genesis contract primitives.

**Spec:** `docs/superpowers/specs/2026-08-23-tiger-private-market-genesis-design.md`

## Global Constraints

- `DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.`
- Automotive remains parts-only; whole-vehicle subjects must fail closed again at pre-contact authorization.
- Existing private communication is one-to-one only; no groups, rooms, group chat, or broadcast.
- Raw private intent, direct PII/contact values, message bodies, and reusable secrets must never be emitted by this boundary.
- Sponsored status never grants contact eligibility.
- No `main`, Production, database, payment, deployment, or infrastructure mutation in this plan.

---

### Task 1: Contact authorization contract

**Files:**
- Create: `tests/private-market-contact-handoff.test.cjs`
- Create: `scripts/marketplace/contact-handoff.js`

**Interfaces:**
- Consumes: `CONTACT_STATES`, `FORBIDDEN_TRANSACTION_FIELDS`, `validateAdGenome` from `scripts/marketplace/private-market-contracts.js`.
- Produces: `createContactHandoffConvergence(options)` with `authorizeContact(input)` and `emitHandoff(input)` methods.

- [ ] **Step 1: Write the failing test**

Cover: server actor binding, one-to-one channel intersection, reveal-policy authorization, blocked contact, stale/cross-country policy rejection, Ad Genome expiry, Sector Physics entity allowlist, automotive whole-vehicle rejection, sponsored non-override, direct PII/raw-intent rejection, bounded TTL, nonce replay defense, and immutable capability output.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/private-market-contact-handoff.test.cjs`
Expected: FAIL because `scripts/marketplace/contact-handoff.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement a fail-closed convergence authority. `authorizeContact` must validate the server-derived actor/country/policy authority, validate the Ad Genome at the authorization timestamp, require the requested channel to be allowed by both genome and resolved Sector Physics, enforce reveal-policy approval when `CONTACT_REQUIRES_REVEAL`, reject forbidden/private payload fields recursively, reject disallowed entity types including whole vehicles, consume a nonce once, and return only opaque references plus a bounded expiry. The capability must be frozen.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/private-market-contact-handoff.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(market): authorize bounded private contact handoff`

---

### Task 2: Terminal handoff receipt

**Files:**
- Modify: `tests/private-market-contact-handoff.test.cjs`
- Modify: `scripts/marketplace/contact-handoff.js`

**Interfaces:**
- Consumes: capability returned by `authorizeContact`.
- Produces: a single-use immutable receipt with `HANDOFF_EMITTED` and terminal `TIGER_MARKET_ROLE_ENDED` state.

- [ ] **Step 1: Write the failing test**

Cover: capability ownership/binding, capability expiry, single-use capability replay denial, one-to-one participant preservation, no message body/PII/raw intent, and no transaction/order/payment fields in the receipt.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/private-market-contact-handoff.test.cjs`
Expected: FAIL until handoff emission is implemented.

- [ ] **Step 3: Write minimal implementation**

`emitHandoff` must consume one valid unexpired capability exactly once and return an immutable receipt containing opaque IDs, actor/owner subject refs, allowed channel, policy/version references, timestamps, and terminal market-role state only. It must not accept or emit negotiation, message content, transaction, payment, delivery, settlement, escrow, ownership-transfer, or deal-state fields.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/private-market-contact-handoff.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(market): terminate role at handoff receipt`

---

### Task 3: Exact-head verification

**Files:**
- No runtime file changes required unless verification exposes a defect.

**Interfaces:**
- Consumes: exact branch HEAD containing Tasks 1-2.
- Produces: auditable GREEN evidence for the exact commit.

- [ ] **Step 1: Run focused Market Genesis tests**

Run: `node --test tests/private-market-*.test.cjs`
Expected: PASS.

- [ ] **Step 2: Run repository Quality Gate**

Run the existing VVIP Quality Gate for the exact commit.
Expected: PASS.

- [ ] **Step 3: Verify PR isolation**

Confirm PR #323 still targets `feat/tiger-one-living-surface-impl-20260818`, remains unmerged, and no `main`/Production mutation occurred.

- [ ] **Step 4: Record exact-head evidence**

Report the exact commit SHA and workflow conclusions; do not claim M4 complete if any required check is not GREEN.
