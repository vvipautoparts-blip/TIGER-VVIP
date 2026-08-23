# TIGER Private Market Genesis — M10 Release Evidence Contract Design

**Date:** 2026-08-23

**Status:** Approved design / specification before implementation

**Parent authority:** `docs/owner-control/TIGER_PRIVATE_MARKET_GENESIS_2026_CURRENT_OWNER_AUTHORITY.md`

**Current implementation baseline:** M0–M9 are source-implemented and exact-head repository verified on Draft PR #323. M9 proves durable replay architecture in source and local/repository rehearsal; it does not prove a remote environment has applied the migration or that two deployed runtime instances have exercised the same durable authority.

## 1. Problem

The current Market Genesis readiness gate accepts `authority.contact_replay_protection_durable` as a Boolean fact. That is sufficient to represent source capability but insufficient to represent Production release evidence.

A caller could theoretically construct a readiness snapshot with:

```text
contact_handoff_enabled = true
contact_replay_protection_durable = true
```

without proving that the reviewed replay migration is present in the target database or that multiple deployed runtime instances actually share the same replay source of truth.

M10 removes that ambiguity. A source-level durability fact remains necessary, but it can never by itself authorize Contact/Handoff rollout.

## 2. Governing laws

M10 must preserve without exception:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired and may not return as fallback or alternate authority.
4. Advertising billing remains under TIGER Pulse/country-payment authority and does not create buyer–seller transaction authority.
5. No Production, Staging, remote Supabase, secret, DNS, payment-provider, or infrastructure mutation is part of M10 source implementation.

## 3. Decision

Adopt a fail-closed **Market Genesis Release Evidence Contract** for Contact/Handoff.

The readiness model distinguishes two different facts:

- **SOURCE_DURABLE** — repository/source architecture contains the reviewed durable replay implementation and its source gates are green.
- **DEPLOYED_DURABLE_VERIFIED** — the exact target environment has applied the exact reviewed migration and a distributed probe has proven cross-instance duplicate issuance and duplicate consumption are rejected.

`contact_replay_protection_durable = true` represents only the first fact. It is necessary but never sufficient for release eligibility.

## 4. Snapshot contract

When `authority.contact_handoff_enabled === true`, the readiness snapshot must include a top-level `release` object:

```js
release: {
  target_environment: 'production',
  contact_replay_release_evidence: {
    schema_version: 'market-contact-replay-release-evidence-v1',
    environment: 'production',
    release_sha: '<40 lowercase hex>',
    migration_sha256: '<64 lowercase hex>',
    migration_applied: true,
    migration_applied_at: '<ISO-8601 timestamp>',
    probe_completed_at: '<ISO-8601 timestamp>',
    probe_run_id: '<opaque non-empty reference>',
    runtime_instance_count: 2,
    duplicate_nonce_probe: {
      attempts: 2,
      successes: 1,
      replay_rejections: 1
    },
    duplicate_consume_probe: {
      attempts: 2,
      successes: 1,
      replay_rejections: 1
    }
  }
}
```

The evidence is deliberately aggregate. It must not contain database URLs, credentials, service-role keys, hostnames, IP addresses, raw authorization nonces, nonce hashes, reusable contact capabilities, user PII, message content, private intent, payment/order/escrow/settlement state, or runtime instance identifiers.

## 5. Reviewed migration identity

The M9 durable replay migration currently reviewed by Steel Shield is:

`supabase/migrations/20260823190000_market_genesis_durable_replay.sql`

Reviewed SHA-256:

`484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad`

M10 will expose this digest as a release-contract constant used by the readiness gate. SQL byte drift already invalidates the Steel Shield review; M10 additionally ensures release evidence for a different migration digest cannot authorize Contact/Handoff.

Changing the reviewed migration bytes requires a new security review and a corresponding explicit release-contract digest update. The gate must never infer or accept an arbitrary caller-supplied digest as authoritative.

## 6. Readiness evaluation rules

If Contact/Handoff is enabled, all of the following are required:

1. `authority.contact_replay_protection_durable === true`.
2. `release.target_environment` is a non-empty supported environment string.
3. `contact_replay_release_evidence.schema_version` matches the exact v1 schema.
4. evidence `environment` exactly matches `release.target_environment`.
5. evidence `release_sha` exactly matches both `expected_head_sha` and `observed_head_sha`.
6. evidence `migration_sha256` exactly matches the current reviewed release-contract digest.
7. `migration_applied === true`.
8. `migration_applied_at` and `probe_completed_at` are valid ISO timestamps, and the probe is not earlier than migration application.
9. `probe_run_id` is a bounded non-empty opaque reference.
10. `runtime_instance_count` is an integer greater than or equal to 2.
11. duplicate-nonce probe reports exactly two attempts, one success, and one replay rejection.
12. duplicate-consume probe reports exactly two attempts, one success, and one replay rejection.

