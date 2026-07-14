# PR35 Review Resolution Log

## Pass 01 self-review

| Concern | Resolution |
|---|---|
| Older docs name `clerk-private-profile.html` and `social-ui.js` | selected route/import/service-worker/smoke/completion evidence; redirects and absent-file assertions prevail |
| “Owner” label in current private HTML could imply authority | design treats it as presentation only; policy requires verified assignments |
| Role-based requirement could invite role checks | roles defined only as permission bundles; decisions use permission + active assignment + scope |
| Owner assignment delegation ambiguity | only an owner with `authorization.owner.manage`; self-elevation denied |
| Offline/fallback could fake protected success | production adapter fails closed; privileged queue size is zero |
| Internal notes could leak through shared ticket shape | separate permission, method, projection, and cache prohibition |
| Exact confirmation versus email claim | confirmation is receipt copy; email success requires adapter confirmation |
| Three-dot surface was legacy | new accessible menu attaches to canonical PR29 listing cards |
| Roadmap sequences P06/P20 separately | PR35 is an owner-authorized foundation; modules remain bounded and independently testable |
| SQL prohibition | only review text under `docs/security/sql-review/pr35/`; no application command |

Placeholder, contradiction, authorization ambiguity, dangerous scope expansion, and legacy-target scans must be rerun after implementation and before final review.

## Pass 06 integration resolutions

| Concern | Resolution |
|---|---|
| Audit secret-key matching covered only exact names | added hostile variants and broadened rejection without logging values |
| Requester cancellation existed in the specification but not the domain | implemented owner-isolated cancellation only from `new`; cross-user and post-acknowledgment attempts deny |
| Historical smoke originally rejected all documentation and SQL | retained its old rejection and exempted only exact PR35 allowlist entries under the review-only SQL directory; regression samples cover unauthorized paths |
| Planned file map and allowlist exceeded actual implementation | reconciled documentation and allowlist to the files actually changed in this worktree |

## Pass 07 independent review Round 1

| Finding | Validation and resolution |
|---|---|
| P1 synthetic unauthenticated Care identity | Valid. `pr35-bootstrap.js` used `window.Clerk?.user?.id || 'demo-member'` in every environment. `resolveCareIdentity` now permits that identity only in local preview and returns an inactive, null-id production identity otherwise; the production adapter consequently returns `IDENTITY_REQUIRED`. Regression: `Care demo identity is limited to local preview`. |
| P1 offline pending without persistence | Valid. The controller selected `care.offlinePending` from `navigator.onLine` without calling the existing queue. Submission now reports pending only when `createUserSubmissionQueue(...).enqueue(...)` succeeds; absent/failed storage reports the ordinary safe failure state. Regression: `offline pending is reported only after durable session enqueue succeeds`. |
| P2 changed-files allowlist order | Valid. `CODEX_REVIEW_ROUND1.md` was appended after test paths and failed the existing exact-order assertion. The allowlist was lexically sorted; the existing production-boundary ordering test is the regression gate. |

No Round 1 findings were false positives.

## Pass 08 independent review Round 2

| Finding | Validation and resolution |
|---|---|
| P1 non-owner actor could revoke owner authority | Valid. `changeState` authorized only `authorization.owner.manage`, so a non-owner assignment carrying that permission could suspend or revoke an owner assignment. Owner-target state changes now additionally require an effective owner-role assignment carrying owner-manage within the target scope; missing owner authority fails closed with `OWNER_CONTROL_REQUIRED`. Regression: `non-owner assignment cannot suspend or revoke owner authority`. |
| P1 incomplete scoped-assignment form | Valid. `scopeFrom` serialized the full hierarchy, but the form rendered only `sectorId`; region, area, and team selections therefore could not satisfy `normalizeScope`. The form now renders sector/region/area/team identifiers and dynamically reveals and requires the exact ancestor chain for the selected level. Regression: `assignment form collects and requires the complete selected scope hierarchy`. |
| P1 Round 2 review absent from allowlist | Valid. The exact changed-file gate classified `CODEX_REVIEW_ROUND2.md` as forbidden because it was unlisted. The sorted allowlist now includes the review file, and the production-boundary regression asserts its presence. |

No Round 2 findings were rejected; all three reproduced against the pre-fix implementation.

## Pass 09 independent review Round 3

| Finding | Validation and resolution |
|---|---|
| P1 local Care staff operations ignored assignment scope | Valid. Staff reads and writes checked only the flat presentation permission array. The local adapter now derives the ticket's most specific valid hierarchical scope and calls the existing policy evaluator for reads, messages, transitions, internal notes, and escalations. Staff reads preserve non-enumerating `TICKET_NOT_FOUND`; writes return the deterministic policy denial. Regression: `local staff access is denied outside the effective assignment scope`. |
| P1 lower authority could change higher assignment state | Valid. Suspend/revoke required manage permission in scope but skipped delegation ownership and rank ceilings. State changes now also evaluate the existing `canDelegate` policy against the target role, permissions, and scope before mutation or audit append. Owner-only behavior remains enforced by the same evaluator. Regression: `lower authority cannot suspend or revoke a higher-ranked assignment`. |
| P2 online hint prevented queueing after transport failure | Valid. `navigator.onLine` can remain true during DNS, timeout, captive-portal, and dropped-connection failures. The controller now treats the bounded transport codes `NETWORK_UNAVAILABLE`, `REQUEST_TIMEOUT`, `REQUEST_FAILED`, and `REMOTE_ENFORCEMENT_FAILED` as queueable independently of that hint; aborts and non-transport failures retain their prior behavior. A pending state still requires successful session queue persistence. Regression: `transport failure queues a user submission even when the online hint is true`. |
| Round 3 review absent from allowlist | Valid as a final change-control requirement. The lexically sorted allowlist now includes `CODEX_REVIEW_ROUND3.md`, and the exact-order production-boundary test asserts its presence. |

No Round 3 findings were rejected; all three concrete runtime findings reproduced against the pre-fix implementation. No speculative feature changes were accepted.

## Pass 10 independent review Round 4

| Finding | Validation and resolution |
|---|---|
| P1 authorization gate ran before Clerk initialization | Valid. On the canonical private-profile page, the module bootstrap could run before the deferred Clerk runtime had initialized; the Owner Control page did not declare the Clerk runtime at all. Production bootstrap now waits for Clerk availability and `load()` behind a bounded 2.5-second deadline before identity-dependent controller setup, while injected trusted identity and local preview retain their existing paths. `owner-control.html` declares the same existing Clerk browser runtime before PR35 bootstrap. Regressions: `authorization bootstrap waits for Clerk initialization before reading identity` and `owner control loads the existing Clerk runtime before authorization bootstrap`. |
| P2 successful queue entries were resent | Valid. `flush()` processed every stored entry, including terminal `sent` entries. It now preserves `sent` entries for explicit session-state reporting but skips transport invocation for them. Regression: `successful queue entries are terminal and never resent by later flushes`, which asserts one send across two flush cycles. |
| Round 4 review absent from allowlist | Valid as final change-control reconciliation. `CODEX_REVIEW_ROUND4.md` and this required final report are included in lexical order in the exact changed-file allowlist. |

No Round 4 findings were false positives. Aggregate QA completed with exit `0` at `2026-07-14T18:57:58Z`; production, remote, and manual browser verification remain unclaimed.
