# PR35 Owner Control and Tiger Care Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete, independently testable PR35 foundation for scoped authorization, Owner Control, Tiger Care operations, immutable audits, and safe Arabic-first runtime integration.

**Architecture:** Pure ES modules own domain rules; thin controllers connect canonical PR29–PR33 pages to explicit local and production adapters. Client policy supports UX while every protected production operation fails closed until a configured trusted Supabase/RPC/RLS boundary re-evaluates it.

**Tech Stack:** Static HTML, CSS, browser JavaScript ES modules, Node built-in test runner, Bash/Python QA, Clerk identity, review-only Supabase PostgreSQL/RLS.

## Global Constraints

- Work only on `feat/pr35-owner-control-tiger-care-foundation` from unchanged baseline `c71ecbddd00d91f5ee5414e86e74cbbbdb168d84`.
- No dependency, framework, bundler, commit, push, PR creation, production mutation, remote SQL, migration, secret, service role, payment, or tracked legacy deletion.
- Arabic is default; English must be complete; RTL/LTR, WCAG-oriented keyboard/focus behavior, reduced motion, and 44px targets are mandatory.
- Default deny; no self-elevation; owner manages owner role; no grant above held permission/scope; inactive assignments grant nothing.
- Privileged writes fail closed offline. Only sanitized non-privileged user ticket submissions may queue in session storage.
- Exact confirmation: `تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.` Email success requires configured-adapter confirmation.
- All intended files are enumerated in `docs/launch/pr35/CHANGED_FILES.allowlist`; no other file may change.
- SQL is review-only at `docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql` and must never be applied.

---

### Task 1: Domain contracts and hostile-input boundary

**Files:**
- Create: `scripts/pr35/pr35-contracts.js`
- Create: `scripts/pr35/pr35-sanitize.js`
- Create: `tests/pr35/fixtures.mjs`
- Create: `tests/pr35/contracts.test.mjs`
- Create: `tests/pr35/sanitize.test.mjs`

**Interfaces:**
- Produces: frozen catalogs `ROLE_IDS`, `PERMISSION_IDS`, `SCOPE_LEVELS`, `ASSIGNMENT_STATES`, `CARE_CATEGORIES`, `CARE_PRIORITIES`, `TICKET_STATUSES`, `ERROR_CODES`; `normalizeText(value,{max,required})`; `sanitizeRecord(input, schema)`; `assertSafeKey(key)`.

- [ ] **Step 1: Write failing catalog and sanitizer tests** for exact enum membership, maximum lengths, Unicode preservation, null-prototype output, `__proto__`/`constructor`/`prototype` rejection, unknown-key rejection, and deterministic error codes.
- [ ] **Step 2: Verify RED**

Run: `node --test tests/pr35/contracts.test.mjs tests/pr35/sanitize.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/pr35/pr35-contracts.js`.

- [ ] **Step 3: Implement the minimal frozen catalogs and schema-driven sanitizer** using `Object.create(null)`, own-property checks, trim/Unicode-safe length limits, and no HTML parsing.
- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/pr35/contracts.test.mjs tests/pr35/sanitize.test.mjs`
Expected: PASS, 0 failures.

### Task 2: Scope containment and permission policy

**Files:**
- Create: `scripts/pr35/pr35-scope.js`
- Create: `scripts/pr35/pr35-policy.js`
- Create: `tests/pr35/policy-scope.test.mjs`

**Interfaces:**
- Consumes: contract catalogs and sanitized IDs.
- Produces: `normalizeScope(input)`, `scopeContains(grant, resource)`, `resolveEffectiveAssignments({actor,now})`, `authorize({actor,permission,resourceScope,now})`, `canDelegate({actor,subjectId,permissionIds,scope,roleId,now})`.

- [ ] **Step 1: Write failing matrix tests** covering platform/sector/region/area/team ancestry, missing ancestors, cross-scope denial, pending/suspended/revoked/expired assignments, default deny, self-grant, owner-role mutation, permission ceiling, and scope ceiling.
- [ ] **Step 2: Verify RED**

Run: `node --test tests/pr35/policy-scope.test.mjs`
Expected: FAIL because `pr35-scope.js` is absent.

- [ ] **Step 3: Implement least-privilege policy** returning only `{allowed,code,effectiveAssignmentIds}` and requiring explicit `authorization.owner.manage` for owner-role changes.
- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/pr35/policy-scope.test.mjs`
Expected: PASS, 0 failures.

