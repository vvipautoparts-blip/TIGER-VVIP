# PR36 Review Resolution Log

## R1 — decoded/output verification

- RED: `node --test tests/pr36/canvas-adapter.test.mjs tests/pr36/scheduler.test.mjs tests/pr36/session.test.mjs` failed for uncertain orientation, unverifiable encoded dimensions, injected deadlines, and committed edit transactions.
- GREEN: the same three test files passed 12 focused tests after narrow canvas, scheduler, and session changes.

## R2 — browser shell and standalone validation

- RED: `node tests/pr36/controller-accessibility.test.mjs; node tests/pr36/policy-signature.test.mjs` failed for missing pan/focus/lifecycle/scheduler contracts and missing standalone source-size enforcement.
- GREEN: both files passed after controller, CSS, and policy changes; the complete PR36 test set also passed.

## R3 — worker cancellation and validation fallback

- RED: `node tests/pr36/worker-adapter.test.mjs` rejected the validation-fallback assertion and hung until terminated because abort had no listener.
- GREEN: 4 worker tests passed after validation errors were made non-retriable and abort cleanup/stale suppression were added.

No unresolved automated blocking finding remains. Interactive browser findings cannot be assessed until the manual checklist is run.

## R4 — retry policy, untouched state, and honest copy

- RED: the focused worker/controller/integration command failed because worker decode/encode errors retried on the main thread, initial controller render emitted a change, and PR31 retained future-upload language.
- GREEN: the same three files passed after processing failures were made non-retriable, initial rendering became notification-free, and the Arabic no-photo message was aligned with the local-only/no-publish boundary.
