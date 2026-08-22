# TIGER Social UX / Dead Control Audit

Date: 2026-08-22
Branch: `feat/gemini-final-convergence-lane-20260822`
Scope: Social Core only. ONE FIELD-owned discovery files and PR #313 remain read-only.

## Classification rules

- `REAL_WORKING`: the visible control reaches a tested runtime path and renders an authoritative or bounded result.
- `SHELL_ONLY`: navigation or shell exists, but the destination is intentionally not implemented.
- `PLACEHOLDER`: the surface is visible as a non-interactive placeholder and does not claim completion.
- `FUTURE_HIDDEN`: the capability is not presented as an enabled control in V1.
- `DEAD`: an enabled visible control has no usable handler or bounded outcome. Target: zero.

## Exact inventory

| Surface | Control / selector | Classification | Evidence / boundary |
| --- | --- | --- | --- |
| Home | `[data-social-nav="home"]` | REAL_WORKING | `core-shell.js` selects Home; feed controller mounts loading, empty, error, keyset pagination, reactions, and comments. |
| Home | `[data-social-post-trigger]` | REAL_WORKING | Opens `[data-social-post-sheet]`; post composer validates, authenticates, persists through the Social RPC adapter, and refreshes presentation. |
| Feed | `[data-social-feed-items]` / `[data-social-feed-load-more]` | REAL_WORKING | Feed controller has bounded read failure, retry/backoff for retryable reads, deduped pages, stale cursor mapping, and keyboard focus after terminal append. |
| Feed | `[data-social-reactions-host]` | REAL_WORKING | Reactions controller waits for server confirmation and maps failure to an opaque state. |
| Feed | `[data-social-comments-host]` | REAL_WORKING | Comments controller supports list, create, reply, update, remove, single-flight mutation, cooldown, and opaque failure. |
| Feed | `.social-feed-post__menu` | FUTURE_HIDDEN | No post-menu operation is implemented. The control is now disabled, `aria-disabled="true"`, and marked `data-social-feature-state="future-hidden"`; it cannot be a dead enabled control. |
| Feed | `[data-social-share-trigger]` | FUTURE_HIDDEN | Social post sharing is not implemented. The button remains explicitly disabled and marked `future-hidden`; no fake success path exists. |
| Profile | `[data-social-nav="profile"][data-fusion-account-trigger]` | REAL_WORKING | The Fusion account surface opens the account/settings panel, renders session identity, and exposes the authenticated sign-out path. |
| Friends | `[data-social-nav="friends"]` and `[data-social-friend-action]` | REAL_WORKING | Friends controller loads current relationships and wires accept, decline/cancel, and unfriend actions through bounded auth and runtime adapters. |
| Search | `[data-social-nav="search]`, `[data-social-search-input]`, `[data-social-search-retry]` | REAL_WORKING | Search controller provides bounded result states, privacy-safe rendering, normalized-query in-flight dedupe, retry, offline fail-closed behavior, reconnect focus, Enter submission, and reduced-motion styling. |
| Messages | `[data-social-nav="messages"]` | SHELL_ONLY | Navigation resolves to an explicit placeholder stating that durable messaging is a separate slice; no enabled fake composer or fake send action is exposed here. |
| Notifications | `[data-social-nav="notifications"]` | SHELL_ONLY | Navigation resolves to an explicit placeholder stating that event delivery is a separate slice; no enabled fake notification action is exposed. |
| Composer | `[data-social-post-submit]` | REAL_WORKING | Draft validation, audience validation, auth gate, server-confirmed post creation, bounded failure, and presentation refresh are implemented. |
| Share / Repost | Social post share/repost control | FUTURE_HIDDEN | No Social V1 share/repost mutation is presented as complete. Marketplace share is a separate existing module and is outside this Social-only control. |
| Bookmark | Social bookmark control | FUTURE_HIDDEN | No Social V1 bookmark control is rendered in the Social feed. Marketplace save is a separate module. |
| Follow | Follow control | FUTURE_HIDDEN | No Social V1 follow control is rendered. Existing friendship actions are not relabeled as follow. |
| Marketplace entry | `[data-social-nav="marketplace"]` | REAL_WORKING | Shell routes to the existing Marketplace module; listing search, details, save, contact, share, and composer paths remain Fusion-owned and are not changed by this audit. |
| Stories | `[data-social-story-strip]` story cards | PLACEHOLDER | Static, non-interactive cards only. They have no click handler and are not classified as an enabled story action. End-to-end stories remain a G4 decision. |
| Video / Reels | `.social-nav-item--inactive` video item | FUTURE_HIDDEN | The item is a non-interactive `aria-hidden` shell element, not a button or link. No fake video/reels navigation is exposed. |

## G3 result

- `DEAD_OR_FAKE_SOCIAL_CONTROLS=0` for enabled Social controls on this branch.
- The only previously dead enabled Social control was the post-menu button. It is now explicitly unavailable.
- Unimplemented share is explicitly unavailable rather than silently clickable.
- Messages, Notifications, Stories, and Video/Reels remain honest shell/placeholder/future states.
- No ONE FIELD-owned path, PR #313 branch, main, Production, Staging, provider credential, payment, or real-user data was changed.

## Verification

The exact-head G3 test is `tests/tiger-social-ux-control-inventory.test.cjs`. It renders the real feed controller and asserts that unimplemented post actions are disabled and explicitly marked `future-hidden`.

Required evidence for the implementation head is recorded in PR #316. This audit does not claim Gate 6, Production readiness, final integration, or platform-wide 100% readiness.
