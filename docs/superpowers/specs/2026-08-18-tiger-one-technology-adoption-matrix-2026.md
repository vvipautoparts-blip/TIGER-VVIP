# TIGER ONE 2026 — Technology Adoption Matrix

**Status:** CURRENT DESIGN COMPANION — OWNER REVIEW REQUIRED BEFORE IMPLEMENTATION

**Date:** 2026-08-18

**Parent spec:** `docs/superpowers/specs/2026-08-18-tiger-one-living-surface-design.md`

**Owner authority:** `docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md`

## 0. Purpose

TIGER ONE adopts modern technology only when it materially improves speed, clarity, continuity, accessibility, security, privacy, reliability, or operating cost.

A feature is not accepted merely because it is new. No draft browser capability may become a single point of failure for core navigation, authentication, publishing, search, campaigns, billing, or authorization.

Every advanced feature must have:

1. a capability test or explicit runtime support test;
2. a safe fallback;
3. reduced-motion/accessibility behavior where relevant;
4. performance budget;
5. telemetry that does not expose sensitive data;
6. an owner-approved product reason.

## 1. Adoption classes

### `CORE`
May be used as part of the normal implementation when supported by the project's browser/runtime baseline and repository verification.

### `PROGRESSIVE`
Enhances the experience when supported. The feature is never required for the task to succeed.

### `EXPERIMENTAL_ISOLATED`
May be evaluated behind an explicit feature flag in isolated non-authoritative surfaces. It must not control core product behavior.

### `REJECTED_FOR_CORE`
Technology may be technically interesting but is not permitted as a dependency for the core 2026 launch surface.

---

## 2. Living Surface technology decisions

### 2.1 CSS logical properties and semantic layout — `CORE`

Use logical inline/block properties instead of left/right assumptions for the common surface.

Purpose:
- one RTL/LTR component system;
- fewer duplicated styles;
- lower bidi regression risk.

Fallback: ordinary standards-compliant layout; no alternate Arabic application.

### 2.2 CSS Container Queries — `CORE`

Use component-level size queries where they make a component portable between feed, sheet, desktop rail, and detail contexts.

Purpose:
- component behavior depends on its real container rather than global viewport guesses;
- supports foldables, resizable desktop windows, split views, and adaptive rails without device-name branching.

Rule: do not overuse nested container queries where ordinary flex/grid rules are sufficient.

Primary standard reference: W3C CSS Containment Module Level 3, including `@container` and container-relative units.

### 2.3 View Transitions Level 1 — `PROGRESSIVE`

Use same-document View Transitions for TIGER Morph where runtime support and user motion preference allow.

Eligible examples:
- listing card → detail;
- compact composer → composer surface;
- search mode morph;
- image/header continuity.

Invariant:
- routes, history, focus, deep links, and state remain correct without animation;
- reduced-motion bypasses travel animation;
- failure to start a transition must not fail navigation.

### 2.4 Cross-document View Transitions Level 2 — `EXPERIMENTAL_ISOLATED`

The W3C Level 2 specification remains a Working Draft. It may be evaluated for same-origin navigation continuity only behind feature detection and may not become a launch dependency.

Fallback: immediate route navigation with state/scroll restoration.

### 2.5 CSS Anchor Positioning — `PROGRESSIVE`

The 2026 W3C Level 1 specification remains a Working Draft. Use only for contextual affordances that benefit from true anchor relationships, such as a capability popover attached to its invoking object.

Core rule:
- no important action may become inaccessible when anchor positioning is unsupported;
- fallback uses stable sheet/popover positioning;
- no JavaScript geometry loop solely to imitate the enhancement on unsupported clients.

### 2.6 Popover/dialog semantics — `CORE_WHERE_SUPPORTED`

Prefer platform semantics for modal/non-modal overlays when they satisfy focus, keyboard, screen-reader, and back behavior requirements.

Do not replace a proven accessible sheet implementation merely to chase a browser primitive. Product behavior remains contract-first.

---

## 3. Authentication and trust technology

### 3.1 WebAuthn / passkeys — `CORE_IDENTITY_DIRECTION`

WebAuthn Level 3 reached W3C Candidate Recommendation Snapshot on 2026-05-26.

TIGER keeps passkey-first authentication and step-up capability through the existing identity architecture. The common UI may expose passkey/biometric experiences only through the authoritative identity layer; presentation code does not implement independent credential verification.

Rules:
- server/identity-provider verification remains authoritative;
- no custom browser-side signature-verification authority;
- fallback recovery/MFA remains policy governed;
- sensitive OWNER/security/financial actions may require stronger step-up than ordinary browsing.

### 3.2 Trusted Types — `PROGRESSIVE_SECURITY_HARDENING`

W3C Trusted Types remains a Working Draft in 2026, so it must not be the only XSS defense. Where browser/runtime support and the app architecture permit, adopt it with CSP as defense in depth around dangerous DOM sinks.

It does not replace:
- contextual output encoding;
- sanitization;
- CSP;
- dependency hygiene;
- server-side validation;
- secure component APIs.

Fallback: core security controls remain effective without Trusted Types support.

---

## 4. GPU and visual-compute technology

### 4.1 WebGPU — `REJECTED_FOR_CORE`

WebGPU is a W3C Candidate Recommendation Draft in 2026 and is not required for TIGER ONE core UI.

Do not use WebGPU for:
- navigation;
- ordinary cards;
- buttons;
- typography;
- campaign rotation;
- basic image presentation;
- authentication;
- publishing readiness.