### Task 3: Immutable audit chain

**Files:**
- Create: `scripts/pr35/pr35-audit.js`
- Create: `tests/pr35/audit.test.mjs`

**Interfaces:**
- Produces: `createAuditEvent({previousHash,actorId,action,target,scope,reason,at,metadata})`, `verifyAuditChain(events)`, and `REASON_REQUIRED_ACTIONS`.

- [ ] **Step 1: Write failing tests** for canonical key order, SHA-256 hash chaining through `crypto.subtle`, required reason, bounded metadata, frozen event objects, previous-hash mismatch, update/delete command rejection, and secret-field rejection.
- [ ] **Step 2: Verify RED** with `node --test tests/pr35/audit.test.mjs`; expect missing-module failure.
- [ ] **Step 3: Implement canonical serialization and append-only event creation**; expose no mutation API.
- [ ] **Step 4: Verify GREEN** with `node --test tests/pr35/audit.test.mjs`; expect PASS.

### Task 4: Tiger Care lifecycle, routing, and SLA

**Files:**
- Create: `scripts/pr35/pr35-tiger-care.js`
- Create: `scripts/pr35/pr35-routing.js`
- Create: `scripts/pr35/pr35-sla.js`
- Create: `tests/pr35/tiger-care.test.mjs`
- Create: `tests/pr35/routing-sla.test.mjs`

**Interfaces:**
- Produces: `validateCareRequest(input)`, `transitionTicket({ticket,toStatus,actor,reason,now})`, `projectTicketForRequester(ticket,actorId)`, `routeTicket({ticket,assignments,policies,now})`, `calculateSla({priority,createdAt,acknowledgedAt,resolvedAt,now})`.

- [ ] **Step 1: Write failing transition-table tests** for every allowed and denied edge, cancellation/reopen rules, requester isolation, internal-note stripping, exact categories/priorities, stable routing tie-breaks, ineligible assignment filtering, and 1/4/24/48-hour response budgets.
- [ ] **Step 2: Verify RED**

Run: `node --test tests/pr35/tiger-care.test.mjs tests/pr35/routing-sla.test.mjs`
Expected: FAIL with missing Tiger Care module.

- [ ] **Step 3: Implement pure functions with injected clocks** and return audit inputs for sensitive transitions; never embed internal notes in requester projections.
- [ ] **Step 4: Verify GREEN** using the same command; expect PASS.

### Task 5: Bounded networking, drafts, and queues

**Files:**
- Create: `scripts/pr35/pr35-network.js`
- Create: `scripts/pr35/pr35-drafts.js`
- Create: `tests/pr35/drafts-network.test.mjs`

**Interfaces:**
- Produces: `withRequestPolicy(operation,{signal,timeoutMs,maxAttempts,baseDelayMs,random})`, `createDedupeRegistry()`, `createDraftStore(sessionStorage)`, `enqueueUserSubmission(input,context)`, `flushUserSubmissions(send,context)`.

- [ ] **Step 1: Write failing fake-clock tests** for 8-second timeout, external cancellation, maximum three attempts, 2-second cap, deterministic injected jitter, duplicate collapse, 20-item/64-KiB bounds, session-only storage, sanitized payloads, and denial of every privileged command.
- [ ] **Step 2: Verify RED** with `node --test tests/pr35/drafts-network.test.mjs`; expect missing-module failure.
- [ ] **Step 3: Implement bounded primitives** without caching tickets, notes, permissions, tokens, or secrets.
- [ ] **Step 4: Verify GREEN** with the same command; expect PASS.

