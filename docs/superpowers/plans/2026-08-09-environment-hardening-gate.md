# Environment Hardening Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent any VVIP TIGER Production build or GitHub Pages deployment from proceeding without an independent human reviewer, exact production branch scope, and non-bypassable environment protection.

**Architecture:** GitHub Environments remain the enforcement authority. `production-build` protects access to the verified Production configuration and build job; `github-pages` independently protects the actual deployment job. Both environments are restricted to `main`, require the independent collaborator `nzuodezuode-byte`, prevent self-review where GitHub exposes that option, and disallow administrator bypass. No deployment is authorized by this plan.

**Tech Stack:** GitHub Environments, GitHub Actions, GitHub Pages, repository `vvipautoparts-blip/TIGER-VVIP`.

## Global Constraints

- Frozen application source remains H2: `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`.
- PCG v1 is closed with `PCG_VALUES_VERIFIED_ARTIFACT_ELIGIBLE`.
- Production deploy authority remains `false` throughout EHG.
- Production database mutation authority remains `false` throughout EHG.
- Country activation authority remains `false` throughout EHG.
- Do not modify the three verified `production-build` environment secrets.
- Do not add `TIGER_DEFAULT_COUNTRY_CODE`.
- Reviewer account: `nzuodezuode-byte` (GitHub user id `310225379`, repository role `write`).

---

### Task 1: Freeze current environment state

**Files:**
- Create: `reports/ehg/v1/baseline.json`

**Interfaces:**
- Consumes: GitHub REST environment state.
- Produces: immutable before-state for post-change comparison.

- [ ] Record `production-build`: `can_admins_bypass=true`, no protection rules, no deployment branch policy.
- [ ] Record `github-pages`: `can_admins_bypass=true`, branch policy enabled, only branch rule `main`.
- [ ] Record reviewer eligibility: `nzuodezuode-byte` has `write` access.

### Task 2: Harden `production-build`

**GitHub Settings target:**
- Required reviewers: `nzuodezuode-byte`.
- Prevent self-review: enabled if exposed by GitHub UI/API.
- Administrator bypass: disabled.
- Wait timer: disabled / zero.
- Deployment branches and tags: selected branches/tags only.
- Allowed branch rule: `main` only.
- No tag rule.
- Existing environment secrets unchanged.
- Environment variables remain empty.

- [ ] Apply the target settings through GitHub Environment settings.
- [ ] Re-read the environment and branch policies from GitHub REST.
- [ ] Fail closed if reviewer, bypass state, or branch rule differs from target.

### Task 3: Harden `github-pages`

**GitHub Settings target:**
- Required reviewers: `nzuodezuode-byte`.
- Prevent self-review: enabled if exposed by GitHub UI/API.
- Administrator bypass: disabled.
- Wait timer: disabled / zero.
- Deployment branches and tags: selected branches/tags only.
- Preserve the existing sole branch rule `main`.

- [ ] Apply the target settings through GitHub Environment settings.
- [ ] Re-read the environment and branch policies from GitHub REST.
- [ ] Fail closed if reviewer, bypass state, or branch rule differs from target.

### Task 4: Prove the human gate without deploying

**Evidence target:**
- A production workflow attempt must not reach the protected environment job without reviewer approval.
- No reviewer approval is supplied during the proof.
- No Production deployment occurs.

- [ ] Trigger or observe a safe workflow execution that targets the hardened environment.
- [ ] Verify the run/job is waiting for environment approval or otherwise blocked by the configured protection rule.
- [ ] Verify no `Deploy exact verified artifact` step executes.
- [ ] Record workflow/run/job identifiers and deployment state.

### Task 5: Close EHG

**Files:**
- Create: `reports/ehg/v1/closure.json`

- [ ] Record exact post-hardening environment states.
- [ ] Record branch-policy evidence.
- [ ] Record human-gate proof.
- [ ] Assert `environment_hardening_gate=CLOSED` only if both environments satisfy target controls.
- [ ] Assert `production_deployed=false`, `production_database_mutated=false`, `country_activated=false`.
- [ ] Set next gate to `PRODUCTION_RELEASE_GATE` without granting Production authority.
