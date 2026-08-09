# PRG v1 — Production Release Gate Execution Plan

## Goal

Advance VVIP TIGER from verified H2/PCG/EHG state to the last safe point before Production mutations and deployment, performing every read-only, Staging, static, evidence, and governance task without repeated owner intervention.

## Global constraints

- Exact release source H2: `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`.
- Never mutate `main` during PRG preparation.
- Never deploy Production during PRG preparation.
- Never mutate Production DB without an exact owner-bound authorization capsule.
- Never activate a country implicitly.
- Never seed an owner implicitly.
- Never store raw provider secrets in Git evidence.
- Fail closed on any source, migration, provider, or environment drift.

## Task 1 — Freeze PRG baseline

Create `reports/prg/v1/baseline.json` recording:
- H2;
- Phase B migration path/hash;
- IDENTITY-01 migration path/blob/hash;
- PCG closure reference;
- EHG closure reference;
- Production authority flags all false.

## Task 2 — Read-only proof automation

Create a branch-scoped workflow that:
- verifies current `main` remains exact H2;
- verifies Phase B migration bytes match the frozen digest;
- verifies IDENTITY-01 migration bytes match the frozen digest;
- verifies PCG v1 closure from its control branch;
- verifies EHG v1 closure from its control branch;
- verifies `TIGER_DEFAULT_COUNTRY_CODE` is not introduced in repository Production configuration;
- emits only sanitized proof.

The workflow MUST have `contents: read` only and no deployment, environment write, attestation write, or database credential access.

## Task 3 — IDENTITY-01 Staging proof

When Supabase Staging is reachable:
- resolve current Staging branch/project identity at runtime;
- verify it is not the Production ref;
- read migration ledger and current resolver definition;
- classify whether IDENTITY-01 is absent, already canonical, or drifted;
- if absent and Staging is authorized, apply only `20260808_vvip_identity_fail_closed_profile_resolver.sql`;
- test subject-first behavior in a transaction with rollback;
- prove arbitrary browser `p_email` cannot claim an existing unbound profile;
- prove a signed JWT email may only return `identity_migration_required` for an unbound legacy profile;
- prove exact-subject lookup succeeds;
- prove synthetic residue is zero;
- record sanitized evidence.

No Production database operation is permitted in this task.

## Task 4 — Production read-only preflight

When Supabase Production is reachable:
- verify Production project ref exactly `zelcngyyvbomuzokvuxo`;
- read migration ledger twice to detect races;
- inspect only schema/function metadata and zero-sensitive aggregate facts needed for release classification;
- determine Phase B and IDENTITY-01 states;
- make no DDL/DML changes;
- produce an exact DB authorization candidate capsule if mutation is required.

## Task 5 — Clerk Production readiness

Without changing Clerk settings:
- verify the Production publishable key candidate remains bound to `clerk.tigerautoparts.shop` through its non-secret payload metadata already captured by PCG;
- mark custom-domain/DNS readiness as external-human/provider verification if no connector can prove it;
- keep Google/SSO/provider setup separate unless required by the chosen launch authentication path.

## Task 6 — Build intervention queue

Create `reports/prg/v1/owner-intervention-queue.md` containing only actions that genuinely require the owner or a platform UI not exposed to the agent.

The queue must distinguish:
- mandatory before Production DB;
- mandatory before Web deploy;
- optional/post-launch.

## Task 7 — Update project state

Create/update `MASTER_PROJECT_STATE.md` on the PRG control branch with:
- current immutable release source;
- completed gates;
- current blockers;
- next machine-executable actions;
- owner intervention queue;
- explicit Production authority=false.

Do not merge this state file into `main` automatically.

## Task 8 — Stop at sovereign authorization

Only after all non-owner prerequisites are green, prepare exact immutable authorization capsule(s).

Do not interpret general approval, prior pin approval, merge approval, or PRG adoption as Production authority.