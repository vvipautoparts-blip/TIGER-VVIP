# TIGER Privacy Proof — Slice 3 Implementation Plan

**Goal:** Convert Social Core privacy from a UI expectation into a fail-closed four-boundary evidence contract covering database rows, Realtime delivery, private media access, and cache residue.

**Parent:** TIGER Sovereign Living System 2026 / Slice 3.

**Base:** verified Slice 2 head `8a31c33f1dcbf91628e455abb333700a29144c14`.

## Governing invariant

For an unauthorized actor and a protected Social object such as `only_me`:

`DB rows = 0 AND Realtime events = 0 AND private media access = 0 AND private cache residue = 0`

Every dimension also requires non-empty trusted evidence. Missing evidence is `BLOCKED`, never an inferred pass.

## Existing proof that may be reused

- Social Core PostgreSQL has `ENABLE RLS` + `FORCE RLS`.
- `vvip_social_post_visible_read` makes `only_me` readable only by the author.
- `tests/sql/tiger-social-core-foundation.sql` already proves Bob and Charlie receive zero `only_me` rows.
- `sw-vvip-static.js` only handles same-origin static asset paths and does not handle document/navigation requests; responses with `private`, `no-store`, or `no-cache` are non-cacheable.

These are inputs to evidence, not substitutes for live Staging proof.

## Task 1 — TDD Privacy Proof contract

Create tests first for `evaluatePrivacyProof(input)`.

Required dimensions:

- `database`
- `realtime`
- `media`
- `cache`

Each dimension has:

```json
{
  "status": "PASS|FAIL|UNBOUND",
  "unauthorizedCount": 0,
  "evidence": ["evidence://..."]
}
```

Rules:

1. missing dimension => `BLOCKED / MISSING_PRIVACY_DIMENSION`;
2. `UNBOUND` => `BLOCKED / PRIVACY_DIMENSION_UNBOUND`;
3. `FAIL` or unauthorized count > 0 => `BLOCKED / PRIVACY_EXPOSURE_DETECTED`;
4. `PASS` without evidence => `BLOCKED / PASS_WITHOUT_EVIDENCE`;
5. all four PASS + count 0 + evidence => `SAFE`.

## Task 2 — Minimal evaluator

Create:

- `project-control/privacy-proof/contract.v1.json`
- `project-control/scripts/privacy_proof.mjs`

No network calls and no optimistic defaults.

## Task 3 — Strengthen static/cache proof

Add direct tests proving:

- Social/API/navigation requests are not handled by the static service worker;
- authenticated/private/no-store/no-cache responses cannot enter the static cache;
- activation cleans older `vvip-static-*` versions.

Do not claim that this proves every browser cache or IndexedDB path; runtime Staging acceptance remains a separate evidence source.

## Task 4 — Database privacy evidence

Extend the Social DB rehearsal evidence to emit a dedicated Privacy Proof marker for `only_me` isolation, while retaining existing Bob/Charlie zero-row checks.

No Production DB mutation is part of this slice.

## Task 5 — Realtime boundary contract

Add a Social Realtime visibility filter contract that refuses to subscribe/broadcast protected Social post payloads unless visibility has been authorized at the trusted data boundary.

Until Staging Realtime is bound, report runtime evidence as `UNBOUND`; do not infer live delivery safety solely from static code.

## Task 6 — Media boundary truth

Inventory current Social media storage authorization. If no owner/audience-bound private media authority exists, mark `media = UNBOUND` and make that a hard dependency for the next Media Boundary slice rather than inventing a pass.

## Task 7 — CI evidence

Add `TIGER Privacy Proof` CI that produces a machine-readable `privacy-evidence.json` with static/rehearsal evidence. The CI itself may be GREEN while the release privacy decision is `BLOCKED_UNBOUND` if Realtime/Media live evidence does not exist yet.

## Success criteria

Slice 3 code is `VERIFIED` when exact-head Quality Gate + Privacy Proof CI pass. `R2_TWIN`/`R4_OWNER_PREVIEW` privacy readiness remains blocked until all four live/staging dimensions have matching evidence.
