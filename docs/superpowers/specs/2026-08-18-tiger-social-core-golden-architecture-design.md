# VVIP TIGER Social Core + Golden Architecture 2026 — Design Specification

**Date:** 2026-08-18
**Status:** OWNER APPROVED / CURRENT DESIGN INPUT
**Authority:** `docs/owner-control/TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md`

## Objective

Turn the existing VVIP TIGER/FUSION runtime into a social-network-first product through bounded, testable slices while preserving the proven security, media, publication, marketplace and release infrastructure already in the repository.

The product target is near-complete functional familiarity with the Facebook social model for applicable core behaviors. The implementation remains original VVIP TIGER software and visual identity.

## Product architecture

The product is one platform with modular domains:

```text
VVIP TIGER
├── Identity & Session
├── Profile
├── Social Graph
├── Home Feed
├── Posts & Media
├── Comments & Replies
├── Reactions
├── Sharing & Saves
├── Messaging
├── Notifications
├── Search & Discovery
├── Privacy & Safety
├── Pages
├── Groups
├── Marketplace
├── Pulse / Paid Visibility
└── Administration & Moderation
```

### Rule: modular monolith first

The initial implementation remains deployable as one coherent application/runtime while domain boundaries are explicit in code, data contracts and events.

A domain may be extracted into a separately deployed service only when one or more of these are proven:

- materially different scaling profile;
- materially different availability/SLO requirement;
- independent deployment cadence creates measurable value;
- security isolation requires a process boundary;
- data-access pattern is demonstrably unsuitable for the shared relational core;
- operational evidence shows extraction reduces rather than adds risk.

Microservice count is not a success metric.

## UX architecture

### Primary navigation

The authenticated primary navigation must converge on these familiar destinations:

- Home;
- Friends;
- Messages;
- Notifications;
- Profile;
- Marketplace;
- Search/Discovery.

The first five are Social Core. Marketplace is a module destination.

### Home

Home becomes a social feed surface. Marketplace inventory may be recommended in explicitly identified placements, but Marketplace listings do not define the entire Home feed.

### Composer

A normal social post composer becomes a first-class interaction. Marketplace listing creation remains a distinct commercial composer/action.

The two actions must not be conflated:

- **Post** = social publication;
- **Listing/Ad** = Marketplace/commercial publication.

### Familiar semantics

Use familiar interaction semantics for friendship, follow, reaction, comment, reply, share, save, message, notification and audience/privacy state. TIGER may improve presentation or reduce friction, but departures from common behavior require an explicit product rationale.

## Existing-system preservation

The current repository contains valuable working systems. Migration must reuse or wrap them where compatible rather than rewriting them by default:

- Clerk/federated identity authority;
- fail-closed profile resolution and RLS controls;
- F04 search fabric;
- F05/Media Fortress processing;
- FUSION publication transport;
- Marketplace sector/context logic;
- Pulse paid-visibility authority;
- GitHub OIDC and release attestations;
- current quality gate and security scans.

Any replacement must prove parity and migration safety before the old authority is disconnected.

## Target managed infrastructure

The target architecture is AWS-first and managed-first, introduced only through explicit migration gates.

```text
Clients (Web / Android / iOS)
        │
        ▼
Route 53
        │
        ▼
CloudFront + AWS WAF
        │
 ┌──────┴─────────┐
 ▼                ▼
S3 Media      Application
                  │
            ECS + Fargate
                  │
     ┌────────────┼──────────────┐
     ▼            ▼              ▼
Aurora PG       Valkey      SQS/EventBridge
Serverless v2  Serverless         │
                                  ▼
                            Lambda workers

Search: OpenSearch Serverless when justified
Realtime: AppSync Events when justified
Observability: OpenTelemetry contract
IaC: AWS CDK
CI/CD trust: GitHub Actions OIDC → temporary AWS role
Registry: Amazon ECR
```

### Migration boundary

This specification does **not** authorize an immediate big-bang migration from the current runtime/data stack to all target AWS services.

Each infrastructure migration needs:

1. ADR;
2. threat/failure review;
3. data migration/rollback plan where applicable;
4. tests and observability;
5. cost guardrail;
6. staged cutover;
7. exact-head release verification.

## Identity direction

The existing trusted identity authority remains current. Cognito/passkeys can be evaluated as a future capability but are not an implicit replacement.

No identity-provider migration may occur without explicit OWNER/security approval and dual-authority avoidance.

