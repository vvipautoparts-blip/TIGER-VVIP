# TIGER Social Core + Golden Architecture — Implementation Plan

> **Execution status:** `HISTORICAL EXECUTION RECORD / S0 INPUT ONLY`. Completed Social Core work remains implementation evidence. The current cursor and all future SYNAPSE/VERITY work are governed by `docs/superpowers/plans/2026-08-18-tiger-synapse-v2-verity-fabric-program-execution.md`; this file may not act as a competing current plan.

**Date:** 2026-08-18
**Branch:** `feat/tiger-one-living-surface-impl-20260818`
**Base authority branch:** `feat/tiger-one-living-surface-spec-20260818`

## Goal

Migrate the current Marketplace-first FUSION surface toward the OWNER-approved Social-first VVIP TIGER product through tested vertical slices, preserving current security/runtime capabilities and keeping Marketplace available as a module.

## Non-negotiable constraints

- no direct writes to `main`;
- no Production deployment in this implementation PR;
- no AWS/Supabase/Clerk mutation merely because the target architecture names those services;
- preserve current Clerk/federated identity authority until a separate identity migration is approved;
- preserve fail-closed authorization/RLS/media/release controls;
- no big-bang rewrite;
- no premature Kubernetes/microservice migration;
- each product slice starts with a failing behavioral test where practical;
- Marketplace remains reachable while losing whole-product Home authority.

## Task 0 — Restore design-system GREEN

**Tests:** `tests/tiger-one-design-system.test.cjs`

1. Confirm RED is caused only by missing TIGER ONE token/type files.
2. Add `styles/tiger-one/tokens.css`.
3. Add `styles/tiger-one/type.css`.
4. Re-run the repository quality gate and require both semantic-token tests to pass.

## Task 1 — Social application shell

**New test:** `tests/tiger-social-core-shell.test.cjs`

Test contract before implementation:

- authoritative app declares `data-tiger-social-app`;
- global navigation exposes Home, Friends, Messages, Notifications, Profile and Marketplace semantic destinations;
- Home is identified as social-feed authority;
- normal post composer exists separately from Marketplace listing composer;
- current Marketplace selectors remain present so the existing module continues to operate;
- TIGER ONE design-system styles are loaded;
- no Facebook/Meta asset or brand authority is introduced.

Implementation:

- update `index.html` shell without removing current FUSION runtime hooks;
- add `styles/tiger-social/core-shell.css` for layout/semantic states;
- add a minimal `scripts/social/core-shell.js` only for local shell behavior that does not mint server authority;
- preserve Clerk auth gate and existing protected action wiring.

## Task 2 — Social navigation behavior

**Test first:** navigation-state test.

- Home activates Social Feed surface;
- Friends/Messages/Notifications/Profile open bounded current placeholders/sheets until their domain backends exist;
- Marketplace activates the existing Marketplace module;
- browser/history/hash behavior remains deterministic;
- no placeholder claims a backend action succeeded.

## Task 3 — Post composer foundation

**Test first:** distinguish Social Post from Marketplace Listing.

- social composer is first-class;
- listing composer remains a separate commercial action;
- social publishing transport is an adapter boundary, not local trusted publication;
- audience/privacy contract is explicit before protected publish;
- UI may draft locally but cannot claim server publication until confirmed.

## Task 4 — Social Graph vertical slice

**Test first:** relationship state machine.

States initially modeled:

`none → request_sent → friends`

with cancel/decline/unfriend paths and fail-closed invalid transitions.

Implementation must separate UI optimism from server-confirmed relationship authority.

## Task 5 — Feed interaction primitives

**Test first:** post/reaction/comment/share/save contracts.

- feed item stable ID;
- author/profile reference;
- audience state;
- reaction state;
- comment/reply hierarchy;
- share/repost semantics;
- save/bookmark private state;
- Marketplace recommendations must be typed distinctly from social posts.

## Task 6 — Messaging + notifications seams

**Test first:** conversation/notification contracts.

- message send/read state;
- notification categories;
- transport/realtime adapter boundaries;
- no client-owned authorization;
- future AppSync Events seam can replace transport without changing domain contracts.

## Task 7 — Search/privacy/safety

- reuse F04 current search authority until an explicit migration;
- add people/social-content query types through the same authority path;
- block/mute/report and audience privacy contracts are fail-closed;
- later OpenSearch is an infrastructure migration, not a second search authority.

## Task 8 — Golden Architecture infrastructure ADRs

Create independent ADRs before any runtime migration for:

- Docker/ECR/ECS Fargate;
- AWS CDK;
- Aurora PostgreSQL Serverless v2;
- ElastiCache Serverless for Valkey;
- S3/CloudFront/WAF;
- SQS/EventBridge/Lambda;
- AppSync Events;
- OpenTelemetry;
- OpenSearch Serverless.

Each ADR must include current state, target state, security boundary, cost guardrail, rollback path and migration evidence.

## Current execution checkpoint

Execution starts with Task 0 and Task 1. The current runtime is intentionally preserved while the shell is migrated. No claim of Facebook-complete functional parity is permitted until the later Social Core domain slices and gap matrix are implemented and verified.
