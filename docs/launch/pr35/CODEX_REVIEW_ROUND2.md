# PR35 Independent Codex Review — Round 2

Generated: 2026-07-14T18:46:49+00:00


===== 2026-07-14T18:45:44+00:00 =====
COMMAND: ['codex', '--ask-for-approval', 'never', '--sandbox', 'read-only', '--cd', '<repository-root>', 'review', '--uncommitted']
OpenAI Codex v0.144.4
--------
workdir: <repository-root>
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: read-only
reasoning effort: none
reasoning summaries: none
session id: 019f61f3-0c04-7e50-9dcb-0c9f44fb31bf
--------
user
current changes
2026-07-14T18:45:47.088235Z ERROR codex_core::shell_snapshot: Shell snapshot validation failed: Snapshot command exited with status exit status: 2: /home/codespace/.codex/shell_snapshots/019f61f3-0c04-7e50-9dcb-0c9f44fb31bf.tmp-1784054746132447298: line 2547: syntax error near unexpected token `('

exec
/bin/bash -lc "cat /home/codespace/.codex/plugins/cache/openai-curated-remote/superpowers/6.1.1/skills/using-superpowers/SKILL.md && printf '\\n---ROOT AGENTS---\\n' && find .. -name AGENTS.md -print" in <repository-root>
 succeeded in 424ms:
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

---ROOT AGENTS---
../TIGER-VVIP-PR34-PERSISTENCE/AGENTS.md
../.codespaces/.persistedshare/dotfiles/AGENTS.md
../TIGER-VVIP-PR35-OWNER-CONTROL/AGENTS.md
../TIGER-VVIP/AGENTS.md

exec
/bin/bash -lc "cat AGENTS.md; printf '\\n---STATUS---\\n'; git status --short; printf '\\n---DIFF STAT---\\n'; git diff --stat; git diff --cached --stat" in <repository-root>
 succeeded in 252ms:
# AGENTS.md

## Project Scope

- This repository is a static multi-page web app for TIGER VVIP built with plain HTML, CSS, and JavaScript.
- Do not introduce a framework, bundler, or package-based build step unless the user explicitly asks for it.
- Prefer small edits that preserve the current Facebook-style UI and bilingual Arabic/English behavior.

## Working Commands

- Local preview: `python -m http.server 800`
- App URL during local preview: `http://localhost:800`
- Supabase Edge Function deploy: `npm exec --yes supabase -- functions deploy phone-verification`
- Smoke checks: `./scripts/qa-smoke.sh`
- There is no established automated test suite in this repo. After UI or logic changes, validate with a focused manual smoke check in the browser.

## Code Map

- [index.html](./index.html): authentication entry page (Google/Facebook) and routing buttons to public/private pages.
- [styles.css](./styles.css): visual system and responsive styling.
- [auth.js](./auth.js): Firebase auth flow, user snapshot persistence, and role bootstrap.
- [public-profile.html](./public-profile.html): public feed page (page 3) with composer, feed list, and comments sheet.
- [private-profile.html](./private-profile.html): private profile page (page 4) with profile tabs and posts list.
- [social-ui.js](./social-ui.js): feed/profile interactions, optional Supabase sync, bilingual UI dictionary, and language toggle logic.
- [reset-password.html](./reset-password.html) and [reset-password.js](./reset-password.js): email password reset flow via Firebase.
- [supabase/functions/phone-verification/index.ts](./supabase/functions/phone-verification/index.ts): Deno Edge Function for internal phone verification delivery.
- [supabase/migrations/20260702_feed_posts_table.sql](./supabase/migrations/20260702_feed_posts_table.sql): feed posts table and policies used by the social feed sync.
- [sw.js](./sw.js) and [manifest.webmanifest](./manifest.webmanifest): PWA behavior.

## Project Conventions

- Keep the app static and page-based (`index.html`, `public-profile.html`, `private-profile.html`) unless the user asks for a different structure.
- Preserve bilingual content patterns. UI text commonly uses `data-i18n-ar`, `data-i18n-en`, and the `currentLang` state in [social-ui.js](./social-ui.js).
- Preserve RTL behavior for Arabic views.
- Match the existing visual language in [styles.css](./styles.css); this project intentionally follows a Facebook-style layout and palette.
- When changing auth or registration, trace both DOM changes in [index.html](./index.html) and behavior in [auth.js](./auth.js).

## Supabase Notes

- Social feed sync in [social-ui.js](./social-ui.js) reads optional runtime keys from browser storage:
	- `TIGER_SUPABASE_URL`
	- `TIGER_SUPABASE_ANON_KEY`
