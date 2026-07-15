# PR36 RED/GREEN Evidence

Recorded on 2026-07-15 UTC. No command below contacted a remote system.

## Observed RED

- `node --test tests/pr36/policy-signature.test.mjs`: exit 1; `pr36-policy.js` was not found.
- `node --test tests/pr36/geometry.test.mjs`: exit 1; `pr36-geometry.js` was not found.
- `node --test tests/pr36/scheduler.test.mjs tests/pr36/session.test.mjs`: exit 1; `pr36-scheduler.js` was not found.
- Adapter/controller group: exit 1; canvas and worker modules were not found.
- Integration group: exit 1 against PR31 source-file ownership and absent page assets.
- Crop transaction group: exit 1 because provisional edit APIs and Arabic controls were absent.
- Concurrency regression: exit 1 with observed maximum `1`, expected `2`.

The first GREEN attempt also exposed and fixed an already-aborted scheduler race. Later full-gate attempts stopped on the legacy PR31 object-URL smoke expectation, PR32 legacy filename expectation, PR33 legacy photo copy, Markdown trailing whitespace, and the PR35 branch-specific exact allowlist. Each was resolved narrowly without weakening default, PR34, or PR35 scope guards.

## Observed GREEN

- `bash scripts/qa-pr36-secure-seven-photo-processing.sh --self-test-guard`: exit 0; the forbidden `fetch("/forbidden")` fixture was detected.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh --focused`: exit 0 at 2026-07-15T05:02Z; 8 PR36 test files passed and the local-only static guard passed.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh`: exit 0 at 2026-07-15T05:02Z before the final timeout/cancellation hardening; PR36, PR33, PR34, PR35 behavioral regressions, smoke, scope, and whitespace passed. A fresh focused run after that hardening also exited 0.

No interactive browser or DevTools run was observed; that limitation is not represented as PASS.

## Corrective review cycles

- Canvas/scheduler/session RED: new tests exposed missing orientation/output verification, ignored injected deadlines, and absent committed-edit rollback. GREEN: 12 focused tests passed.
- Controller/policy RED: new tests exposed missing pan/focus/lifecycle/scheduler contracts and standalone source size enforcement. GREEN: both focused files and the 8-file suite passed.
- Worker RED: validation errors incorrectly fell back and abort did not settle. The abort test was deliberately terminated after the intended hang was observed. GREEN: four worker tests passed with non-retriable validation errors and abort cleanup.


## Full closure evidence — 2026-07-15T07:48:18.104818+00:00

- Initial final-gate failures were independently reproduced.
- Root repair was bounded and source-of-truth driven.
- Tests were frozen after any documented stale-contract reconciliation.
- Reviews 1–4 were independently rerun.
- Final independent gate bundle exited zero.
