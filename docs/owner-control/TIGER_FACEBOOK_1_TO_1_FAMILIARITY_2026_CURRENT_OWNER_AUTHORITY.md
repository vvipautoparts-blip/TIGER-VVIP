# TIGER Facebook 1:1 Familiarity + TIGER Identity — Current Owner Authority

**Status:** `CURRENT_ONLY / OWNER_APPROVED / DESIGN AUTHORITY`

**Effective date:** 2026-08-21

**Applies to:** VVIP TIGER Social UI/UX, information architecture, navigation, component topology, interaction grammar, responsive behavior, profile presentation, feed presentation, composer, stories, comments, reactions, friends, messages shell, notifications shell, marketplace placement, accessibility presentation, loading/empty/error states, and all future implementation derived from those surfaces.

## 1. Binding owner decision

The OWNER has approved the following current UI direction:

> **Facebook 1:1 Familiarity + TIGER Identity**

The required interpretation is:

- match Facebook-like social structure and interaction behavior with very high familiarity;
- preserve VVIP TIGER branding, product name, logo, colors, typography choices, data model, identity authority, security boundaries, and platform-specific commercial modules;
- do not copy Meta/Facebook logos, trademarks, proprietary imagery, private assets, or source code;
- do not claim pixel-identical replication across Meta experiments, accounts, locales, or devices;
- do require a canonical TIGER reference that produces the same familiar mental model, control placement, hierarchy, rhythm, and interaction sequence expected from a modern Facebook-style social network.

Any older VVIP TIGER UI/UX authority that conflicts with this rule is immediately classified:

`RETIRED_FROM_CURRENT_PLATFORM / HISTORICAL_ONLY`

It may remain only as audit/provenance evidence and must not control current runtime behavior, active tests, public previews, generated current documentation, or launch criteria.

## 2. Fidelity model

`1:1 Familiarity` means parity in these dimensions:

1. **Information architecture** — the user finds Home, Friends, Messages, Notifications, Profile, Marketplace, search, composer, stories, and feed where a Facebook-familiar user expects them.
2. **Spatial hierarchy** — header, primary navigation, rails, feed column, cards, action rows, comment areas, menus, and modal/sheet layers follow a familiar social-network composition.
3. **Interaction grammar** — click/tap targets, hover/focus states, active tab state, composer opening, reaction selection, comment focus, menus, notifications, profile entry, and responsive transitions behave consistently.
4. **Component anatomy** — post header/body/media/reaction summary/action row/comments, profile header/timeline, friend/request cards, notification rows, message conversation shell, search/result grouping, and marketplace placement have stable internal structure.
5. **Responsive behavior** — desktop and mobile are not the same layout squeezed smaller; each follows an intentional familiar social-network layout.
6. **State fidelity** — loading, empty, error, offline, retry, disabled, deactivated, deleted-user, blocked-user, no-results, and unavailable-feature states are first-class and never represented by dead controls.

The following are explicitly **not** required:

- copying Meta brand assets;
- reproducing proprietary source code;
- tracking every temporary Facebook A/B experiment;
- identical pixels where TIGER branding or accessibility requires a safer/different treatment.

## 3. Non-negotiable UI rules

### 3.1 No fake controls

A visible control must be one of:

- fully functional;
- intentionally disabled with a visible, understandable reason;
- hidden until the feature is actually available.

The current anti-pattern of visible Unicode/icon-like placeholders or permanently disabled controls presented as normal UI is prohibited.

Examples that must not remain as final UI:

- decorative search icon that does not search;
- video tab that is visible but inert;
- share button that is permanently disabled without explanation;
- message/notification destinations that are only placeholder paragraphs;
- profile destination that silently opens an unrelated legacy account sheet.

### 3.2 No placeholder-as-feature

A placeholder panel is not evidence that a feature exists. Current-state documentation and tests must classify a placeholder as `NOT_IMPLEMENTED`, `SPEC_ONLY`, or equivalent until the real workflow is functional and verified.

### 3.3 One current navigation model

Current Social navigation must have one authoritative model. Legacy marketplace-first or duplicate bottom navigation must not coexist as a second final navigation authority.

### 3.4 One current profile presentation model

Social Profile is a real social destination with profile header, identity presentation, social counts/relationships as authorized, tabs/sections, and timeline. Account/security/settings may open from the profile/menu but must not substitute for the social profile itself.