- If runtime keys are missing or Supabase is unavailable, the feed intentionally falls back to local mode.
- Phone verification depends on the deployed edge function in [supabase/functions/phone-verification/index.ts](./supabase/functions/phone-verification/index.ts).
- Meta-specific env vars such as `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are now optional and used only when `WHATSAPP_PROVIDER=meta`.

## Session And Access Rules

- Auth state is managed by Firebase in [auth.js](./auth.js).
- Lightweight role and user snapshot state is stored in browser localStorage keys such as `autoparts_role` and `autoparts_user_snapshot`.
- Preserve role-based gating for creation and profile features implemented in [social-ui.js](./social-ui.js).

## Data And Seed Files

- Use [ADMIN-SETUP.sql](./ADMIN-SETUP.sql) for admin bootstrap.
- Use [TEST-ACCOUNTS-SETUP.sql](./TEST-ACCOUNTS-SETUP.sql) and [TEST-USERS.md](./TEST-USERS.md) for test account setup.
- Use [DEMO-PAYROLL-SEED.sql](./DEMO-PAYROLL-SEED.sql) and [DEMO-PAYROLL-RESET.sql](./DEMO-PAYROLL-RESET.sql) only for demo payroll scenarios.
- Avoid changing seed SQL unless the task explicitly involves onboarding or demo data.

## Documentation To Link Instead Of Repeating

- [README.md](./README.md): quick project overview.
- [SETUP-GUIDE.md](./SETUP-GUIDE.md): main setup flow.
- [SUPABASE-EDGE-OTP-GUIDE.md](./SUPABASE-EDGE-OTP-GUIDE.md): phone verification edge function setup.
- [ADMIN-SETUP-GUIDE.md](./ADMIN-SETUP-GUIDE.md): admin bootstrap steps.
- [TEST-ACCOUNTS-GUIDE.md](./TEST-ACCOUNTS-GUIDE.md): test accounts.
- [FINAL-VERIFICATION.md](./FINAL-VERIFICATION.md): current verification checklist.

## Agent Guidance

- Prefer root-cause fixes in [social-ui.js](./social-ui.js) and [auth.js](./auth.js) over patching text or markup symptoms only.
- Before editing broad UI sections, search for the corresponding IDs in both page markup and related script files:
	- auth flow: [index.html](./index.html) + [auth.js](./auth.js)
	- feed/profile flow: [public-profile.html](./public-profile.html), [private-profile.html](./private-profile.html) + [social-ui.js](./social-ui.js)
- If the change touches auth, OTP, sessions, roles, service worker caching, or hosting routing, mention manual verification steps in the final response because there is no automated suite covering them.
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

---DIFF STAT---
 .gitignore                      |  4 ++++
 private-profile-p03.html        |  7 +++++++
 scripts/qa-smoke.sh             | 13 +++++++++++--
 scripts/vvip-pr30-resilience.js |  7 +++++++
 4 files changed, 29 insertions(+), 2 deletions(-)

exec
/bin/bash -lc "find docs/launch/pr35 docs/security/sql-review/pr35 docs/superpowers scripts/pr35 tests -type f -print | sort; printf '\\n---OTHER---\\n'; ls -l owner-control.html styles/vvip-pr35-owner-care.css scripts/qa-pr35-owner-control-tiger-care.sh AGENTS.override.md; printf '\\n---DIFF---\\n'; git diff -- .gitignore private-profile-p03.html scripts/qa-smoke.sh scripts/vvip-pr30-resilience.js" in <repository-root>
 succeeded in 269ms:
docs/launch/pr35/ARCHITECTURE_AND_DATA_FLOW.md
docs/launch/pr35/ARCHITECTURE_FILE_MAP.md
docs/launch/pr35/CHANGED_FILES.allowlist
docs/launch/pr35/CHANGE_CONTROL_MANIFEST.md
docs/launch/pr35/CODEX_REVIEW_ROUND1.md
docs/launch/pr35/CODEX_REVIEW_ROUND2.md
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

---OTHER---
-rw------- 1 codespace codespace 5957 Jul 14 18:45 AGENTS.override.md
-rw-rw-rw- 1 codespace codespace 3897 Jul 14 14:54 owner-control.html
-rwxrwxrwx 1 codespace codespace 3309 Jul 14 18:00 scripts/qa-pr35-owner-control-tiger-care.sh
-rw-rw-rw- 1 codespace codespace 5183 Jul 14 14:52 styles/vvip-pr35-owner-care.css

---DIFF---
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

exec
/bin/bash -lc ./scripts/qa-pr35-owner-control-tiger-care.sh in <repository-root>
 exited 1 in 2765ms:
[pr35-qa] contracts and hostile input
✔ tests/pr35/contracts.test.mjs (81.501634ms)
✔ tests/pr35/sanitize.test.mjs (57.332351ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 163.306927
[pr35-qa] authorization abuse and scoped assignments
✔ tests/pr35/assignment-repository.test.mjs (82.765486ms)
✔ tests/pr35/policy-scope.test.mjs (63.918541ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 155.706619
[pr35-qa] Tiger Care workflow, routing, SLA, and IDOR
✔ tests/pr35/routing-sla.test.mjs (76.305372ms)
✔ tests/pr35/tiger-care.test.mjs (57.622338ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 142.819744
[pr35-qa] audit immutability and sensitive logging
✔ tests/pr35/audit.test.mjs (72.94276ms)
✔ tests/pr35/production-boundary.test.mjs (54.560522ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 136.273916
[pr35-qa] accessibility, RTL, reduced motion, and UI behavior
✔ tests/pr35/ui-behavior.test.mjs (82.260385ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 90.839074
[pr35-qa] weak network, retry, cancellation, idempotency, and offline policy
✔ tests/pr35/drafts-network.test.mjs (93.757491ms)
✔ tests/pr35/production-boundary.test.mjs (59.558074ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 162.73329
[pr35-qa] syntax checks
[pr35-qa] sensitive logging scan
[pr35-qa] review-only SQL boundary
[pr35-qa] historical smoke guard regression samples
[pr35-qa] historical smoke regression
[smoke] validating PR29 replacement files
[smoke] validating legacy UI files are absent
[smoke] validating canonical index markers and assets
[smoke] validating runtime hooks and nine listing seeds
[smoke] validating account center contract
[smoke] validating PR30 resilience contracts
[smoke] validating PR31 create listing safe shell
[smoke] validating PR32 draft preview integration
[smoke] validating PR33 publish readiness
[focused] validating summary warning semantics
[focused] validating safe publish information action semantics
[focused] PR33 accessibility consistency checks passed
[smoke] validating auth preview and safe return path
[smoke] validating route availability
[smoke] validating service worker cache
[smoke] validating Firebase legacy redirects
[smoke] validating forbidden live terminology and navigation
[smoke] validating retired static policies
[smoke] validating sanitized client recovery logging
[smoke] validating no database-scope diff
[smoke][fail] forbidden PR30 scope changed: docs/launch/pr35/CODEX_REVIEW_ROUND2.md

exec
/bin/bash -lc 'cat docs/launch/pr35/CHANGED_FILES.allowlist; for f in scripts/pr35/*.js; do echo ---$f; sed -n '"'1,260p' \""'$f"; done' in <repository-root>
 succeeded in 303ms:
.gitignore
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
owner-control.html
private-profile-p03.html
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
scripts/qa-pr35-owner-control-tiger-care.sh
scripts/qa-smoke.sh
scripts/vvip-pr30-resilience.js
styles/vvip-pr35-owner-care.css
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
---scripts/pr35/pr35-assignment-repository.js
import { validateCorrelationKey, validateIdempotencyKey, validatePageRequest, ROLE_IDS, PERMISSION_IDS } from './pr35-contracts.js';
import { normalizeText } from './pr35-sanitize.js';
import { normalizeScope, scopeContains } from './pr35-scope.js';
import { authorize, canDelegate } from './pr35-policy.js';
import { createAuditEvent } from './pr35-audit.js';

const clone = (value) => structuredClone(value);
const fail = (code) => Object.freeze({ ok: false, code });
const AUTHORIZATION_READS = new Set(['listAssignments', 'listAuditEvents']);
function confirmedRemoteResult(result, operation) {
  if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean' || typeof result.code !== 'string') {
    return fail('REMOTE_ENFORCEMENT_FAILED');
  }
  if (!result.ok) return Object.freeze(clone(result));
  if (!AUTHORIZATION_READS.has(operation) && result.receipt?.confirmed !== true) {
    return fail('REMOTE_CONFIRMATION_REQUIRED');
  }
  return Object.freeze(clone(result));
}
function validateContext(context) {
  if (!validateCorrelationKey(context?.correlationKey).ok) return 'INVALID_CORRELATION_KEY';
  if (!validateIdempotencyKey(context?.idempotencyKey).ok) return 'INVALID_IDEMPOTENCY_KEY';
  if (!Number.isFinite(Date.parse(context?.now))) return 'INVALID_TIMESTAMP';
  try { normalizeText(context?.reason, { max: 500, required: true }); } catch (error) { return error.code; }
  return null;
}
function page(items, query) {
  const valid = validatePageRequest(query); if (!valid.ok) return valid;
  const offset = valid.value.cursor === null ? 0 : Number(valid.value.cursor);
  if (!Number.isSafeInteger(offset) || offset < 0) return fail('INVALID_CURSOR');
  const selected = items.slice(offset, offset + valid.value.limit).map(clone);
  return Object.freeze({ ok: true, code: 'OK', items: Object.freeze(selected), nextCursor: offset + selected.length < items.length ? String(offset + selected.length) : null });
}

export function createVolatileAuthorizationRepository() {
  const assignments = []; const audits = []; const receipts = new Map(); let sequence = 0;
  async function appendAudit(assignment, action, context) {
    const entry = await createAuditEvent({ previousHash: audits.at(-1)?.hash ?? null, actorId: context.actor.id,
      action, target: { type: 'assignment', id: assignment.id }, scope: assignment.scope,
      reason: context.reason, at: context.now, correlationKey: context.correlationKey,
      idempotencyKey: context.idempotencyKey, metadata: { roleId: assignment.roleId, subjectId: assignment.subjectId, state: assignment.state } });
    audits.push(entry);
  }
  async function runIdempotent(context, operation) {
    const invalid = validateContext(context); if (invalid) return fail(invalid);
    if (receipts.has(context.idempotencyKey)) return receipts.get(context.idempotencyKey);
    try {
      const result = await operation();
      if (result.ok) receipts.set(context.idempotencyKey, result);
      return result;
    } catch (error) { return fail(error.code || 'INVALID_COMMAND'); }
  }
  async function createAssignment(command, context) {
    return runIdempotent(context, async () => {
      if (!command || !ROLE_IDS.includes(command.roleId) || !Array.isArray(command.permissionIds) || command.permissionIds.some((id) => !PERMISSION_IDS.includes(id))) return fail('INVALID_ASSIGNMENT');
      const delegation = canDelegate({ actor: context.actor, subjectId: command.subjectId,
        permissionIds: command.permissionIds, scope: command.scope, roleId: command.roleId, now: context.now });
      if (!delegation.allowed) return fail(delegation.code);
      const startsAt = new Date(command.startsAt); const expiresAt = new Date(command.expiresAt);
      if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(expiresAt.getTime()) || startsAt >= expiresAt) return fail('INVALID_ASSIGNMENT_WINDOW');
      const record = Object.freeze({ id: `assignment-${++sequence}`, subjectId: normalizeText(command.subjectId, { max: 128, required: true }),
        roleId: command.roleId, permissionIds: Object.freeze([...new Set(command.permissionIds)].sort()), scope: normalizeScope(command.scope),
        state: 'active', startsAt: startsAt.toISOString(), expiresAt: expiresAt.toISOString(), grantedBy: context.actor.id });
      assignments.push(record); await appendAudit(record, 'assignment.create', context);
      return Object.freeze({ ok: true, code: 'ASSIGNMENT_CREATED', data: clone(record), receipt: Object.freeze({ correlationKey: context.correlationKey, idempotencyKey: context.idempotencyKey, persistence: 'volatile' }) });
    });
  }
  async function changeState(command, context, state) {
    return runIdempotent(context, async () => {
      const index = assignments.findIndex((item) => item.id === command?.assignmentId);
      if (index < 0) return fail('ASSIGNMENT_NOT_FOUND');
      const current = assignments[index];
      const permission = current.roleId === 'owner' ? 'authorization.owner.manage' : 'authorization.assignment.manage';
      const auth = authorize({ actor: context.actor, permission, resourceScope: current.scope, now: context.now });
      if (!auth.allowed || current.subjectId === context.actor.id) return fail(current.subjectId === context.actor.id ? 'SELF_ELEVATION_DENIED' : auth.code);
      if (current.state === 'revoked') return fail('ASSIGNMENT_TERMINAL');
      const changed = Object.freeze({ ...current, state }); assignments[index] = changed;
      await appendAudit(changed, `assignment.${state === 'suspended' ? 'suspend' : 'revoke'}`, context);
      return Object.freeze({ ok: true, code: `ASSIGNMENT_${state.toUpperCase()}`, data: clone(changed), receipt: Object.freeze({ correlationKey: context.correlationKey, idempotencyKey: context.idempotencyKey, persistence: 'volatile' }) });
    });
  }
  function listProtected(items, query, context, permission) {
    const scope = query?.scope || { level: 'platform' };
    const auth = authorize({ actor: context?.actor, permission, resourceScope: scope, now: context?.now });
    if (!auth.allowed) return fail(auth.code);
    return page(items.filter((item) => scopeContains(scope, item.event?.scope || item.scope)), query);
  }
  return Object.freeze({
    createAssignment, suspendAssignment: (command, context) => changeState(command, context, 'suspended'),
    revokeAssignment: (command, context) => changeState(command, context, 'revoked'),
    listAssignments: (query = {}, context) => listProtected(assignments, query, context, 'authorization.assignment.read'),
    listAuditEvents: (query = {}, context) => listProtected(audits, query, context, 'audit.event.read.scoped')
  });
}

export function createRemoteAuthorizationRepository({ transport, verified = false, online = () => true } = {}) {
  const invoke = async (operation, command, context) => {
    if (typeof transport !== 'function' || verified !== true) return fail('CONFIGURATION_REQUIRED');
    const invalid = validateContext(context); if (invalid) return fail(invalid);
    try {
      if (!online()) return fail('OFFLINE_PRIVILEGED_DENIED');
      const result = await transport(Object.freeze({ operation, command: clone(command), context: clone(context) }));
      return confirmedRemoteResult(result, operation);
    }
    catch { return fail('REMOTE_ENFORCEMENT_FAILED'); }
  };
  return Object.freeze({ createAssignment: (c, x) => invoke('createAssignment', c, x),
    suspendAssignment: (c, x) => invoke('suspendAssignment', c, x), revokeAssignment: (c, x) => invoke('revokeAssignment', c, x),
    listAssignments: (c, x) => invoke('listAssignments', c, x), listAuditEvents: (c, x) => invoke('listAuditEvents', c, x) });
}
---scripts/pr35/pr35-audit.js
import { LIMITS, validateCorrelationKey, validateIdempotencyKey } from './pr35-contracts.js';
import { assertSafeKey, normalizeText, domainError } from './pr35-sanitize.js';
import { normalizeScope } from './pr35-scope.js';

export const REASON_REQUIRED_ACTIONS = Object.freeze(['assignment.create', 'assignment.suspend',
  'assignment.revoke', 'assignment.expire', 'authorization.owner.grant', 'authorization.owner.revoke']);
const secretPattern = /(token|secret|password|authorization|cookie|jwt|session|api[_-]?key)/i;

function sanitizeMetadata(input) {
  if (input === undefined) return Object.freeze(Object.create(null));
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw domainError('INVALID_AUDIT_METADATA');
  const keys = Object.keys(input).sort();
  if (keys.length > LIMITS.AUDIT_METADATA_KEYS) throw domainError('LIST_LIMIT_EXCEEDED');
  const output = Object.create(null);
  for (const key of keys) {
    assertSafeKey(key);
    if (secretPattern.test(key)) throw domainError('AUDIT_SECRET_FIELD');
    const value = input[key];
    if (typeof value === 'string') output[key] = normalizeText(value, { max: LIMITS.TEXT });
    else if (typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean' || value === null) output[key] = value;
    else throw domainError('INVALID_AUDIT_METADATA');
  }
  return Object.freeze(output);
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function createAuditEvent(input) {
  const action = normalizeText(input?.action, { max: 128, required: true });
  let reason;
  try { reason = normalizeText(input?.reason, { max: LIMITS.REASON, required: REASON_REQUIRED_ACTIONS.includes(action) }); }
  catch (error) { if (error.code === 'FIELD_REQUIRED') throw domainError('REASON_REQUIRED'); throw error; }
  if (!validateCorrelationKey(input?.correlationKey).ok) throw domainError('INVALID_CORRELATION_KEY');
  if (!validateIdempotencyKey(input?.idempotencyKey).ok) throw domainError('INVALID_IDEMPOTENCY_KEY');
  if (input.previousHash !== null && !/^[a-f0-9]{64}$/.test(input.previousHash || '')) throw domainError('INVALID_PREVIOUS_HASH');
  const target = input?.target;
  if (!target || typeof target !== 'object' || Array.isArray(target) || Object.keys(target).some((key) => !['type', 'id'].includes(assertSafeKey(key)))) throw domainError('INVALID_AUDIT_TARGET');
  const at = new Date(input?.at); if (!Number.isFinite(at.getTime()) || at.toISOString() !== input.at) throw domainError('INVALID_TIMESTAMP');
  const event = Object.freeze({ version: 1, previousHash: input.previousHash, at: input.at,
    actorId: normalizeText(input.actorId, { max: 128, required: true }), action,
    target: Object.freeze({ type: normalizeText(target.type, { max: 64, required: true }), id: normalizeText(target.id, { max: 128, required: true }) }),
    scope: normalizeScope(input.scope), reason, correlationKey: input.correlationKey,
    idempotencyKey: input.idempotencyKey, metadata: sanitizeMetadata(input.metadata) });
  return Object.freeze({ event, hash: await sha256(canonical(event)) });
}
export async function verifyAuditChain(entries) {
  if (!Array.isArray(entries) || entries.length > 10000) return { ok: false, code: 'AUDIT_CHAIN_INVALID', index: 0 };
  let previousHash = null;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry?.event?.previousHash !== previousHash || entry.hash !== await sha256(canonical(entry.event))) return { ok: false, code: 'AUDIT_CHAIN_INVALID', index };
    previousHash = entry.hash;
  }
  return { ok: true, code: 'AUDIT_CHAIN_VALID' };
}
export function rejectAuditMutation(command) {
  return ['update', 'delete'].includes(command) ? { ok: false, code: 'AUDIT_APPEND_ONLY' } : { ok: false, code: 'UNKNOWN_COMMAND' };
}
---scripts/pr35/pr35-bootstrap.js
import { createLocalCareAdapter } from './pr35-local-adapter.js';
import { createProductionCareAdapter } from './pr35-production-adapter.js';
import { createVolatileAuthorizationRepository, createRemoteAuthorizationRepository } from './pr35-assignment-repository.js';
import { createUserSubmissionQueue } from './pr35-drafts.js';

const localHost = () => ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'].includes(location.hostname);
const preview = () => localHost() && ['account', 'owner', 'home'].includes(new URLSearchParams(location.search).get('preview'));
const now = () => new Date().toISOString();
const demoOwner = () => ({ id: 'demo-owner', kind: 'staff', accountState: 'active', sessionIssuedAt: now(), assignments: [{ id: 'demo-owner-assignment', subjectId: 'demo-owner', roleId: 'owner', permissionIds: ['owner.console.read', 'authorization.assignment.read', 'authorization.assignment.manage', 'authorization.owner.manage', 'authorization.permission.delegate', 'care.ticket.read.scoped', 'care.ticket.escalate', 'audit.event.read.scoped'], scope: { level: 'platform' }, state: 'active', startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z' }] });
const productionIdentity = () => window.__VVIP_PR35_IDENTITY__ || { id: window.Clerk?.user?.id || null, kind: 'user', accountState: window.Clerk?.user ? 'active' : 'inactive', assignments: [] };
export const resolveCareIdentity = ({ local = false, clerkUser = null } = {}) => local
  ? { id: 'demo-member', kind: 'user', accountState: 'active', assignments: [] }
  : { id: clerkUser?.id || null, kind: 'user', accountState: clerkUser?.id ? 'active' : 'inactive', assignments: [] };

async function boot() {
  const local = preview(); const identity = local ? demoOwner : productionIdentity;
  const careIdentity = () => resolveCareIdentity({ local, clerkUser: window.Clerk?.user });
  const repository = local ? createVolatileAuthorizationRepository() : createRemoteAuthorizationRepository();
  const careAdapter = local ? createLocalCareAdapter({ clock: now, online: () => navigator.onLine }) : createProductionCareAdapter();
  if (document.querySelector('[data-vvip-tiger-care-entry]')) {
    const { createCareController } = await import('./pr35-care-controller.js');
    const queue = createUserSubmissionQueue(sessionStorage, window.Clerk?.session?.id || careIdentity().id || 'anonymous');
    const care = createCareController({ adapter: careAdapter, identity: careIdentity, clock: now, queue });
    document.querySelectorAll('[data-vvip-tiger-care-entry]').forEach((button) => button.addEventListener('click', (event) => { event.stopImmediatePropagation(); care.open(button); }, true));
  }
  const actionHost = document.querySelector('[data-profile-actions-menu]'); const ownerRoot = document.querySelector('[data-owner-root]');
  if (actionHost || ownerRoot) {
    const { createOwnerController } = await import('./pr35-owner-controller.js');
    const owner = createOwnerController({ root: document, repository, careAdapter, identity, clock: now, local });
    if (actionHost) owner.mountProfileActions(actionHost);
    const ownerLink = document.querySelector('[data-pr35-owner-link]');
    if (ownerLink && (local || identity().assignments?.some((item) => item.state === 'active' && item.permissionIds?.includes('owner.console.read')))) ownerLink.hidden = false;
    if (ownerRoot) await owner.mountConsole();
  }
}
if (typeof document !== 'undefined') boot().catch(() => { const status = document.querySelector('[data-owner-status]'); if (status) status.textContent = 'تعذر تجهيز الوحدة بأمان. لم يتم حفظ أي تغيير.'; });
---scripts/pr35/pr35-care-controller.js
import { CARE_CATEGORIES, CARE_PRIORITIES } from './pr35-contracts.js';
import { translate } from './pr35-i18n.js';

const labels = Object.freeze({ management_contact: 'تواصل رسمي مع الإدارة', support: 'دعم', complaint_report: 'شكوى أو بلاغ', missing_category: 'فئة غير موجودة', rejection_appeal: 'اعتراض على رفض', account_issue: 'مشكلة حساب', sector_access_request: 'طلب قطاع أو وصول', fraud_safety: 'احتيال أو سلامة', other: 'طلب آخر' });
const el = (tag, attrs = {}, text = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => key === 'class' ? node.className = value : node.setAttribute(key, value)); node.textContent = text; return node; };
const key = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

export async function submitCareRequest({ adapter, queue, payload, context, online }) {
  try {
    const result = await adapter.submitUserRequest(payload, context);
    if (result.ok) return Object.freeze({ state: 'sent', code: result.code });
    if (online()) return Object.freeze({ state: 'failed', code: result.code });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (online()) return Object.freeze({ state: 'failed', code: error?.code || 'REQUEST_FAILED' });
  }
  const queued = queue?.enqueue(payload, context);
  return queued?.ok
    ? Object.freeze({ state: 'pending', code: queued.code })
    : Object.freeze({ state: 'failed', code: queued?.code || 'QUEUE_UNAVAILABLE' });
}

export function createCareController({ root = document, adapter, identity, queue, clock = () => new Date().toISOString(), online = () => navigator.onLine }) {
  let layer; let opener; let requestController;
  function close() { requestController?.abort(); if (!layer) return; layer.remove(); layer = null; opener?.focus(); opener = null; }
  function open(trigger) {
    if (layer) return; opener = trigger || document.activeElement;
    layer = el('div', { class: 'pr35-layer', 'data-care-dialog': '' });
    const dialog = el('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-care-title', tabindex: '-1' });
    const title = el('h2', { id: 'pr35-care-title' }, translate('care.title'));
    const disclosure = el('p', { class: 'pr35-disclosure' }, translate('mode.local'));
    const form = el('form', { class: 'pr35-form', 'data-care-form': '' });
    const category = el('select', { name: 'category', required: '', 'aria-label': 'نوع الطلب' });
    CARE_CATEGORIES.forEach((id) => category.append(el('option', { value: id }, labels[id])));
    const priority = el('select', { name: 'priority', required: '', 'aria-label': 'الأولوية' });
    CARE_PRIORITIES.forEach((id) => priority.append(el('option', { value: id }, ({ low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' })[id])));
    priority.value = 'normal';
    const subject = el('input', { name: 'subject', required: '', maxlength: '160', placeholder: 'موضوع الطلب', 'aria-label': 'موضوع الطلب' });
    const description = el('textarea', { name: 'description', required: '', maxlength: '4000', placeholder: 'اكتب التفاصيل دون بيانات دخول أو أسرار', 'aria-label': 'تفاصيل الطلب' });
    const status = el('p', { class: 'pr35-status', role: 'status', 'aria-live': 'polite', 'data-care-state': 'idle' });
    const submit = el('button', { type: 'submit', class: 'pr35-primary' }, 'إرسال الطلب');
    const cancel = el('button', { type: 'button', 'data-care-close': '' }, translate('common.cancel'));
    form.append(category, priority, subject, description, status, submit, cancel); dialog.append(title, disclosure, form); layer.append(dialog); document.body.append(layer);
    cancel.addEventListener('click', close);
    layer.addEventListener('click', (event) => { if (event.target === layer) close(); });
    layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if (event.key === 'Tab') { const controls = [...dialog.querySelectorAll('button,input,select,textarea')]; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); if (!form.reportValidity()) return;
      requestController?.abort(); requestController = new AbortController(); submit.disabled = true; status.dataset.careState = 'pending'; status.textContent = translate('care.pending');
      const actor = identity(); const context = { actor, now: clock(), correlationKey: key('corr'), idempotencyKey: key('idem'), signal: requestController.signal };
      const payload = { category: category.value, priority: priority.value, subject: subject.value, description: description.value };
      try {
        const result = await submitCareRequest({ adapter, queue, payload, context, online });
        status.dataset.careState = result.state;
        status.textContent = translate(result.state === 'sent' ? 'care.confirmation' : result.state === 'pending' ? 'care.offlinePending' : 'care.failed');
        if (result.state === 'sent') form.reset();
      } catch (error) { if (error.name !== 'AbortError') { status.dataset.careState = 'failed'; status.textContent = translate('care.failed'); } }
      finally { submit.disabled = false; }
    });
    dialog.focus();
  }
  return Object.freeze({ open, close });
}
---scripts/pr35/pr35-contracts.js
const frozen = (values) => Object.freeze([...values]);

export const ROLE_IDS = frozen(['owner', 'platform_admin', 'sector_manager', 'regional_manager',
  'area_manager', 'group_manager', 'campaign_manager', 'sales', 'marketing', 'tiger_care',
  'moderator', 'service_provider', 'regular_user']);

export const PERMISSION_IDS = frozen(['owner.console.read', 'authorization.assignment.read',
  'authorization.assignment.manage', 'authorization.owner.manage',
  'authorization.permission.delegate', 'care.request.create', 'care.ticket.read.own',
  'care.ticket.read.scoped', 'care.ticket.acknowledge', 'care.ticket.assign',
  'care.ticket.transition', 'care.ticket.escalate', 'care.ticket.resolve',
  'care.message.create.own', 'care.message.create.scoped', 'care.internal_note.read',
  'care.internal_note.create', 'care.routing.manage', 'care.sla.manage',
  'audit.event.read.scoped', 'audit.event.append']);

export const SCOPE_LEVELS = frozen(['platform', 'sector', 'region', 'area', 'team']);
export const ASSIGNMENT_STATES = frozen(['pending', 'active', 'suspended', 'revoked', 'expired']);
export const CARE_CATEGORIES = frozen(['management_contact', 'support', 'complaint_report',
  'missing_category', 'rejection_appeal', 'account_issue', 'sector_access_request',
  'fraud_safety', 'other']);
export const CARE_PRIORITIES = frozen(['low', 'normal', 'high', 'urgent']);
export const TICKET_STATUSES = frozen(['new', 'acknowledged', 'in_review', 'waiting_user',
  'escalated', 'resolved', 'closed', 'cancelled']);

const permissions = (...ids) => Object.freeze({ permissionIds: frozen(ids) });
const allExceptBackendAudit = PERMISSION_IDS.filter((id) => id !== 'audit.event.append');
export const ROLE_TEMPLATES = Object.freeze({
  owner: permissions(...allExceptBackendAudit),
  platform_admin: permissions('owner.console.read', 'authorization.assignment.read',
    'authorization.assignment.manage', 'authorization.permission.delegate', 'care.ticket.read.scoped',
    'care.ticket.acknowledge', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate',
    'care.ticket.resolve', 'care.message.create.scoped', 'care.routing.manage', 'care.sla.manage',
    'audit.event.read.scoped'),
  sector_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate'),
  regional_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate'),
  area_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition'),
  group_manager: permissions('care.ticket.read.scoped', 'care.ticket.transition'),
  campaign_manager: permissions('care.ticket.read.scoped'), sales: permissions(), marketing: permissions(),
  tiger_care: permissions('care.ticket.read.scoped', 'care.ticket.acknowledge', 'care.ticket.transition',
    'care.ticket.escalate', 'care.ticket.resolve', 'care.message.create.scoped'),
  moderator: permissions('care.ticket.read.scoped'), service_provider: permissions(),
  regular_user: permissions('care.request.create', 'care.ticket.read.own', 'care.message.create.own')
});

export const ERROR_CODES = Object.freeze({
  PAGE_LIMIT_EXCEEDED: 'PAGE_LIMIT_EXCEEDED', FIELD_TOO_LONG: 'FIELD_TOO_LONG',
  INVALID_CORRELATION_KEY: 'INVALID_CORRELATION_KEY', INVALID_IDEMPOTENCY_KEY: 'INVALID_IDEMPOTENCY_KEY'
});
export const LIMITS = Object.freeze({ PAGE_DEFAULT: 20, PAGE_MAX: 50, CURSOR: 256, KEY: 128,
  TEXT: 500, REASON: 500, LIST: 50, AUDIT_METADATA_KEYS: 20 });

const keyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
function validateKey(value, prefix, code) {
  return typeof value === 'string' && value.startsWith(prefix) && keyPattern.test(value)
    ? { ok: true, code: 'OK', value }
    : { ok: false, code };
}
export const validateCorrelationKey = (value) => validateKey(value, 'corr_', ERROR_CODES.INVALID_CORRELATION_KEY);
export const validateIdempotencyKey = (value) => validateKey(value, 'idem_', ERROR_CODES.INVALID_IDEMPOTENCY_KEY);

export function validatePageRequest({ limit = LIMITS.PAGE_DEFAULT, cursor = null } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.PAGE_MAX) return { ok: false, code: ERROR_CODES.PAGE_LIMIT_EXCEEDED };
  if (cursor !== null && (typeof cursor !== 'string' || [...cursor].length > LIMITS.CURSOR)) return { ok: false, code: ERROR_CODES.FIELD_TOO_LONG };
  return { ok: true, code: 'OK', value: { limit, cursor } };
}
---scripts/pr35/pr35-drafts.js
import { validateCareRequest } from './pr35-tiger-care.js';

const fail = (code) => Object.freeze({ ok: false, code });
const MAX_ITEMS = 20; const MAX_BYTES = 65536;
const keyFor = (kind, sessionId) => `vvip:pr35:${kind}:${sessionId}`;
const read = (storage, key, fallback) => { try { return JSON.parse(storage.getItem(key)) || fallback; } catch { return fallback; } };
const write = (storage, key, value) => {
  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).length > MAX_BYTES) return fail('QUEUE_SIZE_EXCEEDED');
  try { storage.setItem(key, serialized); return { ok: true }; } catch { return fail('SESSION_STORAGE_UNAVAILABLE'); }
};
const normalize = (input, actorId) => validateCareRequest({ ...input, requesterId: actorId });

export function createDraftStore(sessionStorage, sessionId) {
  const key = keyFor('draft', sessionId);
  return Object.freeze({
    save(input, { actorId }) { const valid = normalize(input, actorId); if (!valid.ok) return valid;
      const result = write(sessionStorage, key, { actorId, value: valid.value }); return result.ok ? Object.freeze({ ok: true, code: 'DRAFT_SAVED' }) : result; },
    load({ actorId }) { const draft = read(sessionStorage, key, null); return !draft || draft.actorId !== actorId ? fail('DRAFT_NOT_FOUND') : Object.freeze({ ok: true, code: 'OK', value: structuredClone(draft.value) }); },
    clear() { sessionStorage.removeItem(key); return Object.freeze({ ok: true, code: 'DRAFT_CLEARED' }); }
  });
}

export function createUserSubmissionQueue(sessionStorage, sessionId) {
  const key = keyFor('queue', sessionId);
  const items = () => read(sessionStorage, key, []);
  return Object.freeze({
    enqueue(input, context) {
      if (context?.actor?.kind !== 'user' || input?.commandType) return fail('OFFLINE_PRIVILEGED_DENIED');
      const valid = normalize(input, context.actor.id); if (!valid.ok) return valid;
      const queue = items();
      const existing = queue.find((item) => item.idempotencyKey === context.idempotencyKey);
      if (existing) return fail('DUPLICATE_SUBMISSION');
      if (queue.length >= MAX_ITEMS) return fail('QUEUE_LIMIT_EXCEEDED');
      const entry = { idempotencyKey: context.idempotencyKey, correlationKey: context.correlationKey,
        actorId: context.actor.id, payload: valid.value, state: 'pending', attempts: 0 };
      const result = write(sessionStorage, key, [...queue, entry]);
      return result.ok ? Object.freeze({ ok: true, code: 'QUEUED', state: 'pending' }) : result;
    },
    async flush(send, context) {
      const queue = items(); const updated = [];
      for (const entry of queue) {
        if (entry.actorId !== context?.actor?.id || context.actor.kind !== 'user') { updated.push({ ...entry, state: 'failed', code: 'FORGED_IDENTITY' }); continue; }
        try { const result = await send(structuredClone(entry.payload), { ...context, idempotencyKey: entry.idempotencyKey, correlationKey: entry.correlationKey });
          updated.push({ ...entry, attempts: entry.attempts + 1, state: result.ok ? 'sent' : 'failed', code: result.code });
        } catch { updated.push({ ...entry, attempts: entry.attempts + 1, state: 'failed', code: 'NETWORK_UNAVAILABLE' }); }
      }
      write(sessionStorage, key, updated); return Object.freeze({ ok: true, code: 'QUEUE_FLUSHED', items: Object.freeze(updated.map(Object.freeze)) });
    }, list() { return Object.freeze(items().map((item) => Object.freeze(structuredClone(item)))); }
  });
}
---scripts/pr35/pr35-i18n.js
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
---scripts/pr35/pr35-local-adapter.js
import { validateIdempotencyKey, validateCorrelationKey } from './pr35-contracts.js';
import { validateCareRequest, safeCareText, projectTicketForRequester, transitionTicket, appendTimelineEvent } from './pr35-tiger-care.js';
import { createDedupeRegistry } from './pr35-network.js';
import { calculateSla } from './pr35-sla.js';

const fail = (code) => Object.freeze({ ok: false, code });
const clone = (value) => structuredClone(value);
const immutableList = (items) => Object.freeze(items.map((item) => Object.freeze(clone(item))));

export function createLocalCareAdapter({ clock = () => new Date().toISOString(), online = () => true, notifier } = {}) {
  const tickets = new Map(); const dedupe = createDedupeRegistry(); let ticketSequence = 0; let eventSequence = 0;
  const validateContext = (context) => !context?.actor?.id ? 'IDENTITY_REQUIRED'
    : !validateIdempotencyKey(context.idempotencyKey).ok ? 'INVALID_IDEMPOTENCY_KEY'
      : !validateCorrelationKey(context.correlationKey).ok ? 'INVALID_CORRELATION_KEY' : null;
  const run = async (payload, context, operation) => {
    const invalid = validateContext(context); if (invalid) return fail(invalid);
    try { return await dedupe.run(context.idempotencyKey, payload, operation); }
    catch (error) { return fail(error.code || 'INVALID_COMMAND'); }
  };
  const notify = async (ticket) => {
    if (notifier?.configured !== true || typeof notifier.send !== 'function') return Object.freeze({ status: 'not_configured' });
    try { const result = await notifier.send(Object.freeze({ type: 'care_request_received', ticketId: ticket.id, requesterId: ticket.requesterId }));
      return Object.freeze({ status: result?.confirmed === true ? 'confirmed' : 'failed' });
    } catch { return Object.freeze({ status: 'failed' }); }
  };
  const privileged = (context, permission) => {
    if (!online()) return 'OFFLINE_PRIVILEGED_DENIED';
    if (context?.actor?.kind !== 'staff' || !context.actor.permissions?.includes(permission)) return 'PERMISSION_DENIED';
    return null;
  };
  const find = (id) => tickets.get(id);

  async function submitUserRequest(input, context) {
    if (context?.actor?.kind !== 'user') return fail('PERMISSION_DENIED');
    if (input?.requesterId && input.requesterId !== context.actor.id) return fail('FORGED_IDENTITY');
    const bound = { ...input, requesterId: context.actor.id }; const valid = validateCareRequest(bound); if (!valid.ok) return valid;
    return run(valid.value, context, async () => {
      const createdAt = clock(); const id = `care-ticket-${++ticketSequence}`;
      const createdEvent = Object.freeze({ id: `care-event-${++eventSequence}`, type: 'created', actorId: context.actor.id, at: createdAt, visibility: 'user' });
      const sla = calculateSla({ priority: valid.value.priority, createdAt, now: createdAt });
      const ticket = Object.freeze({ id, ...clone(valid.value), status: 'new', createdAt, updatedAt: createdAt,
        assigneeId: null, messages: Object.freeze([]), internalNotes: Object.freeze([]), escalationHistory: Object.freeze([]),
        assignmentHistory: Object.freeze([]), timeline: Object.freeze([createdEvent]), sla });
      tickets.set(id, ticket); const notification = await notify(ticket);
      return Object.freeze({ ok: true, code: 'REQUEST_ACCEPTED', data: clone(ticket), receipt: Object.freeze({
        persistence: 'local_volatile', idempotencyKey: context.idempotencyKey,
        acknowledgement: 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.',
        email: Object.freeze({ status: 'not_configured' }), notification }) });
    });
  }

  async function getTicket(id, context) {
    const ticket = find(id); if (!ticket || !context?.actor?.id) return fail('TICKET_NOT_FOUND');
    if (context.actor.kind === 'user') { const projected = projectTicketForRequester(ticket, context.actor.id); return projected.ok ? Object.freeze({ ok: true, code: 'OK', data: projected.ticket }) : projected; }
    if (context.actor.kind !== 'staff' || !context.actor.permissions?.includes('care.ticket.read.scoped')) return fail('TICKET_NOT_FOUND');
    return Object.freeze({ ok: true, code: 'OK', data: clone(ticket) });
  }

  async function addStaffMessage(id, input, context) {
    const denied = privileged(context, 'care.message.create.scoped'); if (denied) return fail(denied);
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    return run({ id, body }, context, async () => {
      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    });
  }

  async function addUserMessage(id, input, context) {
    const ticket = find(id); if (!ticket || context?.actor?.kind !== 'user' || ticket.requesterId !== context.actor.id) return fail('TICKET_NOT_FOUND');
    if (input?.authorId && input.authorId !== context.actor.id) return fail('FORGED_IDENTITY');
    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    return run({ id, body }, context, async () => {
      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    });
  }

  async function addInternalNote(id, input, context) {
    const denied = privileged(context, 'care.internal_note.create'); if (denied) return fail(denied);
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    let body; try { body = safeCareText(input?.body, { max: 2000 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
    return run({ id, body, reason: context.reason }, context, async () => {
      const at = clock(); const note = Object.freeze({ id: `care-note-${++eventSequence}`, authorId: context.actor.id, body, at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'internal_note_added', actorId: context.actor.id, at, visibility: 'internal' });
      const next = Object.freeze({ ...ticket, internalNotes: immutableList([...ticket.internalNotes, note]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'INTERNAL_NOTE_ADDED', data: clone(note), audit: Object.freeze({ action: 'care.internal_note.create', reason: context.reason }) });
    });
  }

  async function changeStatus(id, command, context) {
    const denied = privileged(context, 'care.ticket.transition'); if (denied) return fail(denied);
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    return run({ id, ...command, reason: context.reason }, context, async () => {
      const result = transitionTicket({ ticket, toStatus: command.toStatus, actor: context.actor, reason: context.reason,
        resolutionSummary: command.resolutionSummary, now: clock() });
      if (!result.ok) return result; tickets.set(id, result.ticket); return Object.freeze({ ...result, data: clone(result.ticket) });
    });
  }

  async function escalateTicket(id, input, context) {
    const denied = privileged(context, 'care.ticket.escalate'); if (denied) return fail(denied);
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    let teamId; try { teamId = safeCareText(input?.toTeamId, { max: 128 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
    return run({ id, teamId, reason: context.reason }, context, async () => {
      if (!['acknowledged', 'in_review', 'waiting_user'].includes(ticket.status)) return fail('INVALID_TRANSITION');
      const at = clock(); const entry = Object.freeze({ id: `care-escalation-${++eventSequence}`, fromTeamId: ticket.teamId || null,
        toTeamId: teamId, actorId: context.actor.id, reason: context.reason, at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'escalated', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, status: 'escalated', teamId, escalationHistory: immutableList([...ticket.escalationHistory, entry]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'TICKET_ESCALATED', data: clone(next), audit: Object.freeze({ action: 'care.ticket.escalate', reason: context.reason }) });
    });
  }

  return Object.freeze({ submitUserRequest, getTicket, addUserMessage, addStaffMessage, addInternalNote, transitionTicket: changeStatus,
    mutateTicket: changeStatus, escalateTicket,
    listTickets: async (query = {}, context) => {
      const all = [...tickets.values()];
      if (context?.actor?.kind === 'user') return Object.freeze({ ok: true, code: 'OK', items: immutableList(all.filter((ticket) => ticket.requesterId === context.actor.id).map((ticket) => projectTicketForRequester(ticket, context.actor.id).ticket).slice(0, Math.min(50, query.limit || 20))) });
      return fail('PERMISSION_DENIED');
    }
  });
}
---scripts/pr35/pr35-network.js
const codedError = (code) => Object.assign(new Error(code), { code });
const signature = (value) => JSON.stringify(value, Object.keys(value || {}).sort());

export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
  baseDelayMs = 250, random = Math.random, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  idempotent = true } = {}) {
  if (signal?.aborted) throw codedError('REQUEST_CANCELLED');
  const attempts = idempotent ? Math.min(3, Math.max(1, maxAttempts)) : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const cancel = () => controller.abort(codedError('REQUEST_CANCELLED'));
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => controller.abort(codedError('REQUEST_TIMEOUT')), Math.min(30000, Math.max(1, timeoutMs)));
    const aborted = new Promise((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }));
    try { return await Promise.race([operation(controller.signal, attempt), aborted]); }
    catch (error) {
      const reason = controller.signal.aborted ? controller.signal.reason : error;
      if (reason?.code === 'REQUEST_TIMEOUT' || reason?.code === 'REQUEST_CANCELLED') throw reason;
      if (!error?.retryable || attempt === attempts) throw codedError('REQUEST_FAILED');
      const ceiling = Math.min(2000, baseDelayMs * (2 ** (attempt - 1)));
      await sleep(Math.max(0, Math.floor(ceiling * Math.min(1, Math.max(0, random())))));
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  throw codedError('REQUEST_FAILED');
}

export function createDedupeRegistry() {
  const entries = new Map();
  return Object.freeze({
    run(key, payload, operation) {
      if (typeof key !== 'string' || !key) return Promise.reject(codedError('INVALID_IDEMPOTENCY_KEY'));
      const payloadSignature = signature(payload);
      if (entries.has(key)) {
        const entry = entries.get(key);
        if (entry.signature !== payloadSignature) return Promise.reject(codedError('IDEMPOTENCY_CONFLICT'));
        return entry.promise;
      }
      const promise = Promise.resolve().then(operation);
      entries.set(key, Object.freeze({ signature: payloadSignature, promise }));
      promise.catch(() => entries.delete(key));
      return promise;
    }, clear: () => entries.clear()
  });
}
---scripts/pr35/pr35-owner-controller.js
import { authorize, canDelegate } from './pr35-policy.js';
import { ROLE_IDS, PERMISSION_IDS, ROLE_TEMPLATES, SCOPE_LEVELS } from './pr35-contracts.js';
import { calculateSla } from './pr35-sla.js';

const PAGE_SIZE = 20;
const text = (value) => String(value ?? '').trim().toLocaleLowerCase();
export function filterAndPage(rows, { query = '', page = 1, pageSize = PAGE_SIZE } = {}, fields = ['id']) {
  const needle = text(query); const size = Math.min(PAGE_SIZE, Math.max(1, Number(pageSize) || PAGE_SIZE));
  const filtered = rows.filter((row) => !needle || fields.some((field) => text(row[field]).includes(needle)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / size)); const current = Math.min(pageCount, Math.max(1, Number(page) || 1));
  return Object.freeze({ items: filtered.slice((current - 1) * size, current * size), page: current, pageCount, total: filtered.length });
}
export function visibleProfileActions(assignDecision, stateDecision) {
  if (!assignDecision?.allowed) return Object.freeze([]);
  return Object.freeze(stateDecision?.allowed ? ['assign', 'suspend', 'revoke'] : ['assign']);
}
const make = (tag, attrs = {}, value = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, val]) => key === 'class' ? node.className = val : node.setAttribute(key, val)); node.textContent = value; return node; };
const scopeFrom = (form) => { const data = new FormData(form); const level = data.get('scopeLevel'); const scope = { level }; for (const key of ['sectorId', 'regionId', 'areaId', 'teamId']) { const value = text(data.get(key)); if (value) scope[key] = value; } return scope; };
const contextKey = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
const safeMessage = (code) => ({ OFFLINE_PRIVILEGED_DENIED: 'لا يمكن تنفيذ إجراء إداري دون اتصال آمن.', CONFIGURATION_REQUIRED: 'الخدمة الآمنة غير مهيأة. لم يتم حفظ أي تغيير.', PERMISSION_DENIED: 'هذا الإجراء غير متاح لصلاحياتك الحالية.', SCOPE_DENIED: 'النطاق المحدد خارج صلاحياتك.', SELF_ELEVATION_DENIED: 'لا يمكن تعديل صلاحياتك بنفسك.' })[code] || 'تعذر إتمام الإجراء بأمان. راجع البيانات وحاول مرة أخرى.';

export function createOwnerController({ root = document, repository, careAdapter, identity, clock = () => new Date().toISOString(), local = false }) {
  const actor = () => identity(); const now = () => clock(); let activeDialog; let returnFocus; let searchAbort; let debounce; let assignmentFilter = 'all';
  const decision = (permission, scope = { level: 'platform' }) => authorize({ actor: actor(), permission, resourceScope: scope, now: now() });
  const setStatus = (message, state = 'idle') => { const node = root.querySelector('[data-owner-status]'); if (node) { node.textContent = message; node.dataset.state = state; } };
  function closeDialog() { if (!activeDialog) return; activeDialog.remove(); activeDialog = null; returnFocus?.focus(); }
  function dialog(title) { returnFocus = document.activeElement; const layer = make('div', { class: 'pr35-layer' }); const panel = make('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-dialog-title', tabindex: '-1' }); panel.append(make('h2', { id: 'pr35-dialog-title' }, title)); layer.append(panel); document.body.append(layer); activeDialog = layer; layer.addEventListener('click', (event) => { if (event.target === layer) closeDialog(); }); layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDialog(); if (event.key === 'Tab') { const controls = [...panel.querySelectorAll('button,input,select,textarea')].filter((item) => !item.hidden && !item.disabled); const first = controls[0], last = controls.at(-1); if (!first) { event.preventDefault(); panel.focus(); } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }); return panel; }
  function openAssignment(subjectId = 'profile-user') {
    const permitted = decision('authorization.assignment.manage'); if (!permitted.allowed) { setStatus(safeMessage(permitted.code), 'failed'); return; }
    const panel = dialog('تكليف تشغيلي'); const form = make('form', { class: 'pr35-form', 'data-assignment-form': '' });
    const subject = make('input', { name: 'subjectId', value: subjectId, required: '', maxlength: '128', 'aria-label': 'معرف المستخدم' }); subject.value = subjectId;
    const role = make('select', { name: 'roleId', required: '', 'aria-label': 'المنصب' }); ROLE_IDS.filter((id) => id !== 'owner').forEach((id) => role.append(make('option', { value: id }, id.replaceAll('_', ' '))));
    const scopeLevel = make('select', { name: 'scopeLevel', required: '', 'aria-label': 'مستوى النطاق' }); SCOPE_LEVELS.forEach((id) => scopeLevel.append(make('option', { value: id }, id)));
    const scopeId = make('input', { name: 'sectorId', maxlength: '128', placeholder: 'معرف القطاع عند الحاجة', 'aria-label': 'معرف القطاع' });
    const permission = make('select', { name: 'permissionIds', multiple: '', required: '', 'aria-label': 'الصلاحيات المفوضة' }); PERMISSION_IDS.filter((id) => id !== 'authorization.owner.manage' && id !== 'audit.event.append').forEach((id) => permission.append(make('option', { value: id }, id)));
    const expiry = make('input', { name: 'expiresAt', type: 'datetime-local', required: '', 'aria-label': 'تاريخ انتهاء التكليف' });
    const reason = make('textarea', { name: 'reason', required: '', maxlength: '500', 'data-assignment-reason': '', placeholder: 'سبب موثق ومطلوب', 'aria-label': 'سبب التكليف' });
    const state = make('div', { class: 'pr35-review', 'data-assignment-review': '', 'aria-live': 'polite' });
    const next = make('button', { type: 'button', class: 'pr35-primary' }, 'مراجعة التكليف'); const cancel = make('button', { type: 'button' }, 'إلغاء');
    form.append(subject, role, scopeLevel, scopeId, permission, expiry, reason, state, next, cancel); panel.append(form); cancel.addEventListener('click', closeDialog);
    next.addEventListener('click', () => {
      if (!form.reportValidity()) return; const data = new FormData(form); const permissionIds = data.getAll('permissionIds'); const scope = scopeFrom(form);
      const review = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
      if (!review.allowed) { state.textContent = safeMessage(review.code); state.dataset.state = 'failed'; return; }
      state.textContent = `مراجعة قبل التأكيد: ${data.get('roleId')} — ${scope.level} — ${permissionIds.length} صلاحيات — ينتهي ${data.get('expiresAt')}`; state.dataset.state = 'review'; next.hidden = true;
      const confirm = make('button', { type: 'button', class: 'pr35-primary', 'data-assignment-confirm': '' }, 'تأكيد التكليف المحلي'); form.append(confirm); confirm.focus();
      confirm.addEventListener('click', async () => {
        const finalReview = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
        if (!finalReview.allowed || !navigator.onLine) { state.textContent = safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : finalReview.code); state.dataset.state = 'failed'; return; }
        confirm.disabled = true; state.textContent = 'جاري التحقق والتنفيذ…';
        const result = await repository.createAssignment({ subjectId: data.get('subjectId'), roleId: data.get('roleId'), permissionIds, scope, startsAt: now(), expiresAt: new Date(data.get('expiresAt')).toISOString() }, { actor: actor(), now: now(), reason: data.get('reason'), correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') });
        if (!result.ok) { state.textContent = safeMessage(result.code); state.dataset.state = 'failed'; confirm.disabled = false; return; }
        state.textContent = local ? 'تم التكليف داخل العرض المحلي المؤقت فقط.' : 'تم تأكيد التكليف من الخدمة الآمنة.'; state.dataset.state = 'sent'; await renderAssignments();
      });
    }); panel.focus();
  }
  async function changeAssignment(id, action) {
    const allowed = decision('authorization.assignment.manage'); if (!allowed.allowed || !navigator.onLine) { setStatus(safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : allowed.code), 'failed'); return; }
    const panel = dialog(action === 'revoke' ? 'سحب التكليف' : 'تعليق التكليف'); const form = make('form', { class: 'pr35-form' }); const reason = make('textarea', { required: '', maxlength: '500', 'aria-label': 'سبب الإجراء', placeholder: 'السبب مطلوب للتوثيق' }); const confirm = make('button', { type: 'submit', class: 'pr35-danger' }, 'تأكيد الإجراء'); form.append(reason, confirm); panel.append(form);
    form.addEventListener('submit', async (event) => { event.preventDefault(); if (!form.reportValidity()) return; confirm.disabled = true; const method = action === 'revoke' ? repository.revokeAssignment : repository.suspendAssignment; const result = await method({ assignmentId: id }, { actor: actor(), now: now(), reason: reason.value, correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') }); setStatus(result.ok ? 'تم تحديث التكليف محليًا مع سجل تدقيق.' : safeMessage(result.code), result.ok ? 'sent' : 'failed'); closeDialog(); await renderAssignments(); }); panel.focus();
  }
  async function renderAssignments(query = '') {
    const host = root.querySelector('[data-owner-assignments-list]'); if (!host) return; host.replaceChildren(make('div', { class: 'pr35-skeleton', 'aria-hidden': 'true' }));
    const result = await repository.listAssignments({ limit: 20, scope: { level: 'platform' } }, { actor: actor(), now: now() }); host.replaceChildren();
    if (!result.ok) { host.append(make('p', { class: 'pr35-empty' }, safeMessage(result.code))); return; }
    const filtered = assignmentFilter === 'all' ? result.items : result.items.filter((item) => item.state === assignmentFilter);
    const page = filterAndPage(filtered, { query },  ['subjectId', 'roleId', 'state']); if (!page.items.length) { host.append(make('p', { class: 'pr35-empty' }, 'لا توجد تكليفات مطابقة.')); return; }
    page.items.forEach((item) => { const card = make('article', { class: 'pr35-row' }); card.append(make('strong', {}, item.subjectId), make('span', {}, `${item.roleId} · ${item.scope.level} · ${item.state}`)); if (item.state === 'active') { const suspend = make('button', { type: 'button', 'data-suspend-assignment': item.id }, 'تعليق'); const revoke = make('button', { type: 'button', 'data-revoke-assignment': item.id }, 'سحب'); suspend.addEventListener('click', () => changeAssignment(item.id, 'suspend')); revoke.addEventListener('click', () => changeAssignment(item.id, 'revoke')); card.append(suspend, revoke); } host.append(card); });
  }
  function renderDemoQueues() {
    const care = root.querySelector('[data-owner-care-list]'); const permissions = root.querySelector('[data-owner-permission-list]'); const audit = root.querySelector('[data-owner-audit-list]');
    if (care) { const samples = [{ id: 'TC-1042', category: 'مشكلة حساب', priority: 'urgent', createdAt: new Date(Date.parse(now()) - 55 * 60000).toISOString() }, { id: 'TC-1041', category: 'اعتراض على رفض', priority: 'normal', createdAt: new Date(Date.parse(now()) - 2 * 3600000).toISOString() }]; care.replaceChildren(); samples.forEach((ticket) => { const sla = calculateSla({ priority: ticket.priority, createdAt: ticket.createdAt, now: now() }); const node = make('article', { class: `pr35-row${sla.breached || sla.remainingMs < 15 * 60000 ? ' is-warning' : ''}` }); node.append(make('strong', {}, `${ticket.id} — ${ticket.category}`), make('span', {}, sla.breached ? 'تجاوز SLA — يحتاج تصعيدًا' : `متبقٍ ${Math.max(1, Math.ceil(sla.remainingMs / 60000))} دقيقة`), make('button', { type: 'button', disabled: '', title: 'عرض توضيحي محلي' }, 'عرض محلي')); care.append(node); }); }
    if (permissions) permissions.replaceChildren(make('p', { class: 'pr35-empty' }, 'لا توجد طلبات صلاحية معلقة في العرض المحلي.'));
    if (audit) audit.replaceChildren(make('p', { class: 'pr35-empty' }, 'ستظهر أحداث التدقيق غير القابلة للتعديل بعد الإجراءات المحلية.'));
  }
  function bindSearch() { const input = root.querySelector('[data-owner-search]'); if (!input) return; input.addEventListener('input', () => { clearTimeout(debounce); searchAbort?.abort(); searchAbort = new AbortController(); debounce = setTimeout(() => { if (!searchAbort.signal.aborted) renderAssignments(input.value); }, 220); }); root.querySelectorAll('[data-owner-filter]').forEach((button) => button.addEventListener('click', () => { assignmentFilter = button.dataset.ownerFilter; root.querySelectorAll('[data-owner-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button))); renderAssignments(input.value); })); }
  async function mountConsole() { const gate = root.querySelector('[data-owner-auth-gate]'); const consoleNode = root.querySelector('[data-owner-console]'); const allowed = decision('owner.console.read'); if (!allowed.allowed) { if (gate) gate.textContent = safeMessage(allowed.code); return false; } if (gate) gate.hidden = true; if (consoleNode) consoleNode.hidden = false; root.querySelector('[data-owner-local-disclosure]')?.toggleAttribute('hidden', !local); root.querySelector('[data-new-assignment]')?.addEventListener('click', () => openAssignment()); bindSearch(); renderDemoQueues(); await renderAssignments(); return true; }
  function mountProfileActions(host) { const assign = decision('authorization.assignment.manage'); const state = host.dataset.assignmentId ? decision('authorization.assignment.manage') : { allowed: false }; const actions = visibleProfileActions(assign, state); if (!actions.length) { host.remove(); return; } host.hidden = false; const trigger = host.querySelector('[data-profile-actions-trigger]'); const menu = host.querySelector('[role="menu"]'); trigger.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button')?.focus(); }); host.querySelector('[data-profile-assign]')?.addEventListener('click', () => openAssignment(host.dataset.subjectId || 'profile-user')); host.querySelector('[data-profile-suspend]')?.toggleAttribute('hidden', !actions.includes('suspend')); host.querySelector('[data-profile-revoke]')?.toggleAttribute('hidden', !actions.includes('revoke')); if (host.dataset.assignmentId) { host.querySelector('[data-profile-suspend]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'suspend')); host.querySelector('[data-profile-revoke]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'revoke')); } menu.addEventListener('keydown', (event) => { const items = [...menu.querySelectorAll('button:not([hidden])')]; const index = items.indexOf(document.activeElement); if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length].focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); } if (event.key === 'Escape') { menu.hidden = true; trigger.focus(); } }); }
  return Object.freeze({ mountConsole, mountProfileActions, openAssignment, closeDialog, renderAssignments });
}
---scripts/pr35/pr35-policy.js
import { PERMISSION_IDS, ROLE_IDS } from './pr35-contracts.js';
import { normalizeScope, scopeContains } from './pr35-scope.js';

const rank = Object.freeze({ regular_user: 0, service_provider: 1, sales: 1, marketing: 1,
  moderator: 2, tiger_care: 2, campaign_manager: 3, group_manager: 4, area_manager: 5,
  regional_manager: 6, sector_manager: 7, platform_admin: 8, owner: 9 });
const decision = (allowed, code, ids = []) => Object.freeze({ allowed, code, effectiveAssignmentIds: Object.freeze([...ids]) });

function identityFailure(actor) {
  if (!actor?.id) return 'IDENTITY_REQUIRED';
  if (actor.accountState === 'suspended') return 'ACCOUNT_SUSPENDED';
  if (actor.accountState !== 'active') return 'ACCOUNT_INACTIVE';
  if (actor.sessionValidAfter && (!actor.sessionIssuedAt || Date.parse(actor.sessionIssuedAt) < Date.parse(actor.sessionValidAfter))) return 'SESSION_INVALIDATED';
  return null;
}
export function resolveEffectiveAssignments({ actor, now }) {
  if (identityFailure(actor) || !Number.isFinite(Date.parse(now))) return [];
  const at = Date.parse(now);
  return (Array.isArray(actor.assignments) ? actor.assignments : []).filter((item) =>
    item?.state === 'active' && item.subjectId === actor.id && Number.isFinite(Date.parse(item.startsAt)) &&
    Date.parse(item.startsAt) <= at && (!item.expiresAt || Date.parse(item.expiresAt) > at));
}
export function authorize({ actor, permission, resourceScope, now }) {
  const failure = identityFailure(actor); if (failure) return decision(false, failure);
  if (!PERMISSION_IDS.includes(permission)) return decision(false, 'UNKNOWN_PERMISSION');
  let scope; try { scope = normalizeScope(resourceScope); } catch { return decision(false, 'INVALID_SCOPE'); }
  const assignments = resolveEffectiveAssignments({ actor, now });
  const owned = assignments.filter((item) => Array.isArray(item.permissionIds) && item.permissionIds.includes(permission));
  if (!owned.length) return decision(false, 'PERMISSION_DENIED');
  const contained = owned.filter((item) => scopeContains(item.scope, scope));
  if (!contained.length) return decision(false, 'SCOPE_DENIED');
  return decision(true, 'AUTHORIZED', contained.map((item) => item.id).sort());
}
export function canDelegate({ actor, subjectId, permissionIds, scope, roleId, now }) {
  if (!subjectId || subjectId === actor?.id) return decision(false, 'SELF_ELEVATION_DENIED');
  if (!ROLE_IDS.includes(roleId)) return decision(false, 'UNKNOWN_ROLE');
  if (!Array.isArray(permissionIds) || permissionIds.length > 50 || new Set(permissionIds).size !== permissionIds.length) return decision(false, 'INVALID_PERMISSION_LIST');
  if (permissionIds.some((id) => !PERMISSION_IDS.includes(id))) return decision(false, 'UNKNOWN_PERMISSION');
  const effective = resolveEffectiveAssignments({ actor, now });
  if (identityFailure(actor)) return decision(false, identityFailure(actor));
  const permissionOwners = effective.filter((item) => scopeContains(item.scope, scope));
  const ownerAssignment = effective.find((item) => item.roleId === 'owner' && item.permissionIds?.includes('authorization.owner.manage') && scopeContains(item.scope, scope));
  if (roleId === 'owner' || permissionIds.includes('authorization.owner.manage')) {
    if (permissionIds.some((permission) => !permissionOwners.some((item) => item.permissionIds?.includes(permission)))) return decision(false, 'UNOWNED_PERMISSION_DENIED');
    return ownerAssignment ? decision(true, 'AUTHORIZED', [ownerAssignment.id]) : decision(false, 'OWNER_CONTROL_REQUIRED');
  }
  const delegators = effective.filter((item) => item.permissionIds?.includes('authorization.permission.delegate') && scopeContains(item.scope, scope));
  if (!delegators.length) return decision(false, 'DELEGATION_SCOPE_EXCEEDED');
  if (permissionIds.some((permission) => !permissionOwners.some((item) => item.permissionIds?.includes(permission)))) return decision(false, 'UNOWNED_PERMISSION_DENIED');
  const ceiling = Math.max(...delegators.map((item) => rank[item.roleId] ?? -1));
  if ((rank[roleId] ?? Infinity) >= ceiling) return decision(false, 'DELEGATION_AUTHORITY_EXCEEDED');
  return decision(true, 'AUTHORIZED', delegators.map((item) => item.id).sort());
}
---scripts/pr35/pr35-production-adapter.js
const fail = (code) => Object.freeze({ ok: false, code });
const READ_OPERATIONS = new Set(['listTickets', 'getTicket']);

function confirmedResult(result, operation) {
  if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean' || typeof result.code !== 'string') {
    return fail('REMOTE_ENFORCEMENT_FAILED');
  }
  if (!result.ok) return Object.freeze(structuredClone(result));
  if (!READ_OPERATIONS.has(operation) && result.receipt?.confirmed !== true) {
    return fail('REMOTE_CONFIRMATION_REQUIRED');
  }
  return Object.freeze(structuredClone(result));
}

/**
 * Future trusted transport boundary. Configuration is injected by the host;
 * this module contains no endpoint or credential and performs no I/O itself.
 * Every write needs an explicit confirmed receipt from backend enforcement.
 */
export function createProductionCareAdapter({ transport, verified = false, online = () => true } = {}) {
  const call = async (operation, payload, context, privileged = false) => {
    if (typeof transport !== 'function' || verified !== true) return fail('CONFIGURATION_REQUIRED');
    if (!context?.actor?.id) return fail('IDENTITY_REQUIRED');
    try {
      if (!online()) return fail(privileged ? 'OFFLINE_PRIVILEGED_DENIED' : 'NETWORK_UNAVAILABLE');
      const result = await transport(Object.freeze({ operation, payload: structuredClone(payload), context: structuredClone(context) }));
      return confirmedResult(result, operation);
    } catch { return fail('REMOTE_ENFORCEMENT_FAILED'); }
  };
  return Object.freeze({
    listTickets: (query, context) => call('listTickets', query, context),
    submitUserRequest: (input, context) => call('submitUserRequest', input, context),
    getTicket: (id, context) => call('getTicket', { id }, context),
    addUserMessage: (id, input, context) => call('addUserMessage', { id, input }, context),
    addStaffMessage: (id, input, context) => call('addStaffMessage', { id, input }, context, true),
    addInternalNote: (id, input, context) => call('addInternalNote', { id, input }, context, true),
    escalateTicket: (id, input, context) => call('escalateTicket', { id, input }, context, true),
    mutateTicket: (input, context) => call('mutateTicket', input, context, true),
    mutateAuthorization: (input, context) => call('mutateAuthorization', input, context, true),
    appendAudit: (input, context) => call('appendAudit', input, context, true)
  });
}
---scripts/pr35/pr35-routing.js
import { safeCareText } from './pr35-tiger-care.js';

const fail = (code) => Object.freeze({ ok: false, code });
const eligible = (assignment, ticket, now) => assignment.state === 'active'
  && (!assignment.startsAt || Date.parse(assignment.startsAt) <= Date.parse(now))
  && (!assignment.expiresAt || Date.parse(now) < Date.parse(assignment.expiresAt))
  && (!assignment.sectorIds?.length || assignment.sectorIds.includes(ticket.sectorId))
  && (!assignment.categories?.length || assignment.categories.includes(ticket.category))
  && (!assignment.priorities?.length || assignment.priorities.includes(ticket.priority))
  && (!assignment.teamIds?.length || assignment.teamIds.includes(ticket.teamId));

export function routeTicket({ ticket, assignments = [], now }) {
  if (!ticket || !Number.isFinite(Date.parse(now))) return fail('INVALID_ROUTING_INPUT');
  const matches = assignments.filter((item) => eligible(item, ticket, now)).sort((a, b) =>
    (a.openTicketCount || 0) - (b.openTicketCount || 0) || a.subjectId.localeCompare(b.subjectId) || a.id.localeCompare(b.id));
  if (!matches.length) return Object.freeze({ ok: false, code: 'NO_ELIGIBLE_ASSIGNEE', assigneeId: null,
    teamId: ticket.teamId || null, escalationRequired: true });
  const match = matches[0];
  return Object.freeze({ ok: true, code: 'ROUTED', assigneeId: match.subjectId, assignmentId: match.id,
    teamId: ticket.teamId || match.teamIds?.[0] || null,
    escalationRequired: ticket.priority === 'urgent' || ticket.category === 'fraud_safety' });
}

export function assignTicket({ ticket, assigneeId, actor, reason, now }) {
  if (!actor?.permissions?.includes('care.ticket.assign')) return fail('PERMISSION_DENIED');
  try {
    const safeAssignee = safeCareText(assigneeId, { max: 128 }); const safeReason = safeCareText(reason, { max: 500 });
    const at = new Date(now); if (!Number.isFinite(at.getTime())) return fail('INVALID_TIMESTAMP');
    const entry = Object.freeze({ assigneeId: safeAssignee, assignedBy: actor.id, reason: safeReason, at: at.toISOString() });
    const history = Object.freeze([...(ticket.assignmentHistory || []).map((item) => Object.freeze(structuredClone(item))), entry]);
    return Object.freeze({ ok: true, code: 'TICKET_ASSIGNED', ticket: Object.freeze({ ...structuredClone(ticket), assigneeId: safeAssignee, assignmentHistory: history }), auditInput: entry });
  } catch (error) { return fail(error.code || 'INVALID_ASSIGNMENT'); }
}
---scripts/pr35/pr35-sanitize.js
import { LIMITS } from './pr35-contracts.js';

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
export function domainError(code) { const error = new TypeError(code); error.code = code; return error; }
export function assertSafeKey(key) {
  if (typeof key !== 'string' || forbiddenKeys.has(key)) throw domainError('UNSAFE_KEY');
  return key;
}
export function normalizeText(value, { max = LIMITS.TEXT, required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw domainError('FIELD_REQUIRED');
    return '';
  }
  if (typeof value !== 'string') throw domainError('INVALID_FIELD_TYPE');
  const normalized = value.normalize('NFC').trim();
  if (required && !normalized) throw domainError('FIELD_REQUIRED');
  if ([...normalized].length > max) throw domainError('FIELD_TOO_LONG');
  return normalized;
}
export function sanitizeRecord(input, schema) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw domainError('INVALID_RECORD');
  const output = Object.create(null);
  for (const key of Object.keys(input)) {
    assertSafeKey(key);
    if (!Object.hasOwn(schema, key)) throw domainError('UNKNOWN_FIELD');
  }
  for (const [key, rule] of Object.entries(schema)) {
    assertSafeKey(key);
    const value = input[key];
    if (rule.type === 'text') output[key] = normalizeText(value, rule);
    else if (rule.type === 'textList') {
      if (value === undefined) { output[key] = Object.freeze([]); continue; }
      if (!Array.isArray(value)) throw domainError('INVALID_FIELD_TYPE');
      if (value.length > rule.maxItems) throw domainError('LIST_LIMIT_EXCEEDED');
      output[key] = Object.freeze(value.map((item) => normalizeText(item, { max: rule.itemMax, required: true })));
    } else throw domainError('INVALID_SCHEMA');
  }
  return Object.freeze(output);
}
---scripts/pr35/pr35-scope.js
import { SCOPE_LEVELS } from './pr35-contracts.js';
import { normalizeText, domainError } from './pr35-sanitize.js';

const ancestors = ['sectorId', 'regionId', 'areaId', 'teamId'];
export function normalizeScope(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !SCOPE_LEVELS.includes(input.level)) throw domainError('INVALID_SCOPE');
  try {
    const levelIndex = SCOPE_LEVELS.indexOf(input.level);
    const output = { level: input.level };
    for (let index = 1; index <= levelIndex; index += 1) {
      const key = ancestors[index - 1];
      output[key] = normalizeText(input[key], { max: 128, required: true });
    }
    const allowed = new Set(['level', ...ancestors.slice(0, levelIndex)]);
    if (Object.keys(input).some((key) => !allowed.has(key))) throw domainError('INVALID_SCOPE');
    return Object.freeze(output);
  } catch { throw domainError('INVALID_SCOPE'); }
}
export function scopeContains(grantInput, resourceInput) {
  try {
    const grant = normalizeScope(grantInput); const resource = normalizeScope(resourceInput);
    const grantIndex = SCOPE_LEVELS.indexOf(grant.level); const resourceIndex = SCOPE_LEVELS.indexOf(resource.level);
    if (grantIndex > resourceIndex) return false;
    return ancestors.slice(0, grantIndex).every((key) => grant[key] === resource[key]);
  } catch { return false; }
}
---scripts/pr35/pr35-sla.js
import { CARE_PRIORITIES } from './pr35-contracts.js';

export const SLA_RESPONSE_HOURS = Object.freeze({ urgent: 1, high: 4, normal: 24, low: 48 });
export function calculateSla({ priority, createdAt, acknowledgedAt = null, resolvedAt = null, now }) {
  if (!CARE_PRIORITIES.includes(priority)) return Object.freeze({ ok: false, code: 'INVALID_PRIORITY' });
  const created = Date.parse(createdAt); const current = Date.parse(now);
  if (!Number.isFinite(created) || !Number.isFinite(current)) return Object.freeze({ ok: false, code: 'INVALID_TIMESTAMP' });
  const responseBudgetHours = SLA_RESPONSE_HOURS[priority];
  const due = created + responseBudgetHours * 3600000;
  const stoppedAt = acknowledgedAt ? Date.parse(acknowledgedAt) : resolvedAt ? Date.parse(resolvedAt) : current;
  if (!Number.isFinite(stoppedAt)) return Object.freeze({ ok: false, code: 'INVALID_TIMESTAMP' });
  const breached = stoppedAt >= due;
  return Object.freeze({ ok: true, code: 'OK', responseBudgetHours, dueAt: new Date(due).toISOString(),
    breached, state: breached ? 'breached' : acknowledgedAt || resolvedAt ? 'met' : 'active',
    remainingMs: Math.max(0, due - stoppedAt) });
}
---scripts/pr35/pr35-tiger-care.js
import { CARE_CATEGORIES, CARE_PRIORITIES, TICKET_STATUSES } from './pr35-contracts.js';
import { normalizeText, assertSafeKey } from './pr35-sanitize.js';

export const AR_ACKNOWLEDGEMENT = 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.';
export const EN_ACKNOWLEDGEMENT = 'Your request has been received. We will contact you within 24 hours.';
const unsafeMarkup = /<\s*\/?\s*[a-z!]|(?:javascript|data)\s*:|\bon\w+\s*=/iu;
const transitions = Object.freeze({
  new: ['acknowledged', 'cancelled'], acknowledged: ['in_review', 'waiting_user', 'escalated', 'cancelled'],
  in_review: ['waiting_user', 'escalated', 'resolved', 'cancelled'],
  waiting_user: ['in_review', 'escalated', 'cancelled'], escalated: ['in_review', 'waiting_user', 'resolved', 'cancelled'],
  resolved: ['in_review', 'closed'], closed: [], cancelled: []
});
const fail = (code) => Object.freeze({ ok: false, code });
const clone = (value) => structuredClone(value);

export function safeCareText(value, { max, required = true } = {}) {
  const text = normalizeText(value, { max, required });
  if (unsafeMarkup.test(text)) throw Object.assign(new TypeError('UNSAFE_CONTENT'), { code: 'UNSAFE_CONTENT' });
  return text;
}

export function validateCareRequest(input) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('INVALID_REQUEST');
    for (const key of Object.keys(input)) assertSafeKey(key);
    if (!CARE_CATEGORIES.includes(input.category)) return fail('INVALID_REQUEST_TYPE');
    if (!CARE_PRIORITIES.includes(input.priority)) return fail('INVALID_PRIORITY');
    const value = Object.freeze({ requesterId: safeCareText(input.requesterId, { max: 128 }), category: input.category,
      priority: input.priority, subject: safeCareText(input.subject, { max: 160 }),
      description: safeCareText(input.description, { max: 4000 }),
      sectorId: safeCareText(input.sectorId, { max: 128, required: false }),
      listingId: safeCareText(input.listingId, { max: 128, required: false }),
      teamId: safeCareText(input.teamId, { max: 128, required: false }) });
    return Object.freeze({ ok: true, code: 'OK', value });
  } catch (error) { return fail(error.code || 'INVALID_REQUEST'); }
}

export function transitionTicket({ ticket, toStatus, actor, reason, resolutionSummary, now }) {
  if (!ticket || !TICKET_STATUSES.includes(ticket.status) || !TICKET_STATUSES.includes(toStatus)) return fail('INVALID_STATUS');
  const requesterCancellation = actor?.kind === 'user' && toStatus === 'cancelled';
  if (requesterCancellation) {
    if (!actor?.id || ticket.requesterId !== actor.id) return fail('TICKET_NOT_FOUND');
    if (ticket.status !== 'new') return fail('CANCELLATION_NOT_ALLOWED');
  } else if (!actor?.id || actor.kind !== 'staff' || !actor.permissions?.includes('care.ticket.transition')) return fail('PERMISSION_DENIED');
  if (!transitions[ticket.status].includes(toStatus)) return fail(transitions[ticket.status].length ? 'INVALID_TRANSITION' : 'TERMINAL_STATUS');
  try {
    const safeReason = safeCareText(reason, { max: 500 });
    let safeResolution = ticket.resolutionSummary || '';
    if (toStatus === 'resolved') safeResolution = safeCareText(resolutionSummary, { max: 1000 });
    const at = new Date(now); if (!Number.isFinite(at.getTime())) return fail('INVALID_TIMESTAMP');
    const reopening = ticket.status === 'resolved' && toStatus === 'in_review';
    const event = Object.freeze({ id: `transition:${ticket.id}:${at.toISOString()}:${toStatus}`, type: 'status_changed',
      actorId: actor.id, at: at.toISOString(), fromStatus: ticket.status, toStatus, reason: safeReason });
    const timeline = appendTimelineEvent(ticket.timeline || [], event);
    if (!Array.isArray(timeline)) return timeline;
    const next = Object.freeze({ ...clone(ticket), status: toStatus, resolutionSummary: safeResolution,
      reopenedCount: (ticket.reopenedCount || 0) + (reopening ? 1 : 0), timeline });
    return Object.freeze({ ok: true, code: reopening ? 'TICKET_REOPENED' : 'TICKET_TRANSITIONED', ticket: next,
      auditInput: Object.freeze({ action: reopening ? 'care.ticket.reopen' : 'care.ticket.transition', reason: safeReason, at: at.toISOString() }) });
  } catch (error) {
    if (error.code === 'FIELD_REQUIRED') return fail(reason === undefined || reason === null || reason === '' ? 'REASON_REQUIRED' : 'RESOLUTION_SUMMARY_REQUIRED');
    return fail(error.code || 'INVALID_COMMAND');
  }
}

export function projectTicketForRequester(ticket, actorId) {
  if (!ticket || !actorId || ticket.requesterId !== actorId) return fail('TICKET_NOT_FOUND');
  const { internalNotes: _n, routingReason: _r, auditMetadata: _a, assignmentHistory: _h,
    escalationHistory: _e, ...visible } = clone(ticket);
  visible.messages = (visible.messages || []).filter((message) => message.visibility === 'user');
  visible.timeline = (visible.timeline || []).filter((event) => event.visibility !== 'internal');
  return Object.freeze({ ok: true, code: 'OK', ticket: Object.freeze(visible) });
}

export function createCareTimeline() { return Object.freeze([]); }
export function appendTimelineEvent(timeline, event) {
  if (!Array.isArray(timeline) || !event?.id || !event.type || !event.actorId || !Number.isFinite(Date.parse(event.at))) return fail('INVALID_TIMELINE_EVENT');
  if (timeline.some((item) => item.id === event.id)) return fail('DUPLICATE_EVENT');
  return Object.freeze([...timeline.map((item) => Object.freeze(clone(item))), Object.freeze(clone(event))]);
}

exec
/bin/bash -lc "sed -n '1,320p' scripts/pr35/pr35-local-adapter.js; echo ---CARE; sed -n '1,320p' scripts/pr35/pr35-care-controller.js; echo ---OWNER; sed -n '1,380p' scripts/pr35/pr35-owner-controller.js; echo ---NETWORK; cat scripts/pr35/pr35-network.js scripts/pr35/pr35-drafts.js" in <repository-root>
 succeeded in 210ms:
import { validateIdempotencyKey, validateCorrelationKey } from './pr35-contracts.js';
import { validateCareRequest, safeCareText, projectTicketForRequester, transitionTicket, appendTimelineEvent } from './pr35-tiger-care.js';
import { createDedupeRegistry } from './pr35-network.js';
import { calculateSla } from './pr35-sla.js';

const fail = (code) => Object.freeze({ ok: false, code });
const clone = (value) => structuredClone(value);
const immutableList = (items) => Object.freeze(items.map((item) => Object.freeze(clone(item))));

export function createLocalCareAdapter({ clock = () => new Date().toISOString(), online = () => true, notifier } = {}) {
  const tickets = new Map(); const dedupe = createDedupeRegistry(); let ticketSequence = 0; let eventSequence = 0;
  const validateContext = (context) => !context?.actor?.id ? 'IDENTITY_REQUIRED'
    : !validateIdempotencyKey(context.idempotencyKey).ok ? 'INVALID_IDEMPOTENCY_KEY'
      : !validateCorrelationKey(context.correlationKey).ok ? 'INVALID_CORRELATION_KEY' : null;
  const run = async (payload, context, operation) => {
    const invalid = validateContext(context); if (invalid) return fail(invalid);
    try { return await dedupe.run(context.idempotencyKey, payload, operation); }
    catch (error) { return fail(error.code || 'INVALID_COMMAND'); }
  };
  const notify = async (ticket) => {
    if (notifier?.configured !== true || typeof notifier.send !== 'function') return Object.freeze({ status: 'not_configured' });
    try { const result = await notifier.send(Object.freeze({ type: 'care_request_received', ticketId: ticket.id, requesterId: ticket.requesterId }));
      return Object.freeze({ status: result?.confirmed === true ? 'confirmed' : 'failed' });
    } catch { return Object.freeze({ status: 'failed' }); }
  };
  const privileged = (context, permission) => {
    if (!online()) return 'OFFLINE_PRIVILEGED_DENIED';
    if (context?.actor?.kind !== 'staff' || !context.actor.permissions?.includes(permission)) return 'PERMISSION_DENIED';
    return null;
  };
  const find = (id) => tickets.get(id);

  async function submitUserRequest(input, context) {
    if (context?.actor?.kind !== 'user') return fail('PERMISSION_DENIED');
    if (input?.requesterId && input.requesterId !== context.actor.id) return fail('FORGED_IDENTITY');
    const bound = { ...input, requesterId: context.actor.id }; const valid = validateCareRequest(bound); if (!valid.ok) return valid;
    return run(valid.value, context, async () => {
      const createdAt = clock(); const id = `care-ticket-${++ticketSequence}`;
      const createdEvent = Object.freeze({ id: `care-event-${++eventSequence}`, type: 'created', actorId: context.actor.id, at: createdAt, visibility: 'user' });
      const sla = calculateSla({ priority: valid.value.priority, createdAt, now: createdAt });
      const ticket = Object.freeze({ id, ...clone(valid.value), status: 'new', createdAt, updatedAt: createdAt,
        assigneeId: null, messages: Object.freeze([]), internalNotes: Object.freeze([]), escalationHistory: Object.freeze([]),
        assignmentHistory: Object.freeze([]), timeline: Object.freeze([createdEvent]), sla });
      tickets.set(id, ticket); const notification = await notify(ticket);
      return Object.freeze({ ok: true, code: 'REQUEST_ACCEPTED', data: clone(ticket), receipt: Object.freeze({
        persistence: 'local_volatile', idempotencyKey: context.idempotencyKey,
        acknowledgement: 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.',
        email: Object.freeze({ status: 'not_configured' }), notification }) });
    });
  }

  async function getTicket(id, context) {
    const ticket = find(id); if (!ticket || !context?.actor?.id) return fail('TICKET_NOT_FOUND');
    if (context.actor.kind === 'user') { const projected = projectTicketForRequester(ticket, context.actor.id); return projected.ok ? Object.freeze({ ok: true, code: 'OK', data: projected.ticket }) : projected; }
    if (context.actor.kind !== 'staff' || !context.actor.permissions?.includes('care.ticket.read.scoped')) return fail('TICKET_NOT_FOUND');
    return Object.freeze({ ok: true, code: 'OK', data: clone(ticket) });
  }

  async function addStaffMessage(id, input, context) {
    const denied = privileged(context, 'care.message.create.scoped'); if (denied) return fail(denied);
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    return run({ id, body }, context, async () => {
      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    });
  }

  async function addUserMessage(id, input, context) {
    const ticket = find(id); if (!ticket || context?.actor?.kind !== 'user' || ticket.requesterId !== context.actor.id) return fail('TICKET_NOT_FOUND');
    if (input?.authorId && input.authorId !== context.actor.id) return fail('FORGED_IDENTITY');
    let body; try { body = safeCareText(input?.body, { max: 2000 }); } catch (error) { return fail(error.code); }
    return run({ id, body }, context, async () => {
      const at = clock(); const message = Object.freeze({ id: `care-message-${++eventSequence}`, authorId: context.actor.id, body, visibility: 'user', at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'message_added', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, messages: immutableList([...ticket.messages, message]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'MESSAGE_ADDED', data: clone(message) });
    });
  }

  async function addInternalNote(id, input, context) {
    const denied = privileged(context, 'care.internal_note.create'); if (denied) return fail(denied);
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    let body; try { body = safeCareText(input?.body, { max: 2000 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
    return run({ id, body, reason: context.reason }, context, async () => {
      const at = clock(); const note = Object.freeze({ id: `care-note-${++eventSequence}`, authorId: context.actor.id, body, at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'internal_note_added', actorId: context.actor.id, at, visibility: 'internal' });
      const next = Object.freeze({ ...ticket, internalNotes: immutableList([...ticket.internalNotes, note]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'INTERNAL_NOTE_ADDED', data: clone(note), audit: Object.freeze({ action: 'care.internal_note.create', reason: context.reason }) });
    });
  }

  async function changeStatus(id, command, context) {
    const denied = privileged(context, 'care.ticket.transition'); if (denied) return fail(denied);
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    return run({ id, ...command, reason: context.reason }, context, async () => {
      const result = transitionTicket({ ticket, toStatus: command.toStatus, actor: context.actor, reason: context.reason,
        resolutionSummary: command.resolutionSummary, now: clock() });
      if (!result.ok) return result; tickets.set(id, result.ticket); return Object.freeze({ ...result, data: clone(result.ticket) });
    });
  }

  async function escalateTicket(id, input, context) {
    const denied = privileged(context, 'care.ticket.escalate'); if (denied) return fail(denied);
    const ticket = find(id); if (!ticket) return fail('TICKET_NOT_FOUND');
    let teamId; try { teamId = safeCareText(input?.toTeamId, { max: 128 }); safeCareText(context.reason, { max: 500 }); } catch (error) { return fail(error.code); }
    return run({ id, teamId, reason: context.reason }, context, async () => {
      if (!['acknowledged', 'in_review', 'waiting_user'].includes(ticket.status)) return fail('INVALID_TRANSITION');
      const at = clock(); const entry = Object.freeze({ id: `care-escalation-${++eventSequence}`, fromTeamId: ticket.teamId || null,
        toTeamId: teamId, actorId: context.actor.id, reason: context.reason, at });
      const timeline = appendTimelineEvent(ticket.timeline, { id: `care-event-${++eventSequence}`, type: 'escalated', actorId: context.actor.id, at, visibility: 'user' });
      const next = Object.freeze({ ...ticket, status: 'escalated', teamId, escalationHistory: immutableList([...ticket.escalationHistory, entry]), timeline, updatedAt: at }); tickets.set(id, next);
      return Object.freeze({ ok: true, code: 'TICKET_ESCALATED', data: clone(next), audit: Object.freeze({ action: 'care.ticket.escalate', reason: context.reason }) });
    });
  }

  return Object.freeze({ submitUserRequest, getTicket, addUserMessage, addStaffMessage, addInternalNote, transitionTicket: changeStatus,
    mutateTicket: changeStatus, escalateTicket,
    listTickets: async (query = {}, context) => {
      const all = [...tickets.values()];
      if (context?.actor?.kind === 'user') return Object.freeze({ ok: true, code: 'OK', items: immutableList(all.filter((ticket) => ticket.requesterId === context.actor.id).map((ticket) => projectTicketForRequester(ticket, context.actor.id).ticket).slice(0, Math.min(50, query.limit || 20))) });
      return fail('PERMISSION_DENIED');
    }
  });
}
---CARE
import { CARE_CATEGORIES, CARE_PRIORITIES } from './pr35-contracts.js';
import { translate } from './pr35-i18n.js';

const labels = Object.freeze({ management_contact: 'تواصل رسمي مع الإدارة', support: 'دعم', complaint_report: 'شكوى أو بلاغ', missing_category: 'فئة غير موجودة', rejection_appeal: 'اعتراض على رفض', account_issue: 'مشكلة حساب', sector_access_request: 'طلب قطاع أو وصول', fraud_safety: 'احتيال أو سلامة', other: 'طلب آخر' });
const el = (tag, attrs = {}, text = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, value]) => key === 'class' ? node.className = value : node.setAttribute(key, value)); node.textContent = text; return node; };
const key = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

export async function submitCareRequest({ adapter, queue, payload, context, online }) {
  try {
    const result = await adapter.submitUserRequest(payload, context);
    if (result.ok) return Object.freeze({ state: 'sent', code: result.code });
    if (online()) return Object.freeze({ state: 'failed', code: result.code });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (online()) return Object.freeze({ state: 'failed', code: error?.code || 'REQUEST_FAILED' });
  }
  const queued = queue?.enqueue(payload, context);
  return queued?.ok
    ? Object.freeze({ state: 'pending', code: queued.code })
    : Object.freeze({ state: 'failed', code: queued?.code || 'QUEUE_UNAVAILABLE' });
}

export function createCareController({ root = document, adapter, identity, queue, clock = () => new Date().toISOString(), online = () => navigator.onLine }) {
  let layer; let opener; let requestController;
  function close() { requestController?.abort(); if (!layer) return; layer.remove(); layer = null; opener?.focus(); opener = null; }
  function open(trigger) {
    if (layer) return; opener = trigger || document.activeElement;
    layer = el('div', { class: 'pr35-layer', 'data-care-dialog': '' });
    const dialog = el('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-care-title', tabindex: '-1' });
    const title = el('h2', { id: 'pr35-care-title' }, translate('care.title'));
    const disclosure = el('p', { class: 'pr35-disclosure' }, translate('mode.local'));
    const form = el('form', { class: 'pr35-form', 'data-care-form': '' });
    const category = el('select', { name: 'category', required: '', 'aria-label': 'نوع الطلب' });
    CARE_CATEGORIES.forEach((id) => category.append(el('option', { value: id }, labels[id])));
    const priority = el('select', { name: 'priority', required: '', 'aria-label': 'الأولوية' });
    CARE_PRIORITIES.forEach((id) => priority.append(el('option', { value: id }, ({ low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' })[id])));
    priority.value = 'normal';
    const subject = el('input', { name: 'subject', required: '', maxlength: '160', placeholder: 'موضوع الطلب', 'aria-label': 'موضوع الطلب' });
    const description = el('textarea', { name: 'description', required: '', maxlength: '4000', placeholder: 'اكتب التفاصيل دون بيانات دخول أو أسرار', 'aria-label': 'تفاصيل الطلب' });
    const status = el('p', { class: 'pr35-status', role: 'status', 'aria-live': 'polite', 'data-care-state': 'idle' });
    const submit = el('button', { type: 'submit', class: 'pr35-primary' }, 'إرسال الطلب');
    const cancel = el('button', { type: 'button', 'data-care-close': '' }, translate('common.cancel'));
    form.append(category, priority, subject, description, status, submit, cancel); dialog.append(title, disclosure, form); layer.append(dialog); document.body.append(layer);
    cancel.addEventListener('click', close);
    layer.addEventListener('click', (event) => { if (event.target === layer) close(); });
    layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if (event.key === 'Tab') { const controls = [...dialog.querySelectorAll('button,input,select,textarea')]; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); if (!form.reportValidity()) return;
      requestController?.abort(); requestController = new AbortController(); submit.disabled = true; status.dataset.careState = 'pending'; status.textContent = translate('care.pending');
      const actor = identity(); const context = { actor, now: clock(), correlationKey: key('corr'), idempotencyKey: key('idem'), signal: requestController.signal };
      const payload = { category: category.value, priority: priority.value, subject: subject.value, description: description.value };
      try {
        const result = await submitCareRequest({ adapter, queue, payload, context, online });
        status.dataset.careState = result.state;
        status.textContent = translate(result.state === 'sent' ? 'care.confirmation' : result.state === 'pending' ? 'care.offlinePending' : 'care.failed');
        if (result.state === 'sent') form.reset();
      } catch (error) { if (error.name !== 'AbortError') { status.dataset.careState = 'failed'; status.textContent = translate('care.failed'); } }
      finally { submit.disabled = false; }
    });
    dialog.focus();
  }
  return Object.freeze({ open, close });
}
---OWNER
import { authorize, canDelegate } from './pr35-policy.js';
import { ROLE_IDS, PERMISSION_IDS, ROLE_TEMPLATES, SCOPE_LEVELS } from './pr35-contracts.js';
import { calculateSla } from './pr35-sla.js';

const PAGE_SIZE = 20;
const text = (value) => String(value ?? '').trim().toLocaleLowerCase();
export function filterAndPage(rows, { query = '', page = 1, pageSize = PAGE_SIZE } = {}, fields = ['id']) {
  const needle = text(query); const size = Math.min(PAGE_SIZE, Math.max(1, Number(pageSize) || PAGE_SIZE));
  const filtered = rows.filter((row) => !needle || fields.some((field) => text(row[field]).includes(needle)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / size)); const current = Math.min(pageCount, Math.max(1, Number(page) || 1));
  return Object.freeze({ items: filtered.slice((current - 1) * size, current * size), page: current, pageCount, total: filtered.length });
}
export function visibleProfileActions(assignDecision, stateDecision) {
  if (!assignDecision?.allowed) return Object.freeze([]);
  return Object.freeze(stateDecision?.allowed ? ['assign', 'suspend', 'revoke'] : ['assign']);
}
const make = (tag, attrs = {}, value = '') => { const node = document.createElement(tag); Object.entries(attrs).forEach(([key, val]) => key === 'class' ? node.className = val : node.setAttribute(key, val)); node.textContent = value; return node; };
const scopeFrom = (form) => { const data = new FormData(form); const level = data.get('scopeLevel'); const scope = { level }; for (const key of ['sectorId', 'regionId', 'areaId', 'teamId']) { const value = text(data.get(key)); if (value) scope[key] = value; } return scope; };
const contextKey = (prefix) => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
const safeMessage = (code) => ({ OFFLINE_PRIVILEGED_DENIED: 'لا يمكن تنفيذ إجراء إداري دون اتصال آمن.', CONFIGURATION_REQUIRED: 'الخدمة الآمنة غير مهيأة. لم يتم حفظ أي تغيير.', PERMISSION_DENIED: 'هذا الإجراء غير متاح لصلاحياتك الحالية.', SCOPE_DENIED: 'النطاق المحدد خارج صلاحياتك.', SELF_ELEVATION_DENIED: 'لا يمكن تعديل صلاحياتك بنفسك.' })[code] || 'تعذر إتمام الإجراء بأمان. راجع البيانات وحاول مرة أخرى.';

export function createOwnerController({ root = document, repository, careAdapter, identity, clock = () => new Date().toISOString(), local = false }) {
  const actor = () => identity(); const now = () => clock(); let activeDialog; let returnFocus; let searchAbort; let debounce; let assignmentFilter = 'all';
  const decision = (permission, scope = { level: 'platform' }) => authorize({ actor: actor(), permission, resourceScope: scope, now: now() });
  const setStatus = (message, state = 'idle') => { const node = root.querySelector('[data-owner-status]'); if (node) { node.textContent = message; node.dataset.state = state; } };
  function closeDialog() { if (!activeDialog) return; activeDialog.remove(); activeDialog = null; returnFocus?.focus(); }
  function dialog(title) { returnFocus = document.activeElement; const layer = make('div', { class: 'pr35-layer' }); const panel = make('section', { class: 'pr35-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pr35-dialog-title', tabindex: '-1' }); panel.append(make('h2', { id: 'pr35-dialog-title' }, title)); layer.append(panel); document.body.append(layer); activeDialog = layer; layer.addEventListener('click', (event) => { if (event.target === layer) closeDialog(); }); layer.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDialog(); if (event.key === 'Tab') { const controls = [...panel.querySelectorAll('button,input,select,textarea')].filter((item) => !item.hidden && !item.disabled); const first = controls[0], last = controls.at(-1); if (!first) { event.preventDefault(); panel.focus(); } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }); return panel; }
  function openAssignment(subjectId = 'profile-user') {
    const permitted = decision('authorization.assignment.manage'); if (!permitted.allowed) { setStatus(safeMessage(permitted.code), 'failed'); return; }
    const panel = dialog('تكليف تشغيلي'); const form = make('form', { class: 'pr35-form', 'data-assignment-form': '' });
    const subject = make('input', { name: 'subjectId', value: subjectId, required: '', maxlength: '128', 'aria-label': 'معرف المستخدم' }); subject.value = subjectId;
    const role = make('select', { name: 'roleId', required: '', 'aria-label': 'المنصب' }); ROLE_IDS.filter((id) => id !== 'owner').forEach((id) => role.append(make('option', { value: id }, id.replaceAll('_', ' '))));
    const scopeLevel = make('select', { name: 'scopeLevel', required: '', 'aria-label': 'مستوى النطاق' }); SCOPE_LEVELS.forEach((id) => scopeLevel.append(make('option', { value: id }, id)));
    const scopeId = make('input', { name: 'sectorId', maxlength: '128', placeholder: 'معرف القطاع عند الحاجة', 'aria-label': 'معرف القطاع' });
    const permission = make('select', { name: 'permissionIds', multiple: '', required: '', 'aria-label': 'الصلاحيات المفوضة' }); PERMISSION_IDS.filter((id) => id !== 'authorization.owner.manage' && id !== 'audit.event.append').forEach((id) => permission.append(make('option', { value: id }, id)));
    const expiry = make('input', { name: 'expiresAt', type: 'datetime-local', required: '', 'aria-label': 'تاريخ انتهاء التكليف' });
    const reason = make('textarea', { name: 'reason', required: '', maxlength: '500', 'data-assignment-reason': '', placeholder: 'سبب موثق ومطلوب', 'aria-label': 'سبب التكليف' });
    const state = make('div', { class: 'pr35-review', 'data-assignment-review': '', 'aria-live': 'polite' });
    const next = make('button', { type: 'button', class: 'pr35-primary' }, 'مراجعة التكليف'); const cancel = make('button', { type: 'button' }, 'إلغاء');
    form.append(subject, role, scopeLevel, scopeId, permission, expiry, reason, state, next, cancel); panel.append(form); cancel.addEventListener('click', closeDialog);
    next.addEventListener('click', () => {
      if (!form.reportValidity()) return; const data = new FormData(form); const permissionIds = data.getAll('permissionIds'); const scope = scopeFrom(form);
      const review = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
      if (!review.allowed) { state.textContent = safeMessage(review.code); state.dataset.state = 'failed'; return; }
      state.textContent = `مراجعة قبل التأكيد: ${data.get('roleId')} — ${scope.level} — ${permissionIds.length} صلاحيات — ينتهي ${data.get('expiresAt')}`; state.dataset.state = 'review'; next.hidden = true;
      const confirm = make('button', { type: 'button', class: 'pr35-primary', 'data-assignment-confirm': '' }, 'تأكيد التكليف المحلي'); form.append(confirm); confirm.focus();
      confirm.addEventListener('click', async () => {
        const finalReview = canDelegate({ actor: actor(), subjectId: data.get('subjectId'), permissionIds, scope, roleId: data.get('roleId'), now: now() });
        if (!finalReview.allowed || !navigator.onLine) { state.textContent = safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : finalReview.code); state.dataset.state = 'failed'; return; }
        confirm.disabled = true; state.textContent = 'جاري التحقق والتنفيذ…';
        const result = await repository.createAssignment({ subjectId: data.get('subjectId'), roleId: data.get('roleId'), permissionIds, scope, startsAt: now(), expiresAt: new Date(data.get('expiresAt')).toISOString() }, { actor: actor(), now: now(), reason: data.get('reason'), correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') });
        if (!result.ok) { state.textContent = safeMessage(result.code); state.dataset.state = 'failed'; confirm.disabled = false; return; }
        state.textContent = local ? 'تم التكليف داخل العرض المحلي المؤقت فقط.' : 'تم تأكيد التكليف من الخدمة الآمنة.'; state.dataset.state = 'sent'; await renderAssignments();
      });
    }); panel.focus();
  }
  async function changeAssignment(id, action) {
    const allowed = decision('authorization.assignment.manage'); if (!allowed.allowed || !navigator.onLine) { setStatus(safeMessage(!navigator.onLine ? 'OFFLINE_PRIVILEGED_DENIED' : allowed.code), 'failed'); return; }
    const panel = dialog(action === 'revoke' ? 'سحب التكليف' : 'تعليق التكليف'); const form = make('form', { class: 'pr35-form' }); const reason = make('textarea', { required: '', maxlength: '500', 'aria-label': 'سبب الإجراء', placeholder: 'السبب مطلوب للتوثيق' }); const confirm = make('button', { type: 'submit', class: 'pr35-danger' }, 'تأكيد الإجراء'); form.append(reason, confirm); panel.append(form);
    form.addEventListener('submit', async (event) => { event.preventDefault(); if (!form.reportValidity()) return; confirm.disabled = true; const method = action === 'revoke' ? repository.revokeAssignment : repository.suspendAssignment; const result = await method({ assignmentId: id }, { actor: actor(), now: now(), reason: reason.value, correlationKey: contextKey('corr'), idempotencyKey: contextKey('idem') }); setStatus(result.ok ? 'تم تحديث التكليف محليًا مع سجل تدقيق.' : safeMessage(result.code), result.ok ? 'sent' : 'failed'); closeDialog(); await renderAssignments(); }); panel.focus();
  }
  async function renderAssignments(query = '') {
    const host = root.querySelector('[data-owner-assignments-list]'); if (!host) return; host.replaceChildren(make('div', { class: 'pr35-skeleton', 'aria-hidden': 'true' }));
    const result = await repository.listAssignments({ limit: 20, scope: { level: 'platform' } }, { actor: actor(), now: now() }); host.replaceChildren();
    if (!result.ok) { host.append(make('p', { class: 'pr35-empty' }, safeMessage(result.code))); return; }
    const filtered = assignmentFilter === 'all' ? result.items : result.items.filter((item) => item.state === assignmentFilter);
    const page = filterAndPage(filtered, { query },  ['subjectId', 'roleId', 'state']); if (!page.items.length) { host.append(make('p', { class: 'pr35-empty' }, 'لا توجد تكليفات مطابقة.')); return; }
    page.items.forEach((item) => { const card = make('article', { class: 'pr35-row' }); card.append(make('strong', {}, item.subjectId), make('span', {}, `${item.roleId} · ${item.scope.level} · ${item.state}`)); if (item.state === 'active') { const suspend = make('button', { type: 'button', 'data-suspend-assignment': item.id }, 'تعليق'); const revoke = make('button', { type: 'button', 'data-revoke-assignment': item.id }, 'سحب'); suspend.addEventListener('click', () => changeAssignment(item.id, 'suspend')); revoke.addEventListener('click', () => changeAssignment(item.id, 'revoke')); card.append(suspend, revoke); } host.append(card); });
  }
  function renderDemoQueues() {
    const care = root.querySelector('[data-owner-care-list]'); const permissions = root.querySelector('[data-owner-permission-list]'); const audit = root.querySelector('[data-owner-audit-list]');
    if (care) { const samples = [{ id: 'TC-1042', category: 'مشكلة حساب', priority: 'urgent', createdAt: new Date(Date.parse(now()) - 55 * 60000).toISOString() }, { id: 'TC-1041', category: 'اعتراض على رفض', priority: 'normal', createdAt: new Date(Date.parse(now()) - 2 * 3600000).toISOString() }]; care.replaceChildren(); samples.forEach((ticket) => { const sla = calculateSla({ priority: ticket.priority, createdAt: ticket.createdAt, now: now() }); const node = make('article', { class: `pr35-row${sla.breached || sla.remainingMs < 15 * 60000 ? ' is-warning' : ''}` }); node.append(make('strong', {}, `${ticket.id} — ${ticket.category}`), make('span', {}, sla.breached ? 'تجاوز SLA — يحتاج تصعيدًا' : `متبقٍ ${Math.max(1, Math.ceil(sla.remainingMs / 60000))} دقيقة`), make('button', { type: 'button', disabled: '', title: 'عرض توضيحي محلي' }, 'عرض محلي')); care.append(node); }); }
    if (permissions) permissions.replaceChildren(make('p', { class: 'pr35-empty' }, 'لا توجد طلبات صلاحية معلقة في العرض المحلي.'));
    if (audit) audit.replaceChildren(make('p', { class: 'pr35-empty' }, 'ستظهر أحداث التدقيق غير القابلة للتعديل بعد الإجراءات المحلية.'));
  }
  function bindSearch() { const input = root.querySelector('[data-owner-search]'); if (!input) return; input.addEventListener('input', () => { clearTimeout(debounce); searchAbort?.abort(); searchAbort = new AbortController(); debounce = setTimeout(() => { if (!searchAbort.signal.aborted) renderAssignments(input.value); }, 220); }); root.querySelectorAll('[data-owner-filter]').forEach((button) => button.addEventListener('click', () => { assignmentFilter = button.dataset.ownerFilter; root.querySelectorAll('[data-owner-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button))); renderAssignments(input.value); })); }
  async function mountConsole() { const gate = root.querySelector('[data-owner-auth-gate]'); const consoleNode = root.querySelector('[data-owner-console]'); const allowed = decision('owner.console.read'); if (!allowed.allowed) { if (gate) gate.textContent = safeMessage(allowed.code); return false; } if (gate) gate.hidden = true; if (consoleNode) consoleNode.hidden = false; root.querySelector('[data-owner-local-disclosure]')?.toggleAttribute('hidden', !local); root.querySelector('[data-new-assignment]')?.addEventListener('click', () => openAssignment()); bindSearch(); renderDemoQueues(); await renderAssignments(); return true; }
  function mountProfileActions(host) { const assign = decision('authorization.assignment.manage'); const state = host.dataset.assignmentId ? decision('authorization.assignment.manage') : { allowed: false }; const actions = visibleProfileActions(assign, state); if (!actions.length) { host.remove(); return; } host.hidden = false; const trigger = host.querySelector('[data-profile-actions-trigger]'); const menu = host.querySelector('[role="menu"]'); trigger.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button')?.focus(); }); host.querySelector('[data-profile-assign]')?.addEventListener('click', () => openAssignment(host.dataset.subjectId || 'profile-user')); host.querySelector('[data-profile-suspend]')?.toggleAttribute('hidden', !actions.includes('suspend')); host.querySelector('[data-profile-revoke]')?.toggleAttribute('hidden', !actions.includes('revoke')); if (host.dataset.assignmentId) { host.querySelector('[data-profile-suspend]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'suspend')); host.querySelector('[data-profile-revoke]')?.addEventListener('click', () => changeAssignment(host.dataset.assignmentId, 'revoke')); } menu.addEventListener('keydown', (event) => { const items = [...menu.querySelectorAll('button:not([hidden])')]; const index = items.indexOf(document.activeElement); if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length].focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); } if (event.key === 'Escape') { menu.hidden = true; trigger.focus(); } }); }
  return Object.freeze({ mountConsole, mountProfileActions, openAssignment, closeDialog, renderAssignments });
}
---NETWORK
const codedError = (code) => Object.assign(new Error(code), { code });
const signature = (value) => JSON.stringify(value, Object.keys(value || {}).sort());

export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
  baseDelayMs = 250, random = Math.random, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  idempotent = true } = {}) {
  if (signal?.aborted) throw codedError('REQUEST_CANCELLED');
  const attempts = idempotent ? Math.min(3, Math.max(1, maxAttempts)) : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const cancel = () => controller.abort(codedError('REQUEST_CANCELLED'));
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => controller.abort(codedError('REQUEST_TIMEOUT')), Math.min(30000, Math.max(1, timeoutMs)));
    const aborted = new Promise((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }));
    try { return await Promise.race([operation(controller.signal, attempt), aborted]); }
    catch (error) {
      const reason = controller.signal.aborted ? controller.signal.reason : error;
      if (reason?.code === 'REQUEST_TIMEOUT' || reason?.code === 'REQUEST_CANCELLED') throw reason;
      if (!error?.retryable || attempt === attempts) throw codedError('REQUEST_FAILED');
      const ceiling = Math.min(2000, baseDelayMs * (2 ** (attempt - 1)));
      await sleep(Math.max(0, Math.floor(ceiling * Math.min(1, Math.max(0, random())))));
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  throw codedError('REQUEST_FAILED');
}

export function createDedupeRegistry() {
  const entries = new Map();
  return Object.freeze({
    run(key, payload, operation) {
      if (typeof key !== 'string' || !key) return Promise.reject(codedError('INVALID_IDEMPOTENCY_KEY'));
      const payloadSignature = signature(payload);
      if (entries.has(key)) {
        const entry = entries.get(key);
        if (entry.signature !== payloadSignature) return Promise.reject(codedError('IDEMPOTENCY_CONFLICT'));
        return entry.promise;
      }
      const promise = Promise.resolve().then(operation);
      entries.set(key, Object.freeze({ signature: payloadSignature, promise }));
      promise.catch(() => entries.delete(key));
      return promise;
    }, clear: () => entries.clear()
  });
}
import { validateCareRequest } from './pr35-tiger-care.js';

const fail = (code) => Object.freeze({ ok: false, code });
const MAX_ITEMS = 20; const MAX_BYTES = 65536;
const keyFor = (kind, sessionId) => `vvip:pr35:${kind}:${sessionId}`;
const read = (storage, key, fallback) => { try { return JSON.parse(storage.getItem(key)) || fallback; } catch { return fallback; } };
const write = (storage, key, value) => {
  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).length > MAX_BYTES) return fail('QUEUE_SIZE_EXCEEDED');
  try { storage.setItem(key, serialized); return { ok: true }; } catch { return fail('SESSION_STORAGE_UNAVAILABLE'); }
};
const normalize = (input, actorId) => validateCareRequest({ ...input, requesterId: actorId });

export function createDraftStore(sessionStorage, sessionId) {
  const key = keyFor('draft', sessionId);
  return Object.freeze({
    save(input, { actorId }) { const valid = normalize(input, actorId); if (!valid.ok) return valid;
      const result = write(sessionStorage, key, { actorId, value: valid.value }); return result.ok ? Object.freeze({ ok: true, code: 'DRAFT_SAVED' }) : result; },
    load({ actorId }) { const draft = read(sessionStorage, key, null); return !draft || draft.actorId !== actorId ? fail('DRAFT_NOT_FOUND') : Object.freeze({ ok: true, code: 'OK', value: structuredClone(draft.value) }); },
    clear() { sessionStorage.removeItem(key); return Object.freeze({ ok: true, code: 'DRAFT_CLEARED' }); }
  });
}

export function createUserSubmissionQueue(sessionStorage, sessionId) {
  const key = keyFor('queue', sessionId);
  const items = () => read(sessionStorage, key, []);
  return Object.freeze({
    enqueue(input, context) {
      if (context?.actor?.kind !== 'user' || input?.commandType) return fail('OFFLINE_PRIVILEGED_DENIED');
      const valid = normalize(input, context.actor.id); if (!valid.ok) return valid;
      const queue = items();
      const existing = queue.find((item) => item.idempotencyKey === context.idempotencyKey);
      if (existing) return fail('DUPLICATE_SUBMISSION');
      if (queue.length >= MAX_ITEMS) return fail('QUEUE_LIMIT_EXCEEDED');
      const entry = { idempotencyKey: context.idempotencyKey, correlationKey: context.correlationKey,
        actorId: context.actor.id, payload: valid.value, state: 'pending', attempts: 0 };
      const result = write(sessionStorage, key, [...queue, entry]);
      return result.ok ? Object.freeze({ ok: true, code: 'QUEUED', state: 'pending' }) : result;
    },
    async flush(send, context) {
      const queue = items(); const updated = [];
      for (const entry of queue) {
        if (entry.actorId !== context?.actor?.id || context.actor.kind !== 'user') { updated.push({ ...entry, state: 'failed', code: 'FORGED_IDENTITY' }); continue; }
        try { const result = await send(structuredClone(entry.payload), { ...context, idempotencyKey: entry.idempotencyKey, correlationKey: entry.correlationKey });
          updated.push({ ...entry, attempts: entry.attempts + 1, state: result.ok ? 'sent' : 'failed', code: result.code });
        } catch { updated.push({ ...entry, attempts: entry.attempts + 1, state: 'failed', code: 'NETWORK_UNAVAILABLE' }); }
      }
      write(sessionStorage, key, updated); return Object.freeze({ ok: true, code: 'QUEUE_FLUSHED', items: Object.freeze(updated.map(Object.freeze)) });
    }, list() { return Object.freeze(items().map((item) => Object.freeze(structuredClone(item)))); }
  });
}

exec
/bin/bash -lc "nl -ba scripts/pr35/pr35-owner-controller.js | sed -n '25,48p'; nl -ba docs/launch/pr35/CHANGED_FILES.allowlist | sed -n '1,25p'; nl -ba scripts/pr35/pr35-assignment-repository.js | sed -n '60,82p'; grep -n \"owner\" tests/pr35/assignment-repository.test.mjs tests/pr35/policy-scope.test.mjs" in <repository-root>
 succeeded in 254ms:
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
     1	.gitignore
     2	docs/launch/pr35/ARCHITECTURE_AND_DATA_FLOW.md
     3	docs/launch/pr35/ARCHITECTURE_FILE_MAP.md
     4	docs/launch/pr35/CHANGED_FILES.allowlist
     5	docs/launch/pr35/CHANGE_CONTROL_MANIFEST.md
     6	docs/launch/pr35/CODEX_REVIEW_ROUND1.md
     7	docs/launch/pr35/LEGACY_AND_UNUSED_FILE_AUDIT.md
     8	docs/launch/pr35/PERFORMANCE_AND_WEAK_NETWORK_BUDGET.md
     9	docs/launch/pr35/PERMISSION_CATALOG.md
    10	docs/launch/pr35/REVIEW_RESOLUTION_LOG.md
    11	docs/launch/pr35/SECURITY_THREAT_MODEL.md
    12	docs/launch/pr35/TIGER_CARE_WORKFLOW.md
    13	docs/launch/pr35/qa/INTEGRATION_PRELIMINARY_EVIDENCE.md
    14	docs/launch/pr35/qa/SECURITY_EVIDENCE.md
    15	docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql
    16	docs/superpowers/plans/2026-07-14-pr35-owner-control-tiger-care-plan.md
    17	docs/superpowers/specs/2026-07-14-pr35-owner-control-tiger-care-design.md
    18	owner-control.html
    19	private-profile-p03.html
    20	scripts/pr35/pr35-assignment-repository.js
    21	scripts/pr35/pr35-audit.js
    22	scripts/pr35/pr35-bootstrap.js
    23	scripts/pr35/pr35-care-controller.js
    24	scripts/pr35/pr35-contracts.js
    25	scripts/pr35/pr35-drafts.js
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
tests/pr35/assignment-repository.test.mjs:6:const context = { actor: actor({ assignments: [assignment({ roleId: 'owner', permissionIds: ['authorization.owner.manage', 'authorization.permission.delegate', 'authorization.assignment.manage', 'authorization.assignment.read', 'audit.event.read.scoped', 'care.ticket.read.scoped'] })] }),
tests/pr35/policy-scope.test.mjs:22:  assert.equal(authorize({ actor: null, permission: 'owner.console.read', resourceScope: PLATFORM_SCOPE, now: NOW }).code, 'IDENTITY_REQUIRED');
tests/pr35/policy-scope.test.mjs:23:  assert.equal(authorize({ actor: actor({ assignments: [] }), permission: 'owner.console.read', resourceScope: PLATFORM_SCOPE, now: NOW }).code, 'PERMISSION_DENIED');
tests/pr35/policy-scope.test.mjs:40:test('delegation denies self elevation, unowned permission, ceiling, and owner control', () => {
tests/pr35/policy-scope.test.mjs:46:  assert.equal(canDelegate({ actor: admin, subjectId: 'user-2', permissionIds: ['care.ticket.read.scoped'], scope: TEAM_SCOPE, roleId: 'owner', now: NOW }).code, 'OWNER_CONTROL_REQUIRED');
tests/pr35/policy-scope.test.mjs:50:test('only an owner assignment holding owner-manage may alter owner authority', () => {
tests/pr35/policy-scope.test.mjs:51:  const fake = actor({ assignments: [assignment({ roleId: 'owner', permissionIds: ['authorization.owner.manage', 'authorization.permission.delegate'] })] });
tests/pr35/policy-scope.test.mjs:52:  assert.equal(canDelegate({ actor: fake, subjectId: 'user-2', permissionIds: ['authorization.owner.manage'], scope: PLATFORM_SCOPE, roleId: 'owner', now: NOW }).allowed, true);
tests/pr35/policy-scope.test.mjs:53:  const labelOnly = actor({ assignments: [assignment({ roleId: 'owner', permissionIds: ['authorization.permission.delegate'] })] });
tests/pr35/policy-scope.test.mjs:54:  assert.equal(canDelegate({ actor: labelOnly, subjectId: 'user-2', permissionIds: [], scope: PLATFORM_SCOPE, roleId: 'owner', now: NOW }).code, 'OWNER_CONTROL_REQUIRED');
tests/pr35/policy-scope.test.mjs:55:  assert.equal(canDelegate({ actor: fake, subjectId: 'user-2', permissionIds: ['care.ticket.resolve'], scope: PLATFORM_SCOPE, roleId: 'owner', now: NOW }).code, 'UNOWNED_PERMISSION_DENIED');

codex
The patch contains an owner-authority bypass, prevents creation of several required scoped assignments, and currently fails its own historical smoke suite.

Full review comments:

- [P1] Require an owner assignment before revoking owner authority — <repository-root>/scripts/pr35/pr35-assignment-repository.js:73-75
  When the target assignment has role `owner`, this checks only `authorization.owner.manage`; an actor with a non-owner assignment containing that permission can therefore suspend or revoke an owner's assignment. Since `canDelegate` allows an owner to grant this permission alongside a non-owner role, this violates the explicit owner-only revocation rule. Verify that an effective owner-role assignment authorizes the operation, as `canDelegate` does.

- [P1] Collect every identifier required by the selected scope — <repository-root>/scripts/pr35/pr35-owner-controller.js:33-34
  The assignment form always submits only `sectorId`. Selecting `region`, `area`, or `team` consequently produces a scope missing `regionId`, `areaId`, or `teamId`; `normalizeScope` rejects it and the UI cannot create any assignment below sector scope. Render and require the identifiers implied by the selected scope level.

- [P1] Add the round-two review file to the change allowlist — <repository-root>/docs/launch/pr35/CHANGED_FILES.allowlist:5-7
  With the current untracked `docs/launch/pr35/CODEX_REVIEW_ROUND2.md`, the historical smoke test fails because this allowlist includes round one but omits round two. Running `./scripts/qa-pr35-owner-control-tiger-care.sh` reaches `[smoke][fail] forbidden PR30 scope changed: docs/launch/pr35/CODEX_REVIEW_ROUND2.md`, so the required regression suite cannot pass.
The patch contains an owner-authority bypass, prevents creation of several required scoped assignments, and currently fails its own historical smoke suite.

Full review comments:

- [P1] Require an owner assignment before revoking owner authority — <repository-root>/scripts/pr35/pr35-assignment-repository.js:73-75
  When the target assignment has role `owner`, this checks only `authorization.owner.manage`; an actor with a non-owner assignment containing that permission can therefore suspend or revoke an owner's assignment. Since `canDelegate` allows an owner to grant this permission alongside a non-owner role, this violates the explicit owner-only revocation rule. Verify that an effective owner-role assignment authorizes the operation, as `canDelegate` does.

- [P1] Collect every identifier required by the selected scope — <repository-root>/scripts/pr35/pr35-owner-controller.js:33-34
  The assignment form always submits only `sectorId`. Selecting `region`, `area`, or `team` consequently produces a scope missing `regionId`, `areaId`, or `teamId`; `normalizeScope` rejects it and the UI cannot create any assignment below sector scope. Render and require the identifiers implied by the selected scope level.

- [P1] Add the round-two review file to the change allowlist — <repository-root>/docs/launch/pr35/CHANGED_FILES.allowlist:5-7
  With the current untracked `docs/launch/pr35/CODEX_REVIEW_ROUND2.md`, the historical smoke test fails because this allowlist includes round one but omits round two. Running `./scripts/qa-pr35-owner-control-tiger-care.sh` reaches `[smoke][fail] forbidden PR30 scope changed: docs/launch/pr35/CODEX_REVIEW_ROUND2.md`, so the required regression suite cannot pass.

RETURN_CODE: 0
