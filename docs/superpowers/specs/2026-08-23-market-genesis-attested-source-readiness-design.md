# TIGER Private Market Genesis — M11 Attested Source Readiness Design

**Date:** 2026-08-23  
**Status:** Approved design / written specification before implementation  
**Baseline:** M0–M10 are source-implemented and exact-head repository verified on Draft PR #323. M10 distinguishes `SOURCE_DURABLE` from `DEPLOYED_DURABLE_VERIFIED`; it does not itself create deployed-environment evidence.

## 1. Purpose

M11 closes the source-to-release trust gap without creating a second release system.

The repository already has an Exact-Artifact Production trust chain that binds a sealed artifact to the repository, exact source SHA/tree, producing workflow identity, GitHub artifact identity/digest, inner bundle digest, and GitHub attestation. M11 extends that existing chain with an attested Market Genesis source-readiness evidence object.

M11 does **not** create a parallel Market Genesis release plane, does **not** apply the durable replay migration, and does **not** claim deployed replay durability.

## 2. Governing laws

M11 preserves all existing owner authority. In particular:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired with no fallback or alternate authority.
4. Pulse/country-payment authority remains the advertising-billing authority; Market Genesis does not gain buyer–seller payment authority.
5. `contact_replay_protection_durable=true` remains source capability only and can never by itself establish `DEPLOYED_DURABLE_VERIFIED`.
6. M11 source implementation performs no Staging/Production deployment, remote Supabase mutation, migration apply, DNS mutation, secret mutation, payment-provider mutation, or Contact/Handoff activation.

## 3. Problem statement

### 3.1 Caller-supplied workflow status is not release provenance

`market-readiness-gate.js` currently accepts workflow records containing only a name, status, and conclusion. Those records are useful as repository/pre-merge evidence, but they are caller-supplied data and are not cryptographically authenticated GitHub release provenance.

The same gate currently accepts `options.requiredWorkflows`, which allows a caller to replace the default required workflow set with a smaller set. That is inappropriate at a trust boundary.

M11 therefore separates two concepts:

- **repository readiness evidence** — useful for PR/source verification;
- **attested release-source evidence** — produced only inside the existing sealed Production artifact builder and authenticated by the existing artifact/attestation chain.

Repository workflow JSON must never become Production authority merely because it says `success`.

### 3.2 M10 release evidence must not float outside the existing release plane

M10 correctly requires real environment evidence before Contact/Handoff can be considered deployed-durable. The next step must not be a new Market Genesis-only artifact or promotion workflow. That would duplicate trust authority and create two release planes.

M11 instead makes Market Genesis source readiness a first-class evidence member of the existing sealed Production release artifact.

## 4. Architectural decision

Adopt **M11 — Market Genesis Attested Source Readiness**.

The trust chain becomes:

`exact current main SHA`  
→ `fixed source/Market Genesis verification`  
→ `TIGER_MARKET_GENESIS_SOURCE_READINESS_V1`  
→ `sealed Production release bundle`  
→ `inner SHA-256`  
→ `GitHub artifact digest`  
→ `GitHub attestation`  
→ `existing exact-artifact Production promotion verifier`

M11 extends the existing release plane; it does not replace or fork it.

## 5. Source-readiness evidence contract

The sealed Production artifact will contain:

`evidence/market-genesis-source-readiness.json`

The object is canonical JSON with a closed field set.

### 5.1 Top-level schema

```json
{
  "schema": "TIGER_MARKET_GENESIS_SOURCE_READINESS_V1",
  "source_sha": "<40 lowercase hex>",
  "source_tree": "<40 lowercase hex>",
  "state": "SOURCE_VERIFIED",
  "deployed_durable_verified": false,
  "reviewed_replay_migration_sha256": "484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad",
  "authority": {
    "market_genesis_active": true,
    "living_classified_fabric_active": false,
    "transaction_capabilities_enabled": false,
    "pulse_ad_billing_authority_preserved": true,
    "contact_replay_protection_durable": true
  },
  "source_contract": {
    "contract_version": "market-genesis-source-contract-v1",
    "whole_vehicle_ads_forbidden": true,
    "no_transaction": true,
    "release_evidence_required_for_contact": true,
    "retired_fallback_forbidden": true
  }
}
```

### 5.2 Closed-schema rules

The top-level object, `authority`, and `source_contract` are closed allowlists. Unknown keys fail verification.

The evidence must not contain:

- database URLs;
- credentials, publishable/secret/service-role keys, tokens, or cookies;
- hostnames or IP addresses;
- raw authorization nonces or nonce hashes;
- reusable Contact/Handoff capabilities;
- runtime instance identifiers;
- PII or message content;
- raw private intent or precise private location;
- buyer/seller order, payment, escrow, settlement, delivery, ownership-transfer, or dispute state.

The object is a source-readiness statement only.

### 5.3 Source-only state law

`state` must equal exactly `SOURCE_VERIFIED`.

