# TIGER Facebook 1:1 Familiarity + TIGER Identity — Design Specification

**Date:** 2026-08-21

**Status:** `OWNER APPROVED DESIGN / IMPLEMENTATION NOT STARTED`

**Authority:** `docs/owner-control/TIGER_FACEBOOK_1_TO_1_FAMILIARITY_2026_CURRENT_OWNER_AUTHORITY.md`

## 1. Purpose

This design replaces the current loosely Facebook-inspired social shell with a canonical, testable, high-familiarity social architecture while preserving VVIP TIGER identity and all existing security/business authority.

The current problem is structural, not cosmetic. The existing implementation has several visible controls and destinations whose behavior is incomplete or placeholder-only, a single-column desktop composition, duplicated navigation concepts, hard-coded social identities in feed/comments, and a profile destination that does not yet behave as a real social profile timeline.

The target is not a trademark/asset clone. The target is a Facebook-familiar product mental model with TIGER branding and independent implementation.

## 2. Scope split

Implementation is intentionally divided into two programs with a hard ordering dependency.

### Program A — P0-B Closure

Must finish before UI parity implementation proceeds.

Required outcomes:

- active/deactivated/deleted profile lifecycle is authoritative and verified;
- deactivated actors cannot perform privileged social mutations;
- deleted actors are terminal;
- historical post/comment/message/profile presentation is orphan-safe;
- public presentation never leaks Clerk subject/private identity;
- feed/comment author presentation is derived from safe social profile projection rather than hard-coded text;
- deleted presentation uses a stable tombstone such as `Deleted member`;
- reactivation restores the same profile identity where authorized;
- session/recovery remains Clerk authority rather than introducing a second identity system;
- exact-head runtime/database/security/CI evidence exists before issue #297 can close.

### Program B — Facebook Familiarity UI Realignment

Begins only after Program A is green and integrated.

Required outcome: every current social destination and control either works according to the canonical reference or is intentionally absent/unavailable without masquerading as completed functionality.

## 3. Design principles

### 3.1 Familiarity over novelty

Users should not need to relearn where core social functions live.

### 3.2 TIGER identity over imitation

Branding, logo, terminology, product modules, security, and business rules remain TIGER.

### 3.3 Functional truth over screenshot similarity

A visually accurate dead button is a defect. A less decorative but fully functioning, correctly placed control is closer to acceptance.

### 3.4 One authority per surface

No competing desktop/mobile/legacy navigation systems may both claim to be final.

### 3.5 Progressive implementation without fake completeness

Incomplete features are hidden or explicitly unavailable. Placeholder content cannot satisfy parity.

## 4. Canonical Facebook→TIGER surface map

| Familiar social concept | TIGER destination/component | Required behavior | Current known state | Acceptance state |
|---|---|---|---|---|
| Home | `home` / Social Home | composer + stories when real + feed + continuation | partial | verified functional |
| Search | Global social search | people/content discovery with privacy filters | incomplete | real search or hidden |
| Friends | `friends` | requests, accepted friends, actions | partial | server-truth UI |
| Messages | `messages` | conversation shell + send/read states | placeholder | implemented or hidden/unavailable |
| Notifications | `notifications` | durable list + unread/read + navigation | placeholder | implemented or hidden/unavailable |
| Profile | `profile` | real social profile + timeline + sections | account sheet substitute | first-class profile |
| Marketplace | `marketplace` | commercial module inside social shell | partial | distinct module placement |
| Composer | Social post composer | identity, body, audience, media when trusted, publish states | partial | verified publish flow |
| Stories | story strip/viewer | actual member/story state | hard-coded visual cards | implemented or hidden |
| Reactions | post reactions | persisted picker/state/count | partial | verified behavior |
| Comments | post comments | safe author presentation, reply/edit/delete | partial | verified behavior |
| Share/Repost | post share/repost | defined privacy semantics | visible disabled control | implemented or hidden |
| Saved | private bookmark/saved | private owner collection | partial backend | verified destination when exposed |

## 5. Desktop shell specification

### 5.1 Top app bar

Desktop app bar is persistent and visually compact.

Left/brand zone:

- TIGER home/brand control;
- global search field or search trigger with a real search experience.

Center navigation zone:

- Home;
- Friends;
- Marketplace;
- additional implemented high-level social destinations where appropriate.

Right quick-action zone:

- messages;
- notifications;
- profile/account/menu;
- other approved creation/action controls only when functional.

Rules:

- no Unicode glyph used as a final icon solution when a real icon system is available;
- all controls are semantic buttons/links;
- active destination is unambiguous;
- badges/counts must come from real state;
- no duplicated active navigation below the same desktop bar unless the secondary navigation is context-specific.

