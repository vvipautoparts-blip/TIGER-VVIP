# VVIP TIGER — TSRF Staging Workflow Context Fix Design

## Status

Approved under the standing Global Launch Finalization authorization. This is a CI-definition repair only. It does not create Staging proof, deploy Staging/Production, change protected environment variables, weaken fail-closed checks, or authorize release.

## Observed failure

`.github/workflows/tsrf-staging-evidence.yml` declares only `workflow_dispatch`, yet GitHub creates an immediate failed run on repository pushes. The failed run has zero jobs and GitHub exposes the workflow by path rather than its declared name. This proves the failure occurs while GitHub is loading/validating the workflow definition, before the `evidence` job or any Staging proof step can execute.

The workflow currently defines this at `jobs.evidence.env`:

```yaml
RUNNER_IDENTITY: github-actions:${{ runner.os }}:${{ runner.arch }}
```

GitHub's context-availability contract allows `runner` in `jobs.<job_id>.steps.env`, but not in `jobs.<job_id>.env`. Therefore the workflow definition is invalid before dispatch.

## Root-cause fix

Make one semantic change only:

1. Remove `RUNNER_IDENTITY` from `jobs.evidence.env`.
2. Add the same expression as step-local `env` on `Package fail-closed TSRF Staging Evidence`:

```yaml
env:
  RUNNER_IDENTITY: github-actions:${{ runner.os }}:${{ runner.arch }}
```

The value remains runner-derived at execution time and reaches the same Node evidence builder through `process.env.RUNNER_IDENTITY`.

## Preserved security contract

The repair must preserve all of the following unchanged:

- trigger remains `workflow_dispatch` only;
- `source_sha` remains required;
- exact lowercase 40-character source SHA validation remains;
- checkout remains bound to the requested exact SHA;
- protected GitHub Environment remains `staging`;
- `TSRF_STAGING_IDENTITY_PROVEN` remains mandatory and must equal `true`;
- model, prompt version, max output tokens, and HTTPS identity-verifier variables remain mandatory;
- same-SHA `proof-input.json` and `source-proof.json` handoff remains mandatory;
- proof environment must remain `STAGING` and proof SHA must match the requested SHA;
- source cleanliness and exact-HEAD checks remain after evidence generation;
- no fallback, synthetic evidence, default secret, or bypass path is introduced.

## Verification strategy

Add a permanent static contract test that fails on the current definition and proves:

- `runner.*` is absent from job-level `env`;
- runner identity is present only in the package step's `env`;
- workflow still declares dispatch-only triggering;
- protected `staging` environment and fail-closed proof markers remain present.

TDD sequence:

1. RED: commit the contract before the workflow repair and observe VVIP Quality Gate fail.
2. GREEN: move the expression to step-local `env` only.
3. Verify the exact repaired HEAD with VVIP Quality Gate and Project Control.
4. Verify a normal push no longer produces a zero-job TSRF Staging Evidence failure.
5. Do **not** claim Staging evidence PASS merely because the workflow definition becomes valid. Real Staging proof still requires an explicit protected `workflow_dispatch` run with actual same-SHA proof producer handoff.

## Scope

Expected files:

- `.github/workflows/tsrf-staging-evidence.yml`
- `.github/workflows/vvip-quality-gate.yml` — stacked branch trigger only
- `tests/tsrf-staging-workflow-context.test.cjs`
- this design and implementation plan

## Hard boundaries

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `PRODUCTION_EDGE=LOCKED`
- `STAGING_PROOF=NOT_SYNTHESIZED`
- `PRODUCTION_DEPLOY=NOT_AUTHORIZED`
- `REAL_CHARGES=NOT_AUTHORIZED`
