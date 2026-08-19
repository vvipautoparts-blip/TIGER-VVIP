# TIGER Exact-SHA Preview Guard — Implementation Plan

**Goal:** Make an isolated owner Preview impossible to label valid unless its exact source, environment isolation, staging backend, synthetic data, public configuration safety, and deployment evidence are machine-verifiable.

**Parent:** TIGER Sovereign Living System 2026 / Slice 2.

**Base:** verified TSLS Slice 1 head `eca97874ed42dc689b09f630e9b31a0f0c7c4ff6`.

## Invariants

- Never mutate `main` or Production to create Preview.
- Never reuse the retired Pages URL as evidence.
- Preview must expose exact commit identity and be visibly `PREVIEW`/`STAGING`.
- Backend identity must be explicitly non-Production.
- Seed data must be synthetic/sanitized.
- Browser configuration must contain no service-role/admin/private secret material.
- A URL alone is never proof; deployment evidence must bind URL + exact SHA.
- Missing evidence => `BLOCKED`.

## Task 1 — TDD contract

Add fail-closed tests for `evaluatePreviewCandidate()`:

1. missing/invalid exact SHA => `BLOCKED / INVALID_COMMIT_SHA`;
2. `environment !== PREVIEW` => blocked;
3. `backend.environment !== STAGING` => blocked;
4. Production backend identifiers => blocked;
5. missing synthetic seed proof => blocked;
6. secret-like browser configuration keys (`service_role`, admin/private/secret material) => blocked;
7. missing HTTPS deployment URL/evidence => blocked for `R4_OWNER_PREVIEW`;
8. a complete isolated exact-SHA candidate => `SAFE`.

## Task 2 — Minimal evaluator

Create:

- `project-control/preview-guard/contract.v1.json`
- `project-control/scripts/preview_guard.mjs`

The evaluator returns deterministic `{decision, eligible, reasons}` and never defaults to success.

## Task 3 — Preview evidence builder

Create a dependency-free script that writes a non-secret manifest containing:

- schema version;
- commit SHA;
- optional tree SHA;
- environment = `PREVIEW`;
- backend environment = `STAGING`;
- synthetic seed evidence refs;
- public build digest/evidence refs;
- deployment URL only after a provider has actually returned HTTPS evidence.

Without deployment evidence, the manifest must remain `BLOCKED` for R4.

## Task 4 — CI guard

Add a PR-safe workflow that:

- checks out exact PR head;
- runs Preview Guard tests/evaluator;
- builds/verifies the public Preview artifact without deploying to Production Pages;
- uploads the sealed candidate artifact and evidence manifest;
- never requests Pages write permission;
- never uses Production secrets.

## Task 5 — Provider boundary

A live HTTPS deployment is allowed only through a connected provider/environment that can create an isolated preview without replacing the active Production surface. If no such provider is connected, report `R4_OWNER_PREVIEW = BLOCKED_PROVIDER` rather than fabricating a URL or reusing Production Pages.
