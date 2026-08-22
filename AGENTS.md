# AGENTS.md

## Project Scope

- This repository is a static multi-page web app for VVIP TIGER built primarily with plain HTML, CSS, and JavaScript.
- Do not introduce a framework, bundler, or package-based build step unless the owner explicitly approves it.
- Prefer small, reversible edits that preserve the current bilingual Arabic/English and RTL behavior.
- GitHub/repository state is the implementation source of truth; never bypass quality/security gates.

## Project Continuity Protocol

- Before broad implementation work, read [MASTER_PROJECT_STATE.md](./docs/MASTER_PROJECT_STATE.md).
- Before owner-gated launch work, read [OWNER_GLOBAL_LAUNCH_EXECUTION_DIRECTIVE_20260808.md](./docs/global/OWNER_GLOBAL_LAUNCH_EXECUTION_DIRECTIVE_20260808.md).
- Treat chat history as temporary context, not repository authority.
- When sources disagree, use this precedence: current repository bytes/refs -> exact-head CI/test/security evidence -> current PR/commit metadata -> `docs/MASTER_PROJECT_STATE.md` -> historical chat/prose.
- Do not restart or rebuild verified work merely because a new chat/session begins.
- Use the session sequence `READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT -> CONTINUE`.
- Classify continuity state explicitly as `APPROVED`, `IMPLEMENTED`, `VERIFIED`, `IN_PROGRESS`, `BLOCKED`, `DEFERRED`, or `STALE`.
- `IMPLEMENTED` is not `VERIFIED` without evidence; `DEFERRED` is not complete.
- Before modifying files, resolve the active branch/PR/head SHA/dependency chain and inspect the checks relevant to that exact source state.
- When the active execution cursor materially changes, update `docs/MASTER_PROJECT_STATE.md` before handing the work to another session.

## Owner Global Launch Authorization

- `OWNER GLOBAL LAUNCH AUTHORIZATION = ACTIVE`.
- Continue autonomously after successful checkpoints; do not stop merely to repeat status or request routine approval already granted by the owner directive.
- The owner authorization covers progression through merges, remote migrations, Production configuration/deployment, provider enablement, and necessary bounded launch-cost actions when their technical prerequisites are satisfied and the required tools/accounts are available.
- Owner authorization does not permit bypassing failed gates, fabricating evidence, exposing secrets, weakening identity/RLS/security controls, ignoring dependency order, or making unbounded financial commitments.
- Existing cost hard limits remain enforcement controls until a provider-specific change is justified by measured need; do not invent a spending ceiling or payment method.
- If an action cannot be executed because the required external account/tool/access is unavailable, record the exact external blocker and continue all independent work rather than asking for routine reconfirmation.

## Binding Identity Architecture

- Read [Federated Identity Sovereignty ADR](./docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md) before changing authentication, recovery, account linking, or identity mapping.
- VVIP TIGER is federated-identity only: do not add first-party password sign-in, password hashes, local password reset/recovery, or a parallel Supabase/Firebase password system.
- Authentication belongs to the approved external identity provider/runtime; VVIP TIGER owns authorization, roles/capabilities, account status, RLS/data policy, owner approvals, and audit evidence.
- Canonical account identity is the verified external issuer + subject. Email/phone are attributes and must not be used alone to transfer or auto-link account ownership.
- The historical `reset-password.html` route is a compatibility redirect to provider recovery. Do not attach a local reset runtime to it.
- Do not put provider secrets, private signing keys, service-role credentials, or tokens in browser code or logs.

## Working Commands

- Local preview: `python -m http.server 800`
- App URL during local preview: `http://localhost:800`
- Smoke checks: `./scripts/qa-smoke.sh`
- Full repository gate: `bash scripts/quality-gate.sh`
- Repository checks include Node, Python, shell smoke, security, migration, Cleanroom, and Project Control integrity tests.

## Code Map

- [index.html](./index.html): canonical unified Social Home, Marketplace, and authentication entry page.
- [styles/tiger-social/core-shell.css](./styles/tiger-social/core-shell.css): active Social Home shell and mobile presentation.
- [styles/tiger-one/tokens.css](./styles/tiger-one/tokens.css) and [styles/tiger-one/type.css](./styles/tiger-one/type.css): active TIGER ONE visual tokens.
- [styles/vvip-pr29-home-marketplace.css](./styles/vvip-pr29-home-marketplace.css): retained Marketplace compatibility styling; it is not the current Social Home authority.
- [auth-clerk-index.js](./auth-clerk-index.js): Clerk authentication gate for the unified home.
- [scripts/social/core-shell.js](./scripts/social/core-shell.js): Social Home navigation and controller composition.
- [scripts/social/feed-controller.js](./scripts/social/feed-controller.js): trusted Social feed presentation.
- [scripts/social/post-composer.js](./scripts/social/post-composer.js): authenticated social post composer.
- [scripts/social/friends-controller.js](./scripts/social/friends-controller.js): friendship presentation and actions.
- [scripts/social/reactions-controller.js](./scripts/social/reactions-controller.js): server-confirmed reaction presentation and actions.
- [scripts/runtime/vvip-runtime-loader.js](./scripts/runtime/vvip-runtime-loader.js): external Clerk session + Supabase data-layer runtime bridge.
- [scripts/runtime/vvip-marketplace-repository.js](./scripts/runtime/vvip-marketplace-repository.js): canonical marketplace data repository.
- [private-profile-p03.html](./private-profile-p03.html): legacy preview/account compatibility surface only; it is not the current Social Home authority.
- [scripts/vvip-p03-profile.js](./scripts/vvip-p03-profile.js): private account-center interactions.
- [scripts/vvip-p03-profile-identity.js](./scripts/vvip-p03-profile-identity.js): authenticated profile resolver bridge.
- [reset-password.html](./reset-password.html): legacy URL compatibility redirect to external-provider recovery only.
- [sw-vvip-static.js](./sw-vvip-static.js) and [manifest.webmanifest](./manifest.webmanifest): canonical static-delivery PWA surface. `sw.js` is retired and must not return.

## Project Conventions

- Keep the app static and page-based unless a separately approved architecture changes that boundary.
- Preserve bilingual content patterns and RTL behavior for Arabic views.
- Match the active Social visual language in [styles/tiger-social/core-shell.css](./styles/tiger-social/core-shell.css) and the TIGER ONE tokens; preserve Marketplace compatibility where required.
- When changing auth or registration, trace both DOM changes in [index.html](./index.html) and behavior in [auth-clerk-index.js](./auth-clerk-index.js) plus the runtime loader.
- Sensitive identity/data changes must fail closed and remain subject/RLS controlled.

## Supabase Notes

- Supabase is a data/storage layer, not a second VVIP password authority.
- Browser Supabase access must remain under the verified external session and least-privilege RLS/policy enforcement.
- Do not add service-role or provider secrets to browser configuration.
- Historical phone-verification/OTP assets are not authority to create a new first-party identity backend.

## Session And Access Rules

- The canonical home authentication gate is managed in [auth-clerk-index.js](./auth-clerk-index.js).
- VVIP authorization is independent from external authentication: authenticated does not imply admin or privileged access.
- Preserve role/capability and data-scope enforcement in canonical authorization and RLS layers.
- Do not persist external provider tokens merely to maintain login identity.

## Documentation To Link Instead Of Repeating

- [README.md](./README.md): current project overview.
- [MASTER_PROJECT_STATE.md](./docs/MASTER_PROJECT_STATE.md): current continuation cursor, blockers, authorization state, and next action.
- [OWNER_GLOBAL_LAUNCH_EXECUTION_DIRECTIVE_20260808.md](./docs/global/OWNER_GLOBAL_LAUNCH_EXECUTION_DIRECTIVE_20260808.md): binding owner authorization to continue through global launch without routine reconfirmation.
- [Federated Identity Sovereignty ADR](./docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md): binding identity decision.
- [Federated Identity Known Gap](./docs/security/FEDERATED_IDENTITY_KNOWN_GAP_20260808.md): deployment-bound identity remediation record.
- [Legacy Password Runtime Removal](./docs/security/LEGACY_PASSWORD_RUNTIME_REMOVAL_20260808.md): retired password/recovery runtime evidence.
- [ADMIN-SETUP-GUIDE.md](./ADMIN-SETUP-GUIDE.md): current admin identity boundary notice.

## Agent Guidance

- Prefer root-cause fixes in canonical loaded code over patching symptoms.
- Do not reintroduce retired auth files to satisfy stale references; repair the reference or route to the current architecture.
- If auth, recovery, sessions, roles, RLS, service-worker caching, or hosting routing changes, add/adjust focused automated contracts and run the full Quality Gate.
- Never claim Production identity or global-launch readiness without exact release-candidate environment evidence where the launch contract requires it.
- After each verified phase, continue automatically to the next safe phase until Global Launch Ready or a genuine external blocker is reached.
