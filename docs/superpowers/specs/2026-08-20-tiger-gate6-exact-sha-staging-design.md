# TIGER Gate 6 — Exact-SHA Staging Design

## Status

Owner-approved architecture for Gate 6. This document defines a non-Production staging path only. It does not authorize merge to `main`, Production deployment, Production database mutation, Production credentials, or real payment processing.

## Goal

Turn Gate 6 from `APPROVED / not implemented` into a fail-closed, evidence-backed **Exact-SHA Staging** gate where the browser surface, backend, data, credentials, storage, and payment mode are all isolated from Production and the resulting evidence is bound to one exact Git commit SHA.

## Current authority and baseline

- Repository: `vvipautoparts-blip/TIGER-VVIP`.
- Gate 5 verified baseline SHA before Gate 6 design work: `79c3719b01ff91da3b339086c96e1b2fbf0adb27`.
- Gate 6 registry state at design time: `APPROVED`, evidence `Not implemented/verified on current train`.
- Production barricade remains active.
- Production Supabase project reference is known as `zelcngyyvbomuzokvuxo` and is forbidden as a Gate 6 target.
- Existing Production Pages promotion remains Production-only and MUST NOT be reused as the Staging deploy path.

## Architecture decision

Gate 6 uses two independently isolated provider surfaces:

1. **Frontend Staging: Cloudflare Pages**
   - HTTPS endpoint.
   - Exact-SHA deployment identity.
   - Public runtime artifact built from the repository allowlist/build authority, not from an uncontrolled repository-root upload.
   - No Production credentials embedded in browser output.

2. **Backend Staging: dedicated Supabase project**
   - Separate project from Production, with a distinct project ref and URL.
   - Migrations applied only to the Staging project after local validation.
   - Staging publishable/anon key only in the client runtime.
   - Service-role or database secrets never committed and never exposed to the browser.
   - Storage, Auth, Realtime, and database data are Staging-only.

## Alternatives rejected

### Reuse GitHub Pages for Staging

Rejected because the existing Pages promotion workflow is explicitly a Production artifact promotion path bound to `main`. Reusing it would weaken environment authority and create an ambiguous deployment surface.

### Vercel Hobby for Staging

Rejected for this project because the free Hobby plan is not an appropriate basis for the platform's commercial staging surface.

### Supabase development branch on Production project as final Gate 6 target

Rejected as the final Gate 6 architecture because Gate 6 requires stronger provider/project isolation and a clean non-Production authority boundary. A dedicated Staging project makes project identity, credentials, data, storage, logs, and lifecycle independently auditable.

## Environment authority

The Staging runtime must set and verify:

- `TIGER_ENVIRONMENT=staging`
- `TIGER_SUPABASE_URL=<staging project URL>`
- `TIGER_SUPABASE_PUBLISHABLE_KEY=<staging publishable key>`
- `TIGER_CLERK_PUBLISHABLE_KEY=<staging/test publishable key if Clerk is active in this Gate>`
- `TIGER_MEDIA_FINALIZER_URL=<staging/sandbox endpoint or explicitly disabled staging stub>`
- `TIGER_DEFAULT_COUNTRY_CODE=<non-authoritative staging default>`

The build/deploy pipeline must reject:

- `TIGER_ENVIRONMENT=production`.
- Supabase project ref `zelcngyyvbomuzokvuxo`.
- Any URL or config value matching the known Production backend authority.
- Secret/service-role/database-password shaped values in browser artifacts.
- Missing or ambiguous backend binding.

## Data and identity isolation

Gate 6 uses synthetic or sanitized fixture data only.

Required invariants:

- No Production database copy.
- No Production user export/import.
- No Production storage bucket copy.
- No Production session/token reuse.
- Synthetic fixture identities must be visibly non-real and deterministically reproducible.
- Fixture loader must be idempotent or cleanly resettable inside Staging only.
- Staging Auth users, if required, are test identities only.

