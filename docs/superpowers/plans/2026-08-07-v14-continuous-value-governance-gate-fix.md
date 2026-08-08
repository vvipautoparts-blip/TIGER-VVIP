# V14 Continuous Value Governance Gate Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the missing fail-closed Continuous Value Governance check in the V14 Quality Gate so the existing CleanGuard contract suite and integrated quality gate agree again.

**Architecture:** Use the failing exact-head CleanGuard contract test as RED evidence. Restore the single known-good `continuous_value_governance` gate from the canonical phase-one implementation immediately after Project Control validation, invoking only `node project-control/value-governance/cli.mjs --check`; do not enable delete, cleanup, execute, quarantine, purge, or production behavior.

**Tech Stack:** Bash, Node.js test runner, GitHub Actions, TIGER Project Control.

## Global Constraints

- Do not modify `main` directly.
- Do not touch production or remote Supabase.
- Do not change marketplace runtime behavior.
- Do not enable destructive CleanGuard modes.
- Preserve fail-closed behavior.
- Require exact-head CI after integration.

---

### Task 1: Restore the missing governance quality gate

**Files:**
- Modify: `scripts/quality-gate.sh`
- Test: `tests/value-governance-cli.test.cjs`

**Interfaces:**
- Consumes: `project-control/value-governance/cli.mjs --check`.
- Produces: exactly one Quality Gate named `continuous_value_governance`.

- [ ] **Step 1: Confirm RED**

Exact-head CleanGuard run `31133416584`, job `92727348599` fails:

```text
not ok 5 - quality gate invokes continuous value governance exactly once
Expected values to be strictly equal:
0 !== 1
```

The test requires exactly one occurrence of:

```text
"continuous_value_governance"
node project-control/value-governance/cli.mjs --check
```

- [ ] **Step 2: Compare the known-good implementation**

Use `feat/continuous-value-governance-phase1-20260806:scripts/quality-gate.sh` as the repository-native reference. Its gate is:

```bash
if [ -f project-control/value-governance/cli.mjs ]; then
    run_clean_gate \
        "continuous_value_governance" \
        node project-control/value-governance/cli.mjs --check
else
    echo "GATE_continuous_value_governance=SKIP"
fi
```

- [ ] **Step 3: Apply only that missing block**

Insert it immediately after `validate_project_control` and before later authority/security gates. Do not alter any neighboring gate.

- [ ] **Step 4: Verify safety contract**

The source must contain exactly one `--check` invocation and zero invocations using `--delete`, `--execute`, `--cleanup`, or `--production`.

- [ ] **Step 5: Integrate through a focused PR**

Open against `integration/v14-global-launch-readiness-20260806`, review the exact diff, then merge the fix without touching `main`.

- [ ] **Step 6: Re-run exact-head gates**

Required evidence includes:

```bash
node --test tests/value-governance-cli.test.cjs
bash scripts/quality-gate.sh
```

GitHub Actions must then re-run CleanGuard and V14 Release Candidate on the resulting integration SHA.