It may later be evaluated as `EXPERIMENTAL_ISOLATED` for a demonstrably valuable compute/visual workload with strict GPU memory, power, fallback, and crash budgets.

Reason: introducing a GPU dependency where CSS/Canvas/native primitives already solve the problem would increase attack surface, battery cost, compatibility burden, and implementation complexity without user value.

---

## 5. Adaptive rendering and performance

### 5.1 Capability-first adaptation — `CORE`

Do not branch UI by marketing device names such as “iPhone”, “Galaxy”, or “desktop”.

Adapt using bounded capability/context signals:
- container size;
- pointer/hover capability;
- safe-area insets;
- reduced-motion preference;
- text scale/accessibility constraints;
- app Data Saver preference;
- measured runtime resource pressure where an approved API exists.

Do not fingerprint users to optimize decoration.

### 5.2 Content visibility / virtualization — `BOUNDED_CORE`

Use rendering containment/virtualization only for long surfaces where measurements prove value.

Rules:
- scroll position must be stable;
- accessibility tree behavior must remain correct;
- back-to-place restoration must survive virtualization;
- no blank flashes during fast scroll;
- memory savings must be measurable.

### 5.3 Performance observer instrumentation — `CORE_OBSERVABILITY`

Measure user-facing rendering/interaction signals with privacy-safe instrumentation.

At minimum, implementation verification distinguishes:
- first useful interaction;
- long interaction tasks;
- layout instability;
- route/surface transition time;
- feed render cost;
- image placeholder → final media transition;
- memory/resource pressure diagnostics when available.

No sensitive content, auth tokens, private message bodies, or hidden risk data is emitted to telemetry.

---

## 6. Motion technology policy

TIGER motion is a state explanation system, not decoration.

### `CORE`
- CSS transforms/opacity for bounded micro-interactions;
- semantic timing tokens;
- `prefers-reduced-motion` handling;
- deterministic fallback with no animation.

### `PROGRESSIVE`
- View Transition API for spatial continuity;
- anchor-positioned contextual affordances.

### Rejected
- perpetual ambient animation;
- particle systems;
- auto-playing 3D scenes;
- GPU-heavy glass effects;
- motion that delays a primary action;
- animation required to understand state.

---

## 7. AI / local intelligence policy

Modern AI must be invisible when possible and advisory when visible.

### Allowed direction
- structured search-intent assistance;
- title/description quality assistance;
- category/field suggestions;
- translation assistance;
- duplicate/spam/content-quality assistance;
- image-quality advice.

### Non-negotiable boundaries
AI may not:
- grant capability;
- authenticate identity;
- move platform funds autonomously;
- bypass country/sector/legal gates;
- publish a user's listing without the required user confirmation;
- become an alternative database authority;
- retain private messages as generic model memory;
- silently fall back to a paid remote model when policy/budget forbids it.

AI features must degrade to deterministic/manual product behavior when unavailable.

---

## 8. Future-display technology seams

Future Video, 3D, AR, spatial computing, and richer campaign formats are supported as contract seams, not prebuilt screens.

A future capability must plug into:
- Commercial Object identity;
- media policy;
- accessibility representation;
- lifecycle;
- analytics taxonomy;
- authorization;
- moderation;
- performance budget.

No future medium receives a parallel application shell.

---

## 9. Technology kill criteria

An advanced technology is removed or disabled if it causes any of the following without sufficient compensating value:

- accessibility regression;
- broken navigation/history;
- security-policy weakening;
- privacy expansion without approval;
- >1 independent authority for the same decision;
- material battery/GPU/CPU increase on ordinary flows;
- measurable scroll/jank regression;
- browser-specific product fork;
- large dependency cost for decorative value;
- unbounded memory/resource behavior;
- inability to provide a clean fallback.

---

## 10. 2026 standards status snapshot used by this design

Status is informational and must be reverified at implementation/release time because standards evolve.

- WebAuthn Level 3 — W3C Candidate Recommendation Snapshot, 26 May 2026.
- WebGPU — W3C Candidate Recommendation Draft, latest 2026 publication family.
- CSS Anchor Positioning Level 1 — W3C Working Draft, 27 March 2026.
- CSS View Transitions Level 1 — W3C Candidate Recommendation Draft family; Level 2 remains Working Draft.
- Trusted Types — W3C Working Draft, 24 February 2026.
- CSS Containment Level 3 defines Container Queries and container-relative units.

Official references:
- https://www.w3.org/TR/webauthn/
- https://www.w3.org/TR/webgpu/
- https://www.w3.org/TR/css-anchor-position-1/
- https://www.w3.org/TR/css-view-transitions-1/
- https://www.w3.org/TR/css-view-transitions-2/
- https://www.w3.org/TR/trusted-types/
- https://www.w3.org/TR/css-contain-3/

---

## 11. Implementation gate

Before any implementation slice adopts a `PROGRESSIVE` or `EXPERIMENTAL_ISOLATED` technology, the plan must specify:

1. exact user value;
2. support detection;
3. fallback behavior;
4. accessibility behavior;
5. performance/memory budget;
6. security/privacy impact;
7. focused tests;
8. rollback/disable path.

If those cannot be written clearly, the technology is not adopted.

This matrix is subordinate to OWNER security/legal/financial authority and to the current TIGER ONE product direction. It exists to keep TIGER technologically modern **without turning novelty into technical debt**.