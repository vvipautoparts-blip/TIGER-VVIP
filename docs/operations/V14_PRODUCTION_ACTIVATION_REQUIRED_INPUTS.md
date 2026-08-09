# V14 production activation — external inputs

Code and CI fail closed until these externally managed values exist in GitHub
Environments/Secrets. Public publishable values are injected at build time; no
secret or service-role key is permitted in the browser artifact.

## GitHub environment: `production-build`

Required secrets:

- `TIGER_CLERK_PUBLISHABLE_KEY` — a Clerk **production** publishable key (`pk_live_...`).
- `TIGER_SUPABASE_URL` — the HTTPS URL of the Production Supabase project.
- `TIGER_SUPABASE_PUBLISHABLE_KEY` — a Supabase publishable or legacy anon key; never service-role/secret.

Required variable:

- `TIGER_DEFAULT_COUNTRY_CODE` — ISO alpha-2 code of an activated market, e.g. `JO` only after its country seal is ACTIVE and VALID.

## Provider configuration

1. Configure Clerk as a Supabase Third-Party Auth provider.
2. Add the production domain and callback URLs in Clerk.
3. Apply numbered migrations only after local reset, remote ledger reconciliation, backup and restore rehearsal.
4. Create the authority principal/assignments and country seal from official approved inputs. The migration intentionally seeds none.
5. Protect both `production-build` and `github-pages` environments with reviewers and prevent self-review.

## Release decision

Production deployment is eligible only when the generated
`release-manifest.json` has `releaseEligible=true`, references the exact deployed
SHA, all quality gates pass, and GitHub environment protection approves the job.
