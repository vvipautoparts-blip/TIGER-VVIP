# VVIP TIGER — MASTER PROJECT STATE

**Last updated:** 2026-08-12
**Repository:** `vvipautoparts-blip/TIGER-VVIP`
**State protocol:** READ -> VERIFY -> PLAN -> EXECUTE

This file records implementation truth. Owner product/security decisions are frozen separately in:

- `docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md`
- `project-control/owner/VVIP_TIGER_OWNER_DECISIONS_2026-08-12.json`

Never treat an approved design as Production until same-SHA evidence proves it.

## Status vocabulary

- `APPROVED_NOT_IMPLEMENTED`
- `IMPLEMENTING`
- `IMPLEMENTED_NOT_PRODUCTION`
- `PRODUCTION_VERIFIED`
- `BLOCKED_HUMAN_GATE`

## Production baseline

- `main` verified at `31e1ca7d6879902c406f3ac93ef93005413552f3` when this state file was created.
- PR #190 `fix(auth): guest-first VVIP access and step-up login` is merged.
- PR #190 guest-first behavior is a protected regression boundary for all later UX work.
- No document in this branch authorizes direct Production database mutation, real-money payout execution, DNS changes, Clerk provider changes or secret changes.

## PR #191 — central commission policy and role identity binding

**State:** `IMPLEMENTING`
**Branch:** `feat/commission-policy-all-sectors-20260811`
**Base:** `main`

Completed and verified during the current execution stream:

- mandatory `ACCOUNT_ID` / `CLERK_USER_ID` reference for new operational role assignment;
- server-side trusted resolution requirement before role activation;
- exact Clerk/account/subject mismatch denial tests;
- normalized identity binding retained through semantic persistence/idempotency;
- Operations Console identity-binding field;
- owner-approved all-sector commission/role specification and machine-readable decision file;
- prior same-head checkpoint `c2472b89a6a9d34e0c13741ad3ad5768a4304318` passed CodeQL, VVIP Quality Gate, V14 Release Candidate, Dependency Review, Project Control Integrity and TIGER CleanGuard;
- role-retirement TDD started after that green checkpoint;
- RED evidence proved active `area_manager` remained in V13/PR35/Operations Console;
- implementation now removes `area_manager` from active role catalogs/ranks/UI while retaining geographic `area` scope and historical-readable identity.

Latest observed implementation head while this state file was authored: `94da6e4b355dcaf13f41201ba5d66b30a6a6624a`.

Still required before PR #191 can be Ready:

1. same-head green verification after active `area_manager` retirement;
2. central exact commission-policy module for all current/future sectors;
3. deterministic zero-loss minor-unit redistribution for removed share;
4. active-path alias audit for `SECONDARY_MARKETER`, `SUPERVISOR`, `AREA_MANAGER` and semantic aliases;
5. safe handling of legacy active bootstrap/schema references without rewriting historical audit/provenance;
6. final same-head protected checks;
7. protected human review/merge gate.

No real-money execution and no Production DB apply are authorized inside PR #191.

## PR #189 — VVIP TIGER experience convergence

**State:** `IMPLEMENTING`
**Branch:** `feat/experience-convergence-20260811`
**Latest observed head:** `8738b14a2ecd4ce4703d9858e21eac38b0f09f03`
**Observed base SHA:** `130bb2364a82a19a62f79f8270b6182e078606a2`

Important: PR #189 was created before the merged PR #190 auth head and therefore must be synchronized/reconciled with current `main` before completion. It must preserve guest-first auth and step-up protected intent behavior.

Approved UX direction:

- Facebook-like familiarity for hierarchy/flow only;
- independent VVIP TIGER celestial/royal-blue Glassmorphism identity;
- fixed desktop top bar;
- composer, horizontal content/stories and vertical feed;
- natural Home/Profile/Search/Notifications/Messages/Settings navigation;
- profile cover/avatar/actions/tabs structure;
- mobile bottom navigation;
- compact icon/action buttons;
- ordinary posts publish directly without commercial registration or default human review;
- optional funding appears after successful post publication;
- purchase/funding/payment resolves trusted `Clerk user.id <-> accountId` server-side.

## Security — TIGER SEAL + MIRAGE

**State:** `APPROVED_NOT_IMPLEMENTED` as a dedicated security implementation stream.

Approved design baseline:

- one sensitive action -> one bounded server-issued authority seal;
- purpose-bound access and no ambient root/admin authority;
- split knowledge and minimum data projection;
- MIRAGE masking/tokenization/aliasing/withholding rather than sending unnecessary raw private truth;
- ephemeral field-level reveal;
- no fabricated financial truth;
- native secure handling for critical views where platform APIs support screenshot/capture controls;
- capture/mirroring response moves sensitive views to protected projection where supported;
- AI-safe projection prevents intentional disclosure of private canonical identifiers, secrets, tokens and infrastructure internals to AI integrations;
- anti-extraction query budgets, bounded export, anti-enumeration and quarantine signals;
- controlled ghost/canary identifiers as detection signals;
- no false claim of mathematical 100%/1000% unhackability or universal screenshot prevention.

Implementation must occur in isolated security PR(s) after the written security design/plan is committed and reviewed against the current repository state. It must not be mixed into PR #191.

## Financial reliability

**State:** `APPROVED_NOT_IMPLEMENTED` for real-money execution.

Policy requirements:

- exact rational/integer source of truth;
- no calculation from rounded display percentages;
- deterministic remainder handling;
- idempotency and reconciliation;
- historical financial facts immutable;
- before real-money activation: at least 5,000,000 mixed simulated movements plus invariant checks for zero double-charge, zero duplicate commission and exact reconciliation.

## Product simplicity rule

Visible UX remains simple even when backend controls become stronger. Internal names such as TIGER SEAL/MIRAGE are engineering architecture, not a requirement to create extra user-facing menus or products.

## Superseded current requirements

Do not reintroduce without a new owner decision:

- commercial registration required for an ordinary post;
- default human/admin pre-publication review for ordinary posts;
- default manual preview queue for ordinary posts;
- default external-brand proof gate blocking ordinary post publication;
- commercial-register approval as a hidden ordinary-user ranking gate;
- TIGER CITADEL 2026 as the selected security architecture.

## Continuation rule

Every new work session must:

1. read this file and the latest owner-decision reference;
2. verify current `main`, active PR heads and CI rather than trusting stale chat state;
3. preserve PR #190 guest-first auth;
4. continue from the last verified implementation checkpoint;
5. never claim Production completion without exact deployed-SHA evidence;
6. ask the owner only when a protected human-only gate genuinely requires action.
