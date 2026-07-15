# PR36 QA Evidence

Date: 2026-07-15 UTC. Remote actions: none.

Observed commands:

- `bash scripts/qa-pr36-secure-seven-photo-processing.sh --self-test-guard` — exit 0; the forbidden `fetch("/forbidden")` fixture was detected.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh --focused` — exit 0 after the corrective RED/GREEN cycles; 8 test files passed and static privacy/scope guards passed.
- `bash scripts/qa-pr36-secure-seven-photo-processing.sh` — exit 0 at 2026-07-15T05:59Z; PR36 plus PR33, PR34, PR35, smoke, and whitespace gates passed.

An interactive browser and DevTools run was not available. Automated evidence does not establish real decoder, visual, offline-network-panel, or browser object-URL behavior.
