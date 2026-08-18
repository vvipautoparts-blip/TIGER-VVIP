# VVIP TIGER

VVIP TIGER is a security-first social and marketplace platform under controlled development.

## Current product surface

The current implementation direction is the TIGER Social Core on PR #271:

- `index.html` — the unified social Home and Marketplace entry surface;
- `scripts/social/` — feed, composer, friends, reactions, and bounded runtime adapters;
- `styles/tiger-social/core-shell.css` — the active social shell and mobile presentation;
- `styles/tiger-one/` — the active TIGER ONE design tokens and typography;
- Clerk — external identity and authentication runtime;
- Supabase — subject/RLS-controlled data and storage layer;
- VVIP-owned authorization, moderation, audit, and release controls.

The Home presentation uses a compact TIGER header, social tabs, a social composer, a Stories presentation, and Facebook-familiar post interaction patterns while retaining independent TIGER branding and implementation.

## Source of truth

Repository bytes, the exact branch SHA, and checks from that same SHA are the implementation source of truth. Historical videos, screenshots, deployment notes, and archived state files are evidence only.

The retired GitHub Pages address is not an accepted preview of PR #271 and must not be shared as the current TIGER Social build. A valid review link must be an isolated preview built from the exact PR #271 head without modifying `main` or Production.

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

Do not describe a branch as ready until the checks for its exact current head are GREEN.