### 5.2 Three-column composition

Desktop viewport uses adaptive rails:

`Left Rail — Center Feed — Right Rail`

Suggested behavior, not fixed pixel copying:

- center feed remains readable and stable;
- left rail owns personal/navigation shortcuts;
- right rail owns contextual social/advertising modules;
- at intermediate widths the right rail collapses first;
- at narrower widths the left rail collapses into menu/navigation;
- the center feed must not remain artificially narrow while large unused desktop space exists.

### 5.3 Left rail

Order should prioritize:

- own profile;
- friends;
- saved/bookmarks when exposed;
- marketplace;
- other implemented TIGER modules.

Each entry requires real navigation and current-state semantics.

### 5.4 Right rail

May expose:

- TIGER Pulse/sponsored placements;
- friend requests/suggestions;
- contacts/status if implemented;
- contextual recommendations.

It must never display fake user data or hard-coded social identities as verified runtime content.

## 6. Mobile shell specification

### 6.1 Header

- compact TIGER branding;
- real search access;
- real messages/notifications/menu access according to screen width;
- safe-area aware.

### 6.2 Primary tabs

Use a familiar horizontally distributed navigation model with strong active state.

Controls must not be inert spans.

If a destination is unavailable, either:

- hide it;
- expose it with explicit unavailable status and disabled semantics if the product needs visible roadmap signaling.

The default is to hide incomplete primary destinations.

### 6.3 Feed surfaces

On mobile:

- cards may become edge-to-edge or nearly edge-to-edge;
- no duplicated bottom navigation fighting with top tabs;
- touch targets >= accessible minimum;
- story strip scrolls horizontally if enabled;
- action rows remain reachable with one hand where practical;
- dialogs/sheets use mobile-appropriate full-height/bottom-sheet behavior.

## 7. Home feed specification

### 7.1 Home order

1. composer;
2. stories only when real;
3. optional social context module when approved;
4. feed;
5. continuation sentinel/loading state.

### 7.2 Post card model

Each normalized post presentation object must contain safe UI-ready fields, conceptually:

- `postId`;
- `author.profileId`;
- `author.displayName`;
- `author.avatarUrl` or safe fallback;
- `author.state` (`active`, tombstone/unavailable presentation state);
- `body`;
- `audience`;
- `createdAt`;
- `updatedAt`;
- media presentation when authorized;
- reaction summary;
- viewer reaction;
- comment summary/count;
- viewer capabilities;
- share/repost capability when implemented.

The client presentation model must not require or expose `author_subject` as a UI identity key.

### 7.3 Deleted/deactivated author handling

Historical content must not crash or disappear accidentally solely because the author profile is no longer active.

Deleted author:

- display name: stable tombstone;
- avatar: neutral safe fallback;
- no private/business/location details;
- profile navigation disabled/unavailable;
- historical content visibility remains governed by its own content/privacy policy.

Deactivated author:

- public profile destination hidden/unavailable;
- historical content presentation policy explicit;
- no new privileged social mutations by the actor;
- presentation must not leak internal identity.

## 8. Composer specification

### Entry state

Home shows a familiar inline trigger with current-user avatar/presentation.

### Expanded state

Dialog/sheet includes:

- title/header;
- current user presentation;
- audience selector;
- text body;
- media controls only when trusted flow exists;
- publish control;
- close/cancel;
- live validation;
- pending state;
- recoverable error state;
- duplicate-submit prevention.

### Success state

- confirmed server result;
- composer closes or resets predictably;
- feed refresh/insertion must reconcile with server truth;
- no local-only phantom post.

## 9. Stories specification

Stories are not accepted from static sample cards.

If included in the verified product, required runtime data includes:

- story id;
- safe actor presentation;
- media reference;
- created/expiry state according to product rule;
- seen/unseen/current viewer state when supported.

If that backend does not exist at implementation time, remove the story strip from the verified UI rather than leaving sample content.

## 10. Reactions specification

- main reaction button visible on every eligible post;
- touch/click behavior selects/removes reaction;
- desktop hover may reveal picker but must have keyboard/touch equivalent;
- persisted state is source of truth;
- counts reconcile after mutation;
- unavailable actor state blocks mutation fail-closed;
- all reaction types remain TIGER-authorized domain values.

## 11. Comments specification

Comment presentation model must include safe author presentation rather than the current hard-coded member label.

Each comment row should support:

- author avatar/name;
- body;
- timestamp/edit state;
- reply action if allowed;
- edit/delete if viewer authorized;
- nested one-level replies according to current backend contract;
- loading/error/retry;
- deleted/deactivated author fallback.

