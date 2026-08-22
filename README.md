# VVIP TIGER

VVIP TIGER is a security-first social, discovery, advertising, and direct-contact platform under controlled development.

## Current product surface

The current convergence authority is the exact head of PR #320 on `feat/final-release-closure-20260822`, together with the owner authority registry and checks from that same SHA. A PR number, branch name, document, screenshot, or historical deployment is never sufficient evidence by itself.

Current implementation surfaces include:

- `index.html` — the unified social Home and Marketplace/discovery entry surface;
- `scripts/social/` — feed, composer, friends, reactions, comments, search, and bounded runtime adapters;
- `styles/tiger-social/core-shell.css` — the active social shell and mobile presentation;
- `styles/tiger-one/` — the active TIGER ONE design tokens and typography;
- Clerk — external identity and authentication runtime;
- Supabase — subject/RLS-controlled data and storage layer;
- VVIP-owned authorization, moderation, audit, and release controls.

The Home presentation keeps familiar social-network interaction patterns while retaining independent TIGER branding and implementation. Unimplemented capabilities are omitted from the UI rather than presented as dead or disabled controls.

## Constitutional proximity boundary

The owner-authoritative platform boundary is:

`DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS`

TIGER reduces the distance between a person's intent and a relevant person, entity, content, advertisement, product listing, or service provider. For external deals, TIGER does not negotiate, agree, order, checkout, collect deal value, escrow, fulfill, ship, settle, guarantee, or earn a transaction-value commission or success fee.

TIGER finance is limited to TIGER-owned advertising, ad credits/campaigns, and explicitly approved platform-owned services. Advertising revenue is independent of whether an external deal occurs, succeeds, or has any particular value.

The binding interaction model is:

- `SHARE = DISTRIBUTE`
- `••• = CONTROL`
- `CONTACT = HANDOFF → TIGER STOPS`

A control is rendered only when its real capability, authorization, policy, and runtime contract exist. No capability means no button.

The machine/human governance entrypoint for these rules is `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` together with the current owner-control references.

## Source of truth

Repository bytes, the exact branch SHA/tree, and checks from that same SHA are the implementation source of truth. Historical videos, screenshots, deployment notes, archived state files, and superseded PRs are evidence only.

A valid review surface must be built from the exact current head without modifying `main` or Production. A retired GitHub Pages address or historical preview must never be represented as the current build.

## Identity architecture

VVIP TIGER is federated-identity only. The binding decision is recorded in [Federated Identity Sovereignty ADR](docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md) and enforced by [federated-identity-policy.v1.json](project-control/security/federated-identity-policy.v1.json).

Key rules:

- no first-party VVIP passwords or local password recovery;
- authentication is delegated to approved external identity providers;
- canonical account identity is the verified external issuer + subject, not email;
- no automatic account linking solely by email;
- provider secrets and private signing keys never enter browser code;
- VVIP TIGER retains ownership of authorization, roles, account status, RLS, and audit evidence.

## Runtime and release boundary

`scripts/runtime/vvip-runtime-loader.js` obtains the current external Clerk session token for Supabase while disabling browser session persistence and automatic token refresh. Database authorization remains subject/RLS controlled.

`tools/vvip_public_release.py` builds the public artifact from an exact allowlist and rejects retired or unsafe production markers. Repository checkout is not itself a deployable artifact.

No branch preview, documentation edit, or successful local build grants Production deployment authority. Production promotion remains separately gated by exact-SHA evidence and the protected release workflow.

## Local development preview

Run:

```bash
python -m http.server 800
```

Then open `http://localhost:800/index.html`. This local address is only for development and is not a shareable branch Preview.

## Verification

- Focused tests: run the relevant `node --test` or Python unittest target.
- Smoke checks: `./scripts/qa-smoke.sh`.
- Full repository gate: `bash scripts/quality-gate.sh`.

Do not describe a branch as ready until the required checks for its exact current head are GREEN. CI success alone does not establish protected-staging, Production, device, disaster-recovery, observability, or legal/country evidence.