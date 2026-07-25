# VVIP TIGER Clean-room Report

Overall result: **FAIL**

## Inventory summary

- Files: 1178
- Directories: 165
- Symlinks: 4
- Git-tracked paths: 671
- Git-ignored paths observed: 575

## Acceptance gates

| Gate | Result | Findings |
| --- | --- | ---: |
| `broken_symlinks` | PASS | 0 |
| `forbidden_legacy_identifiers` | PASS | 0 |
| `git_diff_check` | PASS | 0 |
| `local_reference_integrity` | FAIL | 2 |
| `package_manager_consistency` | PASS | 0 |
| `portable_workspace_paths` | PASS | 0 |
| `production_supabase_references` | PASS | 0 |
| `scope` | FAIL | 1 |
| `secret_scan` | PASS | 0 |
| `tracked_duplicate_explanations` | PASS | 0 |
| `tracked_garbage` | PASS | 0 |
| `unique_migration_versions` | PASS | 0 |
| `walk_errors` | PASS | 0 |

## Package manager

Authoritative package manager: **none**.

## Exact duplicate analysis

- unexplained: `.venv/lib/python3.12/site-packages/pip-24.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/pip-24.0.dist-info/top_level.txt` — requires canonical-file proof
- unexplained: `.venv/bin/pip`, `.venv/bin/pip3`, `.venv/bin/pip3.12` — requires canonical-file proof
- intentional: `docs/global/OLD_TO_GLOBAL_PHASE_RECONCILIATION_AR.md`, `project-control/docs/OLD_TO_GLOBAL_PHASE_RECONCILIATION_AR.md` — project-control package mirror
- intentional: `clerk-private-profile.html`, `private-profile.html` — route compatibility aliases
- intentional: `docs/global/GLOBAL_LAUNCH_DEFINITION_OF_DONE_AR.md`, `project-control/docs/GLOBAL_LAUNCH_DEFINITION_OF_DONE_AR.md` — project-control package mirror
- intentional: `docs/global/IMPLEMENTATION_BLOCKERS_AR.md`, `project-control/docs/IMPLEMENTATION_BLOCKERS_AR.md` — project-control package mirror
- intentional: `docs/global/GLOBAL_ARCHITECTURE_DECISION_AR.md`, `project-control/docs/GLOBAL_ARCHITECTURE_DECISION_AR.md` — project-control package mirror
- intentional: `docs/superpowers/specs/2026-07-20-global-platform-control-plane-design.md`, `project-control/docs/superpowers/specs/2026-07-20-global-platform-control-plane-design.md` — project-control package mirror
- intentional: `docs/global/FAITH_AND_CULTURAL_INTEGRITY_POLICY_AR.md`, `project-control/docs/FAITH_AND_CULTURAL_INTEGRITY_POLICY_AR.md` — project-control package mirror
- intentional: `docs/global/GLOBAL_SCALE_AND_SLO_SPEC_AR.md`, `project-control/docs/GLOBAL_SCALE_AND_SLO_SPEC_AR.md` — project-control package mirror
- intentional: `docs/launch/pr35/CHANGED_FILES.allowlist`, `docs/launch/pr35/CHANGED_FILES.final` — change-control verification pair
- intentional: `docs/global/GLOBAL_EXECUTION_CHARTER_AR.md`, `project-control/docs/GLOBAL_EXECUTION_CHARTER_AR.md` — project-control package mirror
- intentional: `docs/global/GLOBAL_SEARCH_EXPERIENCE_SPEC_AR.md`, `project-control/docs/GLOBAL_SEARCH_EXPERIENCE_SPEC_AR.md` — project-control package mirror
- intentional: `docs/superpowers/plans/2026-07-20-global-platform-control-plane-implementation.md`, `project-control/docs/superpowers/plans/2026-07-20-global-platform-control-plane-implementation.md` — project-control package mirror
- intentional: `project-control/database/001_project_control_schema.sql`, `supabase/migrations/202607200001_project_control_schema.sql` — source package and deployable migration
- intentional: `project-control/database/002_project_control_seed.sql`, `supabase/migrations/202607200002_project_control_core_seed.sql` — source package and deployable migration
- intentional: `project-control/database/003_project_control_extended_seed.sql`, `supabase/migrations/202607200003_project_control_extended_seed.sql` — source package and deployable migration

The complete deterministic path inventory and redacted finding details are in the JSON report.
