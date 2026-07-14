# PR35 Owner Control and Tiger Care Design

Status: Pass 01 approved design baseline (documentation only)
Date: 2026-07-14
Branch baseline: `feat/pr35-owner-control-tiger-care-foundation` at `c71ecbddd00d91f5ee5414e86e74cbbbdb168d84`

## 1. Decision and scope

PR35 adds a local-first, production-fail-closed foundation for owner governance, permission policies, scoped assignments, Tiger Care, and immutable audit records to the canonical static PR29–PR33 runtime. It does not deploy SQL, mutate Supabase or Clerk, implement payments, expose management telephone numbers, or claim delivery by an unconfigured adapter.

The selected architecture is small ES modules with pure domain functions, browser controllers, and explicit adapters. A monolithic dashboard was rejected because it would couple policy, UI, storage, and networking. Role-name checks were rejected because roles are position bundles, not authorization decisions. A production-looking local success fallback was rejected because privileged operations must fail closed.

## 2. Canonical runtime resolution

The active user route is `index.html`; `firebase.json` redirects retired public-profile URLs to it. The active private route is `private-profile-p03.html`; both `private-profile.html` and `clerk-private-profile.html` redirect to it while preserving query and hash. `index.html` and `private-profile-p03.html` import the PR29–PR33 assets, and `sw.js` precaches that same set. `scripts/qa-smoke.sh` asserts that `social-ui.js`, `public-profile.html`, and `public-profile-p03.html` are absent and identifies the PR29 shell as canonical. Git history through PR33 and the P01 completion/phase tracker confirm the newer runtime supersedes earlier launch inspections.

Consequently, PR35 may integrate only with `index.html`, `private-profile-p03.html`, their imported modules/styles, and `sw.js`. Redirect shims, archived snapshots, old root styles/scripts, and missing legacy feed files are not implementation targets. The three-dot requirement is implemented anew on canonical listing cards, not by restoring `social-ui.js`.

## 3. Architecture and bounded modules

| Module | Responsibility | Dependencies |
|---|---|---|
| `pr35-contracts.js` | enums, bounded record shapes, deterministic error codes | none |
| `pr35-sanitize.js` | normalize text, reject dangerous keys, length limits | contracts |
| `pr35-scope.js` | scope normalization and containment for platform/sector/region/area/team | contracts |
| `pr35-policy.js` | default-deny authorization and delegation constraints | contracts, scope |
| `pr35-audit.js` | canonical append-only audit event creation and hash-chain verification | contracts, sanitize |
| `pr35-tiger-care.js` | request validation and ticket/status transition rules | contracts, sanitize |
| `pr35-routing.js` | deterministic eligible-assignee routing and escalation | policy, Tiger Care |
| `pr35-sla.js` | SLA deadlines and breach state using injected clock | contracts |
| `pr35-network.js` | timeout, cancellation, bounded backoff/jitter, dedupe | contracts |
| `pr35-drafts.js` | session-scoped safe ticket drafts and non-privileged queue | sanitize |
| `pr35-local-adapter.js` | safe demo/read adapter; explicit pending/sent/failed submission state | all domain modules |
| `pr35-production-adapter.js` | deny all protected writes until verified config/backend exists | contracts |
| `pr35-owner-controller.js` | owner console state and commands | policy, adapters |
| `pr35-care-controller.js` | user/staff ticket UI state and commands | Tiger Care, adapters |
| `pr35-listing-menu.js` | canonical listing three-dot entry to structured care flow | care controller |
| `pr35-i18n.js` | Arabic-first keyed copy with English completeness check | contracts |

All domain modules are side-effect free. Controllers receive `adapter`, `identity`, `clock`, and `signal` dependencies. DOM modules render with `textContent`; no untrusted value enters `innerHTML`.

## 4. Exact interfaces

```js
authorize({ actor, permission, resourceScope, now }):
  { allowed: boolean, code: string, effectiveAssignmentIds: string[] }

canDelegate({ actor, subjectId, permissionIds, scope, roleId, now }):
  { allowed: boolean, code: string }

createAuditEvent({ previousHash, actorId, action, target, scope, reason, at, metadata }):
  Promise<{ event: AuditEvent, hash: string }>

transitionTicket({ ticket, toStatus, actor, reason, now }):
  { ok: boolean, code: string, ticket?: Ticket, auditInput?: object }

routeTicket({ ticket, assignments, policies, now }):
  { assigneeId: string|null, teamId: string|null, code: string }

withRequestPolicy(operation, { signal, timeoutMs, maxAttempts, baseDelayMs, random }): Promise<Result>

createOperationalAdapter({ mode, transport, store, clock }): {
  listTickets(query, context): Promise<Page<Ticket>>,
  submitUserRequest(input, context): Promise<SubmissionReceipt>,
  mutateTicket(command, context): Promise<Result>,
  mutateAuthorization(command, context): Promise<Result>,
  appendAudit(event, context): Promise<Result>
}
```

`mode` is `local` or `production`. Production construction without a verified transport returns `CONFIGURATION_REQUIRED`; it never substitutes local success. Local mode may model operations for review but labels them local and never claims remote persistence or email delivery.

## 5. Authorization model