`deployed_durable_verified` must equal exactly `false`.

No M11 source builder, generator, test helper, release manifest flag, workflow input, administrator status, or paid/sponsored state may set it to `true`.

Only separately authorized target-environment activity satisfying the M10 Release Evidence Contract may later establish `DEPLOYED_DURABLE_VERIFIED` outside this source artifact.

## 6. Deterministic evidence generation

M11 will add a small Market Genesis source-readiness generator/validator under `scripts/marketplace/`.

The generator must:

1. use the exact checked-out Git SHA and tree;
2. compute the SHA-256 of `supabase/migrations/20260823190000_market_genesis_durable_replay.sql` from local bytes;
3. require that digest to equal the reviewed M10/M9 constant;
4. emit only the closed canonical source-readiness schema;
5. expose no network or database I/O;
6. read no deployment state;
7. never infer or emit deployed durability;
8. never serialize environment variables, credentials, host information, runtime identifiers, private intent, or user data.

The Production artifact workflow is responsible for sequencing: fixed Market Genesis verification must complete successfully before the generator is invoked. A caller cannot supply alternate booleans to weaken the source contract.

## 7. Fixed Market Genesis source verification in the existing Production builder

`.github/workflows/production-release-artifact.yml` remains the sole sealed Production artifact builder.

Before `market-genesis-source-readiness.json` is generated, the builder must run a fixed Market Genesis source verification set covering at least:

- Market Genesis core contracts;
- whole-vehicle hard prohibition;
- no-transaction negative boundary;
- Living Classified Fabric anti-fallback protections;
- durable replay authority/store/runtime tests;
- reviewed durable replay migration contract/digest;
- M10 Release Evidence Contract tests;
- readiness integration tests;
- privacy/security regressions relevant to Market Genesis.

The set is source-controlled by the trusted workflow and test files. It is not a workflow-dispatch input and cannot be reduced by a caller.

The existing full `scripts/quality-gate.sh` remains required; M11 adds a fixed Market Genesis-specific source attestation step rather than replacing the full gate.

## 8. SVEF integration and versioning

The current Production SVEF bundle manifest is a closed `SVEF_RELEASE_BUNDLE_V1` object and the current Production verifier accepts an exact four-file evidence set. M11 must not smuggle a fifth evidence file into that closed schema without versioning.

### 8.1 Production bundle V2

M11 will introduce a Production bundle schema/version that explicitly binds the new evidence digest.

The Production release-bundle manifest adds exactly:

`market_genesis_source_readiness_sha256`

The value is the SHA-256 of the exact canonical bytes of `evidence/market-genesis-source-readiness.json`.

The production bundle version advances to a new explicit version (implementation name expected to be `SVEF_PRODUCTION_RELEASE_BUNDLE_V2`, unless the implementation plan identifies an existing repository naming convention that requires a semantically equivalent exact name).

Candidate/non-Production bundle behavior should remain on its existing schema unless implementation evidence proves a shared version bump is safer and does not broaden scope. The preferred design is a Production-only V2 so unrelated candidate contracts are not churned.

### 8.2 Exact evidence member set

The attested inner Production tarball will contain exactly these evidence files:

- `evidence/source.json`
- `evidence/materials.json`
- `evidence/sbom.cdx.json`
- `evidence/release-bundle-manifest.json`
- `evidence/market-genesis-source-readiness.json`

plus the already-built `public/` tree.

No extra evidence member is accepted.

### 8.3 Materials binding

The Production builder material inventory must include the M11 trust-boundary implementation and tests needed to interpret the evidence, including at minimum the source-readiness generator/validator, Market Genesis readiness/release-evidence contracts, Production builder, Production verifier, SVEF release-bundle code, and the reviewed durable replay migration.

The existing materials digest continues to bind those repository source bytes.

## 9. Promotion verifier requirements

`scripts/release/verify-production-artifact.py` will fail closed unless all of the following are true after existing outer-artifact and attestation verification:

1. the inner evidence set is exact and contains `market-genesis-source-readiness.json`;
2. the Production bundle version is the M11 version;
3. the release-bundle manifest contains the exact new digest field and no unknown fields;
4. the SHA-256 of the source-readiness JSON equals `market_genesis_source_readiness_sha256`;
5. the source-readiness JSON is strict JSON with no duplicate keys and the exact closed field sets;
6. `source_sha` matches the expected release SHA, `source.json`, and the release-bundle manifest;
7. `source_tree` matches `source.json` and the release-bundle manifest;
8. the migration digest equals the reviewed durable replay migration digest;
9. `state` is exactly `SOURCE_VERIFIED`;
10. `deployed_durable_verified` is exactly `false`;
11. every authority/source-contract invariant has the exact required value;
12. forbidden evidence content is absent.

Any M11 failure blocks promotion before Pages packaging/deployment.

Historical pre-M11 Production artifacts that lack the new evidence are intentionally not sufficient for a post-M11 promotion path. This is a security-boundary upgrade, not a compatibility fallback.

