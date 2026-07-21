# PR34 Hour 1 — QA Evidence

Date: 2026-07-14
Branch: `feat/pr34-listing-persistence-runtime`
Final gate status: **FAIL — legacy smoke scope-lock blocker**

## Baseline and scope evidence

- `pwd` returned the repository root.
- `git branch --show-current` returned `feat/pr34-listing-persistence-runtime`.
- Initial `git status --short` was empty.
- HEAD was `c71ecbd`, the merged PR33 baseline.
- No SQL, migration, auth, service worker, production configuration, remote command, commit, push, PR, or merge operation was performed.

## Executed checks

### Focused contract tests

Command:

```text
node --check scripts/listing/listing-contract.js
node --check scripts/listing/listing-repository.js
node --check scripts/listing/listing-contract.test.js
node --test scripts/listing/listing-contract.test.js
```

Result: PASS. The test process exited 0 and exercised numeral normalization, strict positive price validation, sector/category/status allowlists, injection sanitization, deterministic errors, image ordering/cover rules, canonical timestamps, idempotent create/update, owner isolation, bounded pagination, and the fail-closed remote-ready interface.

### PR34 focused gate

Final command:

```text
./scripts/qa-pr34-hour1.sh
```

Final result: PASS, exit 0.

The gate passed shell and JavaScript syntax, focused behavior, credential/persistence/network/static scope guards, PR33 accessibility regression assertions, and `git diff --check`.

Three earlier gate attempts failed and were root-caused before the final pass:

1. The first remote-command regex falsely matched local `Array.from(...)`; the pattern was narrowed to actual Supabase-client signatures.
2. The PR33 accessibility file has no executable bit in this checkout; the gate now invokes the unchanged baseline through `bash`.
3. After expanding whitespace coverage to untracked PR34 files, Markdown hard-break spaces were detected and removed.

### Existing PR33 accessibility

Command:

```text
bash scripts/qa-pr33-accessibility.sh
```

Result: PASS, exit 0. Summary-warning semantics and safe publish information-action semantics passed.

### Existing smoke

Command:

```text
bash scripts/qa-smoke.sh
```

Result: FAIL, exit 1.

All emitted PR29, PR30, PR31, PR32, and PR33 runtime/readiness/accessibility checks passed before the final historical diff-scope check. The exact blocker was:

```text
[smoke][fail] forbidden PR30 scope changed: docs/launch/pr34/CHANGE_CONTROL_MANIFEST.md
```

The smoke script hard-codes `docs/` as forbidden PR30 scope at `scripts/qa-smoke.sh:1183-1186`. PR34 explicitly requires new documentation under `docs/`, so the unchanged historical script cannot return zero in this authorized worktree. A disposable-index compatibility attempt was also unable to make this check applicable because the script intentionally compares the worktree to `HEAD`; no baseline test file was modified or weakened.

### Whitespace

Command:

```text
git diff --check
```

Result: PASS, exit 0. It is also included in the passing focused gate.

## Security and scope review

- New runtime contains no browser persistence, cookie access, filesystem persistence, logging, network request, database client construction, remote CLI command, or image byte handling.
- The local adapter is volatile, clones outputs, filters reads by owner, preserves immutable identity fields, and bounds list requests to 50.
- The remote-ready adapter has no configuration or implementation and fails closed.
- No privileged database credential strings, access/refresh-token fields, client secrets, private keys, or authorization payloads were found by the focused gate.
- Only the files declared in the PR34 manifest are present as worktree changes.

## Honest completion decision

The PR34 implementation and focused gate pass, and the relevant PR33 assertions pass. The overall required smoke command does not pass because of its obsolete PR30 documentation scope lock. Under the owner instruction that every required check must pass before claiming success, Hour 1 is recorded as **FAIL** pending owner direction or a separately authorized update to the historical smoke scope policy.
