# TIGER Sovereign Intelligence CURRENT_ONLY Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge TIGER intelligence into one canonical registry plus one sovereign policy kernel, remove duplicated browser policy authority, enforce zero-paid-inference defaults, and make machine authority match the current tree.

**Architecture:** `sovereign-intelligence-registry.js` is a browser/Node-safe declarative registry. `sovereign-security-kernel.js` consumes that registry and remains the executable policy gate. `vvip-ai-command-center.js` becomes a fail-closed UI facade over the registry rather than an independently editable authorization system; `owner-control.html` loads the registry first.

**Tech Stack:** JavaScript (CommonJS + browser UMD), Node built-in test runner, static HTML, JSON production-handover authority.

## Global Constraints

- CURRENT_ONLY / Zero-Legacy / Zero-Residue.
- No direct write to `main`; child PR targets `feat/fusion-single-surface-integration-20260815`.
- Paid remote AI inference budget is zero by default; no silent OpenAI/Anthropic/Gemini/Firebase-AI fallback.
- Unknown action/profile/tool/runtime/inference capability fails closed.
- No AI direct DB access, Service Role, AWS credential, IAM/secrets authority, destructive production-data authority, or fund transfer authority.
- Private messages are not general intelligence memory/training material.
- Preserve existing approval replay protection, tool binding, budget/rate gates, kill switches, and audit metadata allow-listing.

---

### Task 1: Lock the convergence contract with RED tests

**Files:**
- Create: `tests/sovereign-intelligence-current-only.test.cjs`

**Interfaces:**
- Consumes: current AI scripts and `owner-control.html` / production handover JSON.
- Produces: executable contract for the registry, zero-paid-inference, intelligence ladder, and single-authority wiring.

- [ ] **Step 1: Write failing tests** asserting `scripts/ai/sovereign-intelligence-registry.js` exists and exports `ACTIONS`, `DECISIONS`, `POLICY`, `AGENT_ACTIONS`, `ACTOR_AGENT_SCOPES`, `PROFILES`, `INTELLIGENCE_LADDER`, `INFERENCE_POLICY`; kernel exports the same registry objects; command center uses the registry; paid remote inference is denied; deterministic/metric paths precede local/browser AI; unsupported inference returns `no_ai`; owner HTML loads registry first; authority JSON has no nonexistent `scripts/test-all.sh` path.
- [ ] **Step 2: Commit tests only** so the branch contains a durable RED checkpoint.
- [ ] **Step 3: Verify RED** through the branch check/workflow or direct Node test execution when available. Expected failure: missing canonical registry / missing new exports, not syntax or environment failure.

### Task 2: Create the canonical sovereign registry

**Files:**
- Create: `scripts/ai/sovereign-intelligence-registry.js`

**Interfaces:**
- Produces: frozen registry objects for Node via `module.exports` and browser via `globalThis.VVIPSovereignIntelligenceRegistry`.
- Profile IDs: `security_sentinel`, `trust_abuse_sentinel`, `market_intelligence`, `operations_sentinel`, `owner_intelligence`, `user_assistant`.

- [ ] **Step 1: Implement frozen ACTIONS/DECISIONS/POLICY once.**
- [ ] **Step 2: Implement profile/action scopes and tool registry once.**
- [ ] **Step 3: Implement `INTELLIGENCE_LADDER = ['deterministic_rule','metric','small_local_model','browser_built_in_ai','no_ai']`.**
- [ ] **Step 4: Implement frozen `INFERENCE_POLICY` with `paidRemoteInferenceBudget: 0`, `paidRemoteFallback: false`, private-message-general-memory false, direct DB false, Service Role false, AWS credentials false, destructive production writes false.**

### Task 3: Make the sovereign kernel consume the registry

**Files:**
- Modify: `scripts/ai/sovereign-security-kernel.js`