## Storage isolation

Staging storage must use only the Staging Supabase project. Evidence must record the Staging project ref and confirm it is not the forbidden Production ref. Any media fixture must be synthetic and non-sensitive.

## Payments isolation

Gate 6 never processes real money.

- Advertising-payment integrations, if present in the runtime, must be disabled or sandbox/test-mode only.
- Marketplace buyer/seller or service-provider/beneficiary payments remain outside TIGER entirely.
- Evidence must record `payment_mode=disabled` or `payment_mode=sandbox`.
- Any live/Production payment credential causes a fail-closed Gate 6 failure.

## Exact-SHA deployment contract

A Gate 6 deployment is eligible only when all of the following refer to the same 40-character Git SHA:

- checked-out source SHA;
- artifact manifest `source_sha`;
- staging evidence manifest `source_sha`;
- GitHub Actions workflow `head_sha`;
- Cloudflare deployment metadata recorded by the workflow;
- smoke-test target evidence.

A branch name, PR number, mutable URL, screenshot, or human statement is never sufficient identity.

## Staging artifact

The Staging artifact must be produced by a dedicated Gate 6 builder that reuses the repository's release allowlist/build authority where practical, while injecting only Staging-safe public configuration.

The artifact must contain a machine-readable manifest with at least:

```json
{
  "schema_version": 1,
  "environment": "staging",
  "source_sha": "<40-char sha>",
  "backend": {
    "provider": "supabase",
    "project_ref": "<staging ref>",
    "url_origin": "https://<staging-ref>.supabase.co"
  },
  "frontend": {
    "provider": "cloudflare-pages",
    "https": true,
    "deployment_id": "<provider deployment id>",
    "url": "https://<deployment>.pages.dev"
  },
  "data_mode": "synthetic",
  "payment_mode": "disabled-or-sandbox",
  "production_ref_forbidden": "zelcngyyvbomuzokvuxo",
  "eligible": true
}
```

Secrets must never appear in this manifest.

## Workflow design

Add a dedicated GitHub Actions workflow for Gate 6 with these phases:

1. **Source identity** — checkout exact PR head and verify a 40-character SHA.
2. **Contract tests** — run Gate 6 unit/contract tests before provider mutation.
3. **Quality/security closure** — run repository Quality Gate and staging-specific secret/config scanners.
4. **Build** — produce the exact-SHA Staging artifact and pre-deploy manifest.
5. **Backend identity check** — resolve only the configured Staging Supabase ref and reject Production ref.
6. **Schema rehearsal/apply** — apply migrations to Staging only through an explicitly configured Staging authority; never run against Production.
7. **Synthetic seed** — load deterministic synthetic fixtures only.
8. **Frontend deploy** — deploy exact artifact to Cloudflare Pages over HTTPS.
9. **Runtime smoke tests** — verify HTTPS, environment marker, backend binding, synthetic-data read path, and fail-closed Production boundary.
10. **Evidence seal** — emit a final evidence JSON and artifact bound to the exact SHA.

Provider mutation phases must be gated by explicit Staging credentials/configuration. Missing credentials produce a clear `BLOCKED_PROVIDER` result, never a false PASS.

## Evidence 10/10 definition

Gate 6 closes the previously missing tenth evidence item only when all ten items below are present on the same exact SHA:

1. Focused Gate 5 inherited contract evidence remains green on the Gate 6 head.
2. Repository Quality Gate passes.
3. Security Critical/High remains zero.
4. Full-history secret gate remains green or is inherited with exact-head policy satisfaction.
5. DB migration rehearsal passes.
6. Gate 6 contract tests pass.
7. Dedicated Supabase Staging identity is proven and Production ref is rejected.
8. Synthetic/sanitized data mode is proven.
9. HTTPS Cloudflare Pages deployment is proven from the exact artifact.
10. Runtime smoke test proves the deployed frontend is bound to the dedicated Staging backend and the final evidence manifest is sealed to the same exact SHA.

