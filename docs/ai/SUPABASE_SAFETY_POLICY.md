# Supabase safety policy — VVIP TIGER

This policy applies to all humans and AI agents working on TIGER-VVIP.

## Production project reference

- Known production Supabase project ref: **`zelcngyyvbomuzokvuxo`**
- This ref appears in `supabase/config.toml` as `project_id` for tooling context.
- **Do not assume** the workspace is safely linked to production until an independent, owner-approved check confirms linkage and intent.

## Prohibited without explicit owner approval

- `supabase db reset` against production or any shared live project
- `supabase db push` (local → remote schema apply)
- `supabase migration repair`
- `supabase link` to production
- Disabling **RLS** or dropping security policies on live data
- Displaying or copying **`service_role`** keys, `sbp_*` access tokens, or database URLs with embedded passwords

## RLS and migrations

- New migrations must preserve or strengthen RLS unless a documented exception is owner-approved.
- Run **`scripts/security/p08-steel-shield/scan-dangerous-sql.sh`** on migration changes in review.
- Agents **must not edit** `supabase/migrations/` unless the task explicitly includes migration work and follows the pipeline below.

## Migration promotion pipeline

Every migration change must pass, in order:

1. **Local validation** — SQL review, dangerous-SQL scan, local tests as applicable
2. **Preview / development** — apply only on non-production projects per owner setup
3. **BLACKBOX review** — read-only; migrations and RLS called out explicitly
4. **GitHub Actions** — `VVIP Quality Gate` (includes scans; no live Supabase calls)
5. **Owner approval** — written go/no-go for production
6. **Production** — executed only by owner or approved runbook, never by autonomous agents

## Edge functions

- Phone verification: `supabase/functions/phone-verification/` — deploy only via owner-approved process (`AGENTS.md` notes `npm exec --yes supabase -- functions deploy phone-verification` when authorized).

## Runtime browser keys

Optional client keys (`TIGER_SUPABASE_URL`, `TIGER_SUPABASE_ANON_KEY`) are **anon**-scope only; never commit service credentials.

## If unsure

Stop and ask the project owner. Default is **no remote mutation**.
