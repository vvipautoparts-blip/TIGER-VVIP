# AI-18 Owner Step-Up Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fail-closed, server-only owner step-up authorization layer for critical TIGER SOVEREIGN actions without embedding any static secret in prompts, source code, SQL, or logs.

**Architecture:** A provider-neutral trusted authenticator adapter produces a branded, in-process verification assertion only after backend verification. The assertion is transaction-bound and feeds a short-lived one-time authorization record. A separate SQL migration persists and atomically consumes the authorization using exact owner/action/release/payload/scope/environment binding. Existing Ed25519 owner receipts and L4 approval consumption remain independent downstream controls.

**Tech Stack:** Node.js `node:test`, Node `crypto`, PostgreSQL/Supabase migration SQL, existing TIGER SOVEREIGN proof and security modules, GitHub Actions Quality Gate/CodeQL/Dependency Review/Project Control.

## Global Constraints

- Never commit, log, hash-as-password, or compare a fixed owner passcode in code or SQL.
- Browser/client booleans cannot create trusted step-up authority.
- Sensitive actions fail closed without a fresh trusted step-up assertion.
- Exact transaction binding is mandatory: owner + action + release + payload + scope + environment.
- One-time consumption and expiry are mandatory.
- No Merge, DB Promotion, Production Activation, or production migration apply in this task.
- Existing owner Ed25519 receipts remain required for the three sovereign owner gates.

---

### Task 1: Write the AI-18 RED security contract

**Files:**
- Create: `tests/sovereign-owner-stepup-authorization.test.cjs`

**Interfaces:**
- Consumes: existing `sovereign-proof-system.js` Release DNA shape.
- Produces expected API for `scripts/ai/sovereign-owner-stepup-authorization.js`.

- [ ] **Step 1: Write failing tests** for trusted verifier branding, challenge binding, phishing-resistant method enforcement, forged JSON rejection, stale challenge rejection, mismatch rejection, one-time in-memory consumption semantics, and absence of raw secret fields.
- [ ] **Step 2: Push RED test commit.**
- [ ] **Step 3: Verify VVIP Quality Gate fails because the new implementation module is missing, while prior suites remain green.**

### Task 2: Implement server-only step-up policy core

**Files:**
- Create: `scripts/ai/sovereign-owner-stepup-authorization.js`

**Interfaces:**
- `createTrustedAuthenticatorVerifier(config)` -> branded verifier object.
- `createOwnerStepUpChallenge(input)` -> immutable transaction-bound challenge.
- `verifyOwnerStepUp(input)` -> immutable verified assertion, only from branded verifier.
- `consumeVerifiedStepUp(input)` -> one-time in-process consumption helper for tests/non-persistent boundaries.

- [ ] **Step 1: Implement exact-key validation and canonical hashing.**
- [ ] **Step 2: Enforce approved phishing-resistant methods and strict assurance.**
- [ ] **Step 3: Bind owner/action/release/payload/scope/environment/challenge/nonce/expiry.**
- [ ] **Step 4: Reject raw credentials and secrets from outputs.**
- [ ] **Step 5: Run Quality Gate and correct only root-cause failures.**

### Task 3: Add persistent one-time authorization migration

**Files:**
- Create: `supabase/migrations/20260807173000_tiger_sovereign_owner_stepup_authorization.sql`
- Create: `tests/ai18-owner-stepup-migration-security.test.cjs`

**Interfaces:**
- Table: `public.ai_owner_stepup_authorizations`.
- Function: `public.consume_ai_owner_stepup_authorization(uuid,text,text,text,text,text,text,timestamptz)`.

- [ ] **Step 1: Write RED SQL security tests before the migration.**
- [ ] **Step 2: Verify RED is caused by the missing migration.**
- [ ] **Step 3: Implement table, indexes, RLS/revokes, mutation guard, atomic consume function.**
- [ ] **Step 4: Ensure no passcode/password/raw credential column exists.**
- [ ] **Step 5: Run Steel Shield and full Quality Gate.**

### Task 4: Bind AI-18 into release provenance and governance

**Files:**
- Modify: `data/ai/sovereign-release-provenance.json`
- Create: `docs/ai/VVIP_TIGER_SOVEREIGN_OWNER_STEPUP_AUTHORIZATION.md`

**Interfaces:**
- AI-18 security policy and migration become measured Release Provenance inputs.

- [ ] **Step 1: Add the AI-18 module/spec to the AI policy/security provenance groups.**
- [ ] **Step 2: Document runtime trust boundary and explicit non-claims.**
- [ ] **Step 3: Confirm the real-repository provenance integration test remains green.**

### Task 5: Exact-head closure

**Files:**
- Update Draft PR body only after exact-head evidence exists.

- [ ] **Step 1: Confirm VVIP Quality Gate PASS on exact head.**
- [ ] **Step 2: Confirm CodeQL PASS on exact head.**
- [ ] **Step 3: Confirm Dependency Review PASS on exact head.**
- [ ] **Step 4: Confirm Project Control Integrity PASS on exact head.**
- [ ] **Step 5: Keep PR Draft/unmerged and record explicit non-claims.**
