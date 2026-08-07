# VVIP TIGER SOVEREIGN PROOF SYSTEM

Status: **AI-14 foundation implemented; production readiness remains blocked by real-evidence gates**

## Constitutional rule

`NO EVIDENCE -> NO TRUST -> NO AUTHORITY -> NO RELEASE`

The Proof System does not replace the existing TIGER SOVEREIGN 45-gate readiness engine. It binds release identity and evidence integrity **to that existing source of truth** so the platform cannot treat evidence from one release as proof for another release.

The Proof System must never use an average quality score to override a failed or missing critical gate.

## Implemented in AI-14

### 1. Release DNA

`scripts/ai/sovereign-proof-system.js` creates `TIGER_RELEASE_DNA_V1` from a bounded set of release-critical components:

- Git commit SHA;
- frontend build SHA-256;
- backend build SHA-256;
- sorted migration path/SHA-256 pairs;
- AI policy SHA-256;
- prompt SHA-256;
- model configuration SHA-256;
- tool registry SHA-256;
- RLS policy SHA-256;
- security configuration SHA-256;
- environment class.

Release DNA uses deterministic canonical JSON hashing. Unknown fields, prototype-shaped keys, malformed hashes, duplicate migration paths, and invalid environments fail closed.

A material component change produces a different Release DNA.

### 2. Evidence Capsules

Each `TIGER_EVIDENCE_CAPSULE_V1` binds:

- exactly one canonical gate from the existing 45-gate registry;
- one exact Release DNA digest;
- a requirement id;
- evidence status;
- the gate-approved evidence class;
- the gate-approved environment;
- a bounded evidence reference;
- verification time;
- SHA-256 of the underlying evidence artifact;
- explicit fixture/simulation markers.

The capsule itself receives a deterministic SHA-256 digest and is immutable in memory.

A capsule is structural proof metadata. It is **not yet a cryptographic signer attestation**; signed external attestation is a later security layer.

### 3. Truth Engine integration

`evaluateProofReadiness` converts only exact-release, integrity-valid capsules into records for the existing `sovereign-readiness-gate.js`.

It does not duplicate or redefine the 45 gates.

The following cannot become production proof:

- evidence for a different Release DNA;
- fixture evidence;
- simulated evidence;
- malformed/tampered capsule metadata;
- wrong evidence class;
- wrong environment;
- missing gate evidence;
- any state rejected by the existing readiness engine.

A changed Release DNA makes old capsules stale rather than silently re-binding them.

### 4. Evidence Root

Exact-release capsule digests are sorted by canonical gate id/digest and hashed into an evidence-root SHA-256.

Changing a valid evidence artifact/capsule changes the root. Direct mutation without recomputing a valid capsule fails integrity verification.

The current evidence root is a deterministic integrity root, not yet an externally signed transparency-log root.

### 5. Golden Release Passport

`TIGER_GOLDEN_RELEASE_PASSPORT_V1` can be created only when the existing readiness engine reports true production readiness for all 45 required gates using exact-release, non-fixture, non-simulated evidence.

`44/45` is blocked.

An `averageScore=100`-style bypass is rejected as an unknown input rather than interpreted as authority.

The passport binds:

- Release DNA digest;
- evidence-root digest;
- exact gate count;
- issuance time;
- production-readiness truth result.

The current passport is an immutable deterministic record. It is **not yet a KMS/HSM-signed release certificate**.

### 6. Change Impact and revalidation planning

`scripts/ai/sovereign-proof-change-impact.js` compares two valid Release DNA objects and produces `TIGER_REVALIDATION_PLAN_V1`.

The plan reports:

- changed release components;
- added/removed/changed migration files;
- gates affected by known component changes;
- unaffected gates;
- reason codes;
- whether full revalidation is mandatory.

Important safety rule:

**The plan never authorizes evidence carry-forward and never grants production readiness.**

Affected gates require fresh Evidence Capsules for the new Release DNA.

### 7. Fail-closed unclassified code change

A changed Git commit represents an arbitrary code delta unless a future trusted change-classification attestation proves otherwise.

Therefore AI-14 deliberately treats an unclassified `commitSha` change as:

`FULL_REVALIDATION_REQUIRED = all 45 gates`

This is conservative by design.

A changed environment class also reopens all 45 gates because evidence scope has changed.

## What AI-14 does not claim

AI-14 does **not** claim that VVIP TIGER is production-ready.

AI-14 does **not** perform or authorize:

- PR merge;
- Supabase preview/staging/production migration application;
- production deployment;
- owner approval synthesis;
- live model/provider calls;
- manual PR36 image acceptance;
- manual owner AI browser acceptance;
- backup/restore or rollback drills;
- legal/privacy review;
- live red-team evidence;
- production smoke/monitoring evidence.

## Required next proof layers

The approved architecture still requires security/runtime layers above the AI-14 foundation.

### Signed Evidence Attestation

Evidence Capsules need a trusted server-side attestation layer using managed asymmetric signing (KMS/HSM or equivalent), trusted key ids, key rotation, expiry/revocation policy, and verification before acceptance.

A client/browser must never possess an evidence-signing private key.

### Sovereign Owner Decision Receipts

The protected owner actions need independently verifiable receipts bound to:

- exact owner identity;
- exact Release DNA;
- exact action;
- exact payload digest;
- exact scope/environment digest;
- issuance/expiry;
- nonce;
- one-time consumption state;
- decision and reason.

Merge approval, DB-promotion approval, and production-activation approval remain three separate protected decisions.

### Persistent Evidence Graph

The long-term proof model must link:

`Requirement -> Code -> Test -> Threat -> Gate -> Evidence -> Decision/Incident -> Release`

Persistence must be append-oriented/tamper-evident and must not give browser roles authority to manufacture privileged proof.

### Trusted Evidence Collectors

Repository CI, security review, manual QA, staging runtime, legal review, owner approval, and production operations each require a source-specific verifier/collector. A user-provided URL or arbitrary JSON object is not sufficient evidence by itself.

### Release provenance

A future Release DNA builder must calculate hashes from the actual release artifacts and deployment inputs, not accept release hashes from an untrusted browser request.

## AI-13 dependency

AI-14 is stacked on the exact green AI-13 implementation and must not be merged ahead of AI-13.

AI-13 remains separately blocked from database promotion until non-production migration execution, executable privilege/RLS tests, real concurrency/race verification, Black Box concurrent-writer verification, backup/restore/rollback proof, required security review, and protected owner DB-promotion approval are completed.

## Definition of 100 percent

The Proof System may expose `TIGER_SOVEREIGN_PROOF_100` only when the canonical readiness engine itself reaches true production readiness for the exact Release DNA.

The operational definition remains:

- 45 required gates;
- 45 accepted PASS evidence records;
- 0 blocked gates;
- 0 missing gates;
- 0 stale release evidence used as proof;
- 0 fixture/simulated production evidence;
- correct production sequence;
- required owner approvals separately evidenced;
- production post-deploy verification completed.

Until then the only truthful state is:

`TIGER_SOVEREIGN_PROOF_BLOCKED`
