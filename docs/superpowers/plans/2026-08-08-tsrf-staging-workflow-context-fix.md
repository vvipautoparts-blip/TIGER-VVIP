# TSRF Staging Workflow Context Fix — Implementation Plan

**Goal:** Repair the invalid GitHub Actions context placement that causes zero-job TSRF Staging Evidence failures on pushes, while preserving every fail-closed Staging evidence requirement.

**Architecture:** Keep the workflow dispatch-only and move runner-derived identity from job-level `env` to the single execution step that consumes it. Add a permanent repository contract test so unsupported context placement cannot regress.

**Tech Stack:** GitHub Actions YAML, Node.js `node:test`, existing VVIP Quality Gate.

## Constraints

- No Staging/Production deployment.
- No protected environment variable mutation.
- No proof synthesis.
- No weakening/removal of exact-SHA, identity, config, proof-handoff, or clean-tree checks.
- Draft stacked PR only.

### Task 1 — CI trigger for isolated repair branch

- [ ] Add `fix/tsrf-staging-workflow-context-20260808` to VVIP Quality Gate push triggers.
- [ ] Add `feat/lean-global-static-cdn-20260808` as an allowed PR base so the stacked repair PR receives pull-request Quality Gate evidence.

### Task 2 — TDD RED contract

- [ ] Create `tests/tsrf-staging-workflow-context.test.cjs` before modifying the TSRF workflow.
- [ ] Assert job-level `env` does not contain `${{ runner.`.
- [ ] Assert the package evidence step owns `RUNNER_IDENTITY` through step-local `env`.
- [ ] Assert dispatch-only trigger, required `source_sha`, `environment: staging`, protected identity/config checks, same-SHA proof handoff, and final source-cleanliness verification remain present.
- [ ] Commit and verify VVIP Quality Gate RED for the intended unsupported context placement.

### Task 3 — Minimal root-cause repair

- [ ] Remove only the job-level `RUNNER_IDENTITY` assignment.
- [ ] Add the identical runner identity expression to `Package fail-closed TSRF Staging Evidence` step `env`.
- [ ] Do not change the Node evidence builder input or any proof rule.

### Task 4 — Exact-head verification

- [ ] Verify VVIP Quality Gate PASS on exact repaired SHA.
- [ ] Verify Project Control Integrity actual conclusion on the same SHA.
- [ ] Verify ordinary push no longer creates a zero-job `.github/workflows/tsrf-staging-evidence.yml` failure.
- [ ] Compare exact branch scope and confirm no DB/Edge/provider/secret/deployment changes.

### Task 5 — Draft PR and truth record

- [ ] Open a Draft PR stacked on `feat/lean-global-static-cdn-20260808`.
- [ ] Record RED and GREEN exact-SHA evidence.
- [ ] State explicitly that workflow-definition health is repaired but real Staging evidence remains pending an explicit protected dispatch with actual same-SHA proof artifacts.
