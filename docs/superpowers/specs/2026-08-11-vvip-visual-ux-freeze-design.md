# VVIP TIGER Visual & UX Freeze Design

**Status:** OWNER APPROVED — 2026-08-11

## Purpose

This specification freezes the owner-approved visual identity and user-experience direction so implementation does not depend on chat memory. It applies to the entire VVIP TIGER public/product surface and explicitly includes the authentication screen, social post composer, marketplace listing creation, post-publish financing/boosting, and account-linked payment flow.

## Binding visual identity

The approved visual reference is the owner-provided blue/glass design. The platform must consistently use:

- luminous sky-blue to royal-blue gradients;
- premium light-blue atmospheric backgrounds with depth and soft glow;
- translucent glassmorphism surfaces where appropriate;
- soft luminous white borders;
- royal-blue gradient primary actions;
- large soft rounded corners;
- restrained shadows and glow, never cluttered or neon-heavy;
- clean whitespace and low visual density;
- responsive behavior for mobile and desktop;
- Arabic RTL and English LTR without losing the visual system;
- VVIP TIGER branding only; no `WIP` branding remains in production-facing UI;
- copyright/year text must reflect 2026 where surfaced.

## Binding UX reference

Facebook is a UX/flow/hierarchy reference only, not a visual-brand copy. VVIP TIGER remains an independent product and brand.

The experience must preserve familiar interaction logic:

1. fixed, understandable top navigation;
2. home feed with a compact post/create entry surface at the top;
3. horizontal story/discovery strip where the product surface requires it;
4. vertically flowing feed cards;
5. direct and obvious card actions;
6. natural transitions among Home, Profile, Search, Notifications, Messages, Settings and Details;
7. profile hierarchy: large cover, overlapping avatar, name/info, management/edit controls, tabs, then posts/details;
8. mobile bottom navigation that remains stable and predictable;
9. progressive menus/settings/dashboard instead of disconnected pages;
10. predictable click behavior and return paths so the user does not get lost.

The implementation principle is:

`Facebook familiarity + VVIP TIGER luxury + 2026 engineering`

## Authentication screen — mandatory scope

The login/step-up authentication surface is part of this freeze and must not be forgotten.

The screen must:

- use the same approved VVIP blue/glass identity;
- retain Clerk as the identity authority;
- retain the already-deployed guest-first/public-first behavior from PR #190;
- never restore a global login wall for ordinary public marketplace browsing;
- appear as a premium step-up surface only when authentication is actually required;
- preserve the existing safe intent-resume behavior after successful login;
- never introduce first-party VVIP password fields or a parallel password authority;
- remain responsive and keyboard accessible;
- present VVIP TIGER branding and clear secure-access messaging;
- fail non-destructively: an authentication UI/runtime failure must not hide the public marketplace.

## Social post composer — mandatory Facebook-style behavior

The ordinary social post flow must be intentionally simple and familiar.

### Entry surface

The home feed exposes a compact composer entry analogous to the familiar social-network pattern: avatar/context on one side and a concise prompt such as `بم تفكر؟` / equivalent localized wording. The entry must not look like a business form or listing wizard.

### Creation flow

A signed-in user can:

- write text directly;
- add supported media through compact icon actions;
- choose supported audience/visibility controls where implemented;
- optionally add lightweight metadata such as location or tags where the product supports them;
- publish through one clear primary action.

The social composer must not require a commercial/business form before ordinary posting.

### Forbidden ordinary-post prerequisites

For an ordinary social post, the platform must not require any of the following as a default prerequisite:

- commercial registration / business registration / trade registry document;
- company certificate;
- business verification document;
- supervisor approval;
- administrator preview;
- manager review;
- manual moderation approval before initial publication;
- payment before ordinary publication;
- marketplace listing fields such as sector, price, commercial phone or business identity unless the user explicitly chooses a commercial/listing flow.

The social post path must remain distinct from business verification and marketplace listing flows.

### Direct publication semantics

Ordinary eligible posts publish immediately after the user submits them. There is no default `PENDING_REVIEW` state caused merely by creating a normal post.

This does not disable platform safety. Automated fail-closed controls may still reject or quarantine content when required by security, abuse prevention, law, malware/media validation, account integrity or explicit policy enforcement. These controls must operate as narrowly scoped safety exceptions, not as blanket human review for every post.

## Post-publish financing / boost flow

After a social post is successfully created and visible, the interface may surface a compact premium financing card/sheet such as `موّل منشورك` / `عزّز الوصول`.

The financing offer is **optional** and must never block ordinary publication.

The post-publish flow is:

1. post succeeds and becomes visible;
2. the UI confirms publication;
3. an optional compact boost/financing card is offered;
4. approved visibility packages are loaded from the authoritative country/market policy;
5. the user chooses a package only if interested;
6. payment mechanism is shown after package selection;
7. payment is considered successful only after trusted server/provider verification;
8. the promotion/boost is linked to the exact post, exact Clerk identity and exact internal platform account.