## 4. Canonical desktop topology

Desktop target topology:

`Top App Bar`

Below it:

`Left Rail | Center Feed | Right Rail`

### Top App Bar

Must contain, in a coherent desktop arrangement:

- TIGER brand/home entry;
- search;
- primary destination navigation;
- quick actions appropriate to current authority;
- messages;
- notifications;
- account/profile/menu entry.

### Left Rail

May contain authenticated user shortcut and current destination shortcuts such as:

- profile;
- friends;
- groups/modules only when implemented;
- marketplace;
- saved/bookmarks when implemented;
- other approved TIGER modules.

No dead shortcut may appear.

### Center Feed

Primary reading/publishing column. Required order when applicable:

1. composer;
2. stories/short-lived social strip if enabled;
3. feed state or posts;
4. progressive pagination/infinite-scroll continuation.

### Right Rail

Contextual social rail, only for implemented features, such as:

- sponsored/Pulse placements owned by TIGER;
- contacts/online context if authorized;
- friend suggestions/requests;
- contextual modules.

It must collapse/relocate on narrower screens rather than compress the feed unreasonably.

## 5. Canonical mobile topology

Mobile must use a deliberate social-network shell:

- compact top bar;
- horizontal primary destination tabs or equivalent familiar navigation;
- edge-to-edge content surfaces where appropriate;
- composer near the top of Home;
- horizontally scrollable stories when enabled;
- feed cards with mobile-native spacing;
- navigation that remains reachable without duplicate/conflicting systems;
- sheets/modals sized for touch and safe areas;
- minimum accessible touch target sizing;
- no desktop-only rail content forced into narrow columns.

The bottom navigation must not be arbitrarily hidden unless the approved mobile navigation model intentionally replaces it with another fully functional mechanism.

## 6. Home feed anatomy

Every social post must render through a canonical presentation model rather than hard-coded placeholder identity.

Required anatomy:

1. author avatar/presentation;
2. author display name;
3. timestamp;
4. audience/privacy indicator where useful;
5. overflow menu when actions exist;
6. body/text;
7. media area when media exists;
8. reaction summary/counts;
9. primary action row;
10. comments/replies area;
11. progressive loading when more discussion exists.

The implementation must never expose Clerk subject identifiers to the UI.

Deactivated/deleted-author historical content must remain orphan-safe and privacy-safe according to P0-B lifecycle authority.

## 7. Composer reference

Home composer must feel immediately familiar:

- avatar/identity context;
- obvious “what are you thinking?” style trigger using TIGER copy;
- modal/sheet/dialog with clear audience/privacy selection;
- text entry;
- media attachment entry when trusted social media flow is implemented;
- publish action;
- cancel/close;
- pending/success/error states;
- duplicate-submit protection;
- keyboard/focus management.

Marketplace listing creation must remain a distinct commercial flow and must not masquerade as a social post composer.

## 8. Stories reference

Stories may appear only when the underlying behavior exists. If enabled:

- create-story card;
- member story cards;
- image/media-backed visual treatment rather than arbitrary placeholder gradients as final production representation;
- horizontal scrolling;
- clear seen/unseen/current state when implemented;
- touch and keyboard accessibility;
- no fake story identities.

If stories backend is not ready, the final verified UI must hide the stories feature rather than simulate it with hard-coded cards.

## 9. Reactions, comments, share/repost

### Reactions

- main reaction control;
- familiar reaction picker interaction;
- selected state;
- total/summary;
- optimistic UI only when reconciliation is safe;
- keyboard and touch support;
- real persisted state.

### Comments

- author presentation from safe projection;
- comment body;
- time/edit state;
- reply/edit/delete controls only when authorized;
- composer positioned consistently;
- loading/error/retry states;
- deleted/deactivated author handling;
- no hard-coded “member” identity as final verified behavior.

### Share/Repost

A visible share/repost control must have defined semantics and functioning implementation. If unavailable, hide it or mark it explicitly unavailable; do not present a normal permanently disabled button.

## 10. Profile reference

Profile must be a first-class social destination.

Required structure when data exists:

- cover/header area;
- profile avatar;
- display name;
- safe public presentation fields;
- friend/follow/social counts according to product authority;
- primary context actions;
- navigation/tabs/sections;
- user timeline;
- media/about/friends sections only when implemented;
- account/settings entry separated from public social presentation.

States:

- own active profile;
- another active public profile;
- deactivated profile;
- deleted member tombstone;
- blocked/unavailable profile;
- loading/error/no-content.

## 11. Friends / social graph reference

Friends surface must support only implemented transitions and expose them as familiar actions:

- requests received;
- requests sent/cancel where authorized;
- accept;
- decline;
- current friends;
- unfriend;
- follow/unfollow separately where the product differentiates those relationships.

The UI must reflect server truth after mutation and must not invent relationship state locally.

## 12. Messages reference

A placeholder is not sufficient for `VERIFIED` status.

When implemented, the shell must include:

- conversation list;
- selected conversation;
- participant identity;
- message history;
- composer;
- delivery/read state when supported;
- unavailable/deleted participant handling;
- loading/error/offline/retry states;
- responsive single-pane/two-pane transitions.

Until then, the current verified product must not pretend Messages is complete.

## 13. Notifications reference

A verified notifications destination must have:

- notification list;
- unread/read distinction;
- actor safe presentation;
- timestamp;
- target navigation;
- empty/loading/error states;
- privacy-safe preview text;
- no deleted-user identity leakage.

## 14. Search reference

Search must be a real interaction, not a decorative icon.

Expected behavior:

- accessible search entry;
- query input;
- bounded query handling;
- useful grouped results according to current features;
- people results from safe public projection only;
- social content results respecting visibility, block, lifecycle, and privacy rules;
- no-result/loading/error states;
- keyboard/touch accessibility.

## 15. Marketplace placement

Marketplace remains a module inside a social-first product.

It must be reachable from familiar navigation but visually and behaviorally distinguish:

- commercial listings;
- social posts;
- Pulse/sponsored visibility.

TIGER remains outside the buyer/seller transaction and does not introduce marketplace checkout, escrow, settlement, transaction commission, or custody contrary to current owner authority.

## 16. TIGER branding boundary

TIGER Identity remains visible through:

- VVIP TIGER name and logo/mark;
- TIGER design tokens and approved accent system;
- TIGER copy and terminology;
- TIGER Pulse placements;
- TIGER marketplace/module names;
- TIGER typography and premium visual refinements where they do not break familiarity.

Familiarity must not turn the product into a misleading Meta/Facebook clone.

## 17. Accessibility and interaction quality

Every verified surface must include:

- semantic buttons/links rather than decorative spans for interactive controls;
- keyboard navigation;
- visible focus state;
- meaningful accessible names;
- correct aria-current/pressed/expanded where relevant;
- screen-reader-safe status announcements;
- touch targets appropriate for mobile;
- no essential action dependent only on hover;
- logical focus trapping/restoration for dialogs/sheets.

## 18. Acceptance and evidence rule

A UI slice may be marked `TRUE GREEN` only when all applicable evidence exists on the same exact SHA:

- structural DOM/component contract tests;
- behavioral interaction tests;
- responsive layout contract tests;
- accessibility contract tests;
- visual/reference comparison evidence where the environment supports it;
- no visible dead/fake controls;
- no unexpected legacy UI authority active;
- current Quality/CleanGuard/Zero-Residue/Project Control gates green;
- relevant runtime/database tests green for the feature;
- exact SHA recorded.

A screenshot alone is not proof of behavior. A passing unit test alone is not proof of visual parity. Both implementation dimensions must be verified.

## 19. Migration order from current UI

The approved sequence is:

1. close P0-B profile/account lifecycle and orphan-safe social presentation first;
2. establish the Facebook→TIGER canonical component map and acceptance matrix;
3. rebuild/realign the global social shell;
4. realign Home feed/composer/stories/post cards;
5. realign Profile;
6. realign Friends;
7. implement or deliberately hide incomplete Search/Messages/Notifications/Share/Stories controls;
8. realign Marketplace placement;
9. responsive/mobile parity pass;
10. accessibility and visual verification pass;
11. exact-head CI and preview evidence;
12. only then classify the UI program closed.

No later step may be used to excuse an unresolved earlier step.

## 20. Final owner statement

> **VVIP TIGER shall use Facebook-like structural and behavioral familiarity at a very high level while remaining unmistakably TIGER in identity, branding, security, business rules, and data authority. Any old UI rule that conflicts with this current owner decision is retired from the current platform. No dead buttons, fake destinations, placeholder-as-feature, duplicate navigation authority, or visually convincing but non-functional surface may be accepted as complete.**
