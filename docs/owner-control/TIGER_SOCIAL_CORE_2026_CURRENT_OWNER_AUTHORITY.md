# TIGER SOCIAL CORE 2026 — CURRENT OWNER AUTHORITY

**Status:** CURRENT_ONLY — BINDING OWNER PRODUCT AUTHORITY

**Effective date:** 2026-08-31

**Applies to:** VVIP TIGER social graph, authenticated/public social journeys, global navigation, feed consumption, reactions, comments, sharing, saving, messaging, notifications, search, privacy/safety, pages, groups, Marketplace placement, and implementation priorities derived from those domains.

**Current publication experience authority:** `docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md`

## 1. Binding product direction

VVIP TIGER is a **social-network-first platform**. Familiar social interaction patterns are used to reduce learning friction, while TIGER retains original branding, copy, visual identity, information architecture, code, security model, and product concepts.

Functional familiarity is a behavior/procedure reference only. It is never permission to copy proprietary source code, trademarks, logos, protected assets, private APIs, or a pixel-for-pixel protected visual identity.

## 2. Functional reference scope

The Social Core current scope includes:

1. registration, sign-in, session recovery and account access;
2. profile and identity presentation;
3. friend requests, friendship lifecycle, following and relationship state;
4. Home Feed and relevance/chronological feed contracts;
5. presentation and interaction with current NEXUS Living Sector Objects;
6. reactions/likes;
7. comments and replies;
8. share/repost semantics;
9. save/bookmark semantics;
10. messaging and conversation entry points;
11. notifications;
12. people/content search and discovery;
13. per-content and account privacy controls;
14. block, mute and report/safety flows;
15. activity history and user-visible account controls;
16. Pages/business identities when introduced;
17. Groups/communities when introduced;
18. Marketplace/classifieds as a **module inside the social platform**, not the primary identity of the whole product;
19. administration and moderation surfaces required to operate the above safely.

New social domains still require legal, privacy, safety, security, and product-fit review before activation.

## 3. Familiarity rule and NEXUS publication boundary

For a familiar social action, prefer an established user mental model unless TIGER has a documented reason to improve it.

Examples:

- Home is primarily a social feed, not a marketplace landing page;
- creation is a first-class action, but the current publishable object is a **Living Sector Object** under NEXUS rather than unrestricted public chatter;
- every newly publishable Living Sector Object binds to an activated sector and one current intent: `OFFER / NEED / SERVICE / OPPORTUNITY`;
- the canonical creation entry is **ماذا تعرض أو تحتاج؟**;
- Friends, Messages, Notifications, and Profile remain first-class navigation concepts;
- Marketplace remains reachable as a module without replacing Home;
- privacy audience and destructive actions remain explicit;
- frontend visibility never grants authority.

There is no separate generic public-post creation contract that may bypass `TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md`.

## 4. Originality and IP boundary

VVIP TIGER must not copy Facebook/Meta source code or non-public implementation details, use their trademarks/logos/proprietary assets as TIGER assets, reproduce protected screens pixel-for-pixel to create confusion, depend on undocumented/private APIs, or imply affiliation or endorsement.

TIGER may implement common social-network patterns using its own code and semantic design system.

## 5. Product hierarchy

Current hierarchy is:

`VVIP TIGER Social Platform`

→ `TIGER NEXUS 2026 current experience`

→ `Social Core capabilities`

→ modules such as `Marketplace`, `Pulse Vault`, and later approved Pages/Groups.

Marketplace/FUSION infrastructure is retained only where compatible with current NEXUS, publication, security, and platform-role authority.

## 6. Monetization compatibility

Current paid-visibility authority remains:

`docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`

Current Pulse reference levels are **2 / 10 / 20 / 45 JOD** only.

NEXUS presents that authority through Pulse Vault. Ordinary eligible sector publication remains free. No marketplace checkout, escrow, delivery, settlement, warranty execution, or platform-run buyer/seller transaction dispute layer is introduced by the social product.

Future social monetization requires a separate explicit owner decision.

## 7. Security and identity preservation

Current trusted identity/security boundaries remain binding where compatible: federated identity, RLS default-deny, SOA/SCG, server-authoritative capability checks, OIDC release controls, signed artifact provenance, SBOM evidence, media protection, immutable-release rules, authorization invariants, ledger controls, and fail-closed behavior.

Current verification references are inherited from NEXUS: **OWASP ASVS 5.0.0**, **NIST SP 800-63-4**, **NIST SP 800-63B-4**, and **SLSA 1.2**. They are verification baselines, not automatic certification claims.

No identity-provider transition is authorized by this document or by adopting a newer standard. Any such transition requires an explicit ADR, migration plan, rollback plan, security review, and exact-head evidence.

## 8. Architecture direction

Implementation remains Managed-first, Modular-first, Event-ready, Global-ready, and evidence-driven. Prefer a modular monolith with clear extraction seams over premature microservices. Use OIDC rather than long-lived cloud credentials; preserve container-ready deployment, managed relational/cache/object-storage/event/search options when justified; and retain OpenTelemetry-compatible observability and repository-governed IaC.

Kubernetes/EKS, Aurora DSQL, DynamoDB feed storage, broad microservice decomposition, multi-region active-active, or other fashionable infrastructure are future options only when a measured requirement and migration gate justify them.

## 9. Migration rule

For each social slice:

1. identify current runtime behavior and authority;
2. write the behavioral/security contract first where practical;
3. implement the smallest compatible vertical slice;
4. preserve security/privacy/data invariants;
5. keep Marketplace reachable as a module;
6. delete conflicting old current-tree authority after replacement proof—never hide it in archive/trash/legacy/fallback/compatibility;
7. pass exact-head verification before convergence is claimed.

No direct write to `main` is authorized by this document.

## 10. Current implementation order

1. Social App Shell / global navigation;
2. Home Feed semantics;
3. NEXUS Living Sector Object composer;
4. Profile;
5. Friends and relationship-state contract;
6. Messages;
7. Notifications;
8. Marketplace module;
9. privacy/safety affordances;
10. progressively deeper social functions through tested vertical slices.

## 11. Supersession

Earlier generic `normal Post Composer` authority that allowed a newly public post without current NEXUS sector/intent binding is superseded. Earlier product/monetization clauses that conflict with NEXUS or the current Pulse authority are also superseded.

Compatible social graph, privacy, safety, search, media, authorization, and operational foundations remain in force.

## 12. Owner acceptance statement

> **Build VVIP TIGER as an original social-network-first product, with familiar social interaction semantics but TIGER-owned code and identity. Current new publication is through NEXUS Living Sector Objects bound to an activated sector and OFFER/NEED/SERVICE/OPPORTUNITY; there is no generic public-post bypass. Keep Marketplace as a module, preserve fail-closed security/identity protections, use current Pulse 2/10/20/45 JOD, use current 2026 verification baselines, and delete conflicting old current-tree authority instead of hiding it.**
