# TIGER ONE 2026 — Living Surface & Interaction Physics

**Status:** OWNER-APPROVED DIRECTION — WRITTEN SPEC FOR OWNER REVIEW

**Date:** 2026-08-18

**Branch:** `feat/tiger-one-living-surface-spec-20260818`

**Parent:** `feat/fusion-single-surface-integration-20260815`

**Owner supersession authority:** `docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md`

## 0. Authority

This specification is the current product/UI/UX/IA authority for the common TIGER ONE surface. Any earlier product/UI/UX/IA/design instruction that conflicts with this document is `SUPERSEDED / HISTORICAL ONLY` under the owner supersession rule.

This document does not silently weaken Clerk, SOA/SCG, RLS, Media Fortress/F05, Search Fabric policy, ledger integrity, legal compliance, or the platform advertising/direct-contact boundary. Those remain protected unless explicitly replaced by a later owner-approved domain authority.

---

## 1. Product thesis

TIGER ONE must be instantly understandable through familiar social interaction patterns while feeling materially more advanced than a clone of Facebook, OpenSooq, or a conventional classifieds marketplace.

Target experience:

> **Familiar mind. Living surface. Commercial depth. Invisible intelligence. Sovereign trust.**

“Future” is not defined by neon, excessive glass, 3D decoration, oversized gradients, novelty gestures, or AI buttons everywhere. Every advanced element must measurably do at least one of the following:

1. reduce friction;
2. increase clarity;
3. preserve spatial continuity;
4. strengthen trust;
5. reduce repeated input;
6. improve accessibility;
7. save time, network, battery, memory, or CPU.

If it does none of these, it is rejected.

---

## 2. Governing interaction rule

> **The user does not feel they are navigating between unrelated pages; TIGER transforms around the current object and intent.**

Real routes, deep links, browser history, and native navigation remain mandatory for correctness. “Living Surface” describes perceptual continuity, not a single-document security shortcut.

Canonical presentation modes:

- `HOME`
- `SEARCH`
- `COMPOSER`
- `DETAIL`
- `PROFILE`
- `CAMPAIGN`
- `CAPABILITY`

Mode is presentation only. Authorization remains server-authoritative.

---

## 3. Behavioral synthesis of owner references

### Facebook contribution

Use only mature muscle memory:

- immediate feed comprehension;
- avatar/name/object header grammar;
- lightweight composer entry;
- bottom sheets/context menus;
- natural back behavior;
- compact action rows;
- profile continuity.

Do not copy Facebook branding, assets, proprietary iconography, colors, reaction model, ranking model, or visual chrome.

### OpenSooq contribution

Use only marketplace depth:

- structured taxonomy;
- useful filters;
- commercial facts;
- location-aware discovery;
- map/list behavior where useful;
- seller/business information;
- direct-contact orientation.

Do not copy its visual identity or page architecture literally.

### TIGER contribution

TIGER owns the differentiating system:

- Living Surface;
- TIGER Morph transitions;
- TIGER Intent Lens extension contract;
- Publish Passport;
- Context Rail;
- TIGER Pulse;
- Trust Halo;
- Adaptive Density;
- sovereign capability exposure inside one product surface;
- semantic design system.

---

## 4. Scope

This spec defines:

- global shell;
- authenticated Home architecture;
- navigation;
- semantic tokens;
- typography;
- geometry/spacing/density;
- button/action grammar;
- iconography;
- motion physics;
- TIGER Pulse home shell;
- composer entry;
- Publish Passport shell;
- Context Rail;
- feed/card shell;
- loading/error/offline behavior;
- RTL/LTR;
- accessibility;
- responsive behavior;
- presentation security boundaries;
- future extension contracts.

Detailed Campaign Studio, Recharge/Publishing Access, Search UX, Profile, Intent Lens internals, Media Fortress internals, billing provider integrations, and Production deployment each receive separate specs/plans.

---

## 5. Global shell

### Mobile canonical order

1. Compact App Bar
2. TIGER Pulse slot when eligible
3. Progressive Composer entry
4. Context Rail
5. Feed

The legacy large authenticated-home marketing Hero is retired.

### Compact App Bar

Contains only high-frequency global functions:

