# VVIP TIGER Clean-room Report

Overall result: **PASS**

## Inventory summary

- Files: 1097
- Directories: 164
- Symlinks: 4
- Git-tracked paths: 612
- Git-ignored paths observed: 569

## Acceptance gates

| Gate | Result | Findings |
| --- | --- | ---: |
| `broken_symlinks` | PASS | 0 |
| `forbidden_legacy_identifiers` | PASS | 0 |
| `git_diff_check` | PASS | 0 |
| `local_reference_integrity` | PASS | 0 |
| `package_manager_consistency` | PASS | 0 |
| `portable_workspace_paths` | PASS | 0 |
| `production_supabase_references` | PASS | 0 |
| `scope` | PASS | 0 |
| `secret_scan` | PASS | 0 |
| `tracked_duplicate_explanations` | PASS | 0 |
| `tracked_garbage` | PASS | 0 |
| `unique_migration_versions` | PASS | 0 |
| `walk_errors` | PASS | 0 |

## Package manager

Authoritative package manager: **none**.

## Exact duplicate analysis

- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/tomli/py.typed`, `.venv/lib/python3.12/site-packages/pip/_vendor/tomli_w/py.typed` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/packaging/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/LICENSE` — requires canonical-file proof
- unexplained: `.venv/bin/pip`, `.venv/bin/pip3`, `.venv/bin/pip3.12` — requires canonical-file proof
- intentional: `docs/global/OLD_TO_GLOBAL_PHASE_RECONCILIATION_AR.md`, `project-control/docs/OLD_TO_GLOBAL_PHASE_RECONCILIATION_AR.md` — project-control package mirror
- intentional: `clerk-private-profile.html`, `private-profile.html` — route compatibility aliases
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/cachecontrol/LICENSE.txt`, `.venv/lib/python3.12/site-packages/pip/_vendor/cachecontrol/LICENSE.txt` — requires canonical-file proof
- intentional: `docs/global/GLOBAL_LAUNCH_DEFINITION_OF_DONE_AR.md`, `project-control/docs/GLOBAL_LAUNCH_DEFINITION_OF_DONE_AR.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/msgpack/COPYING`, `.venv/lib/python3.12/site-packages/pip/_vendor/msgpack/COPYING` — requires canonical-file proof
- intentional: `docs/global/IMPLEMENTATION_BLOCKERS_AR.md`, `project-control/docs/IMPLEMENTATION_BLOCKERS_AR.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/resolvelib/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/resolvelib/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/certifi/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/certifi/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/pkg_resources/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/pkg_resources/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/rich/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/rich/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/tomli/LICENSE`, `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/tomli_w/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/tomli/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/tomli_w/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/pyproject_hooks/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/pyproject_hooks/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/truststore/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/truststore/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/platformdirs/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/platformdirs/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/urllib3/LICENSE.txt`, `.venv/lib/python3.12/site-packages/pip/_vendor/urllib3/LICENSE.txt` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/pygments/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/pygments/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/packaging/LICENSE.BSD`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/LICENSE.BSD` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/idna/LICENSE.md`, `.venv/lib/python3.12/site-packages/pip/_vendor/idna/LICENSE.md` — requires canonical-file proof
- intentional: `docs/global/GLOBAL_ARCHITECTURE_DECISION_AR.md`, `project-control/docs/GLOBAL_ARCHITECTURE_DECISION_AR.md` — project-control package mirror
- intentional: `docs/superpowers/specs/2026-07-20-global-platform-control-plane-design.md`, `project-control/docs/superpowers/specs/2026-07-20-global-platform-control-plane-design.md` — project-control package mirror
- intentional: `docs/global/FAITH_AND_CULTURAL_INTEGRITY_POLICY_AR.md`, `project-control/docs/FAITH_AND_CULTURAL_INTEGRITY_POLICY_AR.md` — project-control package mirror
- intentional: `docs/global/GLOBAL_SCALE_AND_SLO_SPEC_AR.md`, `project-control/docs/GLOBAL_SCALE_AND_SLO_SPEC_AR.md` — project-control package mirror
- intentional: `docs/launch/pr35/CHANGED_FILES.allowlist`, `docs/launch/pr35/CHANGED_FILES.final` — change-control verification pair
- intentional: `docs/global/GLOBAL_EXECUTION_CHARTER_AR.md`, `project-control/docs/GLOBAL_EXECUTION_CHARTER_AR.md` — project-control package mirror
- intentional: `docs/global/GLOBAL_SEARCH_EXPERIENCE_SPEC_AR.md`, `project-control/docs/GLOBAL_SEARCH_EXPERIENCE_SPEC_AR.md` — project-control package mirror
- intentional: `docs/superpowers/plans/2026-07-20-global-platform-control-plane-implementation.md`, `project-control/docs/superpowers/plans/2026-07-20-global-platform-control-plane-implementation.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/requests/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/requests/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/packaging/LICENSE.APACHE`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/LICENSE.APACHE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/distro/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/distro/LICENSE` — requires canonical-file proof
- intentional: `project-control/database/001_project_control_schema.sql`, `supabase/migrations/202607200001_project_control_schema.sql` — source package and deployable migration
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/distlib/LICENSE.txt`, `.venv/lib/python3.12/site-packages/pip/_vendor/distlib/LICENSE.txt` — requires canonical-file proof
- intentional: `project-control/database/002_project_control_seed.sql`, `supabase/migrations/202607200002_project_control_core_seed.sql` — source package and deployable migration
- intentional: `project-control/database/003_project_control_extended_seed.sql`, `supabase/migrations/202607200003_project_control_extended_seed.sql` — source package and deployable migration

The complete deterministic path inventory and redacted finding details are in the JSON report.
