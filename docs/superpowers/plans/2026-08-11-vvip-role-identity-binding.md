# VVIP Role Identity Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require every new operational role assignment to bind the worker to exactly one trusted VVIP internal account identifier or Clerk user identifier, expose that choice in Operations Console, and fail closed until the server verifies the identity/account mapping.

**Architecture:** Extend the existing V13.1 authorization command contract instead of creating a parallel role system. The browser/command boundary performs strict structural validation only; trusted server enforcement resolves the submitted identity reference against the existing Clerk/profile/account bridge before any assignment is persisted active. Operations Console surfaces a compact identity-type selector and identity value field, while historical assignments remain immutable.

**Tech Stack:** JavaScript ES modules, Node 22 `node:test`, existing V13.1 authorization command boundary/server handler, Operations Console local preview, existing Clerk `user.id` + `profiles.clerk_user_id` + global `accountId` identity model.

## Global Constraints

- Every new operational role assignment requires `identityBinding: { type: "ACCOUNT_ID" | "CLERK_USER_ID", value: string }`.
- `ACCOUNT_ID` maps to the existing canonical platform `accountId`; do not invent a second account-number authority.
- `CLERK_USER_ID` maps to the existing Clerk subject / `profiles.clerk_user_id` bridge.
- A browser-supplied identifier is never proof of ownership; server verification is mandatory before active persistence.
- Missing, malformed, unsupported, mismatched, ambiguous or unresolvable identity bindings fail closed.
- The identity binding must resolve to the same target person/account represented by the assignment subject; no cross-account reassignment.
- Current and future worker roles use the same central rule.
- Historical audit/assignment facts remain readable and are not rewritten to fabricate identity history.
- Do not mutate Production data, Clerk provider configuration, secrets, DNS, country activation, owner seeding or real-money state in this PR.
- Keep PR #191 Draft until all same-head quality/security checks pass.

---

### Task 1: Command-boundary identity contract

**Files:**
- Modify: `scripts/authorization/v13-authorization-command-boundary.js`
- Test: `tests/v13-1-role-identity-binding.test.cjs`
- Test: `tests/v13-1-authorization-command-boundary.test.cjs`

**Interfaces:**
- Consumes: `request.command.identityBinding` for `createAssignment` only.
- Produces: frozen normalized `{ type, value }` forwarded in the sanitized command.

- [ ] **Step 1: Keep the committed RED tests as the contract evidence.** Confirm Quality Gate fails on the missing identity contract and Operations Console fields.
- [ ] **Step 2: Extend `createAssignment.allowedFields`** with exactly `identityBinding`.
- [ ] **Step 3: Add strict `sanitizeIdentityBinding(value)`** that requires exactly `type` and `value`, accepts only `ACCOUNT_ID` or `CLERK_USER_ID`, trims the value, applies the canonical bounded identifier character set, and requires Clerk identifiers to begin with `user_`.
- [ ] **Step 4: Include the frozen normalized binding** in `sanitizeCreateAssignment()` output.
- [ ] **Step 5: Update existing create-assignment fixtures** so legacy tests exercise the new mandatory contract instead of bypassing it.
- [ ] **Step 6: Run focused command-boundary and role-identity tests** and require all boundary assertions to pass.

### Task 2: Operations Console field and preview trace

**Files:**
- Modify: `operations-console/operations-console.js`
- Test: `tests/v13-1-role-identity-binding.test.cjs`

**Interfaces:**
- Produces form inputs `identityType` and `identityValue`.
- Produces preview/audit text that records the selected reference type without claiming server verification.

- [ ] **Step 1: Add a compact identity type select** with `ACCOUNT_ID` and `CLERK_USER_ID` options to the existing assignment form.
- [ ] **Step 2: Add the required identity value input** labeled as internal account identifier / Clerk user ID and include safe explanatory text that Production verifies the mapping.
- [ ] **Step 3: Ensure assignment preview reads both fields** and refuses an empty value through native form validation.
- [ ] **Step 4: Keep Preview wording explicit** that local UI does not itself activate a Production role or verify identity.
- [ ] **Step 5: Run the focused Operations Console source-contract test** and require PASS.

