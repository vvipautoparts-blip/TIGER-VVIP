# VVIP TIGER Visual & UX Freeze Design

**Status:** OWNER APPROVED — 2026-08-11

## Purpose

This specification freezes the owner-approved visual identity and user-experience direction so implementation does not depend on chat memory. It applies to the entire VVIP TIGER public/product surface and explicitly includes the authentication screen.

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
2. home feed with a post/create entry surface at the top;
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

## Product-wide surfaces covered

The same visual/interaction system applies to:

- authentication / step-up login;
- home/feed;
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

## Create-listing contract

- content is completed first;
- ordinary listing creation is not blocked by blanket manual review;
- blanket copy stating that every listing is held for manual approval is forbidden;
- pricing/visibility/subscription/payment appears only after content is complete;
- security/RLS/media validation/country/payment/audit/abuse controls remain mandatory;
- maximum listing images remains 7 unless separately approved;
- video remains disabled unless separately approved;
- a floating create action may be used where it improves mobile usability.

## Card interaction contract

Cards should support a clear primary action and lightweight secondary actions such as save/favorite, share and appropriate contact/interest actions. Microinteractions must reinforce state without distracting animation.

## Zero-loss traceability rules

No requirement in this specification may be silently removed during implementation.

Every implementation PR must provide evidence for:

- authentication visual contract;
- guest-first behavior preserved;
- home/feed hierarchy;
- mobile bottom navigation;
- profile hierarchy;
- create-listing sequence;
- card actions;
- responsive RTL/LTR behavior;
- approved color/glass token usage;
- accessibility/focus/reduced-motion states;
- absence of forbidden blanket-review wording;
- same-head CI verification.

If a requested surface does not yet exist in the repository, it must be recorded as `NOT_YET_IMPLEMENTED` rather than falsely marked complete.

## Safety boundaries

This design does not authorize direct Production mutation, DNS changes, Clerk provider configuration changes, Supabase Production data mutation, secret changes, country activation or owner seeding. Implementation must proceed through isolated branch/PR, tests and protected release gates.

## Acceptance rule

A surface is not complete merely because it resembles the reference. It is complete only when visual identity, interaction path, accessibility, responsive behavior, security boundary and return/navigation behavior all pass their relevant tests on the same source SHA.