- TIGER mark;
- Search affordance;
- attention/notification affordance only if enabled;
- avatar/account affordance.

No oversized marketing headline. No duplicated Create button when Composer is already visible.

### Bottom navigation

Default mobile set:

- Home
- Search
- Create
- Messages/Contact center when enabled
- Profile

Create may be visually distinct but remains integrated into the navigation grammar.

Campaigns, Recharge, Settings, Reports, Finance, Security, and Owner controls do not each consume a permanent bottom-nav slot. They surface contextually through Profile/Capabilities.

### Desktop

Desktop remains a consumer/commercial surface, not an enterprise dashboard.

Primary feed target width: approximately `680–720px` where viewport permits.

Secondary rails are allowed only when they contain useful live context. Empty decorative sidebars are prohibited.

---

## 6. Visual direction — Adaptive Sovereign Luxury

Premium quality comes from restraint, proportion, hierarchy, optical typography, material consistency, and motion discipline.

### Light

- warm ivory/neutral canvas;
- clean white/pearl raised surfaces;
- graphite text hierarchy;
- deep sovereign navy/charcoal authority color;
- restrained amber/gold VVIP accent.

### Dark

- layered graphite/near-black surfaces;
- no universal absolute-black slab;
- same semantic hierarchy and accessibility;
- restrained amber/gold accent.

### Prohibited

- gold saturation across ordinary controls;
- blue everywhere because previous code used blue;
- gradient-as-luxury;
- glassmorphism on every card;
- neon/futuristic decoration that adds no utility.

---

## 7. Semantic token system

Current components consume semantic roles, not raw brand-copy variables.

Required token families:

- `surface.canvas`
- `surface.raised`
- `surface.sunken`
- `surface.overlay`
- `surface.sponsored`
- `text.primary`
- `text.secondary`
- `text.muted`
- `text.inverse`
- `border.subtle`
- `border.strong`
- `action.primary`
- `action.primaryText`
- `action.secondary`
- `action.quiet`
- `status.success`
- `status.warning`
- `status.danger`
- `status.info`
- `accent.vvip`
- `accent.campaign`
- `focus.ring`
- `radius.control`
- `radius.card`
- `radius.sheet`
- `shadow.low`
- `shadow.medium`
- `motion.fast`
- `motion.standard`
- `motion.slow`

Legacy tokens tied to other brands, including active `fb-*` product authority, are prohibited in the migrated current surface.

---

## 8. TIGER Optical Typography

Typography is bilingual and semantic from the beginning.

Roles:

- `Display`
- `Headline-L`
- `Headline-M`
- `Title-L`
- `Title-M`
- `Body-L`
- `Body-M`
- `Label-L`
- `Label-M`
- `Metric-L`
- `Metric-M`
- `Micro`

Rules:

- Arabic and Latin are optically matched, not merely assigned identical numeric sizes;
- Arabic line-height may differ from Latin;
- Arabic diacritics must never clip;
- mixed Arabic/Latin price strings preserve baseline harmony;
- bidi punctuation is tested;
- prices/metrics use stable numeral behavior;
- tabular numerals are used where aligned metrics materially benefit;
- currency is locale-aware;
- font loading has a fast fallback and may not create invisible text dependency;
- product identity may not remain “Cairo-only because Cairo already exists.”

Final font-family selection is a design-system decision after Arabic/English visual testing; component APIs depend on roles, not a hard-coded family name.

---

## 9. Geometry, spacing, and adaptive density

Use a compact 4-point-derived rhythm with semantic spacing tokens.

No component owns arbitrary margin values without token mapping.

Bounded density modes:

- `COMPACT`
- `COMFORTABLE`
- `ACCESSIBLE`
- `DATA_SAVER`

Density may adapt:

- spacing;
- secondary metadata visibility;
- media preview size;
- prefetch behavior;
- motion intensity;
- action-label visibility.

Density may not hide legal notices, trust state, required fields, security state, or critical errors.

Visible controls may look compact while maintaining comfortable touch targets.

---

## 10. Action grammar

### Primary

One dominant action per context whenever practical.

### Secondary

Important non-dominant alternative.

### Quiet

Repeated low-emphasis utility action.

### Icon action