Authorization evaluates active assignments and explicit permissions, never a displayed role name. Assignment states are `pending`, `active`, `suspended`, `revoked`, `expired`; only `active` with `startsAt <= now < expiresAt` grants authority. Scope is a normalized tuple `{level, sectorId, regionId, areaId, teamId}`; omitted scope identifiers are not wildcards. Platform scope contains lower scopes. Other containment requires every ancestor identifier to match. Cross-scope access needs an explicit cross-scope permission.

The owner role assignment and revocation require an authenticated owner actor plus `authorization.owner.manage`, an explicit reason, online trusted enforcement, and an audit event. No actor can grant permissions they do not currently hold. A delegated actor cannot grant their own maximum authority, owner authority, or a scope broader than their effective scope. Self-assignment is denied. Missing identity, policy, time, scope, adapter configuration, or audit capability denies protected action.

## 6. Tiger Care domain and transitions

Request categories are `management_contact`, `support`, `complaint_report`, `missing_category`, `rejection_appeal`, `account_issue`, `sector_access_request`, `fraud_safety`, and `other`. Priorities are `low`, `normal`, `high`, `urgent`. Statuses are `new`, `acknowledged`, `in_review`, `waiting_user`, `escalated`, `resolved`, `closed`, and `cancelled`.

Allowed transitions:

- `new -> acknowledged|cancelled`
- `acknowledged -> in_review|waiting_user|escalated|cancelled`
- `in_review -> waiting_user|escalated|resolved|cancelled`
- `waiting_user -> in_review|escalated|cancelled`
- `escalated -> in_review|waiting_user|resolved|cancelled`
- `resolved -> in_review|closed`
- `closed` and `cancelled` are terminal

Cancellation is valid only for the owner-isolated requester while no irreversible staff action exists, or for authorized staff with a reason. Reopening a resolution requires a reason and audit. Internal notes are a separate type and permission surface and are never returned by user-facing queries. User access is always constrained to `requesterId === actor.id` by the trusted production boundary.

On accepted local or confirmed remote submission, user copy is exactly: `تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.` Email is reported only when `receipt.email.status === "confirmed"` from a configured adapter.

## 7. Data flow and failure behavior

User form input is normalized, sanitized, bounded, assigned an idempotency key, and submitted. Online production submission crosses the trusted adapter; offline only a non-privileged user ticket may enter the session queue. The UI displays `pending`, `sent`, or `failed`. Permission, assignment, staff ticket mutation, note, escalation, and audit commands are never queued offline. Reads use bounded pages and may cache only non-sensitive, session-safe projections. Secrets, internal notes, authorization payloads, and privileged records are never cached.

Search debounce is 250 ms. Page size defaults to 20 and caps at 50. Requests time out after 8 seconds. Retry is limited to 3 attempts for idempotent reads and confirmed idempotent ticket submission, with delays capped at 2 seconds and full jitter. Navigation/search cancellation uses `AbortController`. Raw exception strings never reach user copy.

## 8. UI, accessibility, RTL, and language

The account center gains a real Tiger Care entry. Canonical listing cards gain an accessible three-dot menu with `aria-haspopup="menu"`, keyboard navigation, Escape dismissal, focus return, and Tiger Care/report actions. The owner console is a separate `owner-control.html` route linked only after authorization; hidden navigation is not security. It uses landmarks, headings, visible focus, 44px targets, semantic tables/cards, live regions, dialog focus containment, reduced-motion media queries, and stable skeleton dimensions.

Arabic is the default (`lang="ar" dir="rtl"`). All copy uses stable translation keys with complete Arabic and English dictionaries; language changes set both `lang` and `dir`. IDs, timestamps, permissions, and status codes remain language-neutral. Layout uses logical CSS properties so LTR does not require structural duplication.

## 9. Data review design

Review-only SQL under `docs/security/sql-review/pr35/` defines roles, permissions, role permissions, assignments, requests, tickets, messages, internal notes, routing events, SLA events, and append-only audit events. It specifies RLS owner isolation, staff permission/scope checks, owner-only owner-role mutation, append-only audit protections, and privileged RPC boundaries. It is never applied during PR35. Client policy mirrors are UX support only.

## 10. Verification and completion gates

Pure Node tests cover default deny, expiry/revocation, containment, delegation, prototype pollution, status transitions, notes isolation, audit immutability, routing, SLA, timeouts, retry bounds, dedupe, and queue restrictions. DOM contract tests cover Arabic/English completeness, focus behavior, menus, dialogs, reduced motion, logical properties, and safe errors. Shell checks cover canonical imports, service-worker exclusions, SQL location, no secrets, no management phone, exact confirmation copy, and allowlist compliance. Manual QA covers 320px mobile, keyboard-only, RTL/LTR, reduced motion, offline/reconnect, slow network, and production fail-closed behavior.

No PASS is recorded without fresh command output in the QA evidence files. The final report must reconcile every intended file against `CHANGED_FILES.allowlist`.

## 11. Explicit exclusions

No remote SQL or deployment, Clerk/Supabase mutation, service-role use, secret retrieval, payment, direct management phone, realtime transport, notification/email provider implementation, legacy tracked-file deletion, or claim that a disconnected network becomes fast.
