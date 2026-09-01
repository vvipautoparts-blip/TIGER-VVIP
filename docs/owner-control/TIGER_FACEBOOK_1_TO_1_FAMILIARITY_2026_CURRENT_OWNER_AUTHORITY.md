# TIGER Social Familiarity + TIGER Identity — Current Subordinate Design Authority

**Status:** `CURRENT_ONLY / OWNER_APPROVED / NEXUS_SUBORDINATE_DESIGN_AUTHORITY / NO_PARALLEL_PRODUCT`

**Reconciled:** 2026-08-31

## 0. Mandatory authority relationship

This document is a **UI/UX familiarity authority only**. Before using it, read:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

The current product authority is:

`docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md`

If any wording in this document could be read to conflict with the owner binding or NEXUS, the newer owner binding/NEXUS rule controls and this document must be corrected. This file cannot create a second product, second composer, second Marketplace object, second publication lifecycle, or alternate execution lane.

## 1. Binding design direction

VVIP TIGER should use highly familiar modern social-network interaction patterns so users understand the product quickly, while remaining unmistakably TIGER in branding, copy, information architecture, security, data authority, and product concepts.

Familiarity means:

- familiar social structure and interaction grammar;
- predictable control placement and hierarchy;
- stable component anatomy and responsive behavior;
- original TIGER branding, language, components, and code;
- no copying of Meta/Facebook logos, trademarks, proprietary assets, private APIs, source code, or pixel-identical protected visual identity.

The design reference never overrides the NEXUS product invariant:

`ONE FEED • ONE OBJECT • ONE PULSE`

## 2. NEXUS publication boundary

Every newly publishable public object remains a **Living Sector Object** bound to an activated TIGER sector and one current approved intent:

- `OFFER`;
- `NEED`;
- `SERVICE`;
- `OPPORTUNITY`.

There is no generic public-post creation bypass and no distinct Marketplace listing-creation product.

The canonical creation entry is exactly:

> **ماذا تعرض أو تحتاج؟**

The same Living Sector Object may appear in Home feed, profile, search, sector discovery, saved surfaces, messaging context, and optional Pulse delivery. Sector discovery/Marketplace placement is a view of the same object, **not a parallel product**.

Ordinary eligible publication remains free. Pulse is optional paid visibility after eligibility.

## 3. Fidelity model

`High familiarity` applies to:

1. **Information architecture** — Home, Search/Discovery, Friends/relationships where implemented, Messages, Notifications, Profile, sector discovery, composer, and implemented media/social modules appear where users can predictably find them.
2. **Spatial hierarchy** — app bar, navigation, rails, feed column, cards, action rows, comments, menus, dialogs, and sheets follow coherent social-product composition.
3. **Interaction grammar** — tap/click, focus, hover, active state, composer opening, reactions, comments, menus, notifications, profile entry, and responsive transitions behave consistently.
4. **Component anatomy** — feed object header/body/media/reaction summary/action row/comments, profile header/timeline, relationship cards, notification rows, message shell, and search grouping have stable internal structure.
5. **Responsive behavior** — mobile is intentionally designed rather than a compressed desktop layout.
6. **State fidelity** — loading, empty, error, offline, retry, disabled, blocked, deleted/deactivated, no-results, and unavailable-feature states are explicit.

Familiarity does not authorize copying another company's brand assets, proprietary implementation, or transient A/B experiments.

## 4. No fake controls or placeholder-as-feature

A visible control must be:

- functional; or
- intentionally disabled with a clear reason; or
- hidden until the underlying feature is genuinely available.

A placeholder panel is not evidence that a feature is implemented. Current status must classify incomplete behavior truthfully.

No decorative search control, inert primary tab, fake message/notification destination, permanently disabled normal-looking action, or unrelated legacy profile substitution may be accepted as complete.

## 5. One navigation and one profile model

The current social shell has one authoritative navigation model. Duplicate Marketplace-first navigation, duplicate bottom navigation, or compatibility navigation cannot coexist as a second final authority.

Profile remains a first-class social destination. Account/security/settings may be reachable from Profile/TIGER Command but cannot replace the social profile presentation.

## 6. Desktop topology

The familiar desktop target is:

`Top App Bar`

then, where screen width and implemented modules permit:

`Left Rail | Center Feed | Right Rail`

The top bar may contain TIGER home/brand entry, Search/Discovery, current primary destinations, Messages, Notifications, and account/TIGER Command actions when actually implemented.

The center feed remains the primary reading and creation column. Contextual rails may contain only implemented, policy-safe modules and must collapse/relocate on narrower screens rather than compress the feed unreasonably.

## 7. Mobile topology

Mobile should use a deliberate social shell with:

- compact top bar;
- reachable primary destinations;
- touch-safe navigation;
- composer near the top of Home;
- feed-first content geometry;
- responsive dialogs/sheets with safe areas;
- accessible touch targets;
- no duplicated/conflicting navigation system.

Desktop-only rail content must not be forced into narrow columns.

## 8. Living Sector Object feed anatomy

A rendered Living Sector Object should use a stable social anatomy where applicable:

1. safe author presentation/avatar;
2. display name;
3. timestamp;
4. audience/privacy indicator where relevant;
5. overflow actions only when implemented and authorized;
6. body/text;
7. media when present;
8. reaction summary;
9. action row;
10. comments/replies;
11. progressive continuation where supported.