Save, Share, More, Close, Back, compact context actions.

Every icon action has an accessible name.

### Destructive

Reserved for destructive/irreversible operations only.

Every action defines:

- default;
- hover where relevant;
- pressed;
- focus-visible;
- loading;
- disabled;
- unavailable/permission-denied explanation when safe and useful.

A disabled control may not silently do nothing without reason where recovery is possible.

---

## 11. Iconography

Use one coherent icon system or controlled custom subset.

Rules:

- consistent optical stroke/weight;
- consistent geometry;
- no emoji navigation icons;
- no arbitrary mixing of filled/outline families;
- filled/weight changes may indicate selection consistently;
- critical actions cannot rely on icon shape alone;
- OWNER/VVIP is not represented by novelty crowns or casino-luxury clichés by default.

---

## 12. TIGER Morph — motion physics

Motion explains state and preserves continuity. It never blocks access.

Motion classes:

1. micro feedback — press/save/select;
2. surface transition — card→detail, composer, search;
3. structural transition — rail/filter expansion;
4. attention transition — campaign/status change.

Implementation must use a bounded timing scale, not random per-component durations.

### Card→Detail

When platform support and user settings allow:

- detail visibly originates from the selected object;
- media/header continuity is preserved;
- no blank intermediate frame;
- back returns to the same feed position;
- search/filter state survives.

Fallback is immediate clean route/sheet transition.

### Reduced motion

`prefers-reduced-motion` is authoritative for presentation enhancement. Essential state remains clear without travel animations.

---

## 13. Sheets and contextual surfaces

Bottom/full sheets must:

- respect device safe areas;
- use a drag affordance only when drag works;
- trap focus when modal;
- restore focus on close;
- support keyboard interaction;
- handle viewport-resize/keyboard appearance;
- scroll internally when content exceeds viewport;
- support reduced-motion mode.

No sheet is allowed to become a hidden multi-page wizard with a sheet skin.

---

## 14. Home architecture

Authenticated Home is the primary TIGER ONE expression.

Canonical sequence:

`App Bar → TIGER Pulse → Composer → Context Rail → Feed`

If Pulse has no eligible campaign, its reserved shell collapses without fake content.

If feed is empty/unavailable, Home retains Search, Composer where allowed, contextual discovery, and an explicit empty/error state.

Synthetic items may appear only under the separate approved synthetic-demo policy and must be labeled.

---

## 15. TIGER Pulse home contract

TIGER Pulse is not a generic banner carousel.

Home rules:

- one dominant sponsored creative at a time;
- explicit sponsored label;
- controlled rotation only when allowed;
- pause on interaction;
- static/reduced-motion mode;
- lightweight Data Saver mode;
- no infinite high-speed ticker;
- no campaign animation competing with feed reading;
- no layout shift from late insertion when eligibility is already known.

Tap opens Campaign/Brochure mode inside the Living Surface.

Later Campaign Studio specs may add brochure pages, verified external navigation, contact, share/save, call/WhatsApp where policy allows, targeting, pacing, analytics, and billing.

---

## 16. Progressive Composer entry

Home prompt:

Arabic: **`ماذا تريد أن تعرض؟`**

English: **`What would you like to offer?`**

It appears as a compact familiar composer, not a form.

Initial visible content after open:

- Photos
- Title
- Sector/Category
- Price Type/Price
- Location

Sector-specific fields reveal progressively.

The legacy numbered default `1 / 2 / 3 / 4` listing wizard is superseded.

---

## 17. Publish Passport

Readiness is communicated through semantic checkpoints, not page numbers.

Example classes:

- Basics
- Media
- Location
- Policy/Trust readiness
- Ready to Publish

Exact requirements are data/policy driven by sector/country/listing state.

The UI cannot fabricate readiness. Server/product rules remain authoritative.

The Passport must be compact, understandable, and non-gamified. No childish progress graphics.

---

## 18. Context Rail

The legacy fixed three-sector HTML authority is superseded.

Rail items are driven by the Dynamic Sector Registry/discovery contract.

Mobile default:

- horizontal compact chips or restrained visual items;
- clear selected state;
- no oversized icon grid unless the context truly benefits.

