# PRG v1 — Consolidated Owner Intervention Queue

This file intentionally contains **only** actions that cannot be completed autonomously with the currently connected tools or that must remain a sovereign human authorization.

Everything else should be executed by the technical agent before asking the owner to return.

## A. Mandatory before Production database mutation

### A1 — Exact Production DB authorization

Do not authorize yet merely from this document. The technical agent must first re-read the exact final candidate capsule and confirm no drift.

Expected future exact phrase:

```text
APPROVE_PRODUCTION_DB_EXACT
```

Scope when activated later:

- Production Supabase ref: `zelcngyyvbomuzokvuxo` only.
- Apply exactly one migration if state is unchanged:
  `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Frozen SHA-256:
  `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- No standalone IDENTITY-01 reapply while current Production resolver remains semantically canonical.
- No country activation.
- No owner seeding.
- No business/listing/user seeding.
- No broad `db push`.

The phrase becomes valid only after the technical agent presents a fresh no-drift capsule for owner review.

## B. Mandatory before public custom-domain Web deployment

### B1 — Clerk Production DNS

Current Clerk Production instance exists and the public key resolves to:

```text
clerk.tigerautoparts.shop
```

The Clerk setup UI still requires its Production DNS records to be connected. This action needs the DNS provider/registrar UI because no DNS connector is available.

When the owner returns:

1. Open Clerk Production setup.
2. Select **Domains → Connect / Add DNS records**.
3. Provide the exact DNS records shown by Clerk to the technical agent or enter them at the DNS provider exactly as instructed.
4. Do not expose any `sk_live_...` secret.

### B2 — GitHub Pages custom domain

GitHub Pages API currently reports:

```text
cname = null
html_url = https://vvipautoparts-blip.github.io/TIGER-VVIP/
```

while repository H2 contains:

```text
CNAME -> tigerautoparts.shop
```

The GitHub Pages custom-domain setting must therefore be configured/verified as:

```text
tigerautoparts.shop
```

This is a GitHub Settings UI action because the connected GitHub tools do not expose Pages configuration writes.

### B3 — Exact Web deployment authorization

A future exact phrase will be requested only after:

- Production DB post-apply proof is green;
- Clerk DNS is ready;
- GitHub Pages custom domain is configured;
- PRG revalidates H2/PCG/EHG and provider state with no drift.

Expected future phrase:

```text
APPROVE_PRODUCTION_WEB_EXACT
```

It is not valid before the final Web release capsule is presented.

## C. Human approvals enforced by GitHub during actual release

The hardened Environments require independent reviewer:

```text
nzuodezuode-byte
```

with self-review prevented and admin bypass disabled.

During an actual authorized release, the reviewer account will need to approve:

1. `production-build` before the build can access Production environment secrets or start its first step.
2. `github-pages` before `Deploy exact verified artifact` can execute.

These approvals are deliberately non-automatable.

## D. Not required for the current dark-launch release gate

The following must **not** be bundled into the above interventions unless separately chosen:

- `TIGER_DEFAULT_COUNTRY_CODE` — remain absent.
- Country activation — separate sovereign business/legal gate.
- Owner seeding — separate authority initialization gate.
- Google SSO custom credentials — configure only if Google sign-in is required as a launch provider; Clerk-hosted authentication itself is the current external identity runtime.
- Passkeys/paid Clerk features — optional unless explicitly adopted.

## Current owner-intervention count

At this stage there are only four mandatory human classes remaining:

1. Clerk DNS connection.
2. GitHub Pages custom-domain configuration.
3. Exact Production DB authorization.
4. Actual protected Environment approvals + later exact Web authorization.

All technical verification and preparation around these items remains agent-owned.