## 10. Repository readiness gate hardening

M11 also removes one unsafe source-level override from `scripts/marketplace/market-readiness-gate.js`:

- callers may no longer replace the required repository workflow set through `options.requiredWorkflows`.

The required repository workflow set becomes module-owned and immutable.

This does **not** elevate caller-supplied workflow records into Production provenance. Repository workflow snapshots remain repository/pre-merge evidence only. The attested Production source-readiness artifact is the release-source authority.

M11 will add regression coverage proving that passing a smaller workflow set as a second argument cannot weaken readiness.

M11 does not require every GitHub workflow in the repository to run on every `main` commit. Existing path-filtered workflows may remain path-filtered. This is another reason Production trust must come from the fixed sealed-artifact builder rather than from a caller-selected historical workflow list.

## 11. M10 relationship

M10 and M11 prove different facts:

- **M10** defines the target-environment evidence required for deployed durable Contact/Handoff replay protection.
- **M11** proves that the exact release source contains and passed the required Market Genesis source contracts before it was sealed and attested.

Therefore:

`M11 SOURCE_VERIFIED` **does not imply** `M10 DEPLOYED_DURABLE_VERIFIED`.

Production Contact/Handoff remains fail-closed until both the source/release chain and the real target-environment M10 evidence are satisfied at the appropriate release stage.

## 12. Failure model

M11 is fail-closed.

Representative bounded failure codes should distinguish at least:

- source-readiness evidence missing;
- source-readiness schema invalid;
- source SHA mismatch;
- source tree mismatch;
- reviewed migration digest mismatch;
- source contract invariant mismatch;
- deployed-durable source claim forbidden;
- source-readiness digest mismatch;
- Production bundle version mismatch;
- unexpected evidence member set.

Exact code names will be fixed in the implementation plan/tests, but they must remain bounded and must not expose secrets, filesystem internals, user data, private intent, or remote infrastructure details.

## 13. TDD and verification requirements

Implementation must follow strict RED → GREEN.

Required RED coverage before production changes includes at least:

1. caller cannot shrink required repository workflows;
2. Production verifier rejects a pre-M11/V1 bundle on the M11 path;
3. missing source-readiness evidence is rejected;
4. unknown source-readiness keys are rejected;
5. source SHA/tree mismatch is rejected;
6. migration digest mismatch is rejected;
7. `deployed_durable_verified=true` is rejected;
8. wrong whole-vehicle/no-transaction/anti-fallback authority values are rejected;
9. tampered source-readiness bytes fail the bundle digest binding;
10. an exact M11 sealed fixture passes.

After GREEN, all existing Market Genesis M0–M10 privacy, security, whole-vehicle, no-transaction, Pulse, SYNAPSE, RLS, durable replay, release-artifact, and promotion tests must remain green.

Final repository verification must be exact-head. No successful workflow from an older SHA may be reused after the M11 implementation/docs head changes.

## 14. Files expected to change

Implementation is expected to touch a focused set such as:

- `scripts/marketplace/market-source-readiness-evidence.js` — new pure generator/validator;
- `scripts/marketplace/market-readiness-gate.js` — remove caller workflow-set override;
- `.github/workflows/production-release-artifact.yml` — fixed Market Genesis source verification + evidence generation + sealing;
- `scripts/tsrf/svef/release-bundle.cjs` — Production V2 digest binding;
- `scripts/release/verify-production-artifact.py` — strict M11 verification;
- focused Node/Python release and Market Genesis tests;
- current owner authority and PR truth after final exact-head verification.

The implementation plan may refine filenames to match repository conventions, but may not create a second release/promotion plane or broaden M11 into deployed-environment automation.

## 15. Acceptance criteria

M11 is source-complete only when:

1. the written contract is implemented with closed schemas and no secret/private-data surface;
2. the Production builder creates Market Genesis source evidence only after fixed source verification succeeds;
3. the exact evidence bytes are cryptographically bound into the sealed Production release bundle;
4. the existing GitHub artifact/attestation trust chain authenticates the bundle containing that evidence;
5. Production promotion rejects missing, stale, tampered, V1/pre-M11, source-mismatched, or semantically invalid Market Genesis source evidence;
6. caller-controlled workflow-list reduction is removed from the repository readiness gate;
7. all immutable Market Genesis commercial/privacy/security laws remain enforced;
8. all applicable exact-head repository/security/database rehearsal workflows are GREEN on one final SHA;
9. PR #323 remains Draft/Open/Unmerged unless separately authorized;
10. no remote Staging/Production/Supabase/DNS/secret/payment-provider mutation or Contact/Handoff activation has occurred as part of M11 source implementation.

## 16. Completion meaning

M11 completion means:

`EXACT_RELEASE_SOURCE_ATTESTED_FOR_MARKET_GENESIS`

It does **not** mean:

`DEPLOYED_DURABLE_VERIFIED`

and it does **not** authorize Production Contact/Handoff by itself.