Comment composer should visually integrate with the post discussion area rather than appear as an unrelated generic form.

## 12. Share/Repost specification

Before exposing a normal share/repost button, define and implement:

- original-post identity;
- privacy propagation;
- deleted/original unavailable semantics;
- audience choice if required;
- duplicate/repost policy;
- server persistence;
- viewer authorization.

Until these exist, the normal post action row must not present share/repost as if usable.

## 13. Profile specification

### 13.1 Profile header

- cover area;
- avatar;
- display name;
- safe public details;
- relationship counts/actions according to authority;
- own-profile actions vs other-profile actions.

### 13.2 Profile sections

Canonical sections may include:

- Posts/Timeline;
- About;
- Friends;
- Photos/Media;

Only implemented sections are exposed.

### 13.3 Own profile

Own profile adds:

- edit profile;
- account/settings entry;
- privacy controls where implemented;
- lifecycle controls in the appropriate settings/account area.

Account/security/settings remain distinct from social profile presentation.

## 14. Friends specification

Surfaces:

- incoming requests;
- outgoing requests when exposed;
- current friends;
- suggestions only when backed by real discovery logic.

Each card uses safe public profile data.

Actions reconcile against server state and include pending/error handling.

## 15. Search specification

Search is a dedicated feature rather than a decorative header glyph.

Search architecture:

- query input;
- normalized/bounded query;
- result groups;
- people results from active safe public projections only;
- post/content results from authorized visibility queries only;
- block/privacy/lifecycle filters reapplied at authoritative query boundary;
- loading/no-results/error states;
- keyboard and mobile-friendly navigation.

Search index, if added later, is never the authorization authority.

## 16. Messages specification

Until durable messaging is implementation-ready, do not classify Messages as verified.

Target structure:

Desktop:

`conversation list | active conversation`

Mobile:

`conversation list -> active conversation`

Required states:

- list loading/empty/error;
- message history loading/error;
- send pending/error;
- participant deleted/unavailable;
- read/delivery state only when supported by backend truth.

## 17. Notifications specification

Notification row:

- safe actor avatar/name or deleted fallback;
- action summary;
- timestamp;
- unread state;
- target navigation;
- privacy-safe preview.

No notification may expose Clerk subjects/private fields.

## 18. Marketplace integration specification

Marketplace remains clearly reachable from the social shell but must not visually collapse into social posting.

Differences to preserve:

- commercial listing composer distinct from social composer;
- listing metadata distinct from social-post metadata;
- Pulse/sponsored treatment explicit;
- no transaction checkout/escrow/settlement introduced;
- direct-contact platform role remains current.

## 19. Iconography specification

Replace final-use Unicode glyphs with a coherent icon system that:

- is legally usable;
- supports required social symbols;
- has consistent stroke/fill language;
- supports RTL placement;
- remains clear at compact mobile sizes;
- has accessible labels separate from the icon itself.

Emoji may appear as content/reaction symbols where intentional, but not as the default navigation icon system.

## 20. Typography and visual system

TIGER owns the visual identity.

Use:

- TIGER type tokens;
- TIGER accent color/system;
- neutral social canvas;
- white/raised content surfaces where appropriate;
- consistent borders/radii/elevation;
- predictable spacing scale;
- strong contrast and visible focus.

Avoid over-luxury visual decoration that harms familiar social hierarchy. Premium quality should come from polish, spacing, typography, motion restraint, and consistency rather than exotic geometry.

## 21. Responsive breakpoints and behavior

Implementation should define behavior tiers rather than arbitrary CSS-only shrinking:

- **Wide desktop:** left + center + right;
- **Medium desktop/tablet landscape:** left + center, right collapsed;
- **Tablet/compact:** center dominant, navigation compacted;
- **Mobile:** dedicated top/tabs/sheets and edge-aware content.

Each tier requires tests for:

- navigation availability;
- feed width;
- rail visibility;
- modal/sheet usability;
- action-row wrapping;
- no horizontal overflow;
- no hidden essential controls.

## 22. Accessibility acceptance

Required before any parity slice closes:

- semantic interactive elements;
- no clickable `span` used as final control;
- keyboard reachability;
- visible focus;
- focus restoration after dialogs;
- `aria-current` on active navigation;
- `aria-expanded` on menus/pickers when relevant;
- meaningful labels;
- live regions for async state where appropriate;
- contrast sufficient for normal/disabled/focus/error states;
- hover-only behavior has non-hover alternative.

## 23. Motion specification

Use restrained motion:

- reaction picker scale/translate;
- menu/sheet open/close;
- lightweight state transitions;
- skeleton/loading where useful.

Respect reduced-motion preferences.