### Task 6: Local and production operational adapters

**Files:**
- Create: `scripts/pr35/pr35-local-adapter.js`
- Create: `scripts/pr35/pr35-production-adapter.js`
- Modify: `tests/pr35/drafts-network.test.mjs`

**Interfaces:**
- Produces adapter methods `listTickets`, `submitUserRequest`, `mutateTicket`, `mutateAuthorization`, and `appendAudit` with `{ok,code,data?,receipt?}` results.

- [ ] **Step 1: Extend tests** to require local labels, explicit email `not_configured`, idempotent receipts, user isolation, and `CONFIGURATION_REQUIRED`/`OFFLINE_PRIVILEGED_DENIED` for production protected operations without verified transport.
- [ ] **Step 2: Verify RED**; run `node --test tests/pr35/drafts-network.test.mjs`, expect adapter import failure.
- [ ] **Step 3: Implement adapters** so local mode never claims remote/email success and production never falls back to local persistence.
- [ ] **Step 4: Verify GREEN**; same command, expect PASS.

### Task 7: Arabic-first i18n and accessible DOM contracts

**Files:**
- Create: `scripts/pr35/pr35-i18n.js`
- Create: `tests/pr35/i18n-dom-contract.test.mjs`
- Create: `styles/vvip-pr35-owner-care.css`

**Interfaces:**
- Produces: `translate(key,lang,params)`, `setDocumentLanguage(lang)`, complete frozen `ar`/`en` dictionaries, and CSS component contracts.

- [ ] **Step 1: Write failing source-contract tests** for equal dictionary keys, exact Arabic confirmation, no raw error vocabulary, `lang`/`dir` mapping, logical CSS properties, `:focus-visible`, `prefers-reduced-motion`, 44px targets, stable skeleton dimensions, and no untrusted `innerHTML` in PR35 modules.
- [ ] **Step 2: Verify RED** with `node --test tests/pr35/i18n-dom-contract.test.mjs`; expect missing i18n module.
- [ ] **Step 3: Implement dictionaries/language setter and premium mobile-first logical CSS** with calm Arabic copy and English readiness.
- [ ] **Step 4: Verify GREEN** using the same command; expect PASS.

### Task 8: Tiger Care controllers and canonical entry points

**Files:**
- Create: `scripts/pr35/pr35-care-controller.js`
- Create: `scripts/pr35/pr35-listing-menu.js`
- Modify: `index.html`
- Modify: `private-profile-p03.html`
- Modify: `scripts/vvip-p03-profile.js`
- Modify: `scripts/vvip-pr29-home-marketplace.js`
- Modify: `scripts/vvip-pr30-resilience.js`
- Modify: `styles/vvip-p03-profile.css`
- Modify: `styles/vvip-pr29-home-marketplace.css`
- Modify: `tests/pr35/i18n-dom-contract.test.mjs`

**Interfaces:**
- Produces: `createCareController({root,adapter,identity,clock})`, `mountListingMenus({root,openCare})`; DOM events `vvip:care:open` and `vvip:care:state`.

