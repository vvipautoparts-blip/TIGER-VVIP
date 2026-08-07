# AI-01 Client Approval Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure no browser/client-supplied `ownerApproved` boolean can unlock an L4 action in the AI-01 runtime foundation.

**Architecture:** Keep the existing static JavaScript policy module and four-agent registry. Harden only the AI-01 authorization boundary: L4 actions remain `OWNER_APPROVAL_REQUIRED` in browser/runtime code regardless of client input, while permanent denies remain permanent. Trusted approval verification is deferred to a future server-side AI-02/AI-03 authorization path.

**Tech Stack:** Plain JavaScript, Node `node:test`, static HTML/JS repository, GitHub Actions quality gates.

## Global Constraints

- Keep the repository static and page-based; do not introduce a framework, bundler, or package-based build step.
- Preserve the four approved agents and existing L1/L2/L3/L4 action taxonomy.
- Keep `AI_COMMAND_CENTER_ENABLED` false by default.
- Do not add an external LLM/provider call.
- Do not add production deploy, merge, money-movement, destructive-data, or production database executors.
- Do not add secrets or server credentials to browser code.
- L4 authorization must fail closed until a future trusted server-side approval verifier exists.

---

### Task 1: Add the regression contract

**Files:**
- Modify: `tests/ai-command-center-policy.test.cjs`

**Interfaces:**
- Consumes: `authorizeAction({ agentId, action, featureEnabled, ownerApproved })` from `scripts/ai/vvip-ai-command-center.js`.
- Produces: a regression contract proving `ownerApproved: true` cannot produce `ALLOW` for L4 in AI-01 client/runtime code.

- [ ] **Step 1: Replace the existing client-unlocks-L4 test with a fail-closed regression test**

Use this exact behavior:

```js
test('client ownerApproved input cannot unlock an L4 action', () => {
  const deploy = authorizeAction({
    agentId: 'technical_manager',
    action: ACTIONS.DEPLOY_PRODUCTION,
    featureEnabled: true,
    ownerApproved: true,
  });

  assert.equal(deploy.decision, DECISIONS.OWNER_APPROVAL_REQUIRED);
  assert.equal(deploy.reasonCode, 'OWNER_APPROVAL_REQUIRED');
});
```

Keep a separate assertion that permanent denials remain denied even when `ownerApproved: true` is present:

```js
test('client approval input never overrides a permanent denial', () => {
  const forbidden = authorizeAction({
    agentId: 'technical_manager',
    action: ACTIONS.DELETE_DATA,
    featureEnabled: true,
    ownerApproved: true,
  });

  assert.equal(forbidden.decision, DECISIONS.DENY);
  assert.equal(forbidden.reasonCode, 'PERMANENTLY_FORBIDDEN');
});
```

- [ ] **Step 2: Commit the failing regression test before implementation**

```bash
git add tests/ai-command-center-policy.test.cjs
git commit -m "test(ai): reject client-side L4 approval"
```

- [ ] **Step 3: Verify the focused/quality CI fails for the expected assertion**

Expected failure before implementation: `authorizeAction(...)` currently returns `ALLOW / OWNER_APPROVAL_VERIFIED` for the L4 deploy case, while the new test expects `OWNER_APPROVAL_REQUIRED`.

---

### Task 2: Harden AI-01 runtime authorization

**Files:**
- Modify: `scripts/ai/vvip-ai-command-center.js`
- Test: `tests/ai-command-center-policy.test.cjs`

**Interfaces:**
- Consumes: existing `POLICY`, `AGENTS`, `DECISIONS`, and feature flag.
- Produces: `authorizeAction()` that never treats client `ownerApproved` input as trusted authorization evidence.

- [ ] **Step 1: Remove client approval from the L4 allow path**

Change `authorizeAction()` so an agent-scoped L4 action always returns:

```js
Object.freeze({
  action,
  agentId,
  decision: DECISIONS.OWNER_APPROVAL_REQUIRED,
  level: policy.level,
  reasonCode: 'OWNER_APPROVAL_REQUIRED',
});
```

Do not return `ALLOW / OWNER_APPROVAL_VERIFIED` anywhere in the browser/runtime AI-01 module.

For compatibility, the function may continue accepting an extra `ownerApproved` property in the input object, but it must be ignored as untrusted client data.

- [ ] **Step 2: Preserve fail-closed ordering**

Authorization order remains:

1. Permanent/unknown policy denial.
2. Feature flag denial.
3. Agent existence check.
4. Agent scope check.
5. L4 returns `OWNER_APPROVAL_REQUIRED`.
6. L1/L2/L3 allowed policy returns `ALLOW`.

- [ ] **Step 3: Commit the minimal implementation**

```bash
git add scripts/ai/vvip-ai-command-center.js
git commit -m "fix(ai): keep L4 approval server-gated"
```

- [ ] **Step 4: Verify CI passes the new regression contract**

Expected: the new client-approval regression test passes and existing permanent-deny, agent-scope, feature-disable, approval-request, and audit-redaction tests remain green.

---

### Task 3: Align AI-01 documentation with the trusted-approval boundary

**Files:**
- Modify: `docs/ai/VVIP_AI01_FOUNDATION.md`

**Interfaces:**
- Consumes: hardened runtime behavior from Task 2.
- Produces: explicit documentation that AI-01 can request owner approval but cannot verify or consume it in browser code.

- [ ] **Step 1: Add the trusted approval statement**

Add these exact principles to the Approval design section:

```markdown
AI-01 browser/runtime code never treats `ownerApproved=true` or any equivalent client-controlled value as proof of authorization. L4 actions remain `OWNER_APPROVAL_REQUIRED` until a future server-side verifier validates a persistent, scoped, expiring, one-time approval record bound to the exact action payload.

`createApprovalRequest()` creates only a pending request envelope. It does not authorize execution and it does not consume an approval.
```

- [ ] **Step 2: Commit the documentation change**

```bash
git add docs/ai/VVIP_AI01_FOUNDATION.md
git commit -m "docs(ai): define trusted L4 approval boundary"
```

---

### Task 4: Final verification gate

**Files:**
- No source changes unless a verification failure identifies a scoped regression.

**Interfaces:**
- Consumes: final branch head after Tasks 1-3.
- Produces: verified AI-01 hardening evidence; does not authorize PR merge.

- [ ] **Step 1: Confirm GitHub Actions on the final head**

Required automated evidence:

- VVIP Quality Gate = PASS
- Project Control Integrity = PASS
- Dependency Review = PASS
- CodeQL = PASS

- [ ] **Step 2: Confirm PR safety state**

Required state:

```text
PR #137 = OPEN + DRAFT + UNMERGED
```

- [ ] **Step 3: Preserve the manual gate**

Do not mark AI-01 complete and do not merge until the focused manual browser smoke confirms:

- owner-control page loads
- four AI roles render
- Arabic/RTL remains correct
- no JavaScript console error
- no horizontal/layout regression
- prompt input remains disabled
- no live AI/provider execution occurs

- [ ] **Step 4: Preserve BLACKBOX gate**

No final `REVIEW_DECISION=PASS` is claimed until manual smoke and final review are both complete with `P0=0` and `P1=0`.