## Data strategy

### Initial target

Aurora PostgreSQL Serverless v2 is the default future relational target for account/profile/social relational data when the migration is approved.

### Future specialized stores

- DynamoDB may later hold feed/timeline high-volume access patterns if metrics justify it.
- Aurora DSQL may later be evaluated for strongly consistent multi-region SQL requirements.
- Neither is required for the initial Social Core.

### Cache

ElastiCache Serverless for Valkey may provide hot-object caching, rate limits, counters, sessions/presence helpers and feed acceleration when measured need exists. Cache never becomes source of truth for protected authority.

## Event strategy

The modular monolith must expose durable domain-event seams without requiring every action to be asynchronous immediately.

Candidate events include:

- `PostCreated`;
- `PostAudienceChanged`;
- `FriendRequestCreated`;
- `FriendshipAccepted`;
- `ReactionChanged`;
- `CommentCreated`;
- `MessageCreated`;
- `NotificationRequested`;
- `MarketplaceListingPublished`;
- `MediaFinalized`;
- `ContentReported`.

Events must carry stable identifiers and minimum necessary data. Security/privacy authority remains server-side and events cannot mint entitlements.

## Realtime strategy

Realtime is required for messaging, typing/presence where approved, and prompt notification delivery. A managed realtime layer is preferred over a self-managed websocket fleet when the migration gate is reached.

Realtime transport does not become authorization authority; every protected subscription/publish action must be server-authorized.

## Search strategy

Reuse current F04 search authority while Social Core is introduced. OpenSearch Serverless is a later scaling/search-capability target, not a reason to create a second current search authority now.

## Observability

OpenTelemetry is the instrumentation contract for future application metrics, traces and logs.

Minimum social product telemetry must distinguish:

- request success/failure/latency;
- feed load latency;
- post publish latency/failure;
- media processing outcome;
- friendship state transition outcome;
- message delivery outcome;
- notification enqueue/delivery outcome;
- search latency/no-result rate;
- security/authorization denial categories without leaking sensitive data.

No raw secrets, private message bodies, uploaded media bytes or sensitive free-form error payloads belong in telemetry.

## Security baseline

Existing stricter compatible controls remain binding:

- least privilege;
- temporary cloud credentials through OIDC;
- fail closed on missing trusted authority;
- server-side authorization;
- RLS/data-scope enforcement;
- signed/verified release provenance;
- secret scanning;
- dangerous-SQL review;
- media isolation/sanitization;
- evidence/audit for protected operational actions.

## Future seams intentionally reserved

The architecture must leave room for, without prematurely deploying:

- EKS/Kubernetes;
- separate Feed service;
- dedicated Messaging service;
- DynamoDB timeline/feed stores;
- Aurora DSQL;
- multi-region active-active;
- service mesh;
- cross-cloud portability;
- advanced AI ranking/moderation;
- TIGER Sovereign Nexus operational/security modules.

## Implementation waves

### Wave 1 — Social shell

- social-first application marker and nav;
- Home/Friends/Messages/Notifications/Profile/Marketplace entry points;
- normal Post composer separated from Listing composer;
- preserve current Marketplace/runtime wiring.

### Wave 2 — Social graph + profile

- relationship-state model;
- friend request send/cancel/accept/decline;
- follow/unfollow where applicable;
- profile social sections;
- privacy contracts.

### Wave 3 — Feed + publishing

- normal post contract;
- audience controls;
- feed items;
- reactions;
- comments/replies;
- share/save.

### Wave 4 — Messaging + notifications

- conversations;
- send/read state;
- notification categories;
- realtime seam.

### Wave 5 — Search + safety + communities

- people/social content search;
- block/mute/report;
- activity controls;
- Pages/Groups where approved.

### Wave 6 — Marketplace integration

- Marketplace remains fully reachable;
- social/profile/share bridges;
- Pulse integration under current monetization authority;
- no unauthorized platform checkout.

## Acceptance criteria for the migration program

The program is considered correctly aligned when:

- Home is social-first;
- Marketplace no longer defines the entire product identity;
- familiar Social Core destinations exist and are progressively functional;
- post publishing and Marketplace listing creation are distinct;
- current identity/security authority is preserved until an explicit migration;
- current quality/security gates remain enforced;
- every implemented slice has tests or equivalent automated evidence;
- no direct `main` writes occur;
- future infrastructure choices are represented by clean seams/ADRs rather than premature deployment.
