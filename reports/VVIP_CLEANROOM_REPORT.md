# VVIP TIGER Clean-room Report

Overall result: **FAIL**

## Inventory summary

- Files: 2245
- Directories: 310
- Symlinks: 4
- Git-tracked paths: 671
- Git-ignored paths observed: 1787

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

- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/autocommand-2.2.2.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/backports.tarfile-1.2.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/importlib_metadata-8.7.1.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco.text-4.0.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco_context-6.1.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco_functools-4.4.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/more_itertools-10.8.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging-26.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/platformdirs-4.4.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/tomli-2.4.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel-0.46.3.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/zipp-3.23.0.dist-info/INSTALLER` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/attrs-26.1.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/iniconfig-2.3.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/jsonschema-4.23.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/jsonschema_specifications-2025.9.1.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/packaging-26.2.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/pluggy-1.6.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/pygments-2.20.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/pytest-9.1.1.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/referencing-0.37.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/rpds_py-2026.6.3.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/setuptools-83.0.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/typing_extensions-4.16.0.dist-info/INSTALLER`, `.venv/lib/python3.12/site-packages/wheel-0.47.0.dist-info/INSTALLER` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco.text-4.0.0.dist-info/top_level.txt`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco_context-6.1.0.dist-info/top_level.txt`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco_functools-4.4.0.dist-info/top_level.txt` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/tomli/py.typed`, `.venv/lib/python3.12/site-packages/pip/_vendor/tomli_w/py.typed`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/tomli/py.typed` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging-26.2.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/more_itertools-10.8.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging-26.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/tomli-2.4.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel-0.46.3.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/typing_extensions-4.16.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/wheel-0.47.0.dist-info/WHEEL` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/attrs-26.1.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/pygments-2.20.0.dist-info/WHEEL` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/jsonschema_specifications-2025.9.1.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/referencing-0.37.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/platformdirs-4.4.0.dist-info/WHEEL` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/iniconfig-2.3.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/importlib_metadata-8.7.1.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco_context-6.1.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco_functools-4.4.0.dist-info/WHEEL`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/zipp-3.23.0.dist-info/WHEEL` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel-0.46.3.dist-info/entry_points.txt`, `.venv/lib/python3.12/site-packages/wheel-0.47.0.dist-info/entry_points.txt` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging-26.2.dist-info/licenses/LICENSE`, `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/packaging/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/LICENSE`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging-26.0.dist-info/licenses/LICENSE` — requires canonical-file proof
- unexplained: `.venv/bin/py.test`, `.venv/bin/pytest` — requires canonical-file proof
- unexplained: `.venv/bin/pip`, `.venv/bin/pip3`, `.venv/bin/pip3.12` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/tomli/_types.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/tomli/_types.py` — requires canonical-file proof
- intentional: `docs/global/OLD_TO_GLOBAL_PHASE_RECONCILIATION_AR.md`, `project-control/docs/OLD_TO_GLOBAL_PHASE_RECONCILIATION_AR.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/packaging/__init__.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/__init__.py` — requires canonical-file proof
- intentional: `clerk-private-profile.html`, `private-profile.html` — route compatibility aliases
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/cachecontrol/LICENSE.txt`, `.venv/lib/python3.12/site-packages/pip/_vendor/cachecontrol/LICENSE.txt` — requires canonical-file proof
- intentional: `docs/global/GLOBAL_LAUNCH_DEFINITION_OF_DONE_AR.md`, `project-control/docs/GLOBAL_LAUNCH_DEFINITION_OF_DONE_AR.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/msgpack/COPYING`, `.venv/lib/python3.12/site-packages/pip/_vendor/msgpack/COPYING` — requires canonical-file proof
- intentional: `docs/global/IMPLEMENTATION_BLOCKERS_AR.md`, `project-control/docs/IMPLEMENTATION_BLOCKERS_AR.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/resolvelib/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/resolvelib/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/metadata.py`, `.venv/lib/python3.12/site-packages/wheel/metadata.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/_setuptools_logging.py`, `.venv/lib/python3.12/site-packages/wheel/_setuptools_logging.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/certifi/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/certifi/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/_commands/unpack.py`, `.venv/lib/python3.12/site-packages/wheel/_commands/unpack.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/pkg_resources/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/pkg_resources/LICENSE`, `.venv/lib/python3.12/site-packages/setuptools-83.0.0.dist-info/licenses/LICENSE`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/backports.tarfile-1.2.0.dist-info/LICENSE`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco.text-4.0.0.dist-info/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/rich/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/rich/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/jsonschema_specifications-2025.9.1.dist-info/licenses/COPYING`, `.venv/lib/python3.12/site-packages/referencing-0.37.0.dist-info/licenses/COPYING` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/tomli/LICENSE`, `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/tomli_w/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/tomli/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/tomli_w/LICENSE`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/tomli-2.4.0.dist-info/licenses/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/jaraco_functools-4.4.0.dist-info/licenses/LICENSE`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/zipp-3.23.0.dist-info/licenses/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/pyproject_hooks/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/pyproject_hooks/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/truststore/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/truststore/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/platformdirs/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/platformdirs/LICENSE`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/platformdirs-4.4.0.dist-info/licenses/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/urllib3/LICENSE.txt`, `.venv/lib/python3.12/site-packages/pip/_vendor/urllib3/LICENSE.txt` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/bdist_wheel.py`, `.venv/lib/python3.12/site-packages/wheel/bdist_wheel.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel-0.46.3.dist-info/licenses/LICENSE.txt`, `.venv/lib/python3.12/site-packages/wheel-0.47.0.dist-info/licenses/LICENSE.txt` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/_structures.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/_structures.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/pygments/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/pygments/LICENSE`, `.venv/lib/python3.12/site-packages/pygments-2.20.0.dist-info/licenses/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging-26.2.dist-info/licenses/LICENSE.BSD`, `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/packaging/LICENSE.BSD`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/LICENSE.BSD`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging-26.0.dist-info/licenses/LICENSE.BSD` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/idna/LICENSE.md`, `.venv/lib/python3.12/site-packages/pip/_vendor/idna/LICENSE.md` — requires canonical-file proof
- intentional: `docs/global/GLOBAL_ARCHITECTURE_DECISION_AR.md`, `project-control/docs/GLOBAL_ARCHITECTURE_DECISION_AR.md` — project-control package mirror
- intentional: `docs/superpowers/specs/2026-07-20-global-platform-control-plane-design.md`, `project-control/docs/superpowers/specs/2026-07-20-global-platform-control-plane-design.md` — project-control package mirror
- intentional: `docs/global/FAITH_AND_CULTURAL_INTEGRITY_POLICY_AR.md`, `project-control/docs/FAITH_AND_CULTURAL_INTEGRITY_POLICY_AR.md` — project-control package mirror
- intentional: `docs/global/GLOBAL_SCALE_AND_SLO_SPEC_AR.md`, `project-control/docs/GLOBAL_SCALE_AND_SLO_SPEC_AR.md` — project-control package mirror
- intentional: `docs/launch/pr35/CHANGED_FILES.allowlist`, `docs/launch/pr35/CHANGED_FILES.final` — change-control verification pair
- intentional: `docs/global/GLOBAL_EXECUTION_CHARTER_AR.md`, `project-control/docs/GLOBAL_EXECUTION_CHARTER_AR.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/packaging/errors.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/errors.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/_musllinux.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/_musllinux.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging/_musllinux.py` — requires canonical-file proof
- intentional: `docs/global/GLOBAL_SEARCH_EXPERIENCE_SPEC_AR.md`, `project-control/docs/GLOBAL_SEARCH_EXPERIENCE_SPEC_AR.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/_commands/pack.py`, `.venv/lib/python3.12/site-packages/wheel/_commands/pack.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/_elffile.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/_elffile.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging/_elffile.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/pygments/styles/_mapping.py`, `.venv/lib/python3.12/site-packages/pygments/styles/_mapping.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/pygments/formatters/_mapping.py`, `.venv/lib/python3.12/site-packages/pygments/formatters/_mapping.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/_commands/tags.py`, `.venv/lib/python3.12/site-packages/wheel/_commands/tags.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/_tokenizer.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/_tokenizer.py` — requires canonical-file proof
- intentional: `docs/superpowers/plans/2026-07-20-global-platform-control-plane-implementation.md`, `project-control/docs/superpowers/plans/2026-07-20-global-platform-control-plane-implementation.md` — project-control package mirror
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/_metadata.py`, `.venv/lib/python3.12/site-packages/wheel/_metadata.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/platformdirs/macos.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/platformdirs/macos.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/licenses/__init__.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/licenses/__init__.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/platformdirs/android.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/platformdirs/android.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/platformdirs/api.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/platformdirs/api.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/_manylinux.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/_manylinux.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging/_manylinux.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/utils.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/utils.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/requests/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/requests/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging-26.2.dist-info/licenses/LICENSE.APACHE`, `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/packaging/LICENSE.APACHE`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/LICENSE.APACHE`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging-26.0.dist-info/licenses/LICENSE.APACHE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/dependency_groups.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/dependency_groups.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip/_vendor/platformdirs/unix.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/platformdirs/unix.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/direct_url.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/direct_url.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/distro/LICENSE`, `.venv/lib/python3.12/site-packages/pip/_vendor/distro/LICENSE` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/_parser.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/_parser.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/cli-32.exe`, `.venv/lib/python3.12/site-packages/setuptools/cli.exe` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/gui-32.exe`, `.venv/lib/python3.12/site-packages/setuptools/gui.exe` — requires canonical-file proof
- intentional: `project-control/database/001_project_control_schema.sql`, `supabase/migrations/202607200001_project_control_schema.sql` — source package and deployable migration
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/_commands/convert.py`, `.venv/lib/python3.12/site-packages/wheel/_commands/convert.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/pip-26.1.2.dist-info/licenses/src/pip/_vendor/distlib/LICENSE.txt`, `.venv/lib/python3.12/site-packages/pip/_vendor/distlib/LICENSE.txt` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/macosx_libfile.py`, `.venv/lib/python3.12/site-packages/wheel/macosx_libfile.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/setuptools/_vendor/wheel/_bdist_wheel.py`, `.venv/lib/python3.12/site-packages/wheel/_bdist_wheel.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/pylock.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/pylock.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/metadata.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/metadata.py` — requires canonical-file proof
- unexplained: `.venv/lib/python3.12/site-packages/packaging/licenses/_spdx.py`, `.venv/lib/python3.12/site-packages/pip/_vendor/packaging/licenses/_spdx.py`, `.venv/lib/python3.12/site-packages/setuptools/_vendor/packaging/licenses/_spdx.py` — requires canonical-file proof
- intentional: `project-control/database/002_project_control_seed.sql`, `supabase/migrations/202607200002_project_control_core_seed.sql` — source package and deployable migration
- intentional: `project-control/database/003_project_control_extended_seed.sql`, `supabase/migrations/202607200003_project_control_extended_seed.sql` — source package and deployable migration

The complete deterministic path inventory and redacted finding details are in the JSON report.
