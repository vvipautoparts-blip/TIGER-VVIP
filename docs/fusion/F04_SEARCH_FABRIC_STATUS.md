# F04 — TIGER Search Fabric Status

**Status:** IMPLEMENTED / EXACT_HEAD_PASS

**Branch:** `feat/f04-tiger-search-fabric-isolated-20260814`

**Verified predecessor:** F03 final head `c9e214bd3da85c985dfa2c33bc531035471e6d4c`

**Implementation checkpoint before closure documentation:** `f36d0b7b67921bab614de52f135be2d714bf25a2`

**First full closure-cycle head:** `0373607c9c376a51290160ffaea5c3b67eec8350`

**Binding Owner invariant:** `docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md`

The final documentation-bearing F04 SHA and its final workflow run IDs are maintained on product PR #236 and verification-only PR #237. They are intentionally not hard-coded after this status transition, because changing this file merely to refresh its own final SHA would recursively create another unverified SHA.

## Exact-head closure evidence

The first full closure cycle on `0373607c9c376a51290160ffaea5c3b67eec8350` passed:

- VVIP Quality Gate #940;
- V14 Release Candidate #398, including explicit exact-source checkout/SHA verification and the full quality gate;
- CodeQL #846;
- Dependency Review #746;
- TIGER CleanGuard #462;
- Project Control Integrity #893.

This status commit is followed by one final full CI/security rerun on the documentation-bearing branch head. The final SHA/run IDs are recorded on PR #236/#237; F04 is considered closed only if that final rerun is also green.

## Implemented contracts

- deterministic Arabic/English query normalization;
- Arabic diacritics and tatweel removal, stable Arabic letter normalization, Arabic/Persian digit normalization, punctuation/whitespace normalization;
- bounded trusted-dictionary structured intent for location, make, category, model aliases, and approved year range;
- unknown terms remain text rather than becoming invented filters;
- fail-closed candidate eligibility: `searchEligible === true` and `policyEligible === true` are mandatory;
- Active Market Country filtering occurs before ranking;
- deterministic lexical/commercial ranking with explicit field weights;
- optional semantic scores are bounded assistive input only and cannot resurrect an excluded candidate;
- stable listing ID tie-breaker;
- results capped at 100 and deeply frozen without mutating source listings;
- one-edit spelling rescue over a bounded trusted vocabulary only;
- bilingual aliases and zero-result rescue exclude unavailable policy entries;
- every rescue family is deterministic and capped;
- Single Surface no longer owns a raw `includes(query)` substring search path;
- F02 loads the F04 search module and renders only `searchListings(...).results`;
- existing 160 ms UI debounce preserved;
- sector selection is converted to candidate eligibility before F04 retrieval;
- dedicated zero-result rescue status host added to the isolated Single Surface;
- Save / Contact / Share actions and the Owner advertising/direct-contact-only disclaimer preserved;
- search-module load failure is fail-closed: no untrusted fallback results are displayed.

## Focused TDD evidence

Local isolated F04 suite after Tasks 1–7:

- total F04 tests: **66/66 PASS**;
- golden bilingual corpus: **36 deterministic cases**, including `مرسيدس 2020 عمان`;
- Single Surface search integration: **5/5 PASS**;
- performance/abuse bounds: **4/4 PASS**;
- malformed/null search options: fail safely after an observed RED contract and minimal fix.

TDD failures were observed before implementation for the normalization module, structured intent, ranking contract, rescue behavior, Single Surface integration, and malformed-null option handling.

## Local performance diagnostics — not Production claims

The performance test runs five local samples for each deterministic synthetic candidate size. Latest isolated diagnostics during implementation:

| Candidates | Local p50 | Local p95 |
|---:|---:|---:|
| 100 | ~2.89 ms | ~11.71 ms |
| 1,000 | ~18.04 ms | ~24.33 ms |
| 25,000 | ~436.01 ms | ~477.02 ms |

These values are engineering diagnostics from the current ChatGPT execution environment only. They are not Production SLOs, capacity certification, or evidence for the later 4M Digital Twin gate.

## Security / policy invariants

- search relevance never grants authorization, visibility, country, sector, moderation, or safety eligibility;
- semantic scores are considered only after candidate eligibility and structured filters;
- typo rescue vocabulary comes from bounded trusted dictionaries, not private/hidden candidate content;
- no global mutable cache of candidate data is introduced;
- unavailable policy locations/categories/aliases are not emitted as rescue suggestions;
- marketplace checkout, escrow, delivery/shipping, transaction payment/settlement, transaction commission/payout, warranty/compensation execution, and platform-run marketplace dispute resolution remain out of scope.

## Protected boundaries still outside F04

F04 does **not** authorize:

- Production deployment;
- protected `index.html` / Clerk authentication changes;
- SQL/database apply;
- Production RLS changes;
- country activation;
- secrets mutation;
- marketplace transaction money movement;
- claims that 25K local search diagnostics prove F08/F13 global capacity.

## Closure rule

The authoritative final F04 closure proof is the complete green workflow set recorded on PR #236/#237 for the final documentation-bearing head. If any final gate is not green, this `EXACT_HEAD_PASS` status is invalid until that defect is corrected and the final head is reverified.
