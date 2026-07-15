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

## Copilot review closure — 20260715T082212Z

Validated review findings were consolidated into three root causes:

1. Crop-editor controls did not hydrate from the selected provisional
   snapshot transform.
2. Historical smoke behavior selected PR36 contracts by branch name,
   which was unsafe in detached HEAD and after merge to main.
3. The Controller V5 scope-reconciliation decision section was duplicated.

Repairs are restricted to the controller, smoke gate, one append-only
regression test, the canonical decision record, and this resolution log.
The crop editor remains non-modal and does not trap Tab navigation.
No production SQL, Supabase, Clerk, service-role, dependency, workflow,
backup, migration, tracked deletion, direct main edit, or automatic merge
is authorized.

## Final surgical closure V6 — canonical QA lifecycle repair

The review-fix workflow exposed a lifecycle defect in the PR36 QA gate:
the gate compared only uncommitted paths from `git diff HEAD` against
the complete frozen 49-path PR36 scope.

The gate now reads the immutable `base_sha` from
`CHANGE_CONTROL_MANIFEST.json` and compares the complete PR36 tree from
that baseline through the current working tree.

The following protections remain mandatory:

- exact manifest/freeze equality;
- sorted and unique frozen paths;
- accurate manifest path count;
- valid baseline commit and ancestry;
- no undeclared paths;
- no SQL, Supabase, migration, or backup paths;
- no tracked deletion;
- no direct main or PR34 modification;
- no automatic merge.


## Scope-order resume V7 — corrected final-gate ordering

Timestamp: `20260715T092452Z`

The previous closure command validated a ten-file scope before writing the fourth-round report. The gate therefore observed nine valid files and stopped safely.

V7 corrects the lifecycle order: all four reviews and gates run first, the fourth-round report is then written, and only afterward is the exact ten-file scope frozen and verified.

No production, database, authentication, dependency, workflow, tracked-deletion, direct-main, PR34, or automatic-merge action was authorized.
