# PR35 Independent Codex Review — Round 1

Generated: 2026-07-14T18:16:48Z

OpenAI Codex v0.144.4
--------
workdir: /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: read-only
reasoning effort: none
reasoning summaries: none
session id: 019f61d7-70cb-7433-9be6-886bc436ce18
--------
user
current changes
2026-07-14T18:15:37.602124Z ERROR codex_core::shell_snapshot: Shell snapshot validation failed: Snapshot command exited with status exit status: 2: /home/codespace/.codex/shell_snapshots/019f61d7-70cb-7433-9be6-886bc436ce18.tmp-1784052936920940694: line 2547: syntax error near unexpected token `('

exec
/bin/bash -lc "cat /home/codespace/.codex/plugins/cache/openai-curated-remote/superpowers/6.1.1/skills/using-superpowers/SKILL.md && printf '\\n---REVIEW---\\n' && cat /home/codespace/.codex/plugins/cache/openai-curated-remote/superpowers/6.1.1/skills/requesting-code-review/SKILL.md && printf '\\n---STATUS---\\n' && git status --short && printf '\\n---DIFFSTAT---\\n' && git diff --stat && git diff --cached --stat" in /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
 succeeded in 324ms:
---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## The Rule

**Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.

**Before entering plan mode:** if you haven't already brainstormed, invoke the brainstorming skill first.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out. Brainstorming and systematic-debugging are Superpowers' most common process skills, but the rule holds for any of them.

- "Let's build X" → superpowers:brainstorming first, then implementation skills.
- "Fix this bug" → superpowers:systematic-debugging first, then domain skills.

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |

## Platform Adaptation

If your harness appears here, read its reference file for special instructions:

- Codex: `references/codex-tools.md`
- Pi: `references/pi-tools.md`
- Antigravity: `references/antigravity-tools.md`

## User Instructions

User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.

---REVIEW---
---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history. This keeps the reviewer focused on the work product, not your thought process, and preserves your own context for continued work.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code reviewer subagent:**

Dispatch a `general-purpose` subagent, filling the template at [code-reviewer.md](code-reviewer.md)

**Placeholders:**
- `{DESCRIPTION}` - Brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after each task or at natural checkpoints
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: [code-reviewer.md](code-reviewer.md)

---STATUS---
 M .gitignore
 M private-profile-p03.html
 M scripts/qa-smoke.sh
 M scripts/vvip-pr30-resilience.js
?? AGENTS.override.md
?? docs/launch/pr35/
?? docs/security/sql-review/pr35/
?? docs/superpowers/
?? owner-control.html
?? scripts/pr35/
?? scripts/qa-pr35-owner-control-tiger-care.sh
?? styles/vvip-pr35-owner-care.css
?? tests/

---DIFFSTAT---
 .gitignore                      |  4 ++++
 private-profile-p03.html        |  7 +++++++
 scripts/qa-smoke.sh             | 13 +++++++++++--
 scripts/vvip-pr30-resilience.js |  7 +++++++
 4 files changed, 29 insertions(+), 2 deletions(-)

exec
/bin/bash -lc "git diff -- . ':"'!docs'"' && printf '\\n---UNTRACKED---\\n' && find docs/launch/pr35 docs/security/sql-review/pr35 docs/superpowers scripts/pr35 tests -type f -maxdepth 6 -print | sort && printf '\\n---ROOTFILES---\\n' && ls -l owner-control.html styles/vvip-pr35-owner-care.css scripts/qa-pr35-owner-control-tiger-care.sh AGENTS.override.md" in /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
 succeeded in 211ms:
diff --git a/.gitignore b/.gitignore
index 35397a2..ce0d071 100644
--- a/.gitignore
+++ b/.gitignore
@@ -9,6 +9,10 @@ supabase/.temp/
 *.desktop-approved.*
 test-results/
 tests/
+!tests/
+tests/*
+!tests/pr35/
+!tests/pr35/**

 # Local generated files
 node_modules/
diff --git a/private-profile-p03.html b/private-profile-p03.html
index 1040300..7df4cb7 100644
--- a/private-profile-p03.html
+++ b/private-profile-p03.html
@@ -13,6 +13,7 @@
   <link rel="stylesheet" href="styles/vvip-pr31-create-listing-shell.css">
   <link rel="stylesheet" href="styles/vvip-pr32-draft-preview.css">
   <link rel="stylesheet" href="styles/vvip-pr33-publish-readiness.css">
+  <link rel="stylesheet" href="styles/vvip-pr35-owner-care.css">
   <script defer crossorigin="anonymous" data-clerk-publishable-key="pk_test_YWNjdXJhdGUtbXVsZS0yOC5jbGVyay5hY2NvdW50cy5kZXYk" src="https://accurate-mule-28.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js"></script>
   <script defer src="scripts/vvip-pr30-resilience.js"></script>
   <script defer src="scripts/vvip-p03-profile.js"></script>
@@ -20,6 +21,7 @@
   <script defer src="scripts/vvip-pr32-draft-preview.js"></script>
   <script defer src="scripts/vvip-pr31-create-listing-shell.js"></script>
   <script defer src="scripts/vvip-pr33-publish-readiness.js"></script>
+  <script type="module" src="scripts/pr35/pr35-bootstrap.js"></script>
 </head>
 <body data-profile-mode="private" data-vvip-account-center data-vvip-private-owner-only>
   <div class="network-notice" data-network-notice role="status" hidden></div>
@@ -36,6 +38,10 @@
       <section class="account-summary account-card" data-account-data-card tabindex="-1">
         <div class="account-initials" data-profile-initials>م</div>
         <div><span class="account-label">حساب المالك</span><h2 data-profile-name>مستخدم</h2><div class="account-status-row"><span>الحالة: <b>نشط</b></span><span>النوع: مستخدم عادي</span></div><p>هذا مركز خاص لإدارة الحساب، وليس صفحة عامة.</p></div>
+        <div class="pr35-profile-actions" data-profile-actions-menu data-subject-id="profile-user" hidden>
+          <button type="button" data-profile-actions-trigger aria-haspopup="menu" aria-expanded="false" aria-label="إجراءات تشغيلية للحساب">⋮</button>
+          <div role="menu" aria-label="إجراءات الحساب التشغيلية" hidden><button type="button" role="menuitem" data-profile-assign>إضافة تكليف تشغيلي</button><button type="button" role="menuitem" data-profile-suspend>تعليق تكليف</button><button type="button" role="menuitem" data-profile-revoke>سحب تكليف</button></div>
+        </div>
       </section>

       <section class="account-section" data-vvip-account-actions aria-labelledby="quick-actions-title">
@@ -46,6 +52,7 @@
           <button type="button" data-account-action="data" data-scroll-target="account-data">بيانات الحساب</button>
           <button type="button" data-account-action="security" data-scroll-target="account-security">الأمان</button>
           <button type="button" data-account-action="care" data-vvip-tiger-care-entry>Tiger Care</button>
+          <a class="account-button account-button--quiet" href="owner-control.html?preview=owner" data-pr35-owner-link hidden>مركز تحكم المالك</a>
         </div>
       </section>

diff --git a/scripts/qa-smoke.sh b/scripts/qa-smoke.sh
index f216000..9355889 100755
--- a/scripts/qa-smoke.sh
+++ b/scripts/qa-smoke.sh
@@ -321,6 +321,11 @@ class Buttons(HTMLParser):
             "data-open-signout",
             "data-confirm-signout",
             "data-cancel-signout",
+            "data-vvip-tiger-care-entry",
+            "data-profile-actions-trigger",
+            "data-profile-assign",
+            "data-profile-suspend",
+            "data-profile-revoke",
         }
         if not keys.intersection(guarded):
             self.unguarded.append(sorted(keys))
@@ -1156,6 +1161,7 @@ PY_LOGGING
 echo "[smoke] validating no database-scope diff"
 python3 <<'PY_DIFF'
 import subprocess
+from pathlib import Path

 changed = subprocess.run(
     ["git", "diff", "HEAD", "--name-only"],
@@ -1180,9 +1186,11 @@ if backup_paths:
         + ", ".join(backup_paths)
     )

+allowlist_path = Path("docs/launch/pr35/CHANGED_FILES.allowlist")
+pr35_allowed = set(allowlist_path.read_text(encoding="utf-8").splitlines()) if allowlist_path.exists() else set()
 forbidden_roots = ("backups/", "approved/", "docs/")
 for name in changed:
-    if name.startswith(forbidden_roots):
+    if name.startswith(forbidden_roots) and name not in pr35_allowed:
         raise SystemExit(f"[smoke][fail] forbidden PR30 scope changed: {name}")

 blocked_roots = [
@@ -1194,7 +1202,8 @@ blocked_roots = [
 ]
 for name in changed:
     lowered = name.lower()
-    if lowered.endswith("." + "sql") or any(root in lowered for root in blocked_roots):
+    review_sql = name.startswith("docs/security/sql-review/pr35/") and name in pr35_allowed
+    if (lowered.endswith("." + "sql") or any(root in lowered for root in blocked_roots)) and not review_sql:
         raise SystemExit(f"[smoke][fail] database-scope file changed: {name}")
 PY_DIFF

diff --git a/scripts/vvip-pr30-resilience.js b/scripts/vvip-pr30-resilience.js
index ef902a9..f7a883e 100644
--- a/scripts/vvip-pr30-resilience.js
+++ b/scripts/vvip-pr30-resilience.js
@@ -12,6 +12,7 @@
     "index.html#marketplace",
     "index.html#search",
     "private-profile-p03.html",
+    "owner-control.html",
     "/private-profile-p03.html",
     "./private-profile-p03.html",
     "#marketplace",
@@ -50,6 +51,12 @@
     "[data-open-signout]",
     "[data-confirm-signout]",
     "[data-cancel-signout]"
+    ,"[data-vvip-tiger-care-entry]"
+    ,"[data-profile-actions-trigger]"
+    ,"[data-profile-assign]"
+    ,"[data-profile-suspend]"
+    ,"[data-profile-revoke]"
+    ,"[data-new-assignment]"
   ].join(",");
   const RECOVERY_MESSAGE =
     "حدث تعذر مؤقت. يمكنك المتابعة من السوق أو الرجوع للرئيسية.";

---UNTRACKED---
docs/launch/pr35/ARCHITECTURE_AND_DATA_FLOW.md
docs/launch/pr35/ARCHITECTURE_FILE_MAP.md
docs/launch/pr35/CHANGED_FILES.allowlist
docs/launch/pr35/CHANGE_CONTROL_MANIFEST.md
docs/launch/pr35/CODEX_REVIEW_ROUND1.md
docs/launch/pr35/LEGACY_AND_UNUSED_FILE_AUDIT.md
docs/launch/pr35/PERFORMANCE_AND_WEAK_NETWORK_BUDGET.md
docs/launch/pr35/PERMISSION_CATALOG.md
docs/launch/pr35/REVIEW_RESOLUTION_LOG.md
docs/launch/pr35/SECURITY_THREAT_MODEL.md
docs/launch/pr35/TIGER_CARE_WORKFLOW.md
docs/launch/pr35/qa/INTEGRATION_PRELIMINARY_EVIDENCE.md
docs/launch/pr35/qa/SECURITY_EVIDENCE.md
docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql
docs/superpowers/plans/2026-07-14-pr35-owner-control-tiger-care-plan.md
docs/superpowers/specs/2026-07-14-pr35-owner-control-tiger-care-design.md
scripts/pr35/pr35-assignment-repository.js
scripts/pr35/pr35-audit.js
scripts/pr35/pr35-bootstrap.js
scripts/pr35/pr35-care-controller.js
scripts/pr35/pr35-contracts.js
scripts/pr35/pr35-drafts.js
scripts/pr35/pr35-i18n.js
scripts/pr35/pr35-local-adapter.js
scripts/pr35/pr35-network.js
scripts/pr35/pr35-owner-controller.js
scripts/pr35/pr35-policy.js
scripts/pr35/pr35-production-adapter.js
scripts/pr35/pr35-routing.js
scripts/pr35/pr35-sanitize.js
scripts/pr35/pr35-scope.js
scripts/pr35/pr35-sla.js
scripts/pr35/pr35-tiger-care.js
tests/pr35/assignment-repository.test.mjs
tests/pr35/audit.test.mjs
tests/pr35/contracts.test.mjs
tests/pr35/drafts-network.test.mjs
tests/pr35/fixtures.mjs
tests/pr35/policy-scope.test.mjs
tests/pr35/production-boundary.test.mjs
tests/pr35/routing-sla.test.mjs
tests/pr35/sanitize.test.mjs
tests/pr35/tiger-care.test.mjs
tests/pr35/ui-behavior.test.mjs

---ROOTFILES---
-rw-rw-rw- 1 codespace codespace 5957 Jul 14 18:15 AGENTS.override.md
-rw-rw-rw- 1 codespace codespace 3897 Jul 14 14:54 owner-control.html
-rwxrwxrwx 1 codespace codespace 3309 Jul 14 18:00 scripts/qa-pr35-owner-control-tiger-care.sh
-rw-rw-rw- 1 codespace codespace 5183 Jul 14 14:52 styles/vvip-pr35-owner-care.css

exec
/bin/bash -lc 'for f in scripts/pr35/*.js; do echo "--- $f"; nl -ba "$f"; done' in /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
 succeeded in 234ms:
--- scripts/pr35/pr35-assignment-repository.js
     1	import { validateCorrelationKey, validateIdempotencyKey, validatePageRequest, ROLE_IDS, PERMISSION_IDS } from './pr35-contracts.js';
     2	import { normalizeText } from './pr35-sanitize.js';
     3	import { normalizeScope, scopeContains } from './pr35-scope.js';
     4	import { authorize, canDelegate } from './pr35-policy.js';
     5	import { createAuditEvent } from './pr35-audit.js';
     6
     7	const clone = (value) => structuredClone(value);
     8	const fail = (code) => Object.freeze({ ok: false, code });
     9	const AUTHORIZATION_READS = new Set(['listAssignments', 'listAuditEvents']);
    10	function confirmedRemoteResult(result, operation) {
    11	  if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean' || typeof result.code !== 'string') {
    12	    return fail('REMOTE_ENFORCEMENT_FAILED');
    13	  }
    14	  if (!result.ok) return Object.freeze(clone(result));
    15	  if (!AUTHORIZATION_READS.has(operation) && result.receipt?.confirmed !== true) {
    16	    return fail('REMOTE_CONFIRMATION_REQUIRED');
    17	  }
    18	  return Object.freeze(clone(result));
    19	}
    20	function validateContext(context) {
    21	  if (!validateCorrelationKey(context?.correlationKey).ok) return 'INVALID_CORRELATION_KEY';
    22	  if (!validateIdempotencyKey(context?.idempotencyKey).ok) return 'INVALID_IDEMPOTENCY_KEY';
    23	  if (!Number.isFinite(Date.parse(context?.now))) return 'INVALID_TIMESTAMP';
    24	  try { normalizeText(context?.reason, { max: 500, required: true }); } catch (error) { return error.code; }
    25	  return null;
    26	}
    27	function page(items, query) {
    28	  const valid = validatePageRequest(query); if (!valid.ok) return valid;
    29	  const offset = valid.value.cursor === null ? 0 : Number(valid.value.cursor);
    30	  if (!Number.isSafeInteger(offset) || offset < 0) return fail('INVALID_CURSOR');
    31	  const selected = items.slice(offset, offset + valid.value.limit).map(clone);
    32	  return Object.freeze({ ok: true, code: 'OK', items: Object.freeze(selected), nextCursor: offset + selected.length < items.length ? String(offset + selected.length) : null });
    33	}
    34
    35	export function createVolatileAuthorizationRepository() {
    36	  const assignments = []; const audits = []; const receipts = new Map(); let sequence = 0;
    37	  async function appendAudit(assignment, action, context) {
    38	    const entry = await createAuditEvent({ previousHash: audits.at(-1)?.hash ?? null, actorId: context.actor.id,
    39	      action, target: { type: 'assignment', id: assignment.id }, scope: assignment.scope,
    40	      reason: context.reason, at: context.now, correlationKey: context.correlationKey,
    41	      idempotencyKey: context.idempotencyKey, metadata: { roleId: assignment.roleId, subjectId: assignment.subjectId, state: assignment.state } });
    42	    audits.push(entry);
    43	  }
    44	  async function runIdempotent(context, operation) {
    45	    const invalid = validateContext(context); if (invalid) return fail(invalid);
    46	    if (receipts.has(context.idempotencyKey)) return receipts.get(context.idempotencyKey);
    47	    try {
    48	      const result = await operation();
    49	      if (result.ok) receipts.set(context.idempotencyKey, result);
    50	      return result;
    51	    } catch (error) { return fail(error.code || 'INVALID_COMMAND'); }
    52	  }
    53	  async function createAssignment(command, context) {
    54	    return runIdempotent(context, async () => {
    55	      if (!command || !ROLE_IDS.includes(command.roleId) || !Array.isArray(command.permissionIds) || command.permissionIds.some((id) => !PERMISSION_IDS.includes(id))) return fail('INVALID_ASSIGNMENT');
    56	      const delegation = canDelegate({ actor: context.actor, subjectId: command.subjectId,
    57	        permissionIds: command.permissionIds, scope: command.scope, roleId: command.roleId, now: context.now });
    58	      if (!delegation.allowed) return fail(delegation.code);
    59	      const startsAt = new Date(command.startsAt); const expiresAt = new Date(command.expiresAt);
    60	      if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(expiresAt.getTime()) || startsAt >= expiresAt) return fail('INVALID_ASSIGNMENT_WINDOW');
    61	      const record = Object.freeze({ id: `assignment-${++sequence}`, subjectId: normalizeText(command.subjectId, { max: 128, required: true }),
    62	        roleId: command.roleId, permissionIds: Object.freeze([...new Set(command.permissionIds)].sort()), scope: normalizeScope(command.scope),
    63	        state: 'active', startsAt: startsAt.toISOString(), expiresAt: expiresAt.toISOString(), grantedBy: context.actor.id });
    64	      assignments.push(record); await appendAudit(record, 'assignment.create', context);
    65	      return Object.freeze({ ok: true, code: 'ASSIGNMENT_CREATED', data: clone(record), receipt: Object.freeze({ correlationKey: context.correlationKey, idempotencyKey: context.idempotencyKey, persistence: 'volatile' }) });
    66	    });
    67	  }
    68	  async function changeState(command, context, state) {
    69	    return runIdempotent(context, async () => {
    70	      const index = assignments.findIndex((item) => item.id === command?.assignmentId);
    71	      if (index < 0) return fail('ASSIGNMENT_NOT_FOUND');
    72	      const current = assignments[index];
    73	      const permission = current.roleId === 'owner' ? 'authorization.owner.manage' : 'authorization.assignment.manage';
    74	      const auth = authorize({ actor: context.actor, permission, resourceScope: current.scope, now: context.now });
    75	      if (!auth.allowed || current.subjectId === context.actor.id) return fail(current.subjectId === context.actor.id ? 'SELF_ELEVATION_DENIED' : auth.code);
    76	      if (current.state === 'revoked') return fail('ASSIGNMENT_TERMINAL');
    77	      const changed = Object.freeze({ ...current, state }); assignments[index] = changed;
    78	      await appendAudit(changed, `assignment.${state === 'suspended' ? 'suspend' : 'revoke'}`, context);
    79	      return Object.freeze({ ok: true, code: `ASSIGNMENT_${state.toUpperCase()}`, data: clone(changed), receipt: Object.freeze({ correlationKey: context.correlationKey, idempotencyKey: context.idempotencyKey, persistence: 'volatile' }) });
    80	    });
    81	  }
    82	  function listProtected(items, query, context, permission) {
    83	    const scope = query?.scope || { level: 'platform' };
    84	    const auth = authorize({ actor: context?.actor, permission, resourceScope: scope, now: context?.now });
    85	    if (!auth.allowed) return fail(auth.code);
    86	    return page(items.filter((item) => scopeContains(scope, item.event?.scope || item.scope)), query);
    87	  }
    88	  return Object.freeze({
    89	    createAssignment, suspendAssignment: (command, context) => changeState(command, context, 'suspended'),
    90	    revokeAssignment: (command, context) => changeState(command, context, 'revoked'),
    91	    listAssignments: (query = {}, context) => listProtected(assignments, query, context, 'authorization.assignment.read'),
    92	    listAuditEvents: (query = {}, context) => listProtected(audits, query, context, 'audit.event.read.scoped')
    93	  });
    94	}
    95
    96	export function createRemoteAuthorizationRepository({ transport, verified = false, online = () => true } = {}) {
    97	  const invoke = async (operation, command, context) => {
    98	    if (typeof transport !== 'function' || verified !== true) return fail('CONFIGURATION_REQUIRED');
    99	    const invalid = validateContext(context); if (invalid) return fail(invalid);
   100	    try {
   101	      if (!online()) return fail('OFFLINE_PRIVILEGED_DENIED');
   102	      const result = await transport(Object.freeze({ operation, command: clone(command), context: clone(context) }));
   103	      return confirmedRemoteResult(result, operation);
   104	    }
   105	    catch { return fail('REMOTE_ENFORCEMENT_FAILED'); }
   106	  };
   107	  return Object.freeze({ createAssignment: (c, x) => invoke('createAssignment', c, x),
   108	    suspendAssignment: (c, x) => invoke('suspendAssignment', c, x), revokeAssignment: (c, x) => invoke('revokeAssignment', c, x),
   109	    listAssignments: (c, x) => invoke('listAssignments', c, x), listAuditEvents: (c, x) => invoke('listAuditEvents', c, x) });
   110	}
--- scripts/pr35/pr35-audit.js
     1	import { LIMITS, validateCorrelationKey, validateIdempotencyKey } from './pr35-contracts.js';
     2	import { assertSafeKey, normalizeText, domainError } from './pr35-sanitize.js';
     3	import { normalizeScope } from './pr35-scope.js';
     4
     5	export const REASON_REQUIRED_ACTIONS = Object.freeze(['assignment.create', 'assignment.suspend',
     6	  'assignment.revoke', 'assignment.expire', 'authorization.owner.grant', 'authorization.owner.revoke']);
     7	const secretPattern = /(token|secret|password|authorization|cookie|jwt|session|api[_-]?key)/i;
     8
     9	function sanitizeMetadata(input) {
    10	  if (input === undefined) return Object.freeze(Object.create(null));
    11	  if (!input || typeof input !== 'object' || Array.isArray(input)) throw domainError('INVALID_AUDIT_METADATA');
    12	  const keys = Object.keys(input).sort();
    13	  if (keys.length > LIMITS.AUDIT_METADATA_KEYS) throw domainError('LIST_LIMIT_EXCEEDED');
    14	  const output = Object.create(null);
    15	  for (const key of keys) {
    16	    assertSafeKey(key);
    17	    if (secretPattern.test(key)) throw domainError('AUDIT_SECRET_FIELD');
    18	    const value = input[key];
    19	    if (typeof value === 'string') output[key] = normalizeText(value, { max: LIMITS.TEXT });
    20	    else if (typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean' || value === null) output[key] = value;
    21	    else throw domainError('INVALID_AUDIT_METADATA');
    22	  }
    23	  return Object.freeze(output);
    24	}
    25	function canonical(value) {
    26	  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    27	  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    28	  return JSON.stringify(value);
    29	}
    30	async function sha256(value) {
    31	  const bytes = new TextEncoder().encode(value);
    32	  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    33	  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    34	}
    35	export async function createAuditEvent(input) {
    36	  const action = normalizeText(input?.action, { max: 128, required: true });
    37	  let reason;
    38	  try { reason = normalizeText(input?.reason, { max: LIMITS.REASON, required: REASON_REQUIRED_ACTIONS.includes(action) }); }
    39	  catch (error) { if (error.code === 'FIELD_REQUIRED') throw domainError('REASON_REQUIRED'); throw error; }
    40	  if (!validateCorrelationKey(input?.correlationKey).ok) throw domainError('INVALID_CORRELATION_KEY');
    41	  if (!validateIdempotencyKey(input?.idempotencyKey).ok) throw domainError('INVALID_IDEMPOTENCY_KEY');
    42	  if (input.previousHash !== null && !/^[a-f0-9]{64}$/.test(input.previousHash || '')) throw domainError('INVALID_PREVIOUS_HASH');
    43	  const target = input?.target;
    44	  if (!target || typeof target !== 'object' || Array.isArray(target) || Object.keys(target).some((key) => !['type', 'id'].includes(assertSafeKey(key)))) throw domainError('INVALID_AUDIT_TARGET');
    45	  const at = new Date(input?.at); if (!Number.isFinite(at.getTime()) || at.toISOString() !== input.at) throw domainError('INVALID_TIMESTAMP');
    46	  const event = Object.freeze({ version: 1, previousHash: input.previousHash, at: input.at,
    47	    actorId: normalizeText(input.actorId, { max: 128, required: true }), action,
    48	    target: Object.freeze({ type: normalizeText(target.type, { max: 64, required: true }), id: normalizeText(target.id, { max: 128, required: true }) }),
    49	    scope: normalizeScope(input.scope), reason, correlationKey: input.correlationKey,
    50	    idempotencyKey: input.idempotencyKey, metadata: sanitizeMetadata(input.metadata) });
    51	  return Object.freeze({ event, hash: await sha256(canonical(event)) });
    52	}
    53	export async function verifyAuditChain(entries) {
    54	  if (!Array.isArray(entries) || entries.length > 10000) return { ok: false, code: 'AUDIT_CHAIN_INVALID', index: 0 };
    55	  let previousHash = null;
    56	  for (let index = 0; index < entries.length; index += 1) {
    57	    const entry = entries[index];
    58	    if (entry?.event?.previousHash !== previousHash || entry.hash !== await sha256(canonical(entry.event))) return { ok: false, code: 'AUDIT_CHAIN_INVALID', index };
    59	    previousHash = entry.hash;
    60	  }
    61	  return { ok: true, code: 'AUDIT_CHAIN_VALID' };
    62	}
    63	export function rejectAuditMutation(command) {
    64	  return ['update', 'delete'].includes(command) ? { ok: false, code: 'AUDIT_APPEND_ONLY' } : { ok: false, code: 'UNKNOWN_COMMAND' };
    65	}
--- scripts/pr35/pr35-bootstrap.js
     1	import { createLocalCareAdapter } from './pr35-local-adapter.js';
     2	import { createProductionCareAdapter } from './pr35-production-adapter.js';
     3	import { createVolatileAuthorizationRepository, createRemoteAuthorizationRepository } from './pr35-assignment-repository.js';
     4
     5	const localHost = () => ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'].includes(location.hostname);
     6	const preview = () => localHost() && ['account', 'owner', 'home'].includes(new URLSearchParams(location.search).get('preview'));
     7	const now = () => new Date().toISOString();
     8	const demoOwner = () => ({ id: 'demo-owner', kind: 'staff', accountState: 'active', sessionIssuedAt: now(), assignments: [{ id: 'demo-owner-assignment', subjectId: 'demo-owner', roleId: 'owner', permissionIds: ['owner.console.read', 'authorization.assignment.read', 'authorization.assignment.manage', 'authorization.owner.manage', 'authorization.permission.delegate', 'care.ticket.read.scoped', 'care.ticket.escalate', 'audit.event.read.scoped'], scope: { level: 'platform' }, state: 'active', startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z' }] });
     9	const productionIdentity = () => window.__VVIP_PR35_IDENTITY__ || { id: window.Clerk?.user?.id || null, kind: 'user', accountState: window.Clerk?.user ? 'active' : 'inactive', assignments: [] };
    10
    11	async function boot() {
    12	  const local = preview(); const identity = local ? demoOwner : productionIdentity;
    13	  const careIdentity = () => ({ id: window.Clerk?.user?.id || 'demo-member', kind: 'user', accountState: 'active', assignments: [] });
    14	  const repository = local ? createVolatileAuthorizationRepository() : createRemoteAuthorizationRepository();
    15	  const careAdapter = local ? createLocalCareAdapter({ clock: now, online: () => navigator.onLine }) : createProductionCareAdapter();
    16	  if (document.querySelector('[data-vvip-tiger-care-entry]')) {
    17	    const { createCareController } = await import('./pr35-care-controller.js');
    18	    const care = createCareController({ adapter: careAdapter, identity: careIdentity, clock: now });
    19	    document.querySelectorAll('[data-vvip-tiger-care-entry]').forEach((button) => button.addEventListener('click', (event) => { event.stopImmediatePropagation(); care.open(button); }, true));
    20	  }
    21	  const actionHost = document.querySelector('[data-profile-actions-menu]'); const ownerRoot = document.querySelector('[data-owner-root]');
    22	  if (actionHost || ownerRoot) {
    23	    const { createOwnerController } = await import('./pr35-owner-controller.js');
    24	    const owner = createOwnerController({ root: document, repository, careAdapter, identity, clock: now, local });
    25	    if (actionHost) owner.mountProfileActions(actionHost);
    26	    const ownerLink = document.querySelector('[data-pr35-owner-link]');
    27	    if (ownerLink && (local || identity().assignments?.some((item) => item.state === 'active' && item.permissionIds?.includes('owner.console.read')))) ownerLink.hidden = false;
    28	    if (ownerRoot) await owner.mountConsole();
    29	  }
    30	}
    31	boot().catch(() => { const status = document.querySelector('[data-owner-status]'); if (status) status.textContent = 'تعذر تجهيز الوحدة بأمان. لم يتم حفظ أي تغيير.'; });
--- scripts/pr35/pr35-care-controller.js
     1	import { CARE_CATEGORIES, CARE_PRIORITIES } from './pr35-contracts.js';
     2	import { translate } from './pr35-i18n.js';
     3
     4	const labels = Object.freeze({ management_contact: 'تواصل رسمي مع الإدارة', support: 'دعم', complaint_report: 'شكوى أو بلاغ', missing_category: 'فئة غير موجودة', rejection_appeal: 'اعتراض على رفض', account_issue: 'مشكلة حساب', sector_access_request: 'طلب قطاع أو وصول', fraud_safety: 'احتيال أو سلامة', other: 'طلب آخر' });
     5	const el = (tag, attrs = {}, text = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => key === 'class' ? node.className = value : node.setAttribute(key, value)); node.textContent = text; return node; };
     6	const key = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
     7
     8	export function createCareController({ root = document, adapter, identity, clock = () => new Date().toISOString() }) {
     9	  let layer; let opener; let requestController;
    10	  function close() { requestController?.abort(); if (!layer) return; layer.remove(); layer = null; opener?.focus(); opener = null; }
    11	  function open(trigger) {
    12	    if (layer) return; opener = trigger || document.activeElement;
    13	    layer = el('div', { class: 'pr35-layer', 'data-care-dialog': '' });
    14	    const dialog = el('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-care-title', tabindex: '-1' });
    15	    const title = el('h2', { id: 'pr35-care-title' }, translate('care.title'));
    16	    const disclosure = el('p', { class: 'pr35-disclosure' }, translate('mode.local'));
    17	    const form = el('form', { class: 'pr35-form', 'data-care-form': '' });
    18	    const category = el('select', { name: 'category', required: '', 'aria-label': 'نوع الطلب' });
    19	    CARE_CATEGORIES.forEach((id) => category.append(el('option', { value: id }, labels[id])));
    20	    const priority = el('select', { name: 'priority', required: '', 'aria-label': 'الأولوية' });
    21	    CARE_PRIORITIES.forEach((id) => priority.append(el('option', { value: id }, ({ low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' })[id])));
    22	    priority.value = 'normal';
    23	    const subject = el('input', { name: 'subject', required: '', maxlength: '160', placeholder: 'موضوع الطلب', 'aria-label': 'موضوع الطلب' });
    24	    const description = el('textarea', { name: 'description', required: '', maxlength: '4000', placeholder: 'اكتب التفاصيل دون بيانات دخول أو أسرار', 'aria-label': 'تفاصيل الطلب' });
    25	    const status = el('p', { class: 'pr35-status', role: 'status', 'aria-live': 'polite', 'data-care-state': 'idle' });
    26	    const submit = el('button', { type: 'submit', class: 'pr35-primary' }, 'إرسال الطلب');
    27	    const cancel = el('button', { type: 'button', 'data-care-close': '' }, translate('common.cancel'));
    28	    form.append(category, priority, subject, description, status, submit, cancel); dialog.append(title, disclosure, form); layer.append(dialog); document.body.append(layer);
    29	    cancel.addEventListener('click', close);
    30	    layer.addEventListener('click', (event) => { if (event.target === layer) close(); });
    31	    layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if (event.key === 'Tab') { const controls = [...dialog.querySelectorAll('button,input,select,textarea')]; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
    32	    form.addEventListener('submit', async (event) => {
    33	      event.preventDefault(); if (!form.reportValidity()) return;
    34	      requestController?.abort(); requestController = new AbortController(); submit.disabled = true; status.dataset.careState = 'pending'; status.textContent = translate('care.pending');
    35	      const actor = identity(); const context = { actor, now: clock(), correlationKey: key('corr'), idempotencyKey: key('idem'), signal: requestController.signal };
    36	      const payload = { category: category.value, priority: priority.value, subject: subject.value, description: description.value };
    37	      try {
    38	        const result = await adapter.submitUserRequest(payload, context);
    39	        if (!result.ok) throw new Error(result.code);
    40	        status.dataset.careState = 'sent'; status.textContent = translate('care.confirmation'); form.reset();
    41	      } catch (error) { if (error.name !== 'AbortError') { status.dataset.careState = 'failed'; status.textContent = navigator.onLine ? translate('care.failed') : translate('care.offlinePending'); } }
    42	      finally { submit.disabled = false; }
    43	    });
    44	    dialog.focus();
    45	  }
    46	  return Object.freeze({ open, close });
    47	}
--- scripts/pr35/pr35-contracts.js
     1	const frozen = (values) => Object.freeze([...values]);
     2
     3	export const ROLE_IDS = frozen(['owner', 'platform_admin', 'sector_manager', 'regional_manager',
     4	  'area_manager', 'group_manager', 'campaign_manager', 'sales', 'marketing', 'tiger_care',
     5	  'moderator', 'service_provider', 'regular_user']);
     6
     7	export const PERMISSION_IDS = frozen(['owner.console.read', 'authorization.assignment.read',
     8	  'authorization.assignment.manage', 'authorization.owner.manage',
     9	  'authorization.permission.delegate', 'care.request.create', 'care.ticket.read.own',
    10	  'care.ticket.read.scoped', 'care.ticket.acknowledge', 'care.ticket.assign',
    11	  'care.ticket.transition', 'care.ticket.escalate', 'care.ticket.resolve',
    12	  'care.message.create.own', 'care.message.create.scoped', 'care.internal_note.read',
    13	  'care.internal_note.create', 'care.routing.manage', 'care.sla.manage',
    14	  'audit.event.read.scoped', 'audit.event.append']);
    15
    16	export const SCOPE_LEVELS = frozen(['platform', 'sector', 'region', 'area', 'team']);
    17	export const ASSIGNMENT_STATES = frozen(['pending', 'active', 'suspended', 'revoked', 'expired']);
    18	export const CARE_CATEGORIES = frozen(['management_contact', 'support', 'complaint_report',
    19	  'missing_category', 'rejection_appeal', 'account_issue', 'sector_access_request',
    20	  'fraud_safety', 'other']);
    21	export const CARE_PRIORITIES = frozen(['low', 'normal', 'high', 'urgent']);
    22	export const TICKET_STATUSES = frozen(['new', 'acknowledged', 'in_review', 'waiting_user',
    23	  'escalated', 'resolved', 'closed', 'cancelled']);
    24
    25	const permissions = (...ids) => Object.freeze({ permissionIds: frozen(ids) });
    26	const allExceptBackendAudit = PERMISSION_IDS.filter((id) => id !== 'audit.event.append');
    27	export const ROLE_TEMPLATES = Object.freeze({
    28	  owner: permissions(...allExceptBackendAudit),
    29	  platform_admin: permissions('owner.console.read', 'authorization.assignment.read',
    30	    'authorization.assignment.manage', 'authorization.permission.delegate', 'care.ticket.read.scoped',
    31	    'care.ticket.acknowledge', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate',
    32	    'care.ticket.resolve', 'care.message.create.scoped', 'care.routing.manage', 'care.sla.manage',
    33	    'audit.event.read.scoped'),
    34	  sector_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate'),
    35	  regional_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate'),
    36	  area_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition'),
    37	  group_manager: permissions('care.ticket.read.scoped', 'care.ticket.transition'),
    38	  campaign_manager: permissions('care.ticket.read.scoped'), sales: permissions(), marketing: permissions(),
    39	  tiger_care: permissions('care.ticket.read.scoped', 'care.ticket.acknowledge', 'care.ticket.transition',
    40	    'care.ticket.escalate', 'care.ticket.resolve', 'care.message.create.scoped'),
    41	  moderator: permissions('care.ticket.read.scoped'), service_provider: permissions(),
    42	  regular_user: permissions('care.request.create', 'care.ticket.read.own', 'care.message.create.own')
    43	});
    44
    45	export const ERROR_CODES = Object.freeze({
    46	  PAGE_LIMIT_EXCEEDED: 'PAGE_LIMIT_EXCEEDED', FIELD_TOO_LONG: 'FIELD_TOO_LONG',
    47	  INVALID_CORRELATION_KEY: 'INVALID_CORRELATION_KEY', INVALID_IDEMPOTENCY_KEY: 'INVALID_IDEMPOTENCY_KEY'
    48	});
    49	export const LIMITS = Object.freeze({ PAGE_DEFAULT: 20, PAGE_MAX: 50, CURSOR: 256, KEY: 128,
    50	  TEXT: 500, REASON: 500, LIST: 50, AUDIT_METADATA_KEYS: 20 });
    51
    52	const keyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
    53	function validateKey(value, prefix, code) {
    54	  return typeof value === 'string' && value.startsWith(prefix) && keyPattern.test(value)
    55	    ? { ok: true, code: 'OK', value }
    56	    : { ok: false, code };
    57	}
    58	export const validateCorrelationKey = (value) => validateKey(value, 'corr_', ERROR_CODES.INVALID_CORRELATION_KEY);
    59	export const validateIdempotencyKey = (value) => validateKey(value, 'idem_', ERROR_CODES.INVALID_IDEMPOTENCY_KEY);
    60
    61	export function validatePageRequest({ limit = LIMITS.PAGE_DEFAULT, cursor = null } = {}) {
    62	  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.PAGE_MAX) return { ok: false, code: ERROR_CODES.PAGE_LIMIT_EXCEEDED };
    63	  if (cursor !== null && (typeof cursor !== 'string' || [...cursor].length > LIMITS.CURSOR)) return { ok: false, code: ERROR_CODES.FIELD_TOO_LONG };
    64	  return { ok: true, code: 'OK', value: { limit, cursor } };
    65	}
--- scripts/pr35/pr35-drafts.js
     1	import { validateCareRequest } from './pr35-tiger-care.js';
     2
     3	const fail = (code) => Object.freeze({ ok: false, code });
     4	const MAX_ITEMS = 20; const MAX_BYTES = 65536;
     5	const keyFor = (kind, sessionId) => `vvip:pr35:${kind}:${sessionId}`;
     6	const read = (storage, key, fallback) => { try { return JSON.parse(storage.getItem(key)) || fallback; } catch { return fallback; } };
     7	const write = (storage, key, value) => {
     8	  const serialized = JSON.stringify(value);
     9	  if (new TextEncoder().encode(serialized).length > MAX_BYTES) return fail('QUEUE_SIZE_EXCEEDED');
    10	  try { storage.setItem(key, serialized); return { ok: true }; } catch { return fail('SESSION_STORAGE_UNAVAILABLE'); }
    11	};
    12	const normalize = (input, actorId) => validateCareRequest({ ...input, requesterId: actorId });
    13
    14	export function createDraftStore(sessionStorage, sessionId) {
    15	  const key = keyFor('draft', sessionId);
    16	  return Object.freeze({
    17	    save(input, { actorId }) { const valid = normalize(input, actorId); if (!valid.ok) return valid;
    18	      const result = write(sessionStorage, key, { actorId, value: valid.value }); return result.ok ? Object.freeze({ ok: true, code: 'DRAFT_SAVED' }) : result; },
    19	    load({ actorId }) { const draft = read(sessionStorage, key, null); return !draft || draft.actorId !== actorId ? fail('DRAFT_NOT_FOUND') : Object.freeze({ ok: true, code: 'OK', value: structuredClone(draft.value) }); },
    20	    clear() { sessionStorage.removeItem(key); return Object.freeze({ ok: true, code: 'DRAFT_CLEARED' }); }
    21	  });
    22	}
    23
    24	export function createUserSubmissionQueue(sessionStorage, sessionId) {
    25	  const key = keyFor('queue', sessionId);
    26	  const items = () => read(sessionStorage, key, []);
    27	  return Object.freeze({
    28	    enqueue(input, context) {
    29	      if (context?.actor?.kind !== 'user' || input?.commandType) return fail('OFFLINE_PRIVILEGED_DENIED');
    30	      const valid = normalize(input, context.actor.id); if (!valid.ok) return valid;
    31	      const queue = items();
    32	      const existing = queue.find((item) => item.idempotencyKey === context.idempotencyKey);
    33	      if (existing) return fail('DUPLICATE_SUBMISSION');
    34	      if (queue.length >= MAX_ITEMS) return fail('QUEUE_LIMIT_EXCEEDED');
    35	      const entry = { idempotencyKey: context.idempotencyKey, correlationKey: context.correlationKey,
    36	        actorId: context.actor.id, payload: valid.value, state: 'pending', attempts: 0 };
    37	      const result = write(sessionStorage, key, [...queue, entry]);
    38	      return result.ok ? Object.freeze({ ok: true, code: 'QUEUED', state: 'pending' }) : result;
    39	    },
    40	    async flush(send, context) {
    41	      const queue = items(); const updated = [];
    42	      for (const entry of queue) {
    43	        if (entry.actorId !== context?.actor?.id || context.actor.kind !== 'user') { updated.push({ ...entry, state: 'failed', code: 'FORGED_IDENTITY' }); continue; }
    44	        try { const result = await send(structuredClone(entry.payload), { ...context, idempotencyKey: entry.idempotencyKey, correlationKey: entry.correlationKey });
    45	          updated.push({ ...entry, attempts: entry.attempts + 1, state: result.ok ? 'sent' : 'failed', code: result.code });
    46	        } catch { updated.push({ ...entry, attempts: entry.attempts + 1, state: 'failed', code: 'NETWORK_UNAVAILABLE' }); }
    47	      }
    48	      write(sessionStorage, key, updated); return Object.freeze({ ok: true, code: 'QUEUE_FLUSHED', items: Object.freeze(updated.map(Object.freeze)) });
    49	    }, list() { return Object.freeze(items().map((item) => Object.freeze(structuredClone(item)))); }
    50	  });
    51	}
--- scripts/pr35/pr35-i18n.js
     1	const ar = {
     2	  'mode.local': 'وضع عرض محلي — لا يتم الحفظ في قاعدة بيانات بعيدة.',
     3	  'mode.productionUnavailable': 'الخدمة الآمنة غير مهيأة حاليًا. لم يتم حفظ أي تغيير.',
     4	  'care.title': 'طلب إلى Tiger Care',
     5	  'care.confirmation': 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.',
     6	  'care.pending': 'جاري إرسال الطلب…',
     7	  'care.failed': 'تعذر إرسال الطلب بأمان. يمكنك المحاولة مرة أخرى.',
     8	  'care.offlinePending': 'الطلب معلّق على هذا الجهاز حتى عودة الاتصال.',
     9	  'common.close': 'إغلاق', 'common.cancel': 'إلغاء', 'common.continue': 'متابعة',
    10	  'common.retry': 'إعادة المحاولة', 'common.loading': 'جاري التحميل…',
    11	  'common.empty': 'لا توجد نتائج مطابقة حاليًا.', 'common.denied': 'هذا الإجراء غير متاح لصلاحياتك الحالية.'
    12	};
    13	const en = {
    14	  'mode.local': 'Local demo mode — changes are not saved to a remote database.',
    15	  'mode.productionUnavailable': 'Secure service is not configured. No change was saved.',
    16	  'care.title': 'Tiger Care request',
    17	  'care.confirmation': 'Your request has been received. We will contact you within 24 hours.',
    18	  'care.pending': 'Sending your request…',
    19	  'care.failed': 'Your request could not be sent safely. Please try again.',
    20	  'care.offlinePending': 'This request is pending on this device until the connection returns.',
    21	  'common.close': 'Close', 'common.cancel': 'Cancel', 'common.continue': 'Continue',
    22	  'common.retry': 'Retry', 'common.loading': 'Loading…',
    23	  'common.empty': 'No matching results yet.', 'common.denied': 'This action is unavailable with your current permissions.'
    24	};
    25
    26	export const dictionaries = Object.freeze({ ar: Object.freeze(ar), en: Object.freeze(en) });
    27	export function translate(key, lang = 'ar', params = {}) {
    28	  const dictionary = dictionaries[lang] || dictionaries.ar;
    29	  return String(dictionary[key] || dictionaries.ar[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
    30	}
    31	export function setDocumentLanguage(lang = 'ar', documentRef = document) {
    32	  const selected = lang === 'en' ? 'en' : 'ar';
    33	  documentRef.documentElement.lang = selected;
    34	  documentRef.documentElement.dir = selected === 'ar' ? 'rtl' : 'ltr';
    35	  return selected;
    36	}
--- scripts/pr35/pr35-local-adapter.js
     1	import { validateIdempotencyKey, validateCorrelationKey } from './pr35-contracts.js';
     2	import { validateCareRequest, safeCareText, projectTicketForRequester, transitionTicket, appendTimelineEvent } from './pr35-tiger-care.js';
     3	import { createDedupeRegistry } from './pr35-network.js';
     4	import { calculateSla } from './pr35-sla.js';
     5
     6	const fail = (code) => Object.freeze({ ok: false, code });
     7	const clone = (value) => structuredClone(value);
     8	const immutableList = (items) => Object.freeze(items.map((item) => Object.freeze(clone(item))));
     9
    10	export function createLocalCareAdapter({ clock = () => new Date().toISOString(), online = () => true, notifier } = {}) {
    11	  const tickets = new Map(); const dedupe = createDedupeRegistry(); let ticketSequence = 0; let eventSequence = 0;
    12	  const validateContext = (context) => !context?.actor?.id ? 'IDENTITY_REQUIRED'
    13	    : !validateIdempotencyKey(context.idempotencyKey).ok ? 'INVALID_IDEMPOTENCY_KEY'
    14	      : !validateCorrelationKey(context.correlationKey).ok ? 'INVALID_CORRELATION_KEY' : null;
    15	  const run = async (payload, context, operation) => {
    16	    const invalid = validateContext(context); if (invalid) return fail(invalid);
    17	    try { return await dedupe.run(context.idempotencyKey, payload, operation); }
    18	    catch (error) { return fail(error.code || 'INVALID_COMMAND'); }
    19	  };
    20	  const notify = async (ticket) => {
    21	    if (notifier?.configured !== true || typeof notifier.send !== 'function') return Object.freeze({ status: 'not_configured' });
    22	    try { const result = await notifier.send(Object.freeze({ type: 'care_request_received', ticketId: ticket.id, requesterId: ticket.requesterId }));
    23	      return Object.freeze({ status: result?.confirmed === true ? 'confirmed' : 'failed' });
    24	    } catch { return Object.freeze({ status: 'failed' }); }
    25	  };
    26	  const privileged = (context, permission) => {
    27	    if (!online()) return 'OFFLINE_PRIVILEGED_DENIED';
    28	    if (context?.actor?.kind !== 'staff' || !context.actor.permissions?.includes(permission)) return 'PERMISSION_DENIED';
    29	    return null;
    30	  };
    31	  const find = (id) => tickets.get(id);
    32
    33	  async function submitUserRequest(input, context) {
    34	    if (context?.actor?.kind !== 'user') return fail('PERMISSION_DENIED');
    35	    if (input?.requesterId && input.requesterId !== context.actor.id) return fail('FORGED_IDENTITY');
    36	    const bound = { ...input, requesterId: context.actor.id }; const valid = validateCareRequest(bound); if (!valid.ok) return valid;
    37	    return run(valid.value, context, async () => {
    38	      const createdAt = clock(); const id = `care-ticket-${++ticketSequence}`;
    39	      const createdEvent = Object.freeze({ id: `care-event-${++eventSequence}`, type: 'created', actorId: context.actor.id, at: createdAt, visibility: 'user' });
    40	      const sla = calculateSla({ priority: valid.value.priority, createdAt, now: createdAt });
    41	      const ticket = Object.freeze({ id, ...clone(valid.value), status: 'new', createdAt, updatedAt: createdAt,
    42	        assigneeId: null, messages: Object.freeze([]), internalNotes: Object.freeze([]), escalationHistory: Object.freeze([]),
    43	        assignmentHistory: Object.freeze([]), timeline: Object.freeze([createdEvent]), sla });
    44	      tickets.set(id, ticket); const notification = await notify(ticket);
    45	      return Object.freeze({ ok: true, code: 'REQUEST_ACCEPTED', data: clone(ticket), receipt: Object.freeze({
    46	        persistence: 'local_volatile', idempotencyKey: context.idempotencyKey,
    47	        acknowledgement: 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.',
    48	        email: Object.freeze({ status: 'not_configured' }), notification }) });
    49	    });
    50	  }
    51
    52	  async function getTicket(id, context) {
    53	    const ticket = find(id); if (!ticket || !context?.actor?.id) return fail('TICKET_NOT_FOUND');
    54	    if (context.actor.kind === 'user') { const projected = projectTicketForRequester(ticket, context.actor.id); return projected.ok ? Object.freeze({ ok: true, code: 'OK', data: projected.ticket }) : projected; }
    55	    if (context.actor.kind !== 'staff' || !context.actor.permissions?.includes('care.ticket.read.scoped')) return fail('TICKET_NOT_FOUND');
    56	    return Object.freeze({ ok: true, code: 'OK', data: clone(ticket) });
    57	  }
    58
    59	  async function addStaffMessage(id, input, context) {
    60	    const denied = privileged(context, 'care.message.create.scoped'); if (denied) return fail(denied);
    61	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    62	    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    63	    return run({ id, body }, context, async () => {
    64	      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
    65	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
    66	      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
    67	      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    68	    });
    69	  }
    70
    71	  async function addUserMessage(id, input, context) {
    72	    const ticket = find(id); if (!ticket || context?.actor?.kind !== 'user' || ticket.requesterId !== context.actor.id) return fail('TICKET_NOT_FOUND');
    73	    if (input?.authorId && input.authorId !== context.actor.id) return fail('FORGED_IDENTITY');
    74	    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    75	    return run({ id, body }, context, async () => {
    76	      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
    77	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
    78	      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
    79	      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    80	    });
    81	  }
    82
    83	  async function addInternalNote(id, input, context) {
    84	    const denied = privileged(context, 'care.internal_note.create'); if (denied) return fail(denied);
    85	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    86	    let body; try { body = safeCareText(input?.body, { max: 2000 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
    87	    return run({ id, body, reason: context.reason }, context, async () => {
    88	      const at = clock(); const note = Object.freeze({ id: `care-note-${++eventSequence}`, authorId: context.actor.id, body, at });
    89	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'internal_note_added', actorId: context.actor.id, at, visibility: 'internal' });
    90	      const next = Object.freeze({ ...ticket, internalNotes: immutableList([...ticket.internalNotes, note]), timeline, updatedAt: at }); tickets.set(id, next);
    91	      return Object.freeze({ ok: true, code: 'INTERNAL_NOTE_ADDED', data: clone(note), audit: Object.freeze({ action: 'care.internal_note.create', reason: context.reason }) });
    92	    });
    93	  }
    94
    95	  async function changeStatus(id, command, context) {
    96	    const denied = privileged(context, 'care.ticket.transition'); if (denied) return fail(denied);
    97	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    98	    return run({ id, ...command, reason: context.reason }, context, async () => {
    99	      const result = transitionTicket({ ticket, toStatus: command.toStatus, actor: context.actor, reason: context.reason,
   100	        resolutionSummary: command.resolutionSummary, now: clock() });
   101	      if (!result.ok) return result; tickets.set(id, result.ticket); return Object.freeze({ ...result, data: clone(result.ticket) });
   102	    });
   103	  }
   104
   105	  async function escalateTicket(id, input, context) {
   106	    const denied = privileged(context, 'care.ticket.escalate'); if (denied) return fail(denied);
   107	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
   108	    let teamId; try { teamId = safeCareText(input?.toTeamId, { max: 128 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
   109	    return run({ id, teamId, reason: context.reason }, context, async () => {
   110	      if (!['acknowledged', 'in_review', 'waiting_user'].includes(ticket.status)) return fail('INVALID_TRANSITION');
   111	      const at = clock(); const entry = Object.freeze({ id: `care-escalation-${++eventSequence}`, fromTeamId: ticket.teamId || null,
   112	        toTeamId: teamId, actorId: context.actor.id, reason: context.reason, at });
   113	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'escalated', actorId: context.actor.id, at, visibility: 'user' });
   114	      const next = Object.freeze({ ...ticket, status: 'escalated', teamId, escalationHistory: immutableList([...ticket.escalationHistory, entry]), timeline, updatedAt: at }); tickets.set(id, next);
   115	      return Object.freeze({ ok: true, code: 'TICKET_ESCALATED', data: clone(next), audit: Object.freeze({ action: 'care.ticket.escalate', reason: context.reason }) });
   116	    });
   117	  }
   118
   119	  return Object.freeze({ submitUserRequest, getTicket, addUserMessage, addStaffMessage, addInternalNote, transitionTicket: changeStatus,
   120	    mutateTicket: changeStatus, escalateTicket,
   121	    listTickets: async (query = {}, context) => {
   122	      const all = [...tickets.values()];
   123	      if (context?.actor?.kind === 'user') return Object.freeze({ ok: true, code: 'OK', items: immutableList(all.filter((ticket) => ticket.requesterId === context.actor.id).map((ticket) => projectTicketForRequester(ticket, context.actor.id).ticket).slice(0, Math.min(50, query.limit || 20))) });
   124	      return fail('PERMISSION_DENIED');
   125	    }
   126	  });
   127	}
--- scripts/pr35/pr35-network.js
     1	const codedError = (code) => Object.assign(new Error(code), { code });
     2	const signature = (value) => JSON.stringify(value, Object.keys(value || {}).sort());
     3
     4	export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
     5	  baseDelayMs = 250, random = Math.random, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
     6	  idempotent = true } = {}) {
     7	  if (signal?.aborted) throw codedError('REQUEST_CANCELLED');
     8	  const attempts = idempotent ? Math.min(3, Math.max(1, maxAttempts)) : 1;
     9	  for (let attempt = 1; attempt <= attempts; attempt++) {
    10	    const controller = new AbortController();
    11	    const cancel = () => controller.abort(codedError('REQUEST_CANCELLED'));
    12	    signal?.addEventListener('abort', cancel, { once: true });
    13	    const timer = setTimeout(() => controller.abort(codedError('REQUEST_TIMEOUT')), Math.min(30000, Math.max(1, timeoutMs)));
    14	    const aborted = new Promise((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }));
    15	    try { return await Promise.race([operation(controller.signal, attempt), aborted]); }
    16	    catch (error) {
    17	      const reason = controller.signal.aborted ? controller.signal.reason : error;
    18	      if (reason?.code === 'REQUEST_TIMEOUT' || reason?.code === 'REQUEST_CANCELLED') throw reason;
    19	      if (!error?.retryable || attempt === attempts) throw codedError('REQUEST_FAILED');
    20	      const ceiling = Math.min(2000, baseDelayMs * (2 ** (attempt - 1)));
    21	      await sleep(Math.max(0, Math.floor(ceiling * Math.min(1, Math.max(0, random())))));
    22	    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
    23	  }
    24	  throw codedError('REQUEST_FAILED');
    25	}
    26
    27	export function createDedupeRegistry() {
    28	  const entries = new Map();
    29	  return Object.freeze({
    30	    run(key, payload, operation) {
    31	      if (typeof key !== 'string' || !key) return Promise.reject(codedError('INVALID_IDEMPOTENCY_KEY'));
    32	      const payloadSignature = signature(payload);
    33	      if (entries.has(key)) {
    34	        const entry = entries.get(key);
    35	        if (entry.signature !== payloadSignature) return Promise.reject(codedError('IDEMPOTENCY_CONFLICT'));
    36	        return entry.promise;
    37	      }
    38	      const promise = Promise.resolve().then(operation);
    39	      entries.set(key, Object.freeze({ signature: payloadSignature, promise }));
    40	      promise.catch(() => entries.delete(key));
    41	      return promise;
    42	    }, clear: () => entries.clear()
    43	  });
    44	}
--- scripts/pr35/pr35-owner-controller.js
     1	import { authorize, canDelegate } from './pr35-policy.js';
     2	import { ROLE_IDS, PERMISSION_IDS, ROLE_TEMPLATES, SCOPE_LEVELS } from './pr35-contracts.js';
     3	import { calculateSla } from './pr35-sla.js';
     4
     5	const PAGE_SIZE = 20;
     6	const text = (value) => String(value ?? '').trim().toLocaleLowerCase();
     7	export function filterAndPage(rows, { query = '', page = 1, pageSize = PAGE_SIZE } = {}, fields = ['id']) {
     8	  const needle = text(query); const size = Math.min(PAGE_SIZE, Math.max(1, Number(pageSize) || PAGE_SIZE));
     9	  const filtered = rows.filter((row) => !needle || fields.some((field) => text(row[field]).includes(needle)));
    10	  const pageCount = Math.max(1, Math.ceil(filtered.length / size)); const current = Math.min(pageCount, Math.max(1, Number(page) || 1));
    11	  return Object.freeze({ items: filtered.slice((current - 1) * size, current * size), page: current, pageCount, total: filtered.length });
    12	}
    13	export function visibleProfileActions(assignDecision, stateDecision) {
    14	  if (!assignDecision?.allowed) return Object.freeze([]);
    15	  return Object.freeze(stateDecision?.allowed ? ['assign', 'suspend', 'revoke'] : ['assign']);
    16	}
    17	const make = (tag, attrs = {}, value = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, val]) => key === 'class' ? node.className = val : node.setAttribute(key, val)); node.textContent = value; return node; };
    18	const scopeFrom = (form) => { const data = new FormData(form); const level = data.get('scopeLevel'); const scope = { level }; for (const key of ['sectorId', 'regionId', 'areaId', 'teamId']) { const value = text(data.get(key)); if (value) scope[key] = value; } return scope; };
    19	const contextKey = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
    20	const safeMessage = (code) => ({ OFFLINE_PRIVILEGED_DENIED: 'لا يمكن تنفيذ إجراء إداري دون اتصال آمن.', CONFIGURATION_REQUIRED: 'الخدمة الآمنة غير مهيأة. لم يتم حفظ أي تغيير.', PERMISSION_DENIED: 'هذا الإجراء غير متاح لصلاحياتك الحالية.', SCOPE_DENIED: 'النطاق المحدد خارج صلاحياتك.', SELF_ELEVATION_DENIED: 'لا يمكن تعديل صلاحياتك بنفسك.' })[code] || 'تعذر إتمام الإجراء بأمان. راجع البيانات وحاول مرة أخرى.';
    21
    22	export function createOwnerController({ root = document, repository, careAdapter, identity, clock = () => new Date().toISOString(), local = false }) {
    23	  const actor = () => identity(); const now = () => clock(); let activeDialog; let returnFocus; let searchAbort; let debounce; let assignmentFilter = 'all';
    24	  const decision = (permission, scope = { level: 'platform' }) => authorize({ actor: actor(), permission, resourceScope: scope, now: now() });
    25	  const setStatus = (message, state = 'idle') => { const node = root.querySelector('[data-owner-status]'); if (node) { node.textContent = message; node.dataset.state = state; } };
    26	  function closeDialog() { if (!activeDialog) return; activeDialog.remove(); activeDialog = null; returnFocus?.focus(); }
    27	  function dialog(title) { returnFocus = document.activeElement; const layer = make('div', { class: 'pr35-layer' }); const panel = make('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-dialog-title', tabindex: '-1' }); panel.append(make('h2', { id: 'pr35-dialog-title' }, title)); layer.append(panel); document.body.append(layer); activeDialog = layer; layer.addEventListener('click', (event) => { if (event.target === layer) closeDialog(); }); layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDialog(); if (event.key === 'Tab') { const controls = [...panel.querySelectorAll('button,input,select,textarea')].filter((item) => !item.hidden && !item.disabled); const first = controls[0], last = controls.at(-1); if (!first) { event.preventDefault(); panel.focus(); } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }); return panel; }
    28	  function openAssignment(subjectId = 'profile-user') {
    29	    const permitted = decision('authorization.assignment.manage'); if (!permitted.allowed) { setStatus(safeMessage(permitted.code), 'failed'); return; }
    30	    const panel = dialog('تكليف تشغيلي'); const form = make('form', { class: 'pr35-form', 'data-assignment-form': '' });
    31	    const subject = make('input', { name: 'subjectId', value: subjectId, required: '', maxlength: '128', 'aria-label': 'معرف المستخدم' }); subject.value = subjectId;
    32	    const role = make('select', { name: 'roleId', required: '', 'aria-label': 'المنصب' }); ROLE_IDS.filter((id) => id !== 'owner').forEach((id) => role.append(make('option', { value: id }, id.replaceAll('_', ' '))));
    33	    const scopeLevel = make('select', { name: 'scopeLevel', required: '', 'aria-label': 'مستوى النطاق' }); SCOPE_LEVELS.forEach((id) => scopeLevel.append(make('option', { value: id }, id)));
    34	    const scopeId = make('input', { name: 'sectorId', maxlength: '128', placeholder: 'معرف القطاع عند الحاجة', 'aria-label': 'معرف القطاع' });
    35	    const permission = make('select', { name: 'permissionIds', multiple: '', required: '', 'aria-label': 'الصلاحيات المفوضة' }); PERMISSION_IDS.filter((id) => id !== 'authorization.owner.manage' && id !== 'audit.event.append').forEach((id) => permission.append(make('option', { value: id }, id)));
    36	    const expiry = make('input', { name: 'expiresAt', type: 'datetime-local', required: '', 'aria-label': 'تاريخ انتهاء التكليف' });
    37	    const reason = make('textarea', { name: 'reason', required: '', maxlength: '500', 'data-assignment-reason': '', placeholder: 'سبب موثق ومطلوب', 'aria-label': 'سبب التكليف' });
    38	    const state = make('div', { class: 'pr35-review', 'data-assignment-review': '', 'aria-live': 'polite' });
    39	    const next = make('button', { type: 'button', class: 'pr35-primary' }, 'مراجعة التكليف'); const cancel = make('button', { type: 'button' }, 'إلغاء');
    40	    form.append(subject, role, scopeLevel, scopeId, permission, expiry, reason, state, next, cancel); panel.append(form); cancel.addEventListener('click', closeDialog);
    41	    next.addEventListener('click', () => {
    42	      if (!form.reportValidity()) return; const data = new FormData(form); const permissionIds = data.getAll('permissionIds'); const scope = scopeFrom(form);
    43	      const review = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
    44	      if (!review.allowed) { state.textContent = safeMessage(review.code); state.dataset.state = 'failed'; return; }
    45	      state.textContent = `مراجعة قبل التأكيد: ${data.get('roleId')} — ${scope.level} — ${permissionIds.length} صلاحيات — ينتهي ${data.get('expiresAt')}`; state.dataset.state = 'review'; next.hidden = true;
    46	      const confirm = make('button', { type: 'button', class: 'pr35-primary', 'data-assignment-confirm': '' }, 'تأكيد التكليف المحلي'); form.append(confirm); confirm.focus();
    47	      confirm.addEventListener('click', async () => {
    48	        const finalReview = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
    49	        if (!finalReview.allowed || !navigator.onLine) { state.textContent = safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : finalReview.code); state.dataset.state = 'failed'; return; }
    50	        confirm.disabled = true; state.textContent = 'جاري التحقق والتنفيذ…';
    51	        const result = await repository.createAssignment({ subjectId: data.get('subjectId'), roleId: data.get('roleId'), permissionIds, scope, startsAt: now(), expiresAt: new Date(data.get('expiresAt')).toISOString() }, { actor: actor(), now: now(), reason: data.get('reason'), correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') });
    52	        if (!result.ok) { state.textContent = safeMessage(result.code); state.dataset.state = 'failed'; confirm.disabled = false; return; }
    53	        state.textContent = local ? 'تم التكليف داخل العرض المحلي المؤقت فقط.' : 'تم تأكيد التكليف من الخدمة الآمنة.'; state.dataset.state = 'sent'; await renderAssignments();
    54	      });
    55	    }); panel.focus();
    56	  }
    57	  async function changeAssignment(id, action) {
    58	    const allowed = decision('authorization.assignment.manage'); if (!allowed.allowed || !navigator.onLine) { setStatus(safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : allowed.code), 'failed'); return; }
    59	    const panel = dialog(action === 'revoke' ? 'سحب التكليف' : 'تعليق التكليف'); const form = make('form', { class: 'pr35-form' }); const reason = make('textarea', { required: '', maxlength: '500', 'aria-label': 'سبب الإجراء', placeholder: 'السبب مطلوب للتوثيق' }); const confirm = make('button', { type: 'submit', class: 'pr35-danger' }, 'تأكيد الإجراء'); form.append(reason, confirm); panel.append(form);
    60	    form.addEventListener('submit', async (event) => { event.preventDefault(); if (!form.reportValidity()) return; confirm.disabled = true; const method = action === 'revoke' ? repository.revokeAssignment : repository.suspendAssignment; const result = await method({ assignmentId: id }, { actor: actor(), now: now(), reason: reason.value, correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') }); setStatus(result.ok ? 'تم تحديث التكليف محليًا مع سجل تدقيق.' : safeMessage(result.code), result.ok ? 'sent' : 'failed'); closeDialog(); await renderAssignments(); }); panel.focus();
    61	  }
    62	  async function renderAssignments(query = '') {
    63	    const host = root.querySelector('[data-owner-assignments-list]'); if (!host) return; host.replaceChildren(make('div', { class: 'pr35-skeleton', 'aria-hidden': 'true' }));
    64	    const result = await repository.listAssignments({ limit: 20, scope: { level: 'platform' } }, { actor: actor(), now: now() }); host.replaceChildren();
    65	    if (!result.ok) { host.append(make('p', { class: 'pr35-empty' }, safeMessage(result.code))); return; }
    66	    const filtered = assignmentFilter === 'all' ? result.items : result.items.filter((item) => item.state === assignmentFilter);
    67	    const page = filterAndPage(filtered, { query },  ['subjectId', 'roleId', 'state']); if (!page.items.length) { host.append(make('p', { class: 'pr35-empty' }, 'لا توجد تكليفات مطابقة.')); return; }
    68	    page.items.forEach((item) => { const card = make('article', { class: 'pr35-row' }); card.append(make('strong', {}, item.subjectId), make('span', {}, `${item.roleId} · ${item.scope.level} · ${item.state}`)); if (item.state === 'active') { const suspend = make('button', { type: 'button', 'data-suspend-assignment': item.id }, 'تعليق'); const revoke = make('button', { type: 'button', 'data-revoke-assignment': item.id }, 'سحب'); suspend.addEventListener('click', () => changeAssignment(item.id, 'suspend')); revoke.addEventListener('click', () => changeAssignment(item.id, 'revoke')); card.append(suspend, revoke); } host.append(card); });
    69	  }
    70	  function renderDemoQueues() {
    71	    const care = root.querySelector('[data-owner-care-list]'); const permissions = root.querySelector('[data-owner-permission-list]'); const audit = root.querySelector('[data-owner-audit-list]');
    72	    if (care) { const samples = [{ id: 'TC-1042', category: 'مشكلة حساب', priority: 'urgent', createdAt: new Date(Date.parse(now()) - 55 * 60000).toISOString() }, { id: 'TC-1041', category: 'اعتراض على رفض', priority: 'normal', createdAt: new Date(Date.parse(now()) - 2 * 3600000).toISOString() }]; care.replaceChildren(); samples.forEach((ticket) => { const sla = calculateSla({ priority: ticket.priority, createdAt: ticket.createdAt, now: now() }); const node = make('article', { class: `pr35-row${sla.breached || sla.remainingMs < 15 * 60000 ? ' is-warning' : ''}` }); node.append(make('strong', {}, `${ticket.id} — ${ticket.category}`), make('span', {}, sla.breached ? 'تجاوز SLA — يحتاج تصعيدًا' : `متبقٍ ${Math.max(1, Math.ceil(sla.remainingMs / 60000))} دقيقة`), make('button', { type: 'button', disabled: '', title: 'عرض توضيحي محلي' }, 'عرض محلي')); care.append(node); }); }
    73	    if (permissions) permissions.replaceChildren(make('p', { class: 'pr35-empty' }, 'لا توجد طلبات صلاحية معلقة في العرض المحلي.'));
    74	    if (audit) audit.replaceChildren(make('p', { class: 'pr35-empty' }, 'ستظهر أحداث التدقيق غير القابلة للتعديل بعد الإجراءات المحلية.'));
    75	  }
    76	  function bindSearch() { const input = root.querySelector('[data-owner-search]'); if (!input) return; input.addEventListener('input', () => { clearTimeout(debounce); searchAbort?.abort(); searchAbort = new AbortController(); debounce = setTimeout(() => { if (!searchAbort.signal.aborted) renderAssignments(input.value); }, 220); }); root.querySelectorAll('[data-owner-filter]').forEach((button) => button.addEventListener('click', () => { assignmentFilter = button.dataset.ownerFilter; root.querySelectorAll('[data-owner-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button))); renderAssignments(input.value); })); }
    77	  async function mountConsole() { const gate = root.querySelector('[data-owner-auth-gate]'); const consoleNode = root.querySelector('[data-owner-console]'); const allowed = decision('owner.console.read'); if (!allowed.allowed) { if (gate) gate.textContent = safeMessage(allowed.code); return false; } if (gate) gate.hidden = true; if (consoleNode) consoleNode.hidden = false; root.querySelector('[data-owner-local-disclosure]')?.toggleAttribute('hidden', !local); root.querySelector('[data-new-assignment]')?.addEventListener('click', () => openAssignment()); bindSearch(); renderDemoQueues(); await renderAssignments(); return true; }
    78	  function mountProfileActions(host) { const assign = decision('authorization.assignment.manage'); const state = host.dataset.assignmentId ? decision('authorization.assignment.manage') : { allowed: false }; const actions = visibleProfileActions(assign, state); if (!actions.length) { host.remove(); return; } host.hidden = false; const trigger = host.querySelector('[data-profile-actions-trigger]'); const menu = host.querySelector('[role="menu"]'); trigger.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button')?.focus(); }); host.querySelector('[data-profile-assign]')?.addEventListener('click', () => openAssignment(host.dataset.subjectId || 'profile-user')); host.querySelector('[data-profile-suspend]')?.toggleAttribute('hidden', !actions.includes('suspend')); host.querySelector('[data-profile-revoke]')?.toggleAttribute('hidden', !actions.includes('revoke')); if (host.dataset.assignmentId) { host.querySelector('[data-profile-suspend]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'suspend')); host.querySelector('[data-profile-revoke]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'revoke')); } menu.addEventListener('keydown', (event) => { const items = [...menu.querySelectorAll('button:not([hidden])')]; const index = items.indexOf(document.activeElement); if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length].focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); } if (event.key === 'Escape') { menu.hidden = true; trigger.focus(); } }); }
    79	  return Object.freeze({ mountConsole, mountProfileActions, openAssignment, closeDialog, renderAssignments });
    80	}
--- scripts/pr35/pr35-policy.js
     1	import { PERMISSION_IDS, ROLE_IDS } from './pr35-contracts.js';
     2	import { normalizeScope, scopeContains } from './pr35-scope.js';
     3
     4	const rank = Object.freeze({ regular_user: 0, service_provider: 1, sales: 1, marketing: 1,
     5	  moderator: 2, tiger_care: 2, campaign_manager: 3, group_manager: 4, area_manager: 5,
     6	  regional_manager: 6, sector_manager: 7, platform_admin: 8, owner: 9 });
     7	const decision = (allowed, code, ids = []) => Object.freeze({ allowed, code, effectiveAssignmentIds: Object.freeze([...ids]) });
     8
     9	function identityFailure(actor) {
    10	  if (!actor?.id) return 'IDENTITY_REQUIRED';
    11	  if (actor.accountState === 'suspended') return 'ACCOUNT_SUSPENDED';
    12	  if (actor.accountState !== 'active') return 'ACCOUNT_INACTIVE';
    13	  if (actor.sessionValidAfter && (!actor.sessionIssuedAt || Date.parse(actor.sessionIssuedAt) < Date.parse(actor.sessionValidAfter))) return 'SESSION_INVALIDATED';
    14	  return null;
    15	}
    16	export function resolveEffectiveAssignments({ actor, now }) {
    17	  if (identityFailure(actor) || !Number.isFinite(Date.parse(now))) return [];
    18	  const at = Date.parse(now);
    19	  return (Array.isArray(actor.assignments) ? actor.assignments : []).filter((item) =>
    20	    item?.state === 'active' && item.subjectId === actor.id && Number.isFinite(Date.parse(item.startsAt)) &&
    21	    Date.parse(item.startsAt) <= at && (!item.expiresAt || Date.parse(item.expiresAt) > at));
    22	}
    23	export function authorize({ actor, permission, resourceScope, now }) {
    24	  const failure = identityFailure(actor); if (failure) return decision(false, failure);
    25	  if (!PERMISSION_IDS.includes(permission)) return decision(false, 'UNKNOWN_PERMISSION');
    26	  let scope; try { scope = normalizeScope(resourceScope); } catch { return decision(false, 'INVALID_SCOPE'); }
    27	  const assignments = resolveEffectiveAssignments({ actor, now });
    28	  const owned = assignments.filter((item) => Array.isArray(item.permissionIds) && item.permissionIds.includes(permission));
    29	  if (!owned.length) return decision(false, 'PERMISSION_DENIED');
    30	  const contained = owned.filter((item) => scopeContains(item.scope, scope));
    31	  if (!contained.length) return decision(false, 'SCOPE_DENIED');
    32	  return decision(true, 'AUTHORIZED', contained.map((item) => item.id).sort());
    33	}
    34	export function canDelegate({ actor, subjectId, permissionIds, scope, roleId, now }) {
    35	  if (!subjectId || subjectId === actor?.id) return decision(false, 'SELF_ELEVATION_DENIED');
    36	  if (!ROLE_IDS.includes(roleId)) return decision(false, 'UNKNOWN_ROLE');
    37	  if (!Array.isArray(permissionIds) || permissionIds.length > 50 || new Set(permissionIds).size !== permissionIds.length) return decision(false, 'INVALID_PERMISSION_LIST');
    38	  if (permissionIds.some((id) => !PERMISSION_IDS.includes(id))) return decision(false, 'UNKNOWN_PERMISSION');
    39	  const effective = resolveEffectiveAssignments({ actor, now });
    40	  if (identityFailure(actor)) return decision(false, identityFailure(actor));
    41	  const permissionOwners = effective.filter((item) => scopeContains(item.scope, scope));
    42	  const ownerAssignment = effective.find((item) => item.roleId === 'owner' && item.permissionIds?.includes('authorization.owner.manage') && scopeContains(item.scope, scope));
    43	  if (roleId === 'owner' || permissionIds.includes('authorization.owner.manage')) {
    44	    if (permissionIds.some((permission) => !permissionOwners.some((item) => item.permissionIds?.includes(permission)))) return decision(false, 'UNOWNED_PERMISSION_DENIED');
    45	    return ownerAssignment ? decision(true, 'AUTHORIZED', [ownerAssignment.id]) : decision(false, 'OWNER_CONTROL_REQUIRED');
    46	  }
    47	  const delegators = effective.filter((item) => item.permissionIds?.includes('authorization.permission.delegate') && scopeContains(item.scope, scope));
    48	  if (!delegators.length) return decision(false, 'DELEGATION_SCOPE_EXCEEDED');
    49	  if (permissionIds.some((permission) => !permissionOwners.some((item) => item.permissionIds?.includes(permission)))) return decision(false, 'UNOWNED_PERMISSION_DENIED');
    50	  const ceiling = Math.max(...delegators.map((item) => rank[item.roleId] ?? -1));
    51	  if ((rank[roleId] ?? Infinity) >= ceiling) return decision(false, 'DELEGATION_AUTHORITY_EXCEEDED');
    52	  return decision(true, 'AUTHORIZED', delegators.map((item) => item.id).sort());
    53	}
--- scripts/pr35/pr35-production-adapter.js
     1	const fail = (code) => Object.freeze({ ok: false, code });
     2	const READ_OPERATIONS = new Set(['listTickets', 'getTicket']);
     3
     4	function confirmedResult(result, operation) {
     5	  if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean' || typeof result.code !== 'string') {
     6	    return fail('REMOTE_ENFORCEMENT_FAILED');
     7	  }
     8	  if (!result.ok) return Object.freeze(structuredClone(result));
     9	  if (!READ_OPERATIONS.has(operation) && result.receipt?.confirmed !== true) {
    10	    return fail('REMOTE_CONFIRMATION_REQUIRED');
    11	  }
    12	  return Object.freeze(structuredClone(result));
    13	}
    14
    15	/**
    16	 * Future trusted transport boundary. Configuration is injected by the host;
    17	 * this module contains no endpoint or credential and performs no I/O itself.
    18	 * Every write needs an explicit confirmed receipt from backend enforcement.
    19	 */
    20	export function createProductionCareAdapter({ transport, verified = false, online = () => true } = {}) {
    21	  const call = async (operation, payload, context, privileged = false) => {
    22	    if (typeof transport !== 'function' || verified !== true) return fail('CONFIGURATION_REQUIRED');
    23	    if (!context?.actor?.id) return fail('IDENTITY_REQUIRED');
    24	    try {
    25	      if (!online()) return fail(privileged ? 'OFFLINE_PRIVILEGED_DENIED' : 'NETWORK_UNAVAILABLE');
    26	      const result = await transport(Object.freeze({ operation, payload: structuredClone(payload), context: structuredClone(context) }));
    27	      return confirmedResult(result, operation);
    28	    } catch { return fail('REMOTE_ENFORCEMENT_FAILED'); }
    29	  };
    30	  return Object.freeze({
    31	    listTickets: (query, context) => call('listTickets', query, context),
    32	    submitUserRequest: (input, context) => call('submitUserRequest', input, context),
    33	    getTicket: (id, context) => call('getTicket', { id }, context),
    34	    addUserMessage: (id, input, context) => call('addUserMessage', { id, input }, context),
    35	    addStaffMessage: (id, input, context) => call('addStaffMessage', { id, input }, context, true),
    36	    addInternalNote: (id, input, context) => call('addInternalNote', { id, input }, context, true),
    37	    escalateTicket: (id, input, context) => call('escalateTicket', { id, input }, context, true),
    38	    mutateTicket: (input, context) => call('mutateTicket', input, context, true),
    39	    mutateAuthorization: (input, context) => call('mutateAuthorization', input, context, true),
    40	    appendAudit: (input, context) => call('appendAudit', input, context, true)
    41	  });
    42	}
--- scripts/pr35/pr35-routing.js
     1	import { safeCareText } from './pr35-tiger-care.js';
     2
     3	const fail = (code) => Object.freeze({ ok: false, code });
     4	const eligible = (assignment, ticket, now) => assignment.state === 'active'
     5	  && (!assignment.startsAt || Date.parse(assignment.startsAt) <= Date.parse(now))
     6	  && (!assignment.expiresAt || Date.parse(now) < Date.parse(assignment.expiresAt))
     7	  && (!assignment.sectorIds?.length || assignment.sectorIds.includes(ticket.sectorId))
     8	  && (!assignment.categories?.length || assignment.categories.includes(ticket.category))
     9	  && (!assignment.priorities?.length || assignment.priorities.includes(ticket.priority))
    10	  && (!assignment.teamIds?.length || assignment.teamIds.includes(ticket.teamId));
    11
    12	export function routeTicket({ ticket, assignments = [], now }) {
    13	  if (!ticket || !Number.isFinite(Date.parse(now))) return fail('INVALID_ROUTING_INPUT');
    14	  const matches = assignments.filter((item) => eligible(item, ticket, now)).sort((a, b) =>
    15	    (a.openTicketCount || 0) - (b.openTicketCount || 0) || a.subjectId.localeCompare(b.subjectId) || a.id.localeCompare(b.id));
    16	  if (!matches.length) return Object.freeze({ ok: false, code: 'NO_ELIGIBLE_ASSIGNEE', assigneeId: null,
    17	    teamId: ticket.teamId || null, escalationRequired: true });
    18	  const match = matches[0];
    19	  return Object.freeze({ ok: true, code: 'ROUTED', assigneeId: match.subjectId, assignmentId: match.id,
    20	    teamId: ticket.teamId || match.teamIds?.[0] || null,
    21	    escalationRequired: ticket.priority === 'urgent' || ticket.category === 'fraud_safety' });
    22	}
    23
    24	export function assignTicket({ ticket, assigneeId, actor, reason, now }) {
    25	  if (!actor?.permissions?.includes('care.ticket.assign')) return fail('PERMISSION_DENIED');
    26	  try {
    27	    const safeAssignee = safeCareText(assigneeId, { max: 128 }); const safeReason = safeCareText(reason, { max: 500 });
    28	    const at = new Date(now); if (!Number.isFinite(at.getTime())) return fail('INVALID_TIMESTAMP');
    29	    const entry = Object.freeze({ assigneeId: safeAssignee, assignedBy: actor.id, reason: safeReason, at: at.toISOString() });
    30	    const history = Object.freeze([...(ticket.assignmentHistory || []).map((item) => Object.freeze(structuredClone(item))), entry]);
    31	    return Object.freeze({ ok: true, code: 'TICKET_ASSIGNED', ticket: Object.freeze({ ...structuredClone(ticket), assigneeId: safeAssignee, assignmentHistory: history }), auditInput: entry });
    32	  } catch (error) { return fail(error.code || 'INVALID_ASSIGNMENT'); }
    33	}
--- scripts/pr35/pr35-sanitize.js
     1	import { LIMITS } from './pr35-contracts.js';
     2
     3	const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
     4	export function domainError(code) { const error = new TypeError(code); error.code = code; return error; }
     5	export function assertSafeKey(key) {
     6	  if (typeof key !== 'string' || forbiddenKeys.has(key)) throw domainError('UNSAFE_KEY');
     7	  return key;
     8	}
     9	export function normalizeText(value, { max = LIMITS.TEXT, required = false } = {}) {
    10	  if (value === undefined || value === null) {
    11	    if (required) throw domainError('FIELD_REQUIRED');
    12	    return '';
    13	  }
    14	  if (typeof value !== 'string') throw domainError('INVALID_FIELD_TYPE');
    15	  const normalized = value.normalize('NFC').trim();
    16	  if (required && !normalized) throw domainError('FIELD_REQUIRED');
    17	  if ([...normalized].length > max) throw domainError('FIELD_TOO_LONG');
    18	  return normalized;
    19	}
    20	export function sanitizeRecord(input, schema) {
    21	  if (!input || typeof input !== 'object' || Array.isArray(input)) throw domainError('INVALID_RECORD');
    22	  const output = Object.create(null);
    23	  for (const key of Object.keys(input)) {
    24	    assertSafeKey(key);
    25	    if (!Object.hasOwn(schema, key)) throw domainError('UNKNOWN_FIELD');
    26	  }
    27	  for (const [key, rule] of Object.entries(schema)) {
    28	    assertSafeKey(key);
    29	    const value = input[key];
    30	    if (rule.type === 'text') output[key] = normalizeText(value, rule);
    31	    else if (rule.type === 'textList') {
    32	      if (value === undefined) { output[key] = Object.freeze([]); continue; }
    33	      if (!Array.isArray(value)) throw domainError('INVALID_FIELD_TYPE');
    34	      if (value.length > rule.maxItems) throw domainError('LIST_LIMIT_EXCEEDED');
    35	      output[key] = Object.freeze(value.map((item) => normalizeText(item, { max: rule.itemMax, required: true })));
    36	    } else throw domainError('INVALID_SCHEMA');
    37	  }
    38	  return Object.freeze(output);
    39	}
--- scripts/pr35/pr35-scope.js
     1	import { SCOPE_LEVELS } from './pr35-contracts.js';
     2	import { normalizeText, domainError } from './pr35-sanitize.js';
     3
     4	const ancestors = ['sectorId', 'regionId', 'areaId', 'teamId'];
     5	export function normalizeScope(input) {
     6	  if (!input || typeof input !== 'object' || Array.isArray(input) || !SCOPE_LEVELS.includes(input.level)) throw domainError('INVALID_SCOPE');
     7	  try {
     8	    const levelIndex = SCOPE_LEVELS.indexOf(input.level);
     9	    const output = { level: input.level };
    10	    for (let index = 1; index <= levelIndex; index += 1) {
    11	      const key = ancestors[index - 1];
    12	      output[key] = normalizeText(input[key], { max: 128, required: true });
    13	    }
    14	    const allowed = new Set(['level', ...ancestors.slice(0, levelIndex)]);
    15	    if (Object.keys(input).some((key) => !allowed.has(key))) throw domainError('INVALID_SCOPE');
    16	    return Object.freeze(output);
    17	  } catch { throw domainError('INVALID_SCOPE'); }
    18	}
    19	export function scopeContains(grantInput, resourceInput) {
    20	  try {
    21	    const grant = normalizeScope(grantInput); const resource = normalizeScope(resourceInput);
    22	    const grantIndex = SCOPE_LEVELS.indexOf(grant.level); const resourceIndex = SCOPE_LEVELS.indexOf(resource.level);
    23	    if (grantIndex > resourceIndex) return false;
    24	    return ancestors.slice(0, grantIndex).every((key) => grant[key] === resource[key]);
    25	  } catch { return false; }
    26	}
--- scripts/pr35/pr35-sla.js
     1	import { CARE_PRIORITIES } from './pr35-contracts.js';
     2
     3	export const SLA_RESPONSE_HOURS = Object.freeze({ urgent: 1, high: 4, normal: 24, low: 48 });
     4	export function calculateSla({ priority, createdAt, acknowledgedAt = null, resolvedAt = null, now }) {
     5	  if (!CARE_PRIORITIES.includes(priority)) return Object.freeze({ ok: false, code: 'INVALID_PRIORITY' });
     6	  const created = Date.parse(createdAt); const current = Date.parse(now);
     7	  if (!Number.isFinite(created) || !Number.isFinite(current)) return Object.freeze({ ok: false, code: 'INVALID_TIMESTAMP' });
     8	  const responseBudgetHours = SLA_RESPONSE_HOURS[priority];
     9	  const due = created + responseBudgetHours * 3600000;
    10	  const stoppedAt = acknowledgedAt ? Date.parse(acknowledgedAt) : resolvedAt ? Date.parse(resolvedAt) : current;
    11	  if (!Number.isFinite(stoppedAt)) return Object.freeze({ ok: false, code: 'INVALID_TIMESTAMP' });
    12	  const breached = stoppedAt >= due;
    13	  return Object.freeze({ ok: true, code: 'OK', responseBudgetHours, dueAt: new Date(due).toISOString(),
    14	    breached, state: breached ? 'breached' : acknowledgedAt || resolvedAt ? 'met' : 'active',
    15	    remainingMs: Math.max(0, due - stoppedAt) });
    16	}
--- scripts/pr35/pr35-tiger-care.js
     1	import { CARE_CATEGORIES, CARE_PRIORITIES, TICKET_STATUSES } from './pr35-contracts.js';
     2	import { normalizeText, assertSafeKey } from './pr35-sanitize.js';
     3
     4	export const AR_ACKNOWLEDGEMENT = 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.';
     5	export const EN_ACKNOWLEDGEMENT = 'Your request has been received. We will contact you within 24 hours.';
     6	const unsafeMarkup = /<\s*\/?\s*[a-z!]|(?:javascript|data)\s*:|\bon\w+\s*=/iu;
     7	const transitions = Object.freeze({
     8	  new: ['acknowledged', 'cancelled'], acknowledged: ['in_review', 'waiting_user', 'escalated', 'cancelled'],
     9	  in_review: ['waiting_user', 'escalated', 'resolved', 'cancelled'],
    10	  waiting_user: ['in_review', 'escalated', 'cancelled'], escalated: ['in_review', 'waiting_user', 'resolved', 'cancelled'],
    11	  resolved: ['in_review', 'closed'], closed: [], cancelled: []
    12	});
    13	const fail = (code) => Object.freeze({ ok: false, code });
    14	const clone = (value) => structuredClone(value);
    15
    16	export function safeCareText(value, { max, required = true } = {}) {
    17	  const text = normalizeText(value, { max, required });
    18	  if (unsafeMarkup.test(text)) throw Object.assign(new TypeError('UNSAFE_CONTENT'), { code: 'UNSAFE_CONTENT' });
    19	  return text;
    20	}
    21
    22	export function validateCareRequest(input) {
    23	  try {
    24	    if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('INVALID_REQUEST');
    25	    for (const key of Object.keys(input)) assertSafeKey(key);
    26	    if (!CARE_CATEGORIES.includes(input.category)) return fail('INVALID_REQUEST_TYPE');
    27	    if (!CARE_PRIORITIES.includes(input.priority)) return fail('INVALID_PRIORITY');
    28	    const value = Object.freeze({ requesterId: safeCareText(input.requesterId, { max: 128 }), category: input.category,
    29	      priority: input.priority, subject: safeCareText(input.subject, { max: 160 }),
    30	      description: safeCareText(input.description, { max: 4000 }),
    31	      sectorId: safeCareText(input.sectorId, { max: 128, required: false }),
    32	      listingId: safeCareText(input.listingId, { max: 128, required: false }),
    33	      teamId: safeCareText(input.teamId, { max: 128, required: false }) });
    34	    return Object.freeze({ ok: true, code: 'OK', value });
    35	  } catch (error) { return fail(error.code || 'INVALID_REQUEST'); }
    36	}
    37
    38	export function transitionTicket({ ticket, toStatus, actor, reason, resolutionSummary, now }) {
    39	  if (!ticket || !TICKET_STATUSES.includes(ticket.status) || !TICKET_STATUSES.includes(toStatus)) return fail('INVALID_STATUS');
    40	  const requesterCancellation = actor?.kind === 'user' && toStatus === 'cancelled';
    41	  if (requesterCancellation) {
    42	    if (!actor?.id || ticket.requesterId !== actor.id) return fail('TICKET_NOT_FOUND');
    43	    if (ticket.status !== 'new') return fail('CANCELLATION_NOT_ALLOWED');
    44	  } else if (!actor?.id || actor.kind !== 'staff' || !actor.permissions?.includes('care.ticket.transition')) return fail('PERMISSION_DENIED');
    45	  if (!transitions[ticket.status].includes(toStatus)) return fail(transitions[ticket.status].length ? 'INVALID_TRANSITION' : 'TERMINAL_STATUS');
    46	  try {
    47	    const safeReason = safeCareText(reason, { max: 500 });
    48	    let safeResolution = ticket.resolutionSummary || '';
    49	    if (toStatus === 'resolved') safeResolution = safeCareText(resolutionSummary, { max: 1000 });
    50	    const at = new Date(now); if (!Number.isFinite(at.getTime())) return fail('INVALID_TIMESTAMP');
    51	    const reopening = ticket.status === 'resolved' && toStatus === 'in_review';
    52	    const event = Object.freeze({ id: `transition:${ticket.id}:${at.toISOString()}:${toStatus}`, type: 'status_changed',
    53	      actorId: actor.id, at: at.toISOString(), fromStatus: ticket.status, toStatus, reason: safeReason });
    54	    const timeline = appendTimelineEvent(ticket.timeline || [], event);
    55	    if (!Array.isArray(timeline)) return timeline;
    56	    const next = Object.freeze({ ...clone(ticket), status: toStatus, resolutionSummary: safeResolution,
    57	      reopenedCount: (ticket.reopenedCount || 0) + (reopening ? 1 : 0), timeline });
    58	    return Object.freeze({ ok: true, code: reopening ? 'TICKET_REOPENED' : 'TICKET_TRANSITIONED', ticket: next,
    59	      auditInput: Object.freeze({ action: reopening ? 'care.ticket.reopen' : 'care.ticket.transition', reason: safeReason, at: at.toISOString() }) });
    60	  } catch (error) {
    61	    if (error.code === 'FIELD_REQUIRED') return fail(reason === undefined || reason === null || reason === '' ? 'REASON_REQUIRED' : 'RESOLUTION_SUMMARY_REQUIRED');
    62	    return fail(error.code || 'INVALID_COMMAND');
    63	  }
    64	}
    65
    66	export function projectTicketForRequester(ticket, actorId) {
    67	  if (!ticket || !actorId || ticket.requesterId !== actorId) return fail('TICKET_NOT_FOUND');
    68	  const { internalNotes: _n, routingReason: _r, auditMetadata: _a, assignmentHistory: _h,
    69	    escalationHistory: _e, ...visible } = clone(ticket);
    70	  visible.messages = (visible.messages || []).filter((message) => message.visibility === 'user');
    71	  visible.timeline = (visible.timeline || []).filter((event) => event.visibility !== 'internal');
    72	  return Object.freeze({ ok: true, code: 'OK', ticket: Object.freeze(visible) });
    73	}
    74
    75	export function createCareTimeline() { return Object.freeze([]); }
    76	export function appendTimelineEvent(timeline, event) {
    77	  if (!Array.isArray(timeline) || !event?.id || !event.type || !event.actorId || !Number.isFinite(Date.parse(event.at))) return fail('INVALID_TIMELINE_EVENT');
    78	  if (timeline.some((item) => item.id === event.id)) return fail('DUPLICATE_EVENT');
    79	  return Object.freeze([...timeline.map((item) => Object.freeze(clone(item))), Object.freeze(clone(event))]);
    80	}

exec
/bin/bash -lc 'for f in scripts/pr35/pr35-contracts.js scripts/pr35/pr35-policy.js scripts/pr35/pr35-local-adapter.js scripts/pr35/pr35-owner-controller.js scripts/pr35/pr35-care-controller.js scripts/pr35/pr35-network.js scripts/pr35/pr35-drafts.js; do echo "--- $f"; nl -ba "$f"; done' in /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
 succeeded in 209ms:
--- scripts/pr35/pr35-contracts.js
     1	const frozen = (values) => Object.freeze([...values]);
     2
     3	export const ROLE_IDS = frozen(['owner', 'platform_admin', 'sector_manager', 'regional_manager',
     4	  'area_manager', 'group_manager', 'campaign_manager', 'sales', 'marketing', 'tiger_care',
     5	  'moderator', 'service_provider', 'regular_user']);
     6
     7	export const PERMISSION_IDS = frozen(['owner.console.read', 'authorization.assignment.read',
     8	  'authorization.assignment.manage', 'authorization.owner.manage',
     9	  'authorization.permission.delegate', 'care.request.create', 'care.ticket.read.own',
    10	  'care.ticket.read.scoped', 'care.ticket.acknowledge', 'care.ticket.assign',
    11	  'care.ticket.transition', 'care.ticket.escalate', 'care.ticket.resolve',
    12	  'care.message.create.own', 'care.message.create.scoped', 'care.internal_note.read',
    13	  'care.internal_note.create', 'care.routing.manage', 'care.sla.manage',
    14	  'audit.event.read.scoped', 'audit.event.append']);
    15
    16	export const SCOPE_LEVELS = frozen(['platform', 'sector', 'region', 'area', 'team']);
    17	export const ASSIGNMENT_STATES = frozen(['pending', 'active', 'suspended', 'revoked', 'expired']);
    18	export const CARE_CATEGORIES = frozen(['management_contact', 'support', 'complaint_report',
    19	  'missing_category', 'rejection_appeal', 'account_issue', 'sector_access_request',
    20	  'fraud_safety', 'other']);
    21	export const CARE_PRIORITIES = frozen(['low', 'normal', 'high', 'urgent']);
    22	export const TICKET_STATUSES = frozen(['new', 'acknowledged', 'in_review', 'waiting_user',
    23	  'escalated', 'resolved', 'closed', 'cancelled']);
    24
    25	const permissions = (...ids) => Object.freeze({ permissionIds: frozen(ids) });
    26	const allExceptBackendAudit = PERMISSION_IDS.filter((id) => id !== 'audit.event.append');
    27	export const ROLE_TEMPLATES = Object.freeze({
    28	  owner: permissions(...allExceptBackendAudit),
    29	  platform_admin: permissions('owner.console.read', 'authorization.assignment.read',
    30	    'authorization.assignment.manage', 'authorization.permission.delegate', 'care.ticket.read.scoped',
    31	    'care.ticket.acknowledge', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate',
    32	    'care.ticket.resolve', 'care.message.create.scoped', 'care.routing.manage', 'care.sla.manage',
    33	    'audit.event.read.scoped'),
    34	  sector_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate'),
    35	  regional_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate'),
    36	  area_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition'),
    37	  group_manager: permissions('care.ticket.read.scoped', 'care.ticket.transition'),
    38	  campaign_manager: permissions('care.ticket.read.scoped'), sales: permissions(), marketing: permissions(),
    39	  tiger_care: permissions('care.ticket.read.scoped', 'care.ticket.acknowledge', 'care.ticket.transition',
    40	    'care.ticket.escalate', 'care.ticket.resolve', 'care.message.create.scoped'),
    41	  moderator: permissions('care.ticket.read.scoped'), service_provider: permissions(),
    42	  regular_user: permissions('care.request.create', 'care.ticket.read.own', 'care.message.create.own')
    43	});
    44
    45	export const ERROR_CODES = Object.freeze({
    46	  PAGE_LIMIT_EXCEEDED: 'PAGE_LIMIT_EXCEEDED', FIELD_TOO_LONG: 'FIELD_TOO_LONG',
    47	  INVALID_CORRELATION_KEY: 'INVALID_CORRELATION_KEY', INVALID_IDEMPOTENCY_KEY: 'INVALID_IDEMPOTENCY_KEY'
    48	});
    49	export const LIMITS = Object.freeze({ PAGE_DEFAULT: 20, PAGE_MAX: 50, CURSOR: 256, KEY: 128,
    50	  TEXT: 500, REASON: 500, LIST: 50, AUDIT_METADATA_KEYS: 20 });
    51
    52	const keyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
    53	function validateKey(value, prefix, code) {
    54	  return typeof value === 'string' && value.startsWith(prefix) && keyPattern.test(value)
    55	    ? { ok: true, code: 'OK', value }
    56	    : { ok: false, code };
    57	}
    58	export const validateCorrelationKey = (value) => validateKey(value, 'corr_', ERROR_CODES.INVALID_CORRELATION_KEY);
    59	export const validateIdempotencyKey = (value) => validateKey(value, 'idem_', ERROR_CODES.INVALID_IDEMPOTENCY_KEY);
    60
    61	export function validatePageRequest({ limit = LIMITS.PAGE_DEFAULT, cursor = null } = {}) {
    62	  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.PAGE_MAX) return { ok: false, code: ERROR_CODES.PAGE_LIMIT_EXCEEDED };
    63	  if (cursor !== null && (typeof cursor !== 'string' || [...cursor].length > LIMITS.CURSOR)) return { ok: false, code: ERROR_CODES.FIELD_TOO_LONG };
    64	  return { ok: true, code: 'OK', value: { limit, cursor } };
    65	}
--- scripts/pr35/pr35-policy.js
     1	import { PERMISSION_IDS, ROLE_IDS } from './pr35-contracts.js';
     2	import { normalizeScope, scopeContains } from './pr35-scope.js';
     3
     4	const rank = Object.freeze({ regular_user: 0, service_provider: 1, sales: 1, marketing: 1,
     5	  moderator: 2, tiger_care: 2, campaign_manager: 3, group_manager: 4, area_manager: 5,
     6	  regional_manager: 6, sector_manager: 7, platform_admin: 8, owner: 9 });
     7	const decision = (allowed, code, ids = []) => Object.freeze({ allowed, code, effectiveAssignmentIds: Object.freeze([...ids]) });
     8
     9	function identityFailure(actor) {
    10	  if (!actor?.id) return 'IDENTITY_REQUIRED';
    11	  if (actor.accountState === 'suspended') return 'ACCOUNT_SUSPENDED';
    12	  if (actor.accountState !== 'active') return 'ACCOUNT_INACTIVE';
    13	  if (actor.sessionValidAfter && (!actor.sessionIssuedAt || Date.parse(actor.sessionIssuedAt) < Date.parse(actor.sessionValidAfter))) return 'SESSION_INVALIDATED';
    14	  return null;
    15	}
    16	export function resolveEffectiveAssignments({ actor, now }) {
    17	  if (identityFailure(actor) || !Number.isFinite(Date.parse(now))) return [];
    18	  const at = Date.parse(now);
    19	  return (Array.isArray(actor.assignments) ? actor.assignments : []).filter((item) =>
    20	    item?.state === 'active' && item.subjectId === actor.id && Number.isFinite(Date.parse(item.startsAt)) &&
    21	    Date.parse(item.startsAt) <= at && (!item.expiresAt || Date.parse(item.expiresAt) > at));
    22	}
    23	export function authorize({ actor, permission, resourceScope, now }) {
    24	  const failure = identityFailure(actor); if (failure) return decision(false, failure);
    25	  if (!PERMISSION_IDS.includes(permission)) return decision(false, 'UNKNOWN_PERMISSION');
    26	  let scope; try { scope = normalizeScope(resourceScope); } catch { return decision(false, 'INVALID_SCOPE'); }
    27	  const assignments = resolveEffectiveAssignments({ actor, now });
    28	  const owned = assignments.filter((item) => Array.isArray(item.permissionIds) && item.permissionIds.includes(permission));
    29	  if (!owned.length) return decision(false, 'PERMISSION_DENIED');
    30	  const contained = owned.filter((item) => scopeContains(item.scope, scope));
    31	  if (!contained.length) return decision(false, 'SCOPE_DENIED');
    32	  return decision(true, 'AUTHORIZED', contained.map((item) => item.id).sort());
    33	}
    34	export function canDelegate({ actor, subjectId, permissionIds, scope, roleId, now }) {
    35	  if (!subjectId || subjectId === actor?.id) return decision(false, 'SELF_ELEVATION_DENIED');
    36	  if (!ROLE_IDS.includes(roleId)) return decision(false, 'UNKNOWN_ROLE');
    37	  if (!Array.isArray(permissionIds) || permissionIds.length > 50 || new Set(permissionIds).size !== permissionIds.length) return decision(false, 'INVALID_PERMISSION_LIST');
    38	  if (permissionIds.some((id) => !PERMISSION_IDS.includes(id))) return decision(false, 'UNKNOWN_PERMISSION');
    39	  const effective = resolveEffectiveAssignments({ actor, now });
    40	  if (identityFailure(actor)) return decision(false, identityFailure(actor));
    41	  const permissionOwners = effective.filter((item) => scopeContains(item.scope, scope));
    42	  const ownerAssignment = effective.find((item) => item.roleId === 'owner' && item.permissionIds?.includes('authorization.owner.manage') && scopeContains(item.scope, scope));
    43	  if (roleId === 'owner' || permissionIds.includes('authorization.owner.manage')) {
    44	    if (permissionIds.some((permission) => !permissionOwners.some((item) => item.permissionIds?.includes(permission)))) return decision(false, 'UNOWNED_PERMISSION_DENIED');
    45	    return ownerAssignment ? decision(true, 'AUTHORIZED', [ownerAssignment.id]) : decision(false, 'OWNER_CONTROL_REQUIRED');
    46	  }
    47	  const delegators = effective.filter((item) => item.permissionIds?.includes('authorization.permission.delegate') && scopeContains(item.scope, scope));
    48	  if (!delegators.length) return decision(false, 'DELEGATION_SCOPE_EXCEEDED');
    49	  if (permissionIds.some((permission) => !permissionOwners.some((item) => item.permissionIds?.includes(permission)))) return decision(false, 'UNOWNED_PERMISSION_DENIED');
    50	  const ceiling = Math.max(...delegators.map((item) => rank[item.roleId] ?? -1));
    51	  if ((rank[roleId] ?? Infinity) >= ceiling) return decision(false, 'DELEGATION_AUTHORITY_EXCEEDED');
    52	  return decision(true, 'AUTHORIZED', delegators.map((item) => item.id).sort());
    53	}
--- scripts/pr35/pr35-local-adapter.js
     1	import { validateIdempotencyKey, validateCorrelationKey } from './pr35-contracts.js';
     2	import { validateCareRequest, safeCareText, projectTicketForRequester, transitionTicket, appendTimelineEvent } from './pr35-tiger-care.js';
     3	import { createDedupeRegistry } from './pr35-network.js';
     4	import { calculateSla } from './pr35-sla.js';
     5
     6	const fail = (code) => Object.freeze({ ok: false, code });
     7	const clone = (value) => structuredClone(value);
     8	const immutableList = (items) => Object.freeze(items.map((item) => Object.freeze(clone(item))));
     9
    10	export function createLocalCareAdapter({ clock = () => new Date().toISOString(), online = () => true, notifier } = {}) {
    11	  const tickets = new Map(); const dedupe = createDedupeRegistry(); let ticketSequence = 0; let eventSequence = 0;
    12	  const validateContext = (context) => !context?.actor?.id ? 'IDENTITY_REQUIRED'
    13	    : !validateIdempotencyKey(context.idempotencyKey).ok ? 'INVALID_IDEMPOTENCY_KEY'
    14	      : !validateCorrelationKey(context.correlationKey).ok ? 'INVALID_CORRELATION_KEY' : null;
    15	  const run = async (payload, context, operation) => {
    16	    const invalid = validateContext(context); if (invalid) return fail(invalid);
    17	    try { return await dedupe.run(context.idempotencyKey, payload, operation); }
    18	    catch (error) { return fail(error.code || 'INVALID_COMMAND'); }
    19	  };
    20	  const notify = async (ticket) => {
    21	    if (notifier?.configured !== true || typeof notifier.send !== 'function') return Object.freeze({ status: 'not_configured' });
    22	    try { const result = await notifier.send(Object.freeze({ type: 'care_request_received', ticketId: ticket.id, requesterId: ticket.requesterId }));
    23	      return Object.freeze({ status: result?.confirmed === true ? 'confirmed' : 'failed' });
    24	    } catch { return Object.freeze({ status: 'failed' }); }
    25	  };
    26	  const privileged = (context, permission) => {
    27	    if (!online()) return 'OFFLINE_PRIVILEGED_DENIED';
    28	    if (context?.actor?.kind !== 'staff' || !context.actor.permissions?.includes(permission)) return 'PERMISSION_DENIED';
    29	    return null;
    30	  };
    31	  const find = (id) => tickets.get(id);
    32
    33	  async function submitUserRequest(input, context) {
    34	    if (context?.actor?.kind !== 'user') return fail('PERMISSION_DENIED');
    35	    if (input?.requesterId && input.requesterId !== context.actor.id) return fail('FORGED_IDENTITY');
    36	    const bound = { ...input, requesterId: context.actor.id }; const valid = validateCareRequest(bound); if (!valid.ok) return valid;
    37	    return run(valid.value, context, async () => {
    38	      const createdAt = clock(); const id = `care-ticket-${++ticketSequence}`;
    39	      const createdEvent = Object.freeze({ id: `care-event-${++eventSequence}`, type: 'created', actorId: context.actor.id, at: createdAt, visibility: 'user' });
    40	      const sla = calculateSla({ priority: valid.value.priority, createdAt, now: createdAt });
    41	      const ticket = Object.freeze({ id, ...clone(valid.value), status: 'new', createdAt, updatedAt: createdAt,
    42	        assigneeId: null, messages: Object.freeze([]), internalNotes: Object.freeze([]), escalationHistory: Object.freeze([]),
    43	        assignmentHistory: Object.freeze([]), timeline: Object.freeze([createdEvent]), sla });
    44	      tickets.set(id, ticket); const notification = await notify(ticket);
    45	      return Object.freeze({ ok: true, code: 'REQUEST_ACCEPTED', data: clone(ticket), receipt: Object.freeze({
    46	        persistence: 'local_volatile', idempotencyKey: context.idempotencyKey,
    47	        acknowledgement: 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.',
    48	        email: Object.freeze({ status: 'not_configured' }), notification }) });
    49	    });
    50	  }
    51
    52	  async function getTicket(id, context) {
    53	    const ticket = find(id); if (!ticket || !context?.actor?.id) return fail('TICKET_NOT_FOUND');
    54	    if (context.actor.kind === 'user') { const projected = projectTicketForRequester(ticket, context.actor.id); return projected.ok ? Object.freeze({ ok: true, code: 'OK', data: projected.ticket }) : projected; }
    55	    if (context.actor.kind !== 'staff' || !context.actor.permissions?.includes('care.ticket.read.scoped')) return fail('TICKET_NOT_FOUND');
    56	    return Object.freeze({ ok: true, code: 'OK', data: clone(ticket) });
    57	  }
    58
    59	  async function addStaffMessage(id, input, context) {
    60	    const denied = privileged(context, 'care.message.create.scoped'); if (denied) return fail(denied);
    61	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    62	    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    63	    return run({ id, body }, context, async () => {
    64	      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
    65	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
    66	      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
    67	      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    68	    });
    69	  }
    70
    71	  async function addUserMessage(id, input, context) {
    72	    const ticket = find(id); if (!ticket || context?.actor?.kind !== 'user' || ticket.requesterId !== context.actor.id) return fail('TICKET_NOT_FOUND');
    73	    if (input?.authorId && input.authorId !== context.actor.id) return fail('FORGED_IDENTITY');
    74	    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    75	    return run({ id, body }, context, async () => {
    76	      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
    77	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
    78	      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
    79	      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    80	    });
    81	  }
    82
    83	  async function addInternalNote(id, input, context) {
    84	    const denied = privileged(context, 'care.internal_note.create'); if (denied) return fail(denied);
    85	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    86	    let body; try { body = safeCareText(input?.body, { max: 2000 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
    87	    return run({ id, body, reason: context.reason }, context, async () => {
    88	      const at = clock(); const note = Object.freeze({ id: `care-note-${++eventSequence}`, authorId: context.actor.id, body, at });
    89	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'internal_note_added', actorId: context.actor.id, at, visibility: 'internal' });
    90	      const next = Object.freeze({ ...ticket, internalNotes: immutableList([...ticket.internalNotes, note]), timeline, updatedAt: at }); tickets.set(id, next);
    91	      return Object.freeze({ ok: true, code: 'INTERNAL_NOTE_ADDED', data: clone(note), audit: Object.freeze({ action: 'care.internal_note.create', reason: context.reason }) });
    92	    });
    93	  }
    94
    95	  async function changeStatus(id, command, context) {
    96	    const denied = privileged(context, 'care.ticket.transition'); if (denied) return fail(denied);
    97	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    98	    return run({ id, ...command, reason: context.reason }, context, async () => {
    99	      const result = transitionTicket({ ticket, toStatus: command.toStatus, actor: context.actor, reason: context.reason,
   100	        resolutionSummary: command.resolutionSummary, now: clock() });
   101	      if (!result.ok) return result; tickets.set(id, result.ticket); return Object.freeze({ ...result, data: clone(result.ticket) });
   102	    });
   103	  }
   104
   105	  async function escalateTicket(id, input, context) {
   106	    const denied = privileged(context, 'care.ticket.escalate'); if (denied) return fail(denied);
   107	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
   108	    let teamId; try { teamId = safeCareText(input?.toTeamId, { max: 128 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
   109	    return run({ id, teamId, reason: context.reason }, context, async () => {
   110	      if (!['acknowledged', 'in_review', 'waiting_user'].includes(ticket.status)) return fail('INVALID_TRANSITION');
   111	      const at = clock(); const entry = Object.freeze({ id: `care-escalation-${++eventSequence}`, fromTeamId: ticket.teamId || null,
   112	        toTeamId: teamId, actorId: context.actor.id, reason: context.reason, at });
   113	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'escalated', actorId: context.actor.id, at, visibility: 'user' });
   114	      const next = Object.freeze({ ...ticket, status: 'escalated', teamId, escalationHistory: immutableList([...ticket.escalationHistory, entry]), timeline, updatedAt: at }); tickets.set(id, next);
   115	      return Object.freeze({ ok: true, code: 'TICKET_ESCALATED', data: clone(next), audit: Object.freeze({ action: 'care.ticket.escalate', reason: context.reason }) });
   116	    });
   117	  }
   118
   119	  return Object.freeze({ submitUserRequest, getTicket, addUserMessage, addStaffMessage, addInternalNote, transitionTicket: changeStatus,
   120	    mutateTicket: changeStatus, escalateTicket,
   121	    listTickets: async (query = {}, context) => {
   122	      const all = [...tickets.values()];
   123	      if (context?.actor?.kind === 'user') return Object.freeze({ ok: true, code: 'OK', items: immutableList(all.filter((ticket) => ticket.requesterId === context.actor.id).map((ticket) => projectTicketForRequester(ticket, context.actor.id).ticket).slice(0, Math.min(50, query.limit || 20))) });
   124	      return fail('PERMISSION_DENIED');
   125	    }
   126	  });
   127	}
--- scripts/pr35/pr35-owner-controller.js
     1	import { authorize, canDelegate } from './pr35-policy.js';
     2	import { ROLE_IDS, PERMISSION_IDS, ROLE_TEMPLATES, SCOPE_LEVELS } from './pr35-contracts.js';
     3	import { calculateSla } from './pr35-sla.js';
     4
     5	const PAGE_SIZE = 20;
     6	const text = (value) => String(value ?? '').trim().toLocaleLowerCase();
     7	export function filterAndPage(rows, { query = '', page = 1, pageSize = PAGE_SIZE } = {}, fields = ['id']) {
     8	  const needle = text(query); const size = Math.min(PAGE_SIZE, Math.max(1, Number(pageSize) || PAGE_SIZE));
     9	  const filtered = rows.filter((row) => !needle || fields.some((field) => text(row[field]).includes(needle)));
    10	  const pageCount = Math.max(1, Math.ceil(filtered.length / size)); const current = Math.min(pageCount, Math.max(1, Number(page) || 1));
    11	  return Object.freeze({ items: filtered.slice((current - 1) * size, current * size), page: current, pageCount, total: filtered.length });
    12	}
    13	export function visibleProfileActions(assignDecision, stateDecision) {
    14	  if (!assignDecision?.allowed) return Object.freeze([]);
    15	  return Object.freeze(stateDecision?.allowed ? ['assign', 'suspend', 'revoke'] : ['assign']);
    16	}
    17	const make = (tag, attrs = {}, value = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, val]) => key === 'class' ? node.className = val : node.setAttribute(key, val)); node.textContent = value; return node; };
    18	const scopeFrom = (form) => { const data = new FormData(form); const level = data.get('scopeLevel'); const scope = { level }; for (const key of ['sectorId', 'regionId', 'areaId', 'teamId']) { const value = text(data.get(key)); if (value) scope[key] = value; } return scope; };
    19	const contextKey = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
    20	const safeMessage = (code) => ({ OFFLINE_PRIVILEGED_DENIED: 'لا يمكن تنفيذ إجراء إداري دون اتصال آمن.', CONFIGURATION_REQUIRED: 'الخدمة الآمنة غير مهيأة. لم يتم حفظ أي تغيير.', PERMISSION_DENIED: 'هذا الإجراء غير متاح لصلاحياتك الحالية.', SCOPE_DENIED: 'النطاق المحدد خارج صلاحياتك.', SELF_ELEVATION_DENIED: 'لا يمكن تعديل صلاحياتك بنفسك.' })[code] || 'تعذر إتمام الإجراء بأمان. راجع البيانات وحاول مرة أخرى.';
    21
    22	export function createOwnerController({ root = document, repository, careAdapter, identity, clock = () => new Date().toISOString(), local = false }) {
    23	  const actor = () => identity(); const now = () => clock(); let activeDialog; let returnFocus; let searchAbort; let debounce; let assignmentFilter = 'all';
    24	  const decision = (permission, scope = { level: 'platform' }) => authorize({ actor: actor(), permission, resourceScope: scope, now: now() });
    25	  const setStatus = (message, state = 'idle') => { const node = root.querySelector('[data-owner-status]'); if (node) { node.textContent = message; node.dataset.state = state; } };
    26	  function closeDialog() { if (!activeDialog) return; activeDialog.remove(); activeDialog = null; returnFocus?.focus(); }
    27	  function dialog(title) { returnFocus = document.activeElement; const layer = make('div', { class: 'pr35-layer' }); const panel = make('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-dialog-title', tabindex: '-1' }); panel.append(make('h2', { id: 'pr35-dialog-title' }, title)); layer.append(panel); document.body.append(layer); activeDialog = layer; layer.addEventListener('click', (event) => { if (event.target === layer) closeDialog(); }); layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDialog(); if (event.key === 'Tab') { const controls = [...panel.querySelectorAll('button,input,select,textarea')].filter((item) => !item.hidden && !item.disabled); const first = controls[0], last = controls.at(-1); if (!first) { event.preventDefault(); panel.focus(); } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }); return panel; }
    28	  function openAssignment(subjectId = 'profile-user') {
    29	    const permitted = decision('authorization.assignment.manage'); if (!permitted.allowed) { setStatus(safeMessage(permitted.code), 'failed'); return; }
    30	    const panel = dialog('تكليف تشغيلي'); const form = make('form', { class: 'pr35-form', 'data-assignment-form': '' });
    31	    const subject = make('input', { name: 'subjectId', value: subjectId, required: '', maxlength: '128', 'aria-label': 'معرف المستخدم' }); subject.value = subjectId;
    32	    const role = make('select', { name: 'roleId', required: '', 'aria-label': 'المنصب' }); ROLE_IDS.filter((id) => id !== 'owner').forEach((id) => role.append(make('option', { value: id }, id.replaceAll('_', ' '))));
    33	    const scopeLevel = make('select', { name: 'scopeLevel', required: '', 'aria-label': 'مستوى النطاق' }); SCOPE_LEVELS.forEach((id) => scopeLevel.append(make('option', { value: id }, id)));
    34	    const scopeId = make('input', { name: 'sectorId', maxlength: '128', placeholder: 'معرف القطاع عند الحاجة', 'aria-label': 'معرف القطاع' });
    35	    const permission = make('select', { name: 'permissionIds', multiple: '', required: '', 'aria-label': 'الصلاحيات المفوضة' }); PERMISSION_IDS.filter((id) => id !== 'authorization.owner.manage' && id !== 'audit.event.append').forEach((id) => permission.append(make('option', { value: id }, id)));
    36	    const expiry = make('input', { name: 'expiresAt', type: 'datetime-local', required: '', 'aria-label': 'تاريخ انتهاء التكليف' });
    37	    const reason = make('textarea', { name: 'reason', required: '', maxlength: '500', 'data-assignment-reason': '', placeholder: 'سبب موثق ومطلوب', 'aria-label': 'سبب التكليف' });
    38	    const state = make('div', { class: 'pr35-review', 'data-assignment-review': '', 'aria-live': 'polite' });
    39	    const next = make('button', { type: 'button', class: 'pr35-primary' }, 'مراجعة التكليف'); const cancel = make('button', { type: 'button' }, 'إلغاء');
    40	    form.append(subject, role, scopeLevel, scopeId, permission, expiry, reason, state, next, cancel); panel.append(form); cancel.addEventListener('click', closeDialog);
    41	    next.addEventListener('click', () => {
    42	      if (!form.reportValidity()) return; const data = new FormData(form); const permissionIds = data.getAll('permissionIds'); const scope = scopeFrom(form);
    43	      const review = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
    44	      if (!review.allowed) { state.textContent = safeMessage(review.code); state.dataset.state = 'failed'; return; }
    45	      state.textContent = `مراجعة قبل التأكيد: ${data.get('roleId')} — ${scope.level} — ${permissionIds.length} صلاحيات — ينتهي ${data.get('expiresAt')}`; state.dataset.state = 'review'; next.hidden = true;
    46	      const confirm = make('button', { type: 'button', class: 'pr35-primary', 'data-assignment-confirm': '' }, 'تأكيد التكليف المحلي'); form.append(confirm); confirm.focus();
    47	      confirm.addEventListener('click', async () => {
    48	        const finalReview = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
    49	        if (!finalReview.allowed || !navigator.onLine) { state.textContent = safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : finalReview.code); state.dataset.state = 'failed'; return; }
    50	        confirm.disabled = true; state.textContent = 'جاري التحقق والتنفيذ…';
    51	        const result = await repository.createAssignment({ subjectId: data.get('subjectId'), roleId: data.get('roleId'), permissionIds, scope, startsAt: now(), expiresAt: new Date(data.get('expiresAt')).toISOString() }, { actor: actor(), now: now(), reason: data.get('reason'), correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') });
    52	        if (!result.ok) { state.textContent = safeMessage(result.code); state.dataset.state = 'failed'; confirm.disabled = false; return; }
    53	        state.textContent = local ? 'تم التكليف داخل العرض المحلي المؤقت فقط.' : 'تم تأكيد التكليف من الخدمة الآمنة.'; state.dataset.state = 'sent'; await renderAssignments();
    54	      });
    55	    }); panel.focus();
    56	  }
    57	  async function changeAssignment(id, action) {
    58	    const allowed = decision('authorization.assignment.manage'); if (!allowed.allowed || !navigator.onLine) { setStatus(safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : allowed.code), 'failed'); return; }
    59	    const panel = dialog(action === 'revoke' ? 'سحب التكليف' : 'تعليق التكليف'); const form = make('form', { class: 'pr35-form' }); const reason = make('textarea', { required: '', maxlength: '500', 'aria-label': 'سبب الإجراء', placeholder: 'السبب مطلوب للتوثيق' }); const confirm = make('button', { type: 'submit', class: 'pr35-danger' }, 'تأكيد الإجراء'); form.append(reason, confirm); panel.append(form);
    60	    form.addEventListener('submit', async (event) => { event.preventDefault(); if (!form.reportValidity()) return; confirm.disabled = true; const method = action === 'revoke' ? repository.revokeAssignment : repository.suspendAssignment; const result = await method({ assignmentId: id }, { actor: actor(), now: now(), reason: reason.value, correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') }); setStatus(result.ok ? 'تم تحديث التكليف محليًا مع سجل تدقيق.' : safeMessage(result.code), result.ok ? 'sent' : 'failed'); closeDialog(); await renderAssignments(); }); panel.focus();
    61	  }
    62	  async function renderAssignments(query = '') {
    63	    const host = root.querySelector('[data-owner-assignments-list]'); if (!host) return; host.replaceChildren(make('div', { class: 'pr35-skeleton', 'aria-hidden': 'true' }));
    64	    const result = await repository.listAssignments({ limit: 20, scope: { level: 'platform' } }, { actor: actor(), now: now() }); host.replaceChildren();
    65	    if (!result.ok) { host.append(make('p', { class: 'pr35-empty' }, safeMessage(result.code))); return; }
    66	    const filtered = assignmentFilter === 'all' ? result.items : result.items.filter((item) => item.state === assignmentFilter);
    67	    const page = filterAndPage(filtered, { query },  ['subjectId', 'roleId', 'state']); if (!page.items.length) { host.append(make('p', { class: 'pr35-empty' }, 'لا توجد تكليفات مطابقة.')); return; }
    68	    page.items.forEach((item) => { const card = make('article', { class: 'pr35-row' }); card.append(make('strong', {}, item.subjectId), make('span', {}, `${item.roleId} · ${item.scope.level} · ${item.state}`)); if (item.state === 'active') { const suspend = make('button', { type: 'button', 'data-suspend-assignment': item.id }, 'تعليق'); const revoke = make('button', { type: 'button', 'data-revoke-assignment': item.id }, 'سحب'); suspend.addEventListener('click', () => changeAssignment(item.id, 'suspend')); revoke.addEventListener('click', () => changeAssignment(item.id, 'revoke')); card.append(suspend, revoke); } host.append(card); });
    69	  }
    70	  function renderDemoQueues() {
    71	    const care = root.querySelector('[data-owner-care-list]'); const permissions = root.querySelector('[data-owner-permission-list]'); const audit = root.querySelector('[data-owner-audit-list]');
    72	    if (care) { const samples = [{ id: 'TC-1042', category: 'مشكلة حساب', priority: 'urgent', createdAt: new Date(Date.parse(now()) - 55 * 60000).toISOString() }, { id: 'TC-1041', category: 'اعتراض على رفض', priority: 'normal', createdAt: new Date(Date.parse(now()) - 2 * 3600000).toISOString() }]; care.replaceChildren(); samples.forEach((ticket) => { const sla = calculateSla({ priority: ticket.priority, createdAt: ticket.createdAt, now: now() }); const node = make('article', { class: `pr35-row${sla.breached || sla.remainingMs < 15 * 60000 ? ' is-warning' : ''}` }); node.append(make('strong', {}, `${ticket.id} — ${ticket.category}`), make('span', {}, sla.breached ? 'تجاوز SLA — يحتاج تصعيدًا' : `متبقٍ ${Math.max(1, Math.ceil(sla.remainingMs / 60000))} دقيقة`), make('button', { type: 'button', disabled: '', title: 'عرض توضيحي محلي' }, 'عرض محلي')); care.append(node); }); }
    73	    if (permissions) permissions.replaceChildren(make('p', { class: 'pr35-empty' }, 'لا توجد طلبات صلاحية معلقة في العرض المحلي.'));
    74	    if (audit) audit.replaceChildren(make('p', { class: 'pr35-empty' }, 'ستظهر أحداث التدقيق غير القابلة للتعديل بعد الإجراءات المحلية.'));
    75	  }
    76	  function bindSearch() { const input = root.querySelector('[data-owner-search]'); if (!input) return; input.addEventListener('input', () => { clearTimeout(debounce); searchAbort?.abort(); searchAbort = new AbortController(); debounce = setTimeout(() => { if (!searchAbort.signal.aborted) renderAssignments(input.value); }, 220); }); root.querySelectorAll('[data-owner-filter]').forEach((button) => button.addEventListener('click', () => { assignmentFilter = button.dataset.ownerFilter; root.querySelectorAll('[data-owner-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button))); renderAssignments(input.value); })); }
    77	  async function mountConsole() { const gate = root.querySelector('[data-owner-auth-gate]'); const consoleNode = root.querySelector('[data-owner-console]'); const allowed = decision('owner.console.read'); if (!allowed.allowed) { if (gate) gate.textContent = safeMessage(allowed.code); return false; } if (gate) gate.hidden = true; if (consoleNode) consoleNode.hidden = false; root.querySelector('[data-owner-local-disclosure]')?.toggleAttribute('hidden', !local); root.querySelector('[data-new-assignment]')?.addEventListener('click', () => openAssignment()); bindSearch(); renderDemoQueues(); await renderAssignments(); return true; }
    78	  function mountProfileActions(host) { const assign = decision('authorization.assignment.manage'); const state = host.dataset.assignmentId ? decision('authorization.assignment.manage') : { allowed: false }; const actions = visibleProfileActions(assign, state); if (!actions.length) { host.remove(); return; } host.hidden = false; const trigger = host.querySelector('[data-profile-actions-trigger]'); const menu = host.querySelector('[role="menu"]'); trigger.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button')?.focus(); }); host.querySelector('[data-profile-assign]')?.addEventListener('click', () => openAssignment(host.dataset.subjectId || 'profile-user')); host.querySelector('[data-profile-suspend]')?.toggleAttribute('hidden', !actions.includes('suspend')); host.querySelector('[data-profile-revoke]')?.toggleAttribute('hidden', !actions.includes('revoke')); if (host.dataset.assignmentId) { host.querySelector('[data-profile-suspend]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'suspend')); host.querySelector('[data-profile-revoke]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'revoke')); } menu.addEventListener('keydown', (event) => { const items = [...menu.querySelectorAll('button:not([hidden])')]; const index = items.indexOf(document.activeElement); if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length].focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); } if (event.key === 'Escape') { menu.hidden = true; trigger.focus(); } }); }
    79	  return Object.freeze({ mountConsole, mountProfileActions, openAssignment, closeDialog, renderAssignments });
    80	}
--- scripts/pr35/pr35-care-controller.js
     1	import { CARE_CATEGORIES, CARE_PRIORITIES } from './pr35-contracts.js';
     2	import { translate } from './pr35-i18n.js';
     3
     4	const labels = Object.freeze({ management_contact: 'تواصل رسمي مع الإدارة', support: 'دعم', complaint_report: 'شكوى أو بلاغ', missing_category: 'فئة غير موجودة', rejection_appeal: 'اعتراض على رفض', account_issue: 'مشكلة حساب', sector_access_request: 'طلب قطاع أو وصول', fraud_safety: 'احتيال أو سلامة', other: 'طلب آخر' });
     5	const el = (tag, attrs = {}, text = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => key === 'class' ? node.className = value : node.setAttribute(key, value)); node.textContent = text; return node; };
     6	const key = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
     7
     8	export function createCareController({ root = document, adapter, identity, clock = () => new Date().toISOString() }) {
     9	  let layer; let opener; let requestController;
    10	  function close() { requestController?.abort(); if (!layer) return; layer.remove(); layer = null; opener?.focus(); opener = null; }
    11	  function open(trigger) {
    12	    if (layer) return; opener = trigger || document.activeElement;
    13	    layer = el('div', { class: 'pr35-layer', 'data-care-dialog': '' });
    14	    const dialog = el('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-care-title', tabindex: '-1' });
    15	    const title = el('h2', { id: 'pr35-care-title' }, translate('care.title'));
    16	    const disclosure = el('p', { class: 'pr35-disclosure' }, translate('mode.local'));
    17	    const form = el('form', { class: 'pr35-form', 'data-care-form': '' });
    18	    const category = el('select', { name: 'category', required: '', 'aria-label': 'نوع الطلب' });
    19	    CARE_CATEGORIES.forEach((id) => category.append(el('option', { value: id }, labels[id])));
    20	    const priority = el('select', { name: 'priority', required: '', 'aria-label': 'الأولوية' });
    21	    CARE_PRIORITIES.forEach((id) => priority.append(el('option', { value: id }, ({ low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' })[id])));
    22	    priority.value = 'normal';
    23	    const subject = el('input', { name: 'subject', required: '', maxlength: '160', placeholder: 'موضوع الطلب', 'aria-label': 'موضوع الطلب' });
    24	    const description = el('textarea', { name: 'description', required: '', maxlength: '4000', placeholder: 'اكتب التفاصيل دون بيانات دخول أو أسرار', 'aria-label': 'تفاصيل الطلب' });
    25	    const status = el('p', { class: 'pr35-status', role: 'status', 'aria-live': 'polite', 'data-care-state': 'idle' });
    26	    const submit = el('button', { type: 'submit', class: 'pr35-primary' }, 'إرسال الطلب');
    27	    const cancel = el('button', { type: 'button', 'data-care-close': '' }, translate('common.cancel'));
    28	    form.append(category, priority, subject, description, status, submit, cancel); dialog.append(title, disclosure, form); layer.append(dialog); document.body.append(layer);
    29	    cancel.addEventListener('click', close);
    30	    layer.addEventListener('click', (event) => { if (event.target === layer) close(); });
    31	    layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if (event.key === 'Tab') { const controls = [...dialog.querySelectorAll('button,input,select,textarea')]; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
    32	    form.addEventListener('submit', async (event) => {
    33	      event.preventDefault(); if (!form.reportValidity()) return;
    34	      requestController?.abort(); requestController = new AbortController(); submit.disabled = true; status.dataset.careState = 'pending'; status.textContent = translate('care.pending');
    35	      const actor = identity(); const context = { actor, now: clock(), correlationKey: key('corr'), idempotencyKey: key('idem'), signal: requestController.signal };
    36	      const payload = { category: category.value, priority: priority.value, subject: subject.value, description: description.value };
    37	      try {
    38	        const result = await adapter.submitUserRequest(payload, context);
    39	        if (!result.ok) throw new Error(result.code);
    40	        status.dataset.careState = 'sent'; status.textContent = translate('care.confirmation'); form.reset();
    41	      } catch (error) { if (error.name !== 'AbortError') { status.dataset.careState = 'failed'; status.textContent = navigator.onLine ? translate('care.failed') : translate('care.offlinePending'); } }
    42	      finally { submit.disabled = false; }
    43	    });
    44	    dialog.focus();
    45	  }
    46	  return Object.freeze({ open, close });
    47	}
--- scripts/pr35/pr35-network.js
     1	const codedError = (code) => Object.assign(new Error(code), { code });
     2	const signature = (value) => JSON.stringify(value, Object.keys(value || {}).sort());
     3
     4	export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
     5	  baseDelayMs = 250, random = Math.random, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
     6	  idempotent = true } = {}) {
     7	  if (signal?.aborted) throw codedError('REQUEST_CANCELLED');
     8	  const attempts = idempotent ? Math.min(3, Math.max(1, maxAttempts)) : 1;
     9	  for (let attempt = 1; attempt <= attempts; attempt++) {
    10	    const controller = new AbortController();
    11	    const cancel = () => controller.abort(codedError('REQUEST_CANCELLED'));
    12	    signal?.addEventListener('abort', cancel, { once: true });
    13	    const timer = setTimeout(() => controller.abort(codedError('REQUEST_TIMEOUT')), Math.min(30000, Math.max(1, timeoutMs)));
    14	    const aborted = new Promise((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }));
    15	    try { return await Promise.race([operation(controller.signal, attempt), aborted]); }
    16	    catch (error) {
    17	      const reason = controller.signal.aborted ? controller.signal.reason : error;
    18	      if (reason?.code === 'REQUEST_TIMEOUT' || reason?.code === 'REQUEST_CANCELLED') throw reason;
    19	      if (!error?.retryable || attempt === attempts) throw codedError('REQUEST_FAILED');
    20	      const ceiling = Math.min(2000, baseDelayMs * (2 ** (attempt - 1)));
    21	      await sleep(Math.max(0, Math.floor(ceiling * Math.min(1, Math.max(0, random())))));
    22	    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
    23	  }
    24	  throw codedError('REQUEST_FAILED');
    25	}
    26
    27	export function createDedupeRegistry() {
    28	  const entries = new Map();
    29	  return Object.freeze({
    30	    run(key, payload, operation) {
    31	      if (typeof key !== 'string' || !key) return Promise.reject(codedError('INVALID_IDEMPOTENCY_KEY'));
    32	      const payloadSignature = signature(payload);
    33	      if (entries.has(key)) {
    34	        const entry = entries.get(key);
    35	        if (entry.signature !== payloadSignature) return Promise.reject(codedError('IDEMPOTENCY_CONFLICT'));
    36	        return entry.promise;
    37	      }
    38	      const promise = Promise.resolve().then(operation);
    39	      entries.set(key, Object.freeze({ signature: payloadSignature, promise }));
    40	      promise.catch(() => entries.delete(key));
    41	      return promise;
    42	    }, clear: () => entries.clear()
    43	  });
    44	}
--- scripts/pr35/pr35-drafts.js
     1	import { validateCareRequest } from './pr35-tiger-care.js';
     2
     3	const fail = (code) => Object.freeze({ ok: false, code });
     4	const MAX_ITEMS = 20; const MAX_BYTES = 65536;
     5	const keyFor = (kind, sessionId) => `vvip:pr35:${kind}:${sessionId}`;
     6	const read = (storage, key, fallback) => { try { return JSON.parse(storage.getItem(key)) || fallback; } catch { return fallback; } };
     7	const write = (storage, key, value) => {
     8	  const serialized = JSON.stringify(value);
     9	  if (new TextEncoder().encode(serialized).length > MAX_BYTES) return fail('QUEUE_SIZE_EXCEEDED');
    10	  try { storage.setItem(key, serialized); return { ok: true }; } catch { return fail('SESSION_STORAGE_UNAVAILABLE'); }
    11	};
    12	const normalize = (input, actorId) => validateCareRequest({ ...input, requesterId: actorId });
    13
    14	export function createDraftStore(sessionStorage, sessionId) {
    15	  const key = keyFor('draft', sessionId);
    16	  return Object.freeze({
    17	    save(input, { actorId }) { const valid = normalize(input, actorId); if (!valid.ok) return valid;
    18	      const result = write(sessionStorage, key, { actorId, value: valid.value }); return result.ok ? Object.freeze({ ok: true, code: 'DRAFT_SAVED' }) : result; },
    19	    load({ actorId }) { const draft = read(sessionStorage, key, null); return !draft || draft.actorId !== actorId ? fail('DRAFT_NOT_FOUND') : Object.freeze({ ok: true, code: 'OK', value: structuredClone(draft.value) }); },
    20	    clear() { sessionStorage.removeItem(key); return Object.freeze({ ok: true, code: 'DRAFT_CLEARED' }); }
    21	  });
    22	}
    23
    24	export function createUserSubmissionQueue(sessionStorage, sessionId) {
    25	  const key = keyFor('queue', sessionId);
    26	  const items = () => read(sessionStorage, key, []);
    27	  return Object.freeze({
    28	    enqueue(input, context) {
    29	      if (context?.actor?.kind !== 'user' || input?.commandType) return fail('OFFLINE_PRIVILEGED_DENIED');
    30	      const valid = normalize(input, context.actor.id); if (!valid.ok) return valid;
    31	      const queue = items();
    32	      const existing = queue.find((item) => item.idempotencyKey === context.idempotencyKey);
    33	      if (existing) return fail('DUPLICATE_SUBMISSION');
    34	      if (queue.length >= MAX_ITEMS) return fail('QUEUE_LIMIT_EXCEEDED');
    35	      const entry = { idempotencyKey: context.idempotencyKey, correlationKey: context.correlationKey,
    36	        actorId: context.actor.id, payload: valid.value, state: 'pending', attempts: 0 };
    37	      const result = write(sessionStorage, key, [...queue, entry]);
    38	      return result.ok ? Object.freeze({ ok: true, code: 'QUEUED', state: 'pending' }) : result;
    39	    },
    40	    async flush(send, context) {
    41	      const queue = items(); const updated = [];
    42	      for (const entry of queue) {
    43	        if (entry.actorId !== context?.actor?.id || context.actor.kind !== 'user') { updated.push({ ...entry, state: 'failed', code: 'FORGED_IDENTITY' }); continue; }
    44	        try { const result = await send(structuredClone(entry.payload), { ...context, idempotencyKey: entry.idempotencyKey, correlationKey: entry.correlationKey });
    45	          updated.push({ ...entry, attempts: entry.attempts + 1, state: result.ok ? 'sent' : 'failed', code: result.code });
    46	        } catch { updated.push({ ...entry, attempts: entry.attempts + 1, state: 'failed', code: 'NETWORK_UNAVAILABLE' }); }
    47	      }
    48	      write(sessionStorage, key, updated); return Object.freeze({ ok: true, code: 'QUEUE_FLUSHED', items: Object.freeze(updated.map(Object.freeze)) });
    49	    }, list() { return Object.freeze(items().map((item) => Object.freeze(structuredClone(item)))); }
    50	  });
    51	}

exec
/bin/bash -lc "nl -ba scripts/pr35/pr35-local-adapter.js | sed -n '90,170p'; nl -ba scripts/pr35/pr35-owner-controller.js | sed -n '1,100p'; printf '\\n---TEST---\\n'; node --test tests/pr35/*.test.mjs" in /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
 exited 1 in 933ms:
    90	      const next = Object.freeze({ ...ticket, internalNotes: immutableList([...ticket.internalNotes, note]), timeline, updatedAt: at }); tickets.set(id, next);
    91	      return Object.freeze({ ok: true, code: 'INTERNAL_NOTE_ADDED', data: clone(note), audit: Object.freeze({ action: 'care.internal_note.create', reason: context.reason }) });
    92	    });
    93	  }
    94
    95	  async function changeStatus(id, command, context) {
    96	    const denied = privileged(context, 'care.ticket.transition'); if (denied) return fail(denied);
    97	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    98	    return run({ id, ...command, reason: context.reason }, context, async () => {
    99	      const result = transitionTicket({ ticket, toStatus: command.toStatus, actor: context.actor, reason: context.reason,
   100	        resolutionSummary: command.resolutionSummary, now: clock() });
   101	      if (!result.ok) return result; tickets.set(id, result.ticket); return Object.freeze({ ...result, data: clone(result.ticket) });
   102	    });
   103	  }
   104
   105	  async function escalateTicket(id, input, context) {
   106	    const denied = privileged(context, 'care.ticket.escalate'); if (denied) return fail(denied);
   107	    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
   108	    let teamId; try { teamId = safeCareText(input?.toTeamId, { max: 128 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
   109	    return run({ id, teamId, reason: context.reason }, context, async () => {
   110	      if (!['acknowledged', 'in_review', 'waiting_user'].includes(ticket.status)) return fail('INVALID_TRANSITION');
   111	      const at = clock(); const entry = Object.freeze({ id: `care-escalation-${++eventSequence}`, fromTeamId: ticket.teamId || null,
   112	        toTeamId: teamId, actorId: context.actor.id, reason: context.reason, at });
   113	      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'escalated', actorId: context.actor.id, at, visibility: 'user' });
   114	      const next = Object.freeze({ ...ticket, status: 'escalated', teamId, escalationHistory: immutableList([...ticket.escalationHistory, entry]), timeline, updatedAt: at }); tickets.set(id, next);
   115	      return Object.freeze({ ok: true, code: 'TICKET_ESCALATED', data: clone(next), audit: Object.freeze({ action: 'care.ticket.escalate', reason: context.reason }) });
   116	    });
   117	  }
   118
   119	  return Object.freeze({ submitUserRequest, getTicket, addUserMessage, addStaffMessage, addInternalNote, transitionTicket: changeStatus,
   120	    mutateTicket: changeStatus, escalateTicket,
   121	    listTickets: async (query = {}, context) => {
   122	      const all = [...tickets.values()];
   123	      if (context?.actor?.kind === 'user') return Object.freeze({ ok: true, code: 'OK', items: immutableList(all.filter((ticket) => ticket.requesterId === context.actor.id).map((ticket) => projectTicketForRequester(ticket, context.actor.id).ticket).slice(0, Math.min(50, query.limit || 20))) });
   124	      return fail('PERMISSION_DENIED');
   125	    }
   126	  });
   127	}
     1	import { authorize, canDelegate } from './pr35-policy.js';
     2	import { ROLE_IDS, PERMISSION_IDS, ROLE_TEMPLATES, SCOPE_LEVELS } from './pr35-contracts.js';
     3	import { calculateSla } from './pr35-sla.js';
     4
     5	const PAGE_SIZE = 20;
     6	const text = (value) => String(value ?? '').trim().toLocaleLowerCase();
     7	export function filterAndPage(rows, { query = '', page = 1, pageSize = PAGE_SIZE } = {}, fields = ['id']) {
     8	  const needle = text(query); const size = Math.min(PAGE_SIZE, Math.max(1, Number(pageSize) || PAGE_SIZE));
     9	  const filtered = rows.filter((row) => !needle || fields.some((field) => text(row[field]).includes(needle)));
    10	  const pageCount = Math.max(1, Math.ceil(filtered.length / size)); const current = Math.min(pageCount, Math.max(1, Number(page) || 1));
    11	  return Object.freeze({ items: filtered.slice((current - 1) * size, current * size), page: current, pageCount, total: filtered.length });
    12	}
    13	export function visibleProfileActions(assignDecision, stateDecision) {
    14	  if (!assignDecision?.allowed) return Object.freeze([]);
    15	  return Object.freeze(stateDecision?.allowed ? ['assign', 'suspend', 'revoke'] : ['assign']);
    16	}
    17	const make = (tag, attrs = {}, value = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, val]) => key === 'class' ? node.className = val : node.setAttribute(key, val)); node.textContent = value; return node; };
    18	const scopeFrom = (form) => { const data = new FormData(form); const level = data.get('scopeLevel'); const scope = { level }; for (const key of ['sectorId', 'regionId', 'areaId', 'teamId']) { const value = text(data.get(key)); if (value) scope[key] = value; } return scope; };
    19	const contextKey = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
    20	const safeMessage = (code) => ({ OFFLINE_PRIVILEGED_DENIED: 'لا يمكن تنفيذ إجراء إداري دون اتصال آمن.', CONFIGURATION_REQUIRED: 'الخدمة الآمنة غير مهيأة. لم يتم حفظ أي تغيير.', PERMISSION_DENIED: 'هذا الإجراء غير متاح لصلاحياتك الحالية.', SCOPE_DENIED: 'النطاق المحدد خارج صلاحياتك.', SELF_ELEVATION_DENIED: 'لا يمكن تعديل صلاحياتك بنفسك.' })[code] || 'تعذر إتمام الإجراء بأمان. راجع البيانات وحاول مرة أخرى.';
    21
    22	export function createOwnerController({ root = document, repository, careAdapter, identity, clock = () => new Date().toISOString(), local = false }) {
    23	  const actor = () => identity(); const now = () => clock(); let activeDialog; let returnFocus; let searchAbort; let debounce; let assignmentFilter = 'all';
    24	  const decision = (permission, scope = { level: 'platform' }) => authorize({ actor: actor(), permission, resourceScope: scope, now: now() });
    25	  const setStatus = (message, state = 'idle') => { const node = root.querySelector('[data-owner-status]'); if (node) { node.textContent = message; node.dataset.state = state; } };
    26	  function closeDialog() { if (!activeDialog) return; activeDialog.remove(); activeDialog = null; returnFocus?.focus(); }
    27	  function dialog(title) { returnFocus = document.activeElement; const layer = make('div', { class: 'pr35-layer' }); const panel = make('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-dialog-title', tabindex: '-1' }); panel.append(make('h2', { id: 'pr35-dialog-title' }, title)); layer.append(panel); document.body.append(layer); activeDialog = layer; layer.addEventListener('click', (event) => { if (event.target === layer) closeDialog(); }); layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDialog(); if (event.key === 'Tab') { const controls = [...panel.querySelectorAll('button,input,select,textarea')].filter((item) => !item.hidden && !item.disabled); const first = controls[0], last = controls.at(-1); if (!first) { event.preventDefault(); panel.focus(); } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }); return panel; }
    28	  function openAssignment(subjectId = 'profile-user') {
    29	    const permitted = decision('authorization.assignment.manage'); if (!permitted.allowed) { setStatus(safeMessage(permitted.code), 'failed'); return; }
    30	    const panel = dialog('تكليف تشغيلي'); const form = make('form', { class: 'pr35-form', 'data-assignment-form': '' });
    31	    const subject = make('input', { name: 'subjectId', value: subjectId, required: '', maxlength: '128', 'aria-label': 'معرف المستخدم' }); subject.value = subjectId;
    32	    const role = make('select', { name: 'roleId', required: '', 'aria-label': 'المنصب' }); ROLE_IDS.filter((id) => id !== 'owner').forEach((id) => role.append(make('option', { value: id }, id.replaceAll('_', ' '))));
    33	    const scopeLevel = make('select', { name: 'scopeLevel', required: '', 'aria-label': 'مستوى النطاق' }); SCOPE_LEVELS.forEach((id) => scopeLevel.append(make('option', { value: id }, id)));
    34	    const scopeId = make('input', { name: 'sectorId', maxlength: '128', placeholder: 'معرف القطاع عند الحاجة', 'aria-label': 'معرف القطاع' });
    35	    const permission = make('select', { name: 'permissionIds', multiple: '', required: '', 'aria-label': 'الصلاحيات المفوضة' }); PERMISSION_IDS.filter((id) => id !== 'authorization.owner.manage' && id !== 'audit.event.append').forEach((id) => permission.append(make('option', { value: id }, id)));
    36	    const expiry = make('input', { name: 'expiresAt', type: 'datetime-local', required: '', 'aria-label': 'تاريخ انتهاء التكليف' });
    37	    const reason = make('textarea', { name: 'reason', required: '', maxlength: '500', 'data-assignment-reason': '', placeholder: 'سبب موثق ومطلوب', 'aria-label': 'سبب التكليف' });
    38	    const state = make('div', { class: 'pr35-review', 'data-assignment-review': '', 'aria-live': 'polite' });
    39	    const next = make('button', { type: 'button', class: 'pr35-primary' }, 'مراجعة التكليف'); const cancel = make('button', { type: 'button' }, 'إلغاء');
    40	    form.append(subject, role, scopeLevel, scopeId, permission, expiry, reason, state, next, cancel); panel.append(form); cancel.addEventListener('click', closeDialog);
    41	    next.addEventListener('click', () => {
    42	      if (!form.reportValidity()) return; const data = new FormData(form); const permissionIds = data.getAll('permissionIds'); const scope = scopeFrom(form);
    43	      const review = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
    44	      if (!review.allowed) { state.textContent = safeMessage(review.code); state.dataset.state = 'failed'; return; }
    45	      state.textContent = `مراجعة قبل التأكيد: ${data.get('roleId')} — ${scope.level} — ${permissionIds.length} صلاحيات — ينتهي ${data.get('expiresAt')}`; state.dataset.state = 'review'; next.hidden = true;
    46	      const confirm = make('button', { type: 'button', class: 'pr35-primary', 'data-assignment-confirm': '' }, 'تأكيد التكليف المحلي'); form.append(confirm); confirm.focus();
    47	      confirm.addEventListener('click', async () => {
    48	        const finalReview = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
    49	        if (!finalReview.allowed || !navigator.onLine) { state.textContent = safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : finalReview.code); state.dataset.state = 'failed'; return; }
    50	        confirm.disabled = true; state.textContent = 'جاري التحقق والتنفيذ…';
    51	        const result = await repository.createAssignment({ subjectId: data.get('subjectId'), roleId: data.get('roleId'), permissionIds, scope, startsAt: now(), expiresAt: new Date(data.get('expiresAt')).toISOString() }, { actor: actor(), now: now(), reason: data.get('reason'), correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') });
    52	        if (!result.ok) { state.textContent = safeMessage(result.code); state.dataset.state = 'failed'; confirm.disabled = false; return; }
    53	        state.textContent = local ? 'تم التكليف داخل العرض المحلي المؤقت فقط.' : 'تم تأكيد التكليف من الخدمة الآمنة.'; state.dataset.state = 'sent'; await renderAssignments();
    54	      });
    55	    }); panel.focus();
    56	  }
    57	  async function changeAssignment(id, action) {
    58	    const allowed = decision('authorization.assignment.manage'); if (!allowed.allowed || !navigator.onLine) { setStatus(safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : allowed.code), 'failed'); return; }
    59	    const panel = dialog(action === 'revoke' ? 'سحب التكليف' : 'تعليق التكليف'); const form = make('form', { class: 'pr35-form' }); const reason = make('textarea', { required: '', maxlength: '500', 'aria-label': 'سبب الإجراء', placeholder: 'السبب مطلوب للتوثيق' }); const confirm = make('button', { type: 'submit', class: 'pr35-danger' }, 'تأكيد الإجراء'); form.append(reason, confirm); panel.append(form);
    60	    form.addEventListener('submit', async (event) => { event.preventDefault(); if (!form.reportValidity()) return; confirm.disabled = true; const method = action === 'revoke' ? repository.revokeAssignment : repository.suspendAssignment; const result = await method({ assignmentId: id }, { actor: actor(), now: now(), reason: reason.value, correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') }); setStatus(result.ok ? 'تم تحديث التكليف محليًا مع سجل تدقيق.' : safeMessage(result.code), result.ok ? 'sent' : 'failed'); closeDialog(); await renderAssignments(); }); panel.focus();
    61	  }
    62	  async function renderAssignments(query = '') {
    63	    const host = root.querySelector('[data-owner-assignments-list]'); if (!host) return; host.replaceChildren(make('div', { class: 'pr35-skeleton', 'aria-hidden': 'true' }));
    64	    const result = await repository.listAssignments({ limit: 20, scope: { level: 'platform' } }, { actor: actor(), now: now() }); host.replaceChildren();
    65	    if (!result.ok) { host.append(make('p', { class: 'pr35-empty' }, safeMessage(result.code))); return; }
    66	    const filtered = assignmentFilter === 'all' ? result.items : result.items.filter((item) => item.state === assignmentFilter);
    67	    const page = filterAndPage(filtered, { query },  ['subjectId', 'roleId', 'state']); if (!page.items.length) { host.append(make('p', { class: 'pr35-empty' }, 'لا توجد تكليفات مطابقة.')); return; }
    68	    page.items.forEach((item) => { const card = make('article', { class: 'pr35-row' }); card.append(make('strong', {}, item.subjectId), make('span', {}, `${item.roleId} · ${item.scope.level} · ${item.state}`)); if (item.state === 'active') { const suspend = make('button', { type: 'button', 'data-suspend-assignment': item.id }, 'تعليق'); const revoke = make('button', { type: 'button', 'data-revoke-assignment': item.id }, 'سحب'); suspend.addEventListener('click', () => changeAssignment(item.id, 'suspend')); revoke.addEventListener('click', () => changeAssignment(item.id, 'revoke')); card.append(suspend, revoke); } host.append(card); });
    69	  }
    70	  function renderDemoQueues() {
    71	    const care = root.querySelector('[data-owner-care-list]'); const permissions = root.querySelector('[data-owner-permission-list]'); const audit = root.querySelector('[data-owner-audit-list]');
    72	    if (care) { const samples = [{ id: 'TC-1042', category: 'مشكلة حساب', priority: 'urgent', createdAt: new Date(Date.parse(now()) - 55 * 60000).toISOString() }, { id: 'TC-1041', category: 'اعتراض على رفض', priority: 'normal', createdAt: new Date(Date.parse(now()) - 2 * 3600000).toISOString() }]; care.replaceChildren(); samples.forEach((ticket) => { const sla = calculateSla({ priority: ticket.priority, createdAt: ticket.createdAt, now: now() }); const node = make('article', { class: `pr35-row${sla.breached || sla.remainingMs < 15 * 60000 ? ' is-warning' : ''}` }); node.append(make('strong', {}, `${ticket.id} — ${ticket.category}`), make('span', {}, sla.breached ? 'تجاوز SLA — يحتاج تصعيدًا' : `متبقٍ ${Math.max(1, Math.ceil(sla.remainingMs / 60000))} دقيقة`), make('button', { type: 'button', disabled: '', title: 'عرض توضيحي محلي' }, 'عرض محلي')); care.append(node); }); }
    73	    if (permissions) permissions.replaceChildren(make('p', { class: 'pr35-empty' }, 'لا توجد طلبات صلاحية معلقة في العرض المحلي.'));
    74	    if (audit) audit.replaceChildren(make('p', { class: 'pr35-empty' }, 'ستظهر أحداث التدقيق غير القابلة للتعديل بعد الإجراءات المحلية.'));
    75	  }
    76	  function bindSearch() { const input = root.querySelector('[data-owner-search]'); if (!input) return; input.addEventListener('input', () => { clearTimeout(debounce); searchAbort?.abort(); searchAbort = new AbortController(); debounce = setTimeout(() => { if (!searchAbort.signal.aborted) renderAssignments(input.value); }, 220); }); root.querySelectorAll('[data-owner-filter]').forEach((button) => button.addEventListener('click', () => { assignmentFilter = button.dataset.ownerFilter; root.querySelectorAll('[data-owner-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button))); renderAssignments(input.value); })); }
    77	  async function mountConsole() { const gate = root.querySelector('[data-owner-auth-gate]'); const consoleNode = root.querySelector('[data-owner-console]'); const allowed = decision('owner.console.read'); if (!allowed.allowed) { if (gate) gate.textContent = safeMessage(allowed.code); return false; } if (gate) gate.hidden = true; if (consoleNode) consoleNode.hidden = false; root.querySelector('[data-owner-local-disclosure]')?.toggleAttribute('hidden', !local); root.querySelector('[data-new-assignment]')?.addEventListener('click', () => openAssignment()); bindSearch(); renderDemoQueues(); await renderAssignments(); return true; }
    78	  function mountProfileActions(host) { const assign = decision('authorization.assignment.manage'); const state = host.dataset.assignmentId ? decision('authorization.assignment.manage') : { allowed: false }; const actions = visibleProfileActions(assign, state); if (!actions.length) { host.remove(); return; } host.hidden = false; const trigger = host.querySelector('[data-profile-actions-trigger]'); const menu = host.querySelector('[role="menu"]'); trigger.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button')?.focus(); }); host.querySelector('[data-profile-assign]')?.addEventListener('click', () => openAssignment(host.dataset.subjectId || 'profile-user')); host.querySelector('[data-profile-suspend]')?.toggleAttribute('hidden', !actions.includes('suspend')); host.querySelector('[data-profile-revoke]')?.toggleAttribute('hidden', !actions.includes('revoke')); if (host.dataset.assignmentId) { host.querySelector('[data-profile-suspend]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'suspend')); host.querySelector('[data-profile-revoke]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'revoke')); } menu.addEventListener('keydown', (event) => { const items = [...menu.querySelectorAll('button:not([hidden])')]; const index = items.indexOf(document.activeElement); if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length].focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); } if (event.key === 'Escape') { menu.hidden = true; trigger.focus(); } }); }
    79	  return Object.freeze({ mountConsole, mountProfileActions, openAssignment, closeDialog, renderAssignments });
    80	}

---TEST---
✔ tests/pr35/assignment-repository.test.mjs (83.073034ms)
✔ tests/pr35/audit.test.mjs (68.16643ms)
✔ tests/pr35/contracts.test.mjs (52.335491ms)
✔ tests/pr35/drafts-network.test.mjs (91.373048ms)
✔ tests/pr35/policy-scope.test.mjs (62.912665ms)
✖ tests/pr35/production-boundary.test.mjs (56.452529ms)
✔ tests/pr35/routing-sla.test.mjs (72.737774ms)
✔ tests/pr35/sanitize.test.mjs (51.15516ms)
✔ tests/pr35/tiger-care.test.mjs (62.978935ms)
✔ tests/pr35/ui-behavior.test.mjs (70.887143ms)
ℹ tests 10
ℹ suites 0
ℹ pass 9
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 684.921709

✖ failing tests:

test at tests/pr35/production-boundary.test.mjs:1:1
✖ tests/pr35/production-boundary.test.mjs (56.452529ms)
  'test failed'

exec
/bin/bash -lc 'node --test --test-reporter=spec tests/pr35/production-boundary.test.mjs; nl -ba tests/pr35/production-boundary.test.mjs; cat package.json 2>/dev/null || true; bash scripts/qa-pr35-owner-control-tiger-care.sh' in /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
 exited 1 in 1056ms:
✖ tests/pr35/production-boundary.test.mjs (59.713197ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 69.938672

✖ failing tests:

test at tests/pr35/production-boundary.test.mjs:1:1
✖ tests/pr35/production-boundary.test.mjs (59.713197ms)
  'test failed'
     1	import test from 'node:test';
     2	import assert from 'node:assert/strict';
     3	import { readFileSync, existsSync } from 'node:fs';
     4
     5	const root = new URL('../../', import.meta.url);
     6	const read = (path) => readFileSync(new URL(path, root), 'utf8');
     7
     8	test('production adapters contain no endpoint or credential and document fail-closed configuration', () => {
     9	  for (const path of [
    10	    'scripts/pr35/pr35-production-adapter.js',
    11	    'scripts/pr35/pr35-assignment-repository.js'
    12	  ]) {
    13	    const source = read(path);
    14	    assert.doesNotMatch(source, /https?:\/\//i);
    15	    assert.doesNotMatch(source, /(supabase_url|anon_key|service_role|api[_-]?key|bearer\s+)/i);
    16	    assert.match(source, /CONFIGURATION_REQUIRED/);
    17	    assert.match(source, /REMOTE_ENFORCEMENT_FAILED/);
    18	  }
    19	});
    20
    21	test('review-only SQL covers the Pass 05 schema and fail-closed RLS design', () => {
    22	  const sql = read('docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql');
    23	  assert.match(sql, /^\/\* REVIEW ONLY — DO NOT APPLY/);
    24	  assert.match(sql, /\bbegin;/i);
    25	  assert.match(sql, /\brollback;\s*$/i);
    26	  for (const table of [
    27	    'roles', 'permissions', 'role_permissions', 'user_role_assignments',
    28	    'permission_requests', 'tiger_care_tickets', 'tiger_care_messages',
    29	    'tiger_care_internal_notes', 'tiger_care_escalations',
    30	    'admin_activity_logs', 'notification_outbox'
    31	  ]) {
    32	    assert.match(sql, new RegExp(`create table public\\.${table}\\b`, 'i'));
    33	    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    34	  }
    35	  assert.match(sql, /auth\.jwt\(\)->>'sub'/);
    36	  assert.match(sql, /set search_path = pg_catalog, public/);
    37	  assert.match(sql, /deny self-assignment/i);
    38	  assert.match(sql, /owner-role assignment or revocation/i);
    39	  assert.match(sql, /requester ticket\/message isolation/i);
    40	  assert.match(sql, /revoke insert, update, delete, truncate on public\.admin_activity_logs/i);
    41	  assert.doesNotMatch(sql, /grant\s+.+\s+to\s+service_role/i);
    42	});
    43
    44	test('Pass 05 remains outside migrations and is recorded in change control', () => {
    45	  assert.equal(existsSync(new URL('supabase/migrations/20260714_pr35_owner_control_tiger_care_review.sql', root)), false);
    46	  assert.match(read('docs/launch/pr35/CHANGE_CONTROL_MANIFEST.md'), /Pass 05:/);
    47	  const allowlist = read('docs/launch/pr35/CHANGED_FILES.allowlist').trim().split('\n');
    48	  assert.ok(allowlist.includes('docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql'));
    49	  assert.ok(allowlist.includes('tests/pr35/production-boundary.test.mjs'));
    50	  assert.deepEqual(allowlist, [...allowlist].sort());
    51	});
[pr35-qa] contracts and hostile input
✔ tests/pr35/contracts.test.mjs (64.52428ms)
✔ tests/pr35/sanitize.test.mjs (52.468505ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 127.094127
[pr35-qa] authorization abuse and scoped assignments
✔ tests/pr35/assignment-repository.test.mjs (71.914894ms)
✔ tests/pr35/policy-scope.test.mjs (62.928491ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 147.371251
[pr35-qa] Tiger Care workflow, routing, SLA, and IDOR
✔ tests/pr35/routing-sla.test.mjs (78.279383ms)
✔ tests/pr35/tiger-care.test.mjs (64.44103ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 152.025592
[pr35-qa] audit immutability and sensitive logging
✔ tests/pr35/audit.test.mjs (72.817265ms)
✖ tests/pr35/production-boundary.test.mjs (66.88498ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 149.445273

✖ failing tests:

test at tests/pr35/production-boundary.test.mjs:1:1
✖ tests/pr35/production-boundary.test.mjs (66.88498ms)
  'test failed'

exec
/bin/bash -lc 'node tests/pr35/production-boundary.test.mjs; echo exit:$?; grep -inE '"'https?://|supabase_url|anon_key|service_role|api[_-]?key|bearer ' scripts/pr35/pr35-production-adapter.js scripts/pr35/pr35-assignment-repository.js; tail -5 docs/security/sql-review/pr35/*.sql; sort -c docs/launch/pr35/CHANGED_FILES.allowlist; echo sort:"'$?' in /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
 succeeded in 259ms:
✔ production adapters contain no endpoint or credential and document fail-closed configuration (1.205408ms)
✔ review-only SQL covers the Pass 05 schema and fail-closed RLS design (1.0565ms)
✖ Pass 05 remains outside migrations and is recorded in change control (3.255451ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11.59053

✖ failing tests:

test at tests/pr35/production-boundary.test.mjs:44:1
✖ Pass 05 remains outside migrations and is recorded in change control (3.255451ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  ... Skipped lines

    [
      '.gitignore',
      'docs/launch/pr35/ARCHITECTURE_AND_DATA_FLOW.md',
      'docs/launch/pr35/ARCHITECTURE_FILE_MAP.md',
      'docs/launch/pr35/CHANGED_FILES.allowlist',
      'docs/launch/pr35/CHANGE_CONTROL_MANIFEST.md',
  -   'docs/launch/pr35/CODEX_REVIEW_ROUND1.md',
      'docs/launch/pr35/LEGACY_AND_UNUSED_FILE_AUDIT.md',
      'docs/launch/pr35/PERFORMANCE_AND_WEAK_NETWORK_BUDGET.md',
      'docs/launch/pr35/PERMISSION_CATALOG.md',
      'docs/launch/pr35/REVIEW_RESOLUTION_LOG.md',
      'docs/launch/pr35/SECURITY_THREAT_MODEL.md',
  ...
      'tests/pr35/ui-behavior.test.mjs',
  +   'docs/launch/pr35/CODEX_REVIEW_ROUND1.md'
    ]

      at TestContext.<anonymous> (file:///workspaces/TIGER-VVIP-PR35-OWNER-CONTROL/tests/pr35/production-boundary.test.mjs:50:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1306:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:897:18)
      at Test.postRun (node:internal/test_runner/test:1447:19)
      at Test.run (node:internal/test_runner/test:1372:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:897:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [Array],
    expected: [Array],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }
exit:1
-- 8. Test owner-only owner mutation, self-grant, permission/rank ceiling, rollback.
-- Rollback is a separately reviewed down script restoring prior grants/policies;
-- never drop evidence tables until export/retention requirements are satisfied.

rollback;
sort: docs/launch/pr35/CHANGED_FILES.allowlist:51: disorder: docs/launch/pr35/CODEX_REVIEW_ROUND1.md
sort:1

exec
/bin/bash -lc "cat scripts/pr35/pr35-i18n.js; nl -ba docs/launch/pr35/CHANGED_FILES.allowlist | tail -10; grep -R \"createUserSubmissionQueue\\|withRequestPolicy\" -n --exclude='*.test.mjs' . | head -20" in /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL
 succeeded in 604ms:
const ar = {
  'mode.local': 'وضع عرض محلي — لا يتم الحفظ في قاعدة بيانات بعيدة.',
  'mode.productionUnavailable': 'الخدمة الآمنة غير مهيأة حاليًا. لم يتم حفظ أي تغيير.',
  'care.title': 'طلب إلى Tiger Care',
  'care.confirmation': 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.',
  'care.pending': 'جاري إرسال الطلب…',
  'care.failed': 'تعذر إرسال الطلب بأمان. يمكنك المحاولة مرة أخرى.',
  'care.offlinePending': 'الطلب معلّق على هذا الجهاز حتى عودة الاتصال.',
  'common.close': 'إغلاق', 'common.cancel': 'إلغاء', 'common.continue': 'متابعة',
  'common.retry': 'إعادة المحاولة', 'common.loading': 'جاري التحميل…',
  'common.empty': 'لا توجد نتائج مطابقة حاليًا.', 'common.denied': 'هذا الإجراء غير متاح لصلاحياتك الحالية.'
};
const en = {
  'mode.local': 'Local demo mode — changes are not saved to a remote database.',
  'mode.productionUnavailable': 'Secure service is not configured. No change was saved.',
  'care.title': 'Tiger Care request',
  'care.confirmation': 'Your request has been received. We will contact you within 24 hours.',
  'care.pending': 'Sending your request…',
  'care.failed': 'Your request could not be sent safely. Please try again.',
  'care.offlinePending': 'This request is pending on this device until the connection returns.',
  'common.close': 'Close', 'common.cancel': 'Cancel', 'common.continue': 'Continue',
  'common.retry': 'Retry', 'common.loading': 'Loading…',
  'common.empty': 'No matching results yet.', 'common.denied': 'This action is unavailable with your current permissions.'
};

export const dictionaries = Object.freeze({ ar: Object.freeze(ar), en: Object.freeze(en) });
export function translate(key, lang = 'ar', params = {}) {
  const dictionary = dictionaries[lang] || dictionaries.ar;
  return String(dictionary[key] || dictionaries.ar[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}
export function setDocumentLanguage(lang = 'ar', documentRef = document) {
  const selected = lang === 'en' ? 'en' : 'ar';
  documentRef.documentElement.lang = selected;
  documentRef.documentElement.dir = selected === 'ar' ? 'rtl' : 'ltr';
  return selected;
}
    42	tests/pr35/contracts.test.mjs
    43	tests/pr35/drafts-network.test.mjs
    44	tests/pr35/fixtures.mjs
    45	tests/pr35/policy-scope.test.mjs
    46	tests/pr35/production-boundary.test.mjs
    47	tests/pr35/routing-sla.test.mjs
    48	tests/pr35/sanitize.test.mjs
    49	tests/pr35/tiger-care.test.mjs
    50	tests/pr35/ui-behavior.test.mjs
    51	docs/launch/pr35/CODEX_REVIEW_ROUND1.md
./scripts/pr35/pr35-drafts.js:24:export function createUserSubmissionQueue(sessionStorage, sessionId) {
./scripts/pr35/pr35-network.js:4:export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
./docs/launch/pr35/CODEX_REVIEW_ROUND1.md:651:    24	export function createUserSubmissionQueue(sessionStorage, sessionId) {
./docs/launch/pr35/CODEX_REVIEW_ROUND1.md:848:     4	export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
./docs/launch/pr35/CODEX_REVIEW_ROUND1.md:1559:     4	export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
./docs/launch/pr35/CODEX_REVIEW_ROUND1.md:1624:    24	export function createUserSubmissionQueue(sessionStorage, sessionId) {
./docs/launch/pr35/CODEX_REVIEW_ROUND1.md:1889:export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
./docs/superpowers/specs/2026-07-14-pr35-owner-control-tiger-care-design.md:60:withRequestPolicy(operation, { signal, timeoutMs, maxAttempts, baseDelayMs, random }): Promise<Result>
./docs/superpowers/plans/2026-07-14-pr35-owner-control-tiger-care-plan.md:114:- Produces: `withRequestPolicy(operation,{signal,timeoutMs,maxAttempts,baseDelayMs,random})`, `createDedupeRegistry()`, `createDraftStore(sessionStorage)`, `enqueueUserSubmission(input,context)`, `flushUserSubmissions(send,context)`.

codex
The patch can assign a synthetic identity to unauthenticated production users and falsely reports offline requests as queued despite not persisting them. The newly added QA suite also currently fails because its allowlist is unsorted.

Full review comments:

- [P1] Require an authenticated identity for Care submissions — /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL/scripts/pr35/pr35-bootstrap.js:13-13
  In production, when Clerk has no current user, this fallback creates an active `demo-member` identity. If a production transport is later configured, an unauthenticated visitor can submit requests attributed to that shared identifier instead of receiving `IDENTITY_REQUIRED`; reserve demo identities for local preview and return a missing/inactive identity otherwise.

- [P1] Queue the request before reporting an offline pending state — /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL/scripts/pr35/pr35-care-controller.js:41-41
  When submission fails while offline, this reports that the request is pending on the device, but the controller never invokes `createUserSubmissionQueue` or persists the payload anywhere. Closing or reloading the page loses the request and nothing is sent when connectivity returns, so either enqueue it before showing this state or report an ordinary failed submission.

- [P2] Keep the changed-files allowlist sorted — /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL/docs/launch/pr35/CHANGED_FILES.allowlist:51-51
  This entry is appended after the test paths rather than in lexical order, causing `tests/pr35/production-boundary.test.mjs` and therefore the PR35 QA script to fail at the allowlist ordering assertion.
The patch can assign a synthetic identity to unauthenticated production users and falsely reports offline requests as queued despite not persisting them. The newly added QA suite also currently fails because its allowlist is unsorted.

Full review comments:

- [P1] Require an authenticated identity for Care submissions — /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL/scripts/pr35/pr35-bootstrap.js:13-13
  In production, when Clerk has no current user, this fallback creates an active `demo-member` identity. If a production transport is later configured, an unauthenticated visitor can submit requests attributed to that shared identifier instead of receiving `IDENTITY_REQUIRED`; reserve demo identities for local preview and return a missing/inactive identity otherwise.

- [P1] Queue the request before reporting an offline pending state — /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL/scripts/pr35/pr35-care-controller.js:41-41
  When submission fails while offline, this reports that the request is pending on the device, but the controller never invokes `createUserSubmissionQueue` or persists the payload anywhere. Closing or reloading the page loses the request and nothing is sent when connectivity returns, so either enqueue it before showing this state or report an ordinary failed submission.

- [P2] Keep the changed-files allowlist sorted — /workspaces/TIGER-VVIP-PR35-OWNER-CONTROL/docs/launch/pr35/CHANGED_FILES.allowlist:51-51
  This entry is appended after the test paths rather than in lexical order, causing `tests/pr35/production-boundary.test.mjs` and therefore the PR35 QA script to fail at the allowlist ordering assertion.
