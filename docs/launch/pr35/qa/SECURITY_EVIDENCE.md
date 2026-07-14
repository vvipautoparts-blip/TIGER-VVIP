# PR35 Security QA Working Evidence

Baseline: `c71ecbddd00d91f5ee5414e86e74cbbbdb168d84`
Branch: `feat/pr35-owner-control-tiger-care-foundation`

## Pass 02 — permissions, assignments, policy, and audit core

Timestamp: `2026-07-14T14:40:01Z` (UTC)

### TDD RED

Command:

```sh
node --test tests/pr35/contracts.test.mjs tests/pr35/sanitize.test.mjs tests/pr35/policy-scope.test.mjs tests/pr35/audit.test.mjs tests/pr35/assignment-repository.test.mjs
```

Result: exit `1`; `0` passed, `5` failed. Each test file failed with
`ERR_MODULE_NOT_FOUND` for its not-yet-created PR35 domain module.

### Focused domain and abuse matrix GREEN

Command:

```sh
node --test --test-isolation=none --test-reporter=spec tests/pr35/contracts.test.mjs tests/pr35/sanitize.test.mjs tests/pr35/policy-scope.test.mjs tests/pr35/audit.test.mjs tests/pr35/assignment-repository.test.mjs
```

Result: exit `0`; `16` tests passed, `0` failed, `0` skipped, `0` todo;
duration `46.993351ms`.

Covered executable scenarios: exact frozen catalogs and role bundles; bounded
pagination and operation keys; Unicode-safe normalization; unknown and
prototype-pollution key rejection; complete scope ancestry; default deny;
inactive, expired, suspended-account, and invalidated-session denial;
permission and scope decisions; self-elevation, unowned-permission,
equal/higher-authority, scope-ceiling, and owner-control denial; deterministic
SHA-256 audit chaining; reason and secret-field rejection; append-only audit;
volatile assignment create/suspend/revoke and idempotency; and missing-config
or offline remote enforcement denial.

### Syntax and integrity

Commands:

```sh
find scripts/pr35 tests/pr35 -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | xargs -0 -n1 node --check
git diff --check
sort -c docs/launch/pr35/CHANGED_FILES.allowlist
```

Result: all three commands exited `0` with no output.

### Historical smoke status

Command: `./scripts/qa-smoke.sh`

Result: exit `1`. All checks through sanitized client recovery logging passed;
the legacy PR30 database-scope guard then reported
`forbidden PR30 scope changed: docs/launch/pr35/ARCHITECTURE_AND_DATA_FLOW.md`
and `scripts/pr35/`. These are allowlisted PR35 additions, but the historical
smoke script has not yet been updated for PR35; that update belongs to the
later aggregate-QA pass. This is recorded as unresolved and is not represented
as a PASS.

### Conclusion and limits

Pass 02 focused security behavior is executable and green. The repository is
memory-only and makes no remote, browser-storage, or production mutation. The
remote interface fails closed, but it is not a production authorization
boundary; future trusted RPC/RLS enforcement remains required. Tests under
`tests/` are ignored by the repository's existing `.gitignore`, so the outer
orchestrator must explicitly include the allowlisted PR35 tests when preparing
the final commit.