**Interfaces:**
- Consumes: `require('./sovereign-intelligence-registry.js')`.
- Produces: existing kernel API plus `PROFILES`, `INTELLIGENCE_LADDER`, `INFERENCE_POLICY`, `selectIntelligenceRoute`, `authorizeInferenceProvider`.

- [ ] **Step 1: Remove local duplicate ACTIONS/DECISIONS/POLICY/AGENT_ACTIONS/ACTOR_AGENT_SCOPES/TOOL_REGISTRY declarations and import them from registry.**
- [ ] **Step 2: Add `authorizeInferenceProvider({kind})`**: allow declared local/browser/no-AI kinds; deny `remote_paid` and unknown kinds with stable reason codes.
- [ ] **Step 3: Add `selectIntelligenceRoute({...})`** choosing deterministic, then metric, then permitted small local, then permitted browser built-in AI, otherwise no-AI. It must never select a paid remote route.
- [ ] **Step 4: Preserve all existing trusted-actor, trusted-runtime-state, approval, digest, replay, budget/rate, tool, kill-switch, and audit behavior.**

### Task 4: Convert browser command center into a non-authoritative facade

**Files:**
- Modify: `scripts/ai/vvip-ai-command-center.js`
- Modify: `scripts/ai/vvip-ai-owner-console.js`
- Modify: `owner-control.html`

**Interfaces:**
- Command center consumes canonical registry in CommonJS or `VVIPSovereignIntelligenceRegistry` in browser.
- Browser facade exposes registry data for display and fail-closed policy previews; it does not duplicate the tables.

- [ ] **Step 1: Replace local ACTIONS/POLICY/AGENTS declarations with registry imports/projections.**
- [ ] **Step 2: Keep the browser feature disabled by default and preserve owner-approval request/audit-envelope behavior.**
- [ ] **Step 3: Update owner-console copy from obsolete “four AI units / backend provider approval” language to the sovereign profiles and zero-paid-inference/no-AI fallback contract.**
- [ ] **Step 4: Load `sovereign-intelligence-registry.js` before command center and owner console in `owner-control.html`.**

### Task 5: Repair source-of-truth and machine authority

**Files:**
- Modify: `docs/MASTER_PROJECT_STATE.md`
- Modify: `project-control/production-handover/current-authority.v1.json`

**Interfaces:**
- Produces: human and machine authority aligned to the current tree.

- [ ] **Step 1: Add Sovereign Intelligence CURRENT_ONLY section to master state with one registry/one policy gate, zero-paid-inference, ladder, kill switch, data/credential/destructive restrictions, and UI non-authority.**
- [ ] **Step 2: Add `scripts/ai/sovereign-intelligence-registry.js`, `scripts/ai/sovereign-security-kernel.js`, `scripts/ai/vvip-ai-command-center.js`, and `scripts/ai/vvip-ai-owner-console.js` to canonical runtime authority.**
- [ ] **Step 3: Remove nonexistent `scripts/test-all.sh` from verification authority rather than inventing a replacement path.**
- [ ] **Step 4: Add machine hard rules for zero paid inference, no direct AI DB access, no AI cloud/service credentials, no destructive AI authority, and registry/kernel single authority.**

### Task 6: GREEN verification and regression gate

**Files:**
- Test: `tests/sovereign-intelligence-current-only.test.cjs`
- Test: `tests/ai-command-center-policy.test.cjs`
- Test: `tests/ai02-sovereign-security-kernel.test.cjs`
- Test: `tests/ai02-tool-action-binding.test.cjs`

- [ ] **Step 1: Run the new focused contract and verify PASS.**
- [ ] **Step 2: Run existing AI command-center and AI02 kernel/tool tests and verify PASS.**
- [ ] **Step 3: Run repository authoritative CI/checks on exact branch SHA.**
- [ ] **Step 4: Inspect exact-SHA workflow failures; fix root cause without weakening gates.**
- [ ] **Step 5: Open child PR to `feat/fusion-single-surface-integration-20260815`, verify mergeability/review threads/checks, and merge only into that declared parent when fully green.**
