# VVIP TIGER — MASTER PROJECT STATE

> Durable continuation ledger. Current repository bytes, refs, PR metadata, and exact-head CI/test/security evidence override this document whenever they differ.

## Snapshot

- **State timestamp:** 2026-08-08 23:40 +03:00
- **Repository:** `vvipautoparts-blip/TIGER-VVIP`
- **Default branch:** `main`
- **Audited `main` SHA:** `4cc292e626fea39f3b0e56b98781d521efef789d`
- **Current execution cursor:** PR `#178` — COST-04 cover-only public media signing
- **Cursor branch:** `feat/lean-global-cover-media-budget-20260808`
- **Cursor exact head:** `81402daf4e093a3b4c728d191bded0b3582b697a`
- **Cursor state:** `VERIFIED` at repository/CI level; Draft + OPEN + UNMERGED
- **Continuity protocol:** `IMPLEMENTED` on this checkpoint branch; exact-head verification required before classifying the checkpoint itself `VERIFIED`
- **Required session sequence:** `READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`

## Source-of-truth precedence

1. Current repository bytes and refs.
2. Exact-head CI/test/security evidence.
3. Current PR/commit metadata.
4. This Master Project State.
5. Historical chat/prose.

A stale chat statement must never override current GitHub evidence.

## Self-reference rule

The exact head SHA of the branch containing this ledger must be resolved from GitHub metadata at session start. This file intentionally does not embed its own containing commit SHA because editing this ledger changes that SHA.

## Active execution cursor

### PR #178 — COST-04

- **Title:** `COST-04: cover-only public media signing`
- **State:** Draft + OPEN + UNMERGED + mergeable at the 2026-08-08 audit.
- **Branch:** `feat/lean-global-cover-media-budget-20260808`
- **Exact source head:** `81402daf4e093a3b4c728d191bded0b3582b697a`
- **Immediate base:** PR `#177`, branch `feat/lean-global-request-sovereignty-20260808`
- **Base head:** `765fccc7acebfc930d49f7dddcc9e1e838e1224e`

### Exact-head evidence observed for PR #178

On exact source SHA `81402daf4e093a3b4c728d191bded0b3582b697a`:

- `VVIP Quality Gate` pull-request run `31277399213` — **PASS**.
- `Project Control Integrity` pull-request run `31277399214` — **PASS**.
- PR #178 records push Quality Gate run `31277323653` — **PASS**.
- Full Quality Gate evidence recorded by PR #178 includes root Node CJS `473/473`, PR35/PR36 `110/110`, listing contract `13/13`, Project Control tests `7/7`, authorization integrity `96/96`, Cleanroom PASS, secret scan PASS, dangerous SQL scan PASS, and isolated QA smoke PASS.

No broader environment or Production claim is implied by repository CI evidence.

## What COST-04 changed

**Status: `VERIFIED` for repository behavior on the exact source head above.**

For public marketplace listings:

- at most one display-critical media path per listing is submitted for signing;
- explicit `is_cover=true` media wins when valid;
- otherwise the lowest-position valid media is selected;
- duplicate selected paths across listings are deduplicated before one signing batch;
- original media metadata/order is preserved;
- only selected media receives a signed URL; non-selected media receives `url: ""`;
- no-path listings avoid unnecessary signing work;
- signing failure remains fail-closed as `MEDIA_SIGNING_FAILED`;
- private reads, uploads, deletes, identity, authorization, and write semantics remain outside COST-04.

This is structural cost reduction only. No currency or percentage saving is claimed without Staging/provider measurements.

## Immediate active dependency chain

- `#169` — COST-01 lean global cost governor foundation.
- `#170` — COST-02 bounded static CDN delivery lane.
- `#171` — FIX-LAUNCH-01 TSRF staging workflow-context repair.
- `#172` — AUTH-ADR-01 federated identity sovereignty.
- `#174` — IDENTITY-01 fail-closed legacy profile linking.
- `#177` — COST-03 public read request sovereignty.
- `#178` — COST-04 cover-only public media signing — **current cursor**.

PR `#173` is the earlier continuity sidecar based on PR #172. Its protocol is valid, but its recorded execution cursor became stale after later work. This checkpoint carries that approved continuity model onto the current PR #178 line instead of rewinding the product stack.

## Identity architecture and remediation status

### Binding architecture

**Status: `APPROVED` + repository implementation present.**

- VVIP TIGER is federated-identity only.
- No first-party VVIP passwords or local password reset authority.
- Canonical identity is the verified external issuer/subject; Clerk JWT `sub` is the current subject anchor.
- Email/phone are attributes, not account identity.
- Automatic ownership transfer solely by email is forbidden.
- Provider secrets/private signing keys must not enter browser code.
- VVIP TIGER retains authorization, roles/capabilities, account state, RLS/data policy, approvals, and audit evidence.

### IDENTITY-01

**Status: `VERIFIED` at repository/CI level; remote application remains `BLOCKED`.**