A single rail must represent one meaning at a time: sector, category, discovery context, saved/recent context, or active-market context. Unrelated concepts may not be mixed into one ambiguous row.

---

## 19. Commercial card shell

Canonical order:

1. identity header;
2. concise title/text;
3. media;
4. commercial facts;
5. actions.

Header may show:

- avatar/business image;
- display name;
- authoritative verification/trust indicator;
- location/sector;
- time;
- contextual `⋮`.

Media:

- near-full card width on mobile;
- swipe for multiple images;
- compact `x/y`;
- stable placeholder;
- no decode-induced reflow.

Commercial facts show only high-value attributes for that object type.

Default primary card actions are exactly:

- Save
- Contact
- Share

Additional authorized capabilities live behind `⋮`/context and remain server-confirmed.

No checkout, escrow, delivery, transaction settlement, marketplace commission, or platform-run transaction dispute action is introduced.

---

## 20. TIGER Trust Halo

Visible trust must be explainable and non-manipulative.

Potential visible signals:

- verified identity/business state;
- account longevity where permitted;
- listing policy verification;
- transparent business/account indicators.

Never expose:

- fraud score;
- device-risk score;
- hidden abuse heuristics;
- internal security classification;
- probabilistic “trust percentage” presented as objective fact.

Trust presentation never replaces authorization or moderation.

---

## 21. Contextual capability exposure

Ordinary users, advertisers, staff, partners, and OWNER may see different actions on the same object, but only from server-confirmed capability state.

Rules:

- UI visibility is not security;
- expired/unknown capability state fails closed;
- sensitive actions may trigger step-up auth;
- privileged controls remain visually integrated with TIGER ONE rather than launching unrelated admin skins;
- no client-side role string grants authority.

Existing SCG/SOA remains authoritative.

---

## 22. Perceived performance

Premium means fast.

Rules:

- no avoidable layout shift;
- skeleton geometry matches target geometry;
- reduced-motion uses static skeletons;
- no excessive shimmer;
- lightweight image placeholders;
- high-resolution media loads only when useful;
- prefetch is selective and network-aware;
- stale async work is aborted/suppressed;
- long-feed rendering must remain memory-aware.

Every implementation plan must declare budgets for:

- JS execution;
- render/layout cost;
- image/font bytes;
- first useful interaction;
- scroll stability;
- memory pressure;
- poor-network behavior.

No “premium” feature is exempt from performance budgets.

---

## 23. Offline, weak network, Data Saver

Weak-network behavior prefers:

- text first;
- tiny placeholders;
- conservative media;
- static TIGER Pulse;
- no nonessential prefetch;
- reduced motion intensity.

Offline/intermittent behavior is explicit:

- cached reading only where privacy permits;
- local drafts only through approved contracts;
- pending state is visible;
- no fake publish/payment/campaign launch/privileged success.

Recovery reconciles safely and uses idempotency contracts where relevant.

---

## 24. Accessibility

Critical Web/PWA journeys target WCAG 2.2 AA quality.

Required:

- keyboard access;
- visible focus;
- logical focus order;
- screen-reader labels;
- semantic headings;
- adequate contrast;
- comfortable targets;
- text scaling without clipping;
- reduced motion;
- no color-only meaning;
- modal/sheet focus restoration;
- RTL screen-reader ordering tests;
- accessible auth inherited from the identity layer.

Accessibility overrides decoration.

---

## 25. RTL/LTR and global behavior

Arabic and English share one component system.

Rules:

- logical CSS properties over left/right assumptions;
- directional icons mirror only when semantics require it;
- dates/numbers/currency are locale-aware;
- mixed-script content remains readable;
- truncation preserves meaning and bidi order;
- long Arabic/English strings cannot break core controls;
- no separate Arabic app and English app.

Future locales plug into catalogs/locale contracts without component forks.

---

## 26. Security and privacy boundaries

Presentation must obey:

1. UI visibility is never authorization.
2. Sensitive capability is server-confirmed.
3. No raw secrets in client presentation code.
4. No client-side ownership trust.
5. No financial authority in browser state.
6. Media remains governed by F05/Media Fortress.
7. Search eligibility remains governed by Search Fabric/policy.
8. Internal trust/risk data is not exposed for cosmetic intelligence.
9. Analytics do not log auth material, private message bodies, or unnecessary sensitive fields.
10. Existing advertising/direct-contact platform boundary remains intact.

