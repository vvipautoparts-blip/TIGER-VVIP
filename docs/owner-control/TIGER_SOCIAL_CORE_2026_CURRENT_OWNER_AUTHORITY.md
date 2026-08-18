# TIGER SOCIAL CORE 2026 — CURRENT OWNER AUTHORITY

**Status:** CURRENT_ONLY — BINDING OWNER PRODUCT AUTHORITY

**Effective date:** 2026-08-18

**Applies to:** VVIP TIGER primary product identity, authenticated/public social journeys, global navigation, social graph, feed, publishing, reactions, comments, sharing, saving, messaging, notifications, search, privacy/safety, pages, groups, marketplace placement, and implementation priorities derived from those domains.

## 1. Binding product direction

VVIP TIGER is now a **social-network-first platform**.

The first product objective is functional familiarity with the established Facebook social-network interaction model to approximately **99.9% at the behavior/procedure level** across applicable core social functions. This is a product-behavior reference, not permission to copy proprietary source code, trademarks, logos, copyrighted assets, private APIs, or a pixel-for-pixel protected visual identity.

The implementation must therefore make familiar social actions immediately understandable while retaining an original VVIP TIGER visual system, brand, codebase, copy where appropriate, security model, and architecture.

## 2. Functional reference scope

The Social Core current scope includes, as product domains:

1. registration, sign-in, session recovery and account access;
2. profile and identity presentation;
3. friend requests, friendship lifecycle, following and relationship state;
4. Home Feed and chronological/relevance-ready feed contracts;
5. text, image and later approved media publishing;
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

The functional map may expand as the Facebook reference evolves, but additions must be mapped to a TIGER domain and reviewed for legal, privacy, safety, security and product fit before implementation.

## 3. Familiarity rule

For a familiar social action, prefer the established user mental model unless there is a documented reason to improve it.

Examples:

- Home is primarily a social feed, not a marketplace landing page;
- creating a normal post is a first-class action;
- Friends, Messages and Notifications are first-class navigation concepts;
- Profile is a first-class destination;
- Marketplace is reachable as a module/destination without replacing Home;
- interaction states must be obvious and reversible where the reference behavior is reversible;
- privacy audience and destructive actions must be explicit rather than hidden behind ambiguous UI.

## 4. Originality and IP boundary

The 99.9% target applies to **functional coverage, procedures, interaction semantics and user familiarity**, not literal copying.

VVIP TIGER must not:

- copy Facebook/Meta source code or non-public implementation details;
- use Facebook/Meta trademarks, logos or proprietary assets as TIGER assets;
- reproduce a protected screen pixel-for-pixel merely to create visual identity confusion;
- depend on undocumented/private Facebook APIs;
- falsely imply affiliation with or endorsement by Meta.

VVIP TIGER may implement common social-network patterns using its own code, semantic design tokens, information architecture details and VVIP TIGER brand system.

## 5. Product hierarchy

Current product hierarchy is:

`VVIP TIGER Social Platform`

→ `Social Core`

→ optional/adjacent modules such as `Marketplace`, `Pulse paid visibility`, `Pages`, `Groups`, and later approved products.

Marketplace/FUSION remains valuable current implementation and historical product work. It is **repositioned**, not discarded: it becomes the Marketplace module and may reuse proven search, publication, media, policy and entitlement infrastructure where compatible.

## 6. Monetization compatibility

This authority does not replace TIGER Pulse Ring monetization rules.

Current paid-visibility authority remains:

`docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`

Ordinary compliant publishing remains free where that authority says it is free. No marketplace checkout, escrow, delivery, settlement, warranty execution or platform-run buyer/seller transaction dispute layer is introduced by this social decision.

Future social monetization requires a separate explicit owner decision and must not be inferred from Facebook behavior.

## 7. Security and identity preservation

This product migration does not silently replace current trusted identity/security authority.

Current Clerk/federated identity boundaries, RLS, SOA/SCG, Trust Fabric, OIDC release controls, media fortress, immutable-release rules, authorization invariants, ledger controls and fail-closed behavior remain binding where compatible.

Cognito/passkeys or another identity provider may be evaluated later, but migration is not authorized merely by the Golden Architecture target. Any identity-provider transition requires an explicit ADR, migration plan, rollback plan and security review.

## 8. Architecture direction

Implementation must follow the current **TIGER Golden Architecture 2026** principles:

- Managed-first;
- Modular-first;
- Event-ready;
- Global-ready;
- start with a modular monolith rather than premature microservices;
- preserve clear extraction seams for future high-scale services;
- GitHub Actions + OIDC for cloud trust rather than long-lived cloud credentials;
- container-ready deployment path using Docker/ECR/ECS Fargate when the current runtime reaches that migration gate;
- Aurora PostgreSQL Serverless v2 as the target relational data direction when migration is approved;
- ElastiCache Serverless for Valkey as the target cache direction when needed;
- S3/CloudFront/WAF for managed media/edge/security capabilities when migration is approved;
- SQS/EventBridge/Lambda for asynchronous/event seams when justified;
- AppSync Events or an equivalent managed realtime layer when realtime extraction is justified;
- OpenSearch Serverless when search scale/function requires it;
- OpenTelemetry as the observability instrumentation contract;
- AWS CDK as the current AWS-first IaC preference, subject to repository ADR and migration gates.

Kubernetes/EKS, Aurora DSQL, DynamoDB feed storage, broad microservice decomposition and multi-region active-active deployment are future options, not immediate implementation requirements.

## 9. Migration rule

The migration is additive and evidence-driven.

For each social slice:

1. identify current runtime behavior and authority;
2. write the behavioral contract/test first where practical;
3. implement the smallest compatible Social Core slice;
4. preserve current security/privacy/data invariants;
5. keep Marketplace functionality reachable while demoting Marketplace-first navigation where the Social Core replaces it;
6. remove dual/current conflicting authority only after the replacement passes gates;
7. pass exact-head verification before convergence is claimed.

No direct write to `main` is authorized by this document.

## 10. Initial implementation order

The first implementation wave is:

1. Social App Shell / global navigation;
2. Home Feed semantics;
3. normal Post Composer;
4. Profile entry point;
5. Friends entry point and relationship-state contract;
6. Messages entry point;
7. Notifications entry point;
8. Marketplace as a first-class module but not Home authority;
9. privacy/safety affordances;
10. progressively deeper social functions through tested vertical slices.

## 11. Supersession

Where prior FUSION/TIGER ONE product language says the whole platform is primarily an advertising/discovery/marketplace product, that **product-identity clause is superseded** by this Social Core authority.

The underlying Marketplace, Pulse, search, media, publication, authorization, security and operational work is not automatically superseded; it is retained and reused where compatible as module infrastructure.

## 12. Owner acceptance statement

> **Build VVIP TIGER first as a social network whose applicable core behavior and procedures are approximately 99.9% familiar to a Facebook user, then improve and differentiate TIGER. Keep VVIP TIGER original in code, brand and protected visual assets. Make Home social-first, keep Marketplace as a module, preserve current security/identity protections, and migrate by tested slices without writing directly to main.**