### Task 3: Trusted server identity verification

**Files:**
- Modify: `scripts/authorization/v13-server-command-handler.js`
- Test: `tests/v13-1-authorization-server-command-handler.test.cjs`
- Test: `tests/v13-1-authorization-server-command-handler-security.test.cjs`
- Create or extend: `tests/v13-1-role-identity-binding.test.cjs`

**Interfaces:**
- Consumes dependency `resolveRoleIdentityBinding({ type, value, subjectId })`.
- Produces trusted frozen resolution `{ accountId, clerkUserId, subjectId, verified: true }`.
- Persists only after the trusted resolution matches the assignment target.

- [ ] **Step 1: Add RED server tests** for missing resolver, unknown binding, mismatched subject/account, malformed trusted response and successful verified mapping.
- [ ] **Step 2: Add the resolver dependency** without trusting any client-supplied account/profile metadata beyond the normalized reference.
- [ ] **Step 3: For `createAssignment`, call the resolver before transaction persistence** and fail closed when resolution is unavailable or inconsistent.
- [ ] **Step 4: Forward only the trusted canonical identity resolution needed for persistence/audit**, never arbitrary browser fields.
- [ ] **Step 5: Ensure idempotency/audit semantics remain deterministic** for the same verified command and identity binding.
- [ ] **Step 6: Run server handler and security tests** and require PASS.

### Task 4: Assignment persistence and historical compatibility audit

**Files:**
- Inspect/modify only if required: `scripts/pr35/pr35-assignment-repository.js`
- Inspect/modify only if required: V13.1 authorization persistence adapter/schema review artifacts
- Test: authorization repository/semantic-idempotency tests affected by the command shape

**Interfaces:**
- New assignments retain the canonical trusted identity association or an auditable reference to it.
- Historical rows without the new association remain historical and are not silently rewritten.

- [ ] **Step 1: Trace the server persistence projection** for `createAssignment` and identify whether identity binding is already retained through normalized command persistence.
- [ ] **Step 2: If persistence drops the binding, add the smallest forward-compatible projection** required for audit/verification; do not apply a Production migration in this PR.
- [ ] **Step 3: Confirm historical reads do not require fabricated identity data** and remain readable.
- [ ] **Step 4: Run repository/idempotency tests** and require PASS.

### Task 5: All-sector commission integration remains isolated but compatible

**Files:**
- Continue under the separate all-sector commission tasks defined by `docs/superpowers/specs/2026-08-11-vvip-commission-policy-all-sectors-design.md`.

**Interfaces:**
- Role identity binding applies to every surviving operational role.
- Retired roles `SECONDARY_MARKETER`, `SUPERVISOR`, and `AREA_MANAGER` cannot be newly assigned through the active role path.

- [ ] **Step 1: Ensure role catalog cleanup tests include the identity-bound assignment path.**
- [ ] **Step 2: Ensure no retired role can pass create-assignment validation.**
- [ ] **Step 3: Keep the central commission calculation and role cleanup in PR #191 without mixing Production payout execution.**

### Task 6: Same-head verification and handoff

**Files:**
- No Production configuration files.

**Interfaces:**
- Produces a Draft PR head that is reviewable on one exact SHA.

- [ ] **Step 1: Run focused Node tests for role identity, command boundary, server handler, repository and semantic idempotency.**
- [ ] **Step 2: Run VVIP Quality Gate, V14 Release Candidate, CodeQL, Dependency Review, TIGER CleanGuard and Project Control on the same head SHA.**
- [ ] **Step 3: Inspect the final diff for Production data mutation, secrets, DNS, Clerk provider changes, country activation, owner seeding or real-money execution; require none.**
- [ ] **Step 4: Keep PR #191 Draft until all required checks are green and protected review is appropriate.**