---

## 27. Failure UX

Failures are classified:

### Retryable

Network/transient saturation/retryable processing. Offer a precise retry path.

### User-correctable

Missing/invalid field, unsupported media/location/category. Explain exact correction without exposing security internals.

### Authorization/policy

State that the action is unavailable; reveal only safe reason classes and never create a resource-existence oracle.

### Fatal/integrity

Fail closed for the affected action while preserving the rest of the application when possible.

No generic “Something went wrong” if a safe actionable class exists.

---

## 28. Future-ready seams without future bloat

This spec reserves contracts, not unused screens.

Future Campaign Studio reuses the same shell, tokens, typography, action grammar, sheets, metrics, and capability gates.

Future Publishing Access/Recharge reuses the same product language and may not create a separate wallet-style product identity.

Future Video/3D/AR plugs into Commercial Object media contracts and does not silently rewrite card grammar.

New sectors/countries are configuration/policy driven; no country-specific UI fork unless legally/functionally required.

Android/iOS inherit the same tokens, IA, action hierarchy, object grammar, and messages; native-only value is reserved for device capabilities such as camera, haptics, push, share sheet, passkeys/biometrics, deep links, and background transfer.

---

## 29. Anti-patterns explicitly retired

The following are `SUPERSEDED / HISTORICAL ONLY` for the current surface:

- large authenticated-home marketing Hero;
- numbered default create-listing wizard;
- fixed three-sector filter authority;
- oversized generic blue buttons for ordinary actions;
- gold/gradient saturation as a luxury substitute;
- emoji navigation;
- separate final-state OWNER/admin skin;
- AI button on every surface;
- auto-playing distracting campaign ticker;
- hidden gestures as the only important-action path;
- component-specific typography/spacing systems;
- decorative animation that delays interaction;
- fake offline success;
- UI-only authorization.

---

## 30. Acceptance criteria

Spec #1 implementation is not complete until one exact implementation head proves all of the following:

1. legacy authenticated Home Hero is removed from current surface behavior;
2. Home order is App Bar → Pulse → Composer → Context Rail → Feed;
3. fixed three-sector HTML authority is removed from current surface behavior;
4. semantic color/spacing/radius/motion/type tokens are present and consumed;
5. no active legacy `fb-*` design authority remains in migrated current surface;
6. action variants are centralized and accessible;
7. default Composer contains no numbered `1/2/3/4` wizard header;
8. Publish Passport shell exists;
9. card shell defaults to Save/Contact/Share;
10. Detail preserves place or has a clean non-transition fallback;
11. reduced-motion behavior passes focused tests;
12. RTL/LTR targeted viewports do not overflow;
13. text scaling preserves critical controls;
14. Data Saver/weak-network hooks suppress nonessential motion/prefetch;
15. loading/error/offline states are explicit and never fake privileged success;
16. UI remains capability-driven, never authorization authority;
17. Clerk, F05, Search Fabric, ownership, SCG/SOA, RLS, ledger, and marketplace-boundary invariants remain unchanged;
18. focused mobile/desktop visual-interaction tests pass;
19. no Production deploy, protected-branch bypass, database apply, money movement, or secret mutation is included in this spec implementation;
20. old conflicting current tests/config/routes are retired or rewritten so no dual UI authority remains.

---

## 31. Implementation decomposition after owner review

After this written spec is approved, implementation must be planned as small isolated slices rather than one giant rewrite:

1. current-authority cleanup contract tests;
2. semantic tokens + typography + action primitives;
3. compact shell/App Bar/navigation;
4. Home structural order;
5. TIGER Pulse slot shell;
6. Composer entry + Publish Passport shell;
7. Context Rail registry rendering;
8. commercial card shell;
9. TIGER Morph/detail continuity;
10. loading/offline/error/accessibility/responsive hardening;
11. exact-head visual/interaction verification;
12. only then retire the legacy conflicting current surface paths.

No slice is allowed to merge to `main` merely because it looks better. It must preserve all current security/governance invariants and pass the repository gates on its exact head.