No fake success state, browser-only payment confirmation, globally hard-coded price or invented impression quantity is allowed.

## Clerk + internal account linkage for financing

Every financing/boost/payment operation must bind trusted identity and trusted account context.

- Clerk `user.id` remains the authoritative authentication identity.
- The platform's internal account identifier/number is resolved from the trusted account/context layer, not accepted blindly from a browser input.
- The server/payment boundary verifies that the Clerk identity is authorized to act for that internal account.
- The boost request records the target post/listing identifier, Clerk identity reference, internal account reference, country/market context, selected plan, payment/provider reference and audit correlation/idempotency reference as appropriate to the existing architecture.
- A mismatch between Clerk identity and internal account fails closed.
- The UI must not expose or allow arbitrary editing of trusted account identifiers to redirect a payment or promotion to another account.

If the repository's canonical internal account field is not literally named `account_number`, implementation must use the canonical existing account identifier instead of inventing a parallel account system.

## Marketplace / commercial listing creation contract

The marketplace flow is separate from the ordinary social post flow.

- content is completed first;
- ordinary listing creation is not blocked by blanket manual review;
- blanket copy stating that every listing is held for manual approval is forbidden;
- pricing/visibility/subscription/payment appears only after listing content is complete;
- commercial registration is not a blanket prerequisite for every user merely to start or complete an ordinary listing unless a specific legal/high-risk product policy explicitly requires it;
- business verification, where legally or risk-required, must be conditional and scoped rather than universally blocking all users;
- security/RLS/media validation/country/payment/audit/abuse controls remain mandatory;
- maximum listing images remains 7 unless separately approved;
- video remains disabled unless separately approved;
- a floating create action may be used where it improves mobile usability.

## Button and icon design contract

Controls must be engineered as a coherent icon system, not oversized generic blocks.

- use compact, familiar iconography for photo/media, reactions, comment, share, save, audience, notifications, messages and similar lightweight actions;
- pair an icon with a short label where meaning is not universally obvious;
- use icon-only controls only when an accessible `aria-label`/tooltip or equivalent clearly explains the action;
- avoid large full-width buttons for secondary actions;
- reserve larger primary buttons for genuinely primary completion actions such as `نشر`, `متابعة`, or payment confirmation;
- mobile tap targets remain accessible even when the visible icon is visually small;
- spacing, alignment, icon weight and states must be consistent across the platform;
- hover, pressed, selected, disabled and focus-visible states must be designed deliberately;
- visual density should resemble a refined modern social interface rather than a dashboard of oversized controls.

## Product-wide surfaces covered

The same visual/interaction system applies to:

- authentication / step-up login;
- home/feed;
- social post composer and post cards;
- post-publish financing/boosting;
- marketplace cards;
- create-listing flow;
- listing detail;
- search/discovery;
- business/services directory;
- public/private profile;
- messages;
- notifications;
- account/settings;
- dashboards/operations surfaces where user-facing;
- subscriptions/visibility selection;
- payments;
- dialogs, sheets, toasts and empty/error/loading states.

## Card interaction contract

Cards should support a clear primary action and lightweight secondary actions such as reaction/interest, comment where available, save/favorite, share and appropriate contact actions. Microinteractions must reinforce state without distracting animation.

## Zero-loss traceability rules

No requirement in this specification may be silently removed during implementation.

Every implementation PR must provide evidence for:

- authentication visual contract;
- guest-first behavior preserved;
- home/feed hierarchy;
- social composer availability and direct-publication behavior;
- absence of commercial-registration prerequisite from ordinary social posting;
- absence of blanket human-review gate from ordinary social posting;
- optional post-publish financing surface;
- trusted Clerk + internal-account linkage for financing;
- mobile bottom navigation;
- profile hierarchy;
- marketplace create-listing sequence;
- compact icon/button system;
- card actions;
- responsive RTL/LTR behavior;
- approved color/glass token usage;
- accessibility/focus/reduced-motion states;
- absence of forbidden blanket-review wording;
- same-head CI verification.

If a requested surface does not yet exist in the repository, it must be recorded as `NOT_YET_IMPLEMENTED` rather than falsely marked complete.

## Safety boundaries

This design does not authorize direct Production mutation, DNS changes, Clerk provider configuration changes, Supabase Production data mutation, secret changes, country activation, owner seeding, real-money payment execution or production payout execution. Implementation must proceed through isolated branch/PR, tests and protected release gates.

## Acceptance rule

A surface is not complete merely because it resembles the reference. It is complete only when visual identity, interaction path, accessibility, responsive behavior, security boundary, payment/identity boundary where relevant, and return/navigation behavior all pass their relevant tests on the same source SHA.