Internal identity-provider subject identifiers must never be exposed as user-facing identity.

## 9. Canonical composer

The only current product creation entry is:

> **ماذا تعرض أو تحتاج؟**

The composer is progressive and TIGER-owned. It may begin from media, voice where available, or text, then request only missing sector/policy-required information.

It must preserve:

- clear current identity context;
- sector and intent contract;
- trusted media attachment where implemented;
- visible validation and missing-information guidance;
- submit/cancel/close behavior;
- pending/success/error states;
- duplicate-submit protection;
- keyboard/focus accessibility.

Sector discovery does not create a second commercial composer. Commercial/offer semantics are represented by the same Living Sector Object and its sector/intent/structured data.

## 10. Stories / short media

Stories or similar short-media surfaces may appear only when their real behavior exists. If enabled they require real state, accessible interaction, non-fake identities, and trusted media handling. If the backend/workflow is incomplete, the feature must be hidden or explicitly unavailable rather than simulated as complete.

## 11. Reactions, comments, share/repost

Reactions must use real persisted/server-reconciled state and accessible selected-state behavior.

Comments/replies must use safe author projections, authorized edit/delete controls, consistent composition, loading/error/retry handling, and deleted/deactivated-author safety.

A visible share/repost control must have defined semantics and functioning implementation. If not available, hide it or mark it explicitly unavailable.

## 12. Profile and relationships

Profile should support the current authorized safe presentation of cover/header, avatar, display name, public fields, relationship/social counts where authorized, primary actions, sections/tabs, timeline, media/about/friends sections only when implemented, and clear separation of social presentation from security/settings.

Relationship surfaces expose only implemented server-authoritative transitions such as requests, accept/decline, friendship state, and follow/unfollow where the product differentiates them. The client must not invent relationship state.

## 13. Messages and Notifications

A placeholder is not a verified Messages or Notifications feature.

When Messages is implemented, its familiar shell may contain conversation list, selected conversation, participant identity, history, composer, supported delivery/read state, unavailable/deleted participant handling, and responsive single/two-pane transitions.

When Notifications is implemented, it requires real rows, read/unread state, safe actor presentation, timestamp, target navigation, privacy-safe preview, and loading/empty/error states.

## 14. Search and sector discovery

Search must be real interaction, not decorative UI. It should support accessible input, bounded query handling, useful results based on implemented capabilities, safe people projection, content visibility/privacy enforcement, no-result/loading/error states, and keyboard/touch accessibility.

Sector discovery/Marketplace placement remains a **module inside NEXUS**. It displays/filter/searches the same Living Sector Objects rather than creating or storing a second Marketplace product object.

The UI may visually distinguish intent, sector attributes, or optional Pulse/promoted state, but TIGER remains outside buyer/seller or service-provider/beneficiary transactions. No marketplace checkout, escrow, custody, transaction settlement, transaction commission, or guarantee is introduced by this design authority.

## 15. TIGER branding boundary

TIGER identity remains visible through the approved current brand/name layer, logo/mark when finalized, TIGER copy/terminology, current design tokens, Pulse presentation, and premium visual refinements that do not break usability.

The temporary operating codename remains governed separately until a final global name is explicitly approved. Familiarity must never imply Meta/Facebook affiliation or imitation of protected identity.

## 16. Accessibility and interaction quality

Verified surfaces should include as applicable:

- semantic interactive elements;
- keyboard navigation;
- visible focus;
- meaningful accessible names;
- correct current/pressed/expanded states;
- screen-reader-safe status messaging;
- touch-safe targets;
- no essential hover-only action;
- logical dialog/sheet focus trapping and restoration.

## 17. Acceptance and evidence rule

A UI slice may be called verified only when applicable evidence exists on the **same exact SHA**. Evidence may include structural/behavioral tests, responsive and accessibility contracts, visual comparison where available, current runtime/data tests, and all required protected gates.

A screenshot alone does not prove behavior. A unit test alone does not prove full visual/interaction readiness. A workflow that never executes is not GREEN evidence.

## 18. Current execution boundary

This document does not set an independent implementation sequence.

Current work follows:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

and the protected PR #349 convergence plan/status.

No new UI/product slice begins before current convergence is reconciled and all required protected checks on the exact current head are **runner-executed GREEN**. This document does not authorize Ready for Review, merge, Production/Staging mutation, provider/database mutation, or gate weakening.

## 19. Latest-only disposal rule

Any older UI/UX instruction that conflicts with the current owner binding or NEXUS is removed from current runtime, tests, current documentation, configuration, generated artifacts, and release gates. It is not moved into an in-tree archive, trash, fallback, or compatibility authority. Git history is provenance.

Compatible social familiarity, accessibility, profile, relationship, search, messaging, notification, and interaction-quality guidance remains in force only within the NEXUS boundaries above.

## 20. Final owner-aligned statement

> **VVIP TIGER uses highly familiar social interaction semantics while remaining TIGER-owned in identity, code, security, data authority, and product concepts. The current product is NEXUS: one feed, one Living Sector Object, one canonical `ماذا تعرض أو تحتاج؟` composer, and optional Pulse on the same object. Sector discovery is not a parallel Marketplace product. No fake controls, duplicate navigation, placeholder-as-feature, parallel creation path, or stale execution authority may be accepted as current.**