No essential information may depend on animation.

## 24. Error and network states

Every async surface must define:

- initial loading;
- empty;
- recoverable error;
- retry;
- offline/unavailable;
- pending mutation;
- mutation failure;
- confirmed success.

Where offline queueing exists, UI must not imply durable success before reconciliation.

## 25. Test architecture

### 25.1 Static structural contracts

Tests assert:

- canonical shell regions exist;
- no legacy duplicate navigation remains active;
- no visible inert primary controls;
- profile is a real destination;
- safe presentation components are used.

### 25.2 Behavioral tests

Test:

- navigation changes destination;
- composer open/close/focus;
- search opens and queries when implemented;
- reaction selection;
- comment focus/create/edit/delete;
- relationship actions;
- profile transitions;
- disabled/unavailable states.

### 25.3 Runtime/data tests

Tie UI behavior to real DB/RPC contracts for:

- active/deactivated/deleted presentation;
- authorization;
- no subject leakage;
- no direct forbidden mutation.

### 25.4 Responsive tests

At representative viewports validate:

- expected rails/tabs;
- center feed width behavior;
- no inaccessible hidden navigation;
- dialogs fit viewport;
- no horizontal overflow.

### 25.5 Visual evidence

Where tooling allows, produce screenshot/reference artifacts for canonical viewports and compare them during review. Visual evidence complements, never replaces, behavioral tests.

## 26. No-fake-green rules

A slice is not green if any of the following is true:

- visible control has no real behavior;
- placeholder is counted as feature completion;
- tests assert only element existence while behavior is broken;
- screenshot looks correct but navigation/action is dead;
- data presentation uses hard-coded identity instead of safe runtime data;
- a current UI test encodes a superseded design;
- mobile and desktop disagree on current navigation authority;
- exact-head CI is red/pending;
- evidence belongs to an older SHA.

## 27. Implementation sequence

### Phase 0 — Close P0-B

Hard gate. Do not begin UI parity migration until complete.

### Phase 1 — Reference/acceptance harness

- canonical component map;
- explicit no-dead-control tests;
- responsive shell tests;
- owner authority checks.

### Phase 2 — Global shell

- icon system;
- desktop three-column shell;
- mobile shell;
- navigation consolidation;
- real search entry/hide if not implemented.

### Phase 3 — Home

- composer;
- story policy;
- feed presentation;
- post anatomy;
- reactions/comments actions.

### Phase 4 — Profile

- real social profile;
- timeline;
- safe lifecycle states;
- account/settings separation.

### Phase 5 — Friends

- request/current friend surfaces;
- server-truth actions.

### Phase 6 — Search/Messages/Notifications/Share

Each feature independently reaches verified functionality or is absent from the final navigation until ready.

### Phase 7 — Marketplace placement

Integrate commercial module cleanly within social-first shell.

### Phase 8 — Responsive/accessibility/visual closure

- canonical viewports;
- keyboard/touch;
- visual evidence;
- dead-control audit;
- exact-head CI.

## 28. P0-B exit criteria before Phase 1

P0-B may close only when all are verified on one exact integrated SHA:

1. profile public projection safe;
2. owner profile self-boundary safe;
3. self deactivation verified;
4. self reactivation verified;
5. service/trusted terminal deletion verified;
6. deleted cannot reactivate;
7. deactivated/deleted cannot privileged social mutate;
8. post author rendering orphan-safe;
9. comment author rendering orphan-safe;
10. message/profile references orphan-safe for implemented current surfaces;
11. no Clerk subject leakage in public/social presentation;
12. profile timeline uses safe projection/presentation;
13. focused tests green;
14. database runtime proof green;
15. security review/hash rules green for changed migrations;
16. Quality, CleanGuard, Zero-Residue, Project Control, Social DB, LC04, LC05, LC06 green on the same exact head;
17. PR merged into integration branch only;
18. integration-head verification rerun;
19. issue #297 closed only after evidence is posted.

## 29. Definition of UI program closure

The Facebook Familiarity program may be called closed only when the acceptance matrix contains no false `DONE` entries and every visible production/current control maps to a working implementation or explicit intentionally unavailable state.

Final report format:

`Surface | Reference Behavior | TIGER Implementation | Tests | Visual Evidence | Exact SHA | CI | Status`

Only `GREEN` or explicit blocker classifications are accepted.

## 30. Final design statement

VVIP TIGER will provide a highly Facebook-familiar social experience without becoming a Meta-branded clone. Familiarity is enforced through architecture, layout hierarchy, control placement, component anatomy, interaction behavior, responsive rules, and verified state handling. TIGER remains sovereign in brand, data, security, monetization, and platform role.