If any requirement fails, Contact/Handoff rollout is blocked. No source flag, paid status, sponsored eligibility, admin override, or missing-evidence default may bypass this rule.

When Contact/Handoff is disabled, release evidence is not required for safe organic/sponsored discovery evaluation. Existing Market Genesis discovery readiness rules continue to apply.

## 7. Failure model

The gate remains deterministic, pure, and fail-closed. It performs no network or database I/O.

M10 introduces bounded internal reason codes sufficient for diagnosis without exposing infrastructure secrets:

- `CONTACT_REPLAY_RELEASE_EVIDENCE_MISSING`
- `CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID`
- `CONTACT_REPLAY_RELEASE_ENVIRONMENT_MISMATCH`
- `CONTACT_REPLAY_RELEASE_SHA_MISMATCH`
- `CONTACT_REPLAY_MIGRATION_DIGEST_MISMATCH`
- `CONTACT_REPLAY_MIGRATION_NOT_APPLIED`
- `CONTACT_REPLAY_RUNTIME_COUNT_INSUFFICIENT`
- `CONTACT_REPLAY_NONCE_PROBE_FAILED`
- `CONTACT_REPLAY_CONSUME_PROBE_FAILED`

Malformed timestamps, schema shape, probe references, or unsupported values may collapse to `CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID` instead of creating additional high-cardinality error strings.

## 8. Components

### 8.1 `market-release-evidence-contract.js`

A small server/release-policy module will define:

- the exact evidence schema version;
- the exact reviewed replay migration SHA-256;
- pure evidence-shape validation helpers;
- no credentials, network clients, environment secrets, or remote actions.

### 8.2 `market-readiness-gate.js`

The existing readiness gate will:

- continue validating exact-head workflow and compatibility evidence;
- continue requiring source durability when Contact/Handoff is enabled;
- additionally require valid release evidence;
- keep discovery modes blocked if another readiness invariant fails;
- never convert repository/source proof into deployed-environment proof.

### 8.3 Tests

M10 will add focused release-evidence tests and update existing readiness tests. Tests will cover:

- Boolean-only durability is blocked;
- valid exact release evidence passes when all other readiness conditions pass;
- source durability false blocks even with otherwise valid release evidence;
- missing evidence blocks;
- release SHA mismatch blocks;
- migration digest mismatch blocks;
- environment mismatch blocks;
- `migration_applied !== true` blocks;
- fewer than two runtime instances blocks;
- duplicate-nonce probe shape/result mismatch blocks;
- duplicate-consume probe shape/result mismatch blocks;
- malformed/chronologically impossible timestamps block;
- Contact/Handoff disabled does not require release evidence;
- existing whole-vehicle and no-transaction regression contracts remain green.

## 9. Data flow

```text
Repository exact-head evidence
        +
Source durable capability
        +
Target environment release evidence
        |
        v
Market Genesis Readiness Gate
        |
        +--> evidence absent/mismatch --> ROLLOUT_BLOCKED
        |
        +--> exact SHA + exact migration digest
             + migration applied
             + >=2 runtime instances
             + duplicate nonce rejected
             + duplicate consume rejected
                   |
                   v
          Contact/Handoff may contribute
          to ROLLOUT_ELIGIBLE
```

M10 does not collect the distributed evidence itself. It defines the contract that future authorized release tooling must satisfy. A later environment-specific step may produce the evidence, but cannot weaken this gate.

## 10. Compatibility and migration

The existing Boolean `contact_replay_protection_durable` is retained to avoid silently changing its current source-level meaning. Its documentation changes from ambiguous release wording to explicit source-durability wording.

Existing callers that enable Contact/Handoff but provide no `release.contact_replay_release_evidence` will intentionally become fail-closed. This is a security hardening behavior, not a compatibility regression.

Callers with Contact/Handoff disabled continue to evaluate discovery readiness without distributed replay evidence.

## 11. Documentation truth

After implementation and exact-head verification:

- owner authority implementation truth must advance from M0–M8 wording to the actual M0–M10 source state;
- PR #323 must state that M10 prevents Boolean-only Production readiness claims;
- PR must remain Draft/Open/Unmerged unless separately authorized;
- no statement may claim the migration was remotely applied or distributed Production verification occurred unless real environment evidence exists.

## 12. Acceptance criteria

M10 source implementation is complete only when:

1. RED tests first prove the existing Boolean-only model is insufficient.
2. The release evidence contract is implemented without remote I/O or secrets.
3. The readiness gate requires exact deployed evidence whenever Contact/Handoff is enabled.
4. Existing Market Genesis privacy, automotive, no-transaction, Pulse, SYNAPSE, RLS, and anti-fallback tests remain green.
5. Required exact-head repository/database/security workflows are green on one final SHA.
6. PR and owner-authority documentation state source truth accurately and preserve the Production non-claim.

M10 source completion does **not** mean Production Contact/Handoff is enabled. It means the repository can no longer represent Contact/Handoff as release-eligible from a durability Boolean alone.