If any item is missing, Gate 6 is not `VERIFIED` and evidence remains below 10/10.

## Fail-closed rules

Gate 6 MUST fail when any of the following occurs:

- deployment target resolves to Production Supabase project ref;
- Staging backend is unbound;
- frontend deploy is not HTTPS;
- exact SHA differs between source/artifact/deployment evidence;
- synthetic-data proof is absent;
- browser artifact contains a service-role key, DB password, or private provider token;
- payment mode is live/Production;
- smoke test cannot prove frontend-to-Staging binding;
- provider API response is missing the identity needed to seal evidence.

Transient provider/network failures may be retried on the same SHA when no source byte changed. Code or configuration defects require a new SHA and a full evidence refresh.

## Repository changes

Expected focused units:

- `.github/workflows/tiger-gate6-exact-sha-staging.yml` — orchestration and evidence upload.
- `scripts/gate6/build-staging-artifact.*` — build public artifact plus pre-deploy manifest.
- `scripts/gate6/verify-staging-config.*` — validate environment/provider identity and reject Production authority.
- `scripts/gate6/seed-synthetic.*` — deterministic Staging-only fixture seed path.
- `scripts/gate6/verify-runtime.*` — HTTPS/runtime/backend-binding smoke verification.
- `tests/tiger-gate6-*.test.*` — focused contract tests for all fail-closed rules.
- `docs/owner-control/TIGER_2026_SOVEREIGN_EXECUTION_REGISTRY.json` — update Gate 5/Gate 6 status only after exact-head evidence supports the change.
- `docs/MASTER_PROJECT_STATE.md` — current human state after evidence closure.

File extensions and exact integration points must follow the existing repository conventions discovered during implementation; no unrelated framework migration is permitted.

## Provider credentials and configuration

The repository must reference provider credentials only through secret/config authorities, never literals in Git.

Expected logical authorities:

- Cloudflare account/project identifier and API token with least privilege for the Staging Pages project only.
- Supabase Staging project ref, URL, publishable key, and server-side migration credential scoped to Staging only.
- Optional Clerk test/staging publishable configuration if authentication is exercised by Gate 6.

The absence of a provider credential is an external blocker, not permission to fall back to Production, GitHub Pages Production promotion, or another unapproved provider.

## Testing strategy

TDD is mandatory for Gate 6 repository changes.

Minimum test groups:

- Production Supabase ref rejection.
- Production environment rejection.
- malformed/non-HTTPS frontend URL rejection.
- source SHA mismatch rejection.
- backend `UNBOUND` rejection.
- secret-shaped browser config rejection.
- synthetic-data mode requirement.
- live-payment mode rejection.
- valid Staging manifest acceptance.
- evidence sealing consistency.

After focused tests, run the complete Quality Gate, Steel Shield/security scans, DB rehearsal, and exact-head GitHub Actions closure.

## Rollback and cleanup

Gate 6 Staging is disposable and independent.

- Frontend deployments may be rolled back or removed without affecting Production.
- Synthetic Staging data may be reset only inside the Staging project.
- No rollback action may target Production resources.
- A failed Gate 6 deployment remains evidence of failure; it must not be relabeled as PASS.

## Completion criteria

Gate 6 is `VERIFIED` only when:

- dedicated non-Production Supabase project identity is proven;
- exact-SHA Cloudflare Pages HTTPS deployment succeeds;
- synthetic-data and payment-isolation requirements pass;
- runtime smoke tests prove frontend/backend binding;
- all Quality/Security/DB checks are green on the same Gate 6 head;
- final evidence is 10/10;
- PR evidence is updated accurately;
- no merge to `main` and no Production deployment has occurred.

Anything less remains `BLOCKED_PROVIDER`, `IN_PROGRESS`, or failed according to the actual evidence.