PR `#174` exact head `c218bf6f63d4db9f898947405c10bb6d9d5e91b3` prepares a forward-only fail-closed resolver migration that prevents email-only legacy ownership transfer and returns an explicit migration-required state instead.

Observed/recorded exact-head evidence:

- VVIP Quality Gate push `31276562500` — PASS.
- VVIP Quality Gate pull request `31276625600` — PASS.
- Project Control Integrity `31276625587` — PASS.

The migration has **not** been applied to remote Staging or Production by this workstream.

## COST-03 status

**Status: `VERIFIED` at repository/CI level.**

PR `#177` exact head `765fccc7acebfc930d49f7dddcc9e1e838e1224e` implements repository-instance-local public-read single-flight plus a 30-second public result reuse boundary, with private reads/identity/writes excluded and review invalidation fenced.

Recorded evidence:

- VVIP Quality Gate push `31276953154` — PASS.
- VVIP Quality Gate pull request `31277019278` — PASS.
- Project Control Integrity `31277019276` — PASS.

## Parallel protected workstreams

### TIGER SOVEREIGN AI

**Status: `IN_PROGRESS` / protected stack.**

AI work spans the established Draft stack including AI-13 through AI-18. Repository/automated verification of individual slices is not equivalent to live Staging/Production authority. Do not merge stack members ahead of dependencies and do not infer owner/L4 approvals from a broad continuation instruction.

### Marketplace / V14

**Status: `IN_PROGRESS` / external activation blocked.**

PR `#134` remains the production-capable marketplace convergence line. The current LEAN GLOBAL/security stack above it does not itself authorize Production activation.

## Deferred / unresolved evidence

- **PR36 real-image browser E2E:** `DEFERRED`; still a real-evidence gate where referenced by readiness contracts.
- **Manual owner AI browser acceptance:** `BLOCKED` until performed on the appropriate release candidate.
- **Remote IDENTITY-01 migration application:** `BLOCKED` behind protected Staging/Production migration evidence.
- **Real Staging launch evidence:** `BLOCKED` where launch contracts require actual protected environment proof.
- **Backup/restore/rollback Production drills:** not inferred from repository-only tests.
- **Android + iPhone release:** not yet authorized as a completed global-launch claim; Web/Android/iPhone launch remains a synchronized release requirement.

## Hard boundaries — do not infer authority

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `PRODUCTION_EDGE=LOCKED`
- `REMOTE_MIGRATION=NOT_AUTHORIZED`
- `PRODUCTION_DEPLOY=NOT_AUTHORIZED`
- `PROVIDER_PURCHASES=NOT_AUTHORIZED`
- `REAL_CHARGES=NOT_AUTHORIZED`
- `MONEY_MOVEMENT=NOT_AUTHORIZED`
- `PROTECTED_OWNER_L4_DECISIONS=NOT_SYNTHESIZED`
- `PRIVATE_BUCKET_PUBLICATION=FORBIDDEN`
- `IDENTITY_CACHE=FORBIDDEN`
- `LOCAL_PASSWORD_AUTHORITY=FORBIDDEN`

Repository continuation may create ordinary non-production branches, commits, tests, documentation, and Draft PRs within the established safety model. It must not silently cross protected merge, production, financial, provider, or identity-authority gates.

## Canonical continuity states

- `APPROVED`
- `IMPLEMENTED`
- `VERIFIED`
- `IN_PROGRESS`
- `BLOCKED`
- `DEFERRED`
- `STALE`

`IMPLEMENTED != VERIFIED` unless exact-current evidence supports verification. `DEFERRED != COMPLETE`.

## Exact stopping point

The latest verified repository execution cursor is PR `#178` at exact source head `81402daf4e093a3b4c728d191bded0b3582b697a`. COST-04 is GREEN on that source. It is stacked on verified COST-03, which is stacked on the repository-level IDENTITY-01 remediation. All remain Draft/open/unmerged and all Production/remote protected boundaries remain locked.

## Next safe action

After this continuity checkpoint itself receives exact-head verification, continue from PR #178 without rebuilding prior work. The next work must remain a **separate, non-production, measurable LEAN GLOBAL slice** chosen only after inspecting the current runtime for the next highest-confidence avoidable request/storage/database cost. Requirements for that next slice:

1. preserve all security/identity/private-read/write boundaries already established;
2. use TDD RED -> minimal GREEN -> full exact-head Quality Gate;
3. prove structural reduction with deterministic counters/contracts rather than invented monetary savings;
4. avoid new paid infrastructure, provider purchase, persistent sensitive caching, or Production mutation;
5. keep the new PR Draft + stacked on the exact verified COST-04 line;
6. update this ledger again when the execution cursor materially changes.

## Session checkpoint

**Checkpoint status:** `CURRENT_CURSOR_RECORDED_AWAITING_CHECKPOINT_EXACT_HEAD_VERIFICATION`

A fresh session must resolve this checkpoint PR/ref, PR #178, its exact source SHA, and current workflow state from GitHub before proceeding. It must continue from the latest verified cursor and must not restart VVIP TIGER from zero.