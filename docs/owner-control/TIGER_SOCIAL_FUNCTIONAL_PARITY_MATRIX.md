# TIGER SOCIAL CORE — FUNCTIONAL PARITY MATRIX

**Status:** CURRENT EXECUTION MAP
**Effective date:** 2026-08-18
**Authority:** `TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md`

## Purpose

This is the single execution map for the OWNER decision to make VVIP TIGER functionally familiar to a Facebook user at approximately 99.9% across applicable core social procedures before TIGER-specific differentiation.

The target is functional/behavioral familiarity. It does not authorize copying Meta/Facebook source code, logos, proprietary assets, private APIs, or a pixel-for-pixel protected visual identity.

## Status vocabulary

- `CURRENT` — trusted current implementation exists and is part of the active path.
- `PARTIAL` — some trusted implementation/contract exists but the user journey is incomplete.
- `LEGACY_REUSE` — useful earlier work exists but must be wrapped/converged before becoming Social Core authority.
- `SPEC_ONLY` — historical/current specification exists without proven current runtime completion.
- `NOT_STARTED` — no current trusted implementation has been accepted yet.
- `FUTURE` — intentionally postponed until earlier core slices are complete.

## Functional matrix

| Domain | Target familiar behavior | Current status | Current evidence / decision | Next convergence gate |
|---|---|---|---|---|
| Registration / Sign-in | Familiar secure registration, login, recovery, session | `CURRENT` | Clerk/federated identity and protected-action gate exist | Preserve; improve social onboarding only |
| Profile | Personal profile, identity, own settings, social sections | `PARTIAL` | Current profile bridge/account surface exists; profile authority recently hardened | Add social timeline, friends, privacy presentation |
| Global Social Shell | Home, Friends, Messages, Notifications, Profile, Marketplace | `PARTIAL` | Social-first shell implementation under PR #271 | Complete functional destination backends |
| Home Feed | Social posts as Home authority | `PARTIAL` | Social Home, bounded runtime adapter, feed controller, loading/empty/error states, and focused tests exist under PR #271 | Observe exact-head CI and bind a rehearsed remote read model |
| Post Composer | Text/image post separate from commercial listing | `PARTIAL` | Separate Social composer, fail-closed PostIntent, audience state, bounded publication RPC adapter, controller, and tests exist | Rehearse database path and complete trusted social-media attachment |
| Social Posts DB | Owner-bound posts with public/friends/only_me visibility | `PARTIAL` | Migration, RLS/RPC contracts, migration-hash lock, and rollback rehearsal SQL exist under PR #271; no Production apply is authorized | Pass exact-head remote DB rehearsal, then staged apply gate |
| Social Graph / Friends | send, cancel, receive, accept, decline, unfriend | `PARTIAL` | Fail-closed relationship state machine, RLS/RPC migration, browser adapter/UI states, and focused tests exist under PR #271 | Pass exact-head remote DB rehearsal and staged persistence proof |
| Follow / Unfollow | Directed follow independent of friendship where appropriate | `NOT_STARTED` | Not yet current authority | Define after friendship foundation |
| Images in Social Posts | trusted image attachment/finalization | `LEGACY_REUSE` | Media Fortress exists for Marketplace media, not Social posts | Build Social Media bridge; no second unsafe media authority |
| Video / Reels | Familiar media flow where explicitly approved | `FUTURE` | Current Social Core does not authorize video implementation | Product/safety/cost decision before implementation |
| Reactions | Like/reaction state and counts | `PARTIAL` | Seven-reaction domain, RLS/RPC migration, bounded runtime adapter, controller/UI, migration-hash lock, rollback rehearsal SQL, and focused tests exist under PR #271 | Pass exact-head remote DB rehearsal; add broader moderation/accessibility proof |
| Comments | comments, one-level replies, owner edit/delete, counts | `PARTIAL` | RPC-only RLS migration, bounded runtime adapter, controller/UI, migration-hash lock, rollback rehearsal SQL, and focused tests exist under PR #271 | Pass exact-head remote DB rehearsal; complete moderation/reporting and deeper parity decisions |
| Share / Repost | share/repost with original-post semantics | `NOT_STARTED` | No accepted current Social Core implementation | Define privacy propagation rules first |
| Save / Bookmark | private saved-post state | `NOT_STARTED` | Marketplace favorites are not Social saves | Owner-only saved-post store |
| Messages | conversations, send, read state, delivery | `SPEC_ONLY` | Historical requirements/UX material exists; no current trusted Social messaging backend accepted | Conversation/message contract then realtime seam |
| Notifications | social notification categories and read state | `SPEC_ONLY` | Historical P19/UX material exists; not current runtime proof | Event contract + notification store/delivery |
| Search / Discovery | people + posts + communities + Marketplace | `LEGACY_REUSE` | F04 search fabric exists for current product; Social query types not yet converged | Add Social query types before OpenSearch migration |
| Privacy audience | per-post public/friends/only_me and account controls | `PARTIAL` | PostIntent + TDD RLS design includes initial audience states | Add settings, block interactions, tests |
| Block | prevent interaction/read paths as policy requires | `NOT_STARTED` | No accepted Social Core contract yet | Must precede broad social launch |
| Mute / Unfollow feed control | reduce content without blocking relationship | `NOT_STARTED` | No accepted Social Core contract yet | Feed-preference domain |
| Report | report post/profile/message/community | `LEGACY_REUSE` | Moderation/safety infrastructure exists in other product domains | Generalize to Social object types |
| Activity Log | own actions/history/privacy changes | `NOT_STARTED` | Audit systems exist operationally, not user Social Activity Log | Build bounded user-visible history projection |
| Pages | public/business/creator identities | `FUTURE` | Not part of first implementation wave | Add after core profile/feed stability |
| Groups | communities, roles, membership, group feed | `FUTURE` | Not part of first implementation wave | Add after Social Graph + Feed maturity |
| Stories | temporary social publishing | `FUTURE` | Not authorized as first-wave requirement | Product decision after feed/media completion |
| Events | event creation/attendance/discovery | `FUTURE` | No current requirement | Evaluate after core parity |
| Marketplace | familiar classifieds/commerce discovery module | `CURRENT` / `LEGACY_REUSE` | Strong existing FUSION/Marketplace/search/media work | Reposition inside Social shell; preserve Pulse authority |
| Marketplace Listing Composer | commercial listing creation | `CURRENT` / `LEGACY_REUSE` | Existing FUSION composer/publication path | Keep distinct from normal Post Composer |
| Paid Visibility | optional promoted Marketplace visibility | `CURRENT AUTHORITY` | Pulse Ring 3/10/20 JOD authority | Do not mix with ordinary Social Post publishing |
| Moderation / Admin | protected review, blocking, policy enforcement | `LEGACY_REUSE` | Existing authority/RLS/SCG/SOA/security controls | Extend object scopes to Social entities |
| Security / Identity | fail-closed Clerk actor, RLS, OIDC release trust | `CURRENT` | Existing hardened platform authority | Reuse unchanged unless explicit ADR approves migration |
| Observability | social request/feed/post/message telemetry | `PARTIAL` | platform telemetry/security foundations exist | Adopt OpenTelemetry contract during managed migration |
| Managed AWS Runtime | ECS/Fargate/Aurora/Valkey/edge/event target | `FUTURE MIGRATION` | Golden Architecture approved; current runtime remains authoritative | Independent ADRs, cost/security/rollback gates |

## Priority order

### P0 — finish before claiming a usable Social Core

1. trusted Social posts persistence;
2. Social Graph persistence + UI;
3. Home feed read model;
4. post publishing + audience controls;
5. reactions;
6. comments/replies;
7. share/save;
8. profile social timeline;
9. block/report/privacy controls;
10. messages + notifications.

### P1 — parity expansion

- follow/unfollow;
- people/content discovery;
- user activity log;
- richer profile controls;
- social image bridge;
- Marketplace/social bridges.

### P2 — later breadth

- Pages;
- Groups;
- Stories;
- Events;
- video/reels only after separate approval;
- high-scale dedicated feed/realtime services only when evidence justifies extraction.

## Anti-chaos rule

No new user-facing feature becomes a priority merely because it is technologically interesting.

Every proposal must first map to one row above or receive an explicit OWNER decision creating a new row. Infrastructure work must identify which product requirement or measured operational risk it serves.

## Completion rule

“99.9% Facebook-like” may not be claimed from visual similarity or a feature checklist alone. A domain reaches parity only after its applicable procedures, state transitions, privacy/safety behavior, empty/loading/error/offline behavior, accessibility, mobile behavior, and trusted backend enforcement are verified.