- [ ] **Step 1: Extend failing contracts** for dialog labeling, focus containment/return, Escape, menu arrow-key navigation, `aria-haspopup="menu"`, status live region, explicit pending/sent/failed states, category fields, and zero management telephone links.
- [ ] **Step 2: Verify RED** using `node --test tests/pr35/i18n-dom-contract.test.mjs`; expect missing hooks/modules.
- [ ] **Step 3: Add module/style imports and stable mount hooks** to only the two canonical pages; replace the placeholder Care toast and add listing menus using DOM creation plus `textContent`.
- [ ] **Step 4: Register PR35 actions in resilience guard** without adding authorization logic there.
- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/pr35/i18n-dom-contract.test.mjs && ./scripts/qa-smoke.sh`
Expected: both commands PASS.

### Task 9: Protected Owner Control Center

**Files:**
- Create: `owner-control.html`
- Create: `scripts/pr35/pr35-owner-controller.js`
- Create: `scripts/pr35/pr35-bootstrap.js`
- Modify: `private-profile-p03.html`
- Modify: `tests/pr35/i18n-dom-contract.test.mjs`

**Interfaces:**
- Produces: `createOwnerController({root,adapter,identity,clock})`; bootstrap chooses local only on explicit localhost preview and production otherwise.

- [ ] **Step 1: Add failing contracts** for auth gate before content, `owner.console.read`, no owner-data render on deny/config failure, reason-required assignment dialog, scoped ticket page of at most 20, no internal notes in normal-user view, and safe Arabic errors.
- [ ] **Step 2: Verify RED** with the DOM-contract test; expect missing owner page/controller.
- [ ] **Step 3: Build the owner view/controller** with lazy panels for assignments, tickets, routing/SLA, and audit; do not optimistically render privileged success.
- [ ] **Step 4: Add an account-center link only after local policy allows it** while documenting that route hiding is not enforcement.
- [ ] **Step 5: Verify GREEN** with `node --test tests/pr35/i18n-dom-contract.test.mjs`; expect PASS.

### Task 10: Review-only Supabase schema and RLS design

**Files:**
- Create: `docs/security/sql-review/pr35/20260714_pr35_owner_control_tiger_care_review.sql`
- Create: `docs/launch/pr35/SECURITY_REVIEW.md`

**Interfaces:**
- Defines review-only tables/functions/policies corresponding exactly to the JS contracts; no runtime consumes this file.

- [ ] **Step 1: Add a static failing QA assertion** that the SQL contains a top-level `REVIEW ONLY — DO NOT APPLY` marker, required tables, explicit RLS enablement, owner isolation, owner-only owner-role mutation, append-only audit denial, scoped staff predicates, bounded functions, and no service-role grant.
- [ ] **Step 2: Verify RED** with `bash scripts/qa-pr35.sh`; expect missing SQL marker/file.
- [ ] **Step 3: Write transaction-wrapped review SQL** for permission catalog, role bundles, assignments, requests/tickets/messages/notes, routing/SLA/audit; include comments for future trusted RPCs and rollback design, but no apply command.
- [ ] **Step 4: Record threat-model traceability and unresolved production prerequisites** in `SECURITY_REVIEW.md`.
- [ ] **Step 5: Verify GREEN** with `bash scripts/qa-pr35.sh`; expect SQL static checks PASS.

### Task 11: Service worker and aggregate QA gates

**Files:**
- Modify: `sw.js`
- Modify: `scripts/qa-smoke.sh`
- Create: `scripts/qa-pr35.sh`

**Interfaces:**
- Produces one non-mutating aggregate command; service worker never precaches owner/private operational pages or payloads.

- [ ] **Step 1: Write failing checks** for canonical imports, cache-version bump, sensitive route/data exclusions, sorted allowlist, changed-file subset, exact confirmation, no phone/email claim, no dangerous placeholders, no prototype keys, syntax, and all Node tests.
- [ ] **Step 2: Verify RED** with `bash scripts/qa-pr35.sh`; expect cache/import or incomplete-artifact failure.
- [ ] **Step 3: Update the cache version and exclusions**, preserve public static caching, and wire all aggregate checks.
- [ ] **Step 4: Verify GREEN**

Run: `bash scripts/qa-pr35.sh && ./scripts/qa-smoke.sh && ./scripts/qa-pr33-accessibility.sh`
Expected: all exit 0.

### Task 12: Accessibility, performance, security, and regression evidence

**Files:**
- Create: `docs/launch/pr35/qa/ACCESSIBILITY_EVIDENCE.md`
- Create: `docs/launch/pr35/qa/PERFORMANCE_EVIDENCE.md`
- Create: `docs/launch/pr35/qa/SECURITY_EVIDENCE.md`
- Create: `docs/launch/pr35/qa/REGRESSION_EVIDENCE.md`
- Create: `docs/launch/pr35/ACCESSIBILITY_AND_RTL_REVIEW.md`
- Create: `docs/launch/pr35/PERFORMANCE_REVIEW.md`
- Create: `docs/launch/pr35/CODE_REVIEW.md`

**Interfaces:**
- Evidence format: UTC timestamp, baseline, exact command/scenario, exit/result, relevant output, reviewer conclusion, and unresolved limits.

- [ ] **Step 1: Run fresh automated gates** and paste results, not conclusions alone.

Run: `bash scripts/qa-pr35.sh`
Expected: PASS with zero failed suites.

- [ ] **Step 2: Run syntax and diff integrity gates**

Run: `find scripts/pr35 tests/pr35 -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | xargs -0 -n1 node --check && git diff --check`
Expected: exit 0.

- [ ] **Step 3: Serve locally and manually test** 320px/desktop Arabic and English, keyboard-only menu/dialog, focus return, reduced motion, offline submission/reconnect, slow 3G timeout/cancel, production missing-config denial, requester isolation, and no raw errors. Record observed outcomes without claiming unexecuted browser automation.
- [ ] **Step 4: Measure source delta and Lighthouse when available**; compare against the documented budgets and record tool absence as a limitation, never PASS.
- [ ] **Step 5: Complete four independent review records**: code, security, accessibility/RTL, performance/weak network. Log every finding and resolution in `REVIEW_RESOLUTION_LOG.md`.

### Task 13: Final reconciliation and handoff artifacts

**Files:**
- Modify: `docs/launch/pr35/REVIEW_RESOLUTION_LOG.md`
- Create: `docs/launch/pr35/FINAL_REPORT.md`
- Create: `docs/launch/pr35/PR_BODY.md`
- Modify: `docs/launch/pr35/CHANGE_CONTROL_MANIFEST.md`
- Modify: `docs/launch/pr35/ARCHITECTURE_FILE_MAP.md`
- Modify: `docs/launch/pr35/CHANGED_FILES.allowlist`

**Interfaces:**
- Produces auditable final status only; outer orchestrator owns commit/push/PR.

- [ ] **Step 1: Compare actual changes to the allowlist**

Run: `comm -23 <(git status --short | sed -E 's/^.. //' | sort -u) <(sort -u docs/launch/pr35/CHANGED_FILES.allowlist)`
Expected: no output except pre-existing `AGENTS.override.md`, which must be explicitly excluded from PR35 and documented.

- [ ] **Step 2: Scan ambiguity and placeholders**

Run: `grep -RInE '\b(T[B]D|T[O]DO|F[I]XME|implement l[a]ter|appropriate error h[a]ndling|similar to T[a]sk)\b' docs/launch/pr35 docs/superpowers scripts/pr35 tests/pr35 || true`
Expected: no unresolved implementation placeholders; quoted QA search terms in the plan are reviewed as documentation, not gaps.

- [ ] **Step 3: Reconcile exact paths and interfaces** against the design, permission catalog, workflow, SQL review, and file map; correct drift.
- [ ] **Step 4: Run final fresh gate**

Run: `bash scripts/qa-pr35.sh && ./scripts/qa-smoke.sh && git diff --check && test "$(git rev-parse HEAD)" = c71ecbddd00d91f5ee5414e86e74cbbbdb168d84`
Expected: all commands exit 0 and HEAD remains unchanged.

- [ ] **Step 5: Write final report and PR body** with exact canonical runtime, planned/actual file list, security limitations, review-only SQL warning, rollback, and evidence links. Do not commit, push, or open the PR.

## Planned execution order

Tasks 1–7 establish independently testable domain/security primitives. Tasks 8–9 integrate only canonical runtime pages. Task 10 remains review-only. Tasks 11–13 provide regression gates, four reviews, QA evidence, final report, and orchestrator handoff. Each task may be reviewed independently; no later task is allowed to weaken an earlier invariant.
