'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { canonicalJson, sha256Hex, validateTrustDna, validateEpochVector } = require('../scripts/trust/contracts.cjs');
const { createTrustedVerifierAdapter } = require('../scripts/trust/runtime-attestation.cjs');
const { createDeploymentAttestationBridge } = require('../scripts/trust/deployment-attestation-bridge.cjs');
const { createTrustedWorkloadIdentityAdapter } = require('../scripts/trust/workload-identity.cjs');
const { createTrustedTransparencyAdapter } = require('../scripts/trust/transparency-evidence.cjs');
const {
  IDENTITY_TRANSPARENCY_CONSTELLATION_SCHEMA,
  createIdentityTransparencyConstellation,
  validateIdentityTransparencyConstellation,
  digestIdentityTransparencyConstellation,
  isTrustedIdentityTransparencyConstellation,
} = require('../scripts/trust/identity-transparency-constellation.cjs');

const HEX = (c, n = 64) => c.repeat(n);
const SHA = HEX('a', 40);
const TREE = HEX('b', 40);
const ARTIFACT = HEX('1');
const WORKLOAD = HEX('2');
const TRUST_DOMAIN = HEX('3');
const IDENTITY_PUBLIC_KEY = HEX('4');
const STATEMENT = HEX('5');
const REGISTRY = HEX('6');
const NOW = 1_700_000_000_000;
const MIGRATION = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';

function sourceReadiness() {
  return {
    schema: 'TIGER_MARKET_GENESIS_SOURCE_READINESS_V1', source_sha: SHA, source_tree: TREE,
    state: 'SOURCE_VERIFIED', deployed_durable_verified: false,
    reviewed_replay_migration_sha256: MIGRATION,
    authority: { market_genesis_active: true, living_classified_fabric_active: false, transaction_capabilities_enabled: false, pulse_ad_billing_authority_preserved: true, contact_replay_protection_durable: true },
    source_contract: { contract_version: 'market-genesis-source-contract-v1', whole_vehicle_ads_forbidden: true, no_transaction: true, release_evidence_required_for_contact: true, retired_fallback_forbidden: true },
  };
}
function releaseEvidence() {
  return { target_environment: 'staging', contact_replay_release_evidence: {
    schema_version: 'market-contact-replay-release-evidence-v1', environment: 'staging', release_sha: SHA,
    migration_sha256: MIGRATION, migration_applied: true,
    migration_applied_at: '2026-08-24T00:00:00.000Z', probe_completed_at: '2026-08-24T00:01:00.000Z', probe_run_id: 'm15-constellation-test', runtime_instance_count: 2,
    duplicate_nonce_probe: { attempts: 2, successes: 1, replay_rejections: 1 }, duplicate_consume_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
  } };
}
function dna(source) {
  return validateTrustDna({ schema: 'TIGER_TRUST_DNA_V1', repository: 'vvipautoparts-blip/TIGER-VVIP', source_sha: SHA, source_tree: TREE,
    source_readiness_sha256: sha256Hex(canonicalJson(source)), release_evidence_contract_sha256: HEX('7'), authority_policy_sha256: HEX('8') });
}
function epochs() {
  return validateEpochVector({ schema: 'TIGER_SOVEREIGN_EPOCH_VECTOR_V1', owner_epoch: 1, policy_epoch: 2, market_epoch: 3, ai_policy_epoch: 4, crypto_epoch: 5, country_epochs: [{ country_code: 'JO', epoch: 6 }] });
}
function trustedBridge() {
  const source = sourceReadiness(); const trustDna = dna(source); const epochVector = epochs();
  const verifier = createTrustedVerifierAdapter({ authenticate(x) { return x?.ok ? x.result : null; } });
  const attestation = verifier.admit({ ok: true, result: {
    schema: 'TIGER_ATTESTATION_RESULT_V1', result_class: 'VERIFIED_RUNTIME_APPRAISAL', environment: 'staging', release_sha: SHA,
    runtime_artifact_sha256: ARTIFACT, verifier_ref_sha256: HEX('9'), attester_ref_sha256: HEX('a'), evidence_sha256: HEX('b'), appraisal_policy_sha256: HEX('c'), freshness_binding_sha256: HEX('d'),
    issued_at_ms: NOW - 10_000, fresh_until_ms: NOW + 120_000, state: 'PASS',
  } }, { nowMs: NOW });
  return createDeploymentAttestationBridge({ expectedSourceSha: SHA, expectedSourceTree: TREE, observedHeadSha: SHA, expectedEnvironment: 'staging', expectedArtifactSha256: ARTIFACT, trustDna, epochVector, clock: () => NOW }).derive({ sourceReadinessEvidence: source, releaseEvidence: releaseEvidence(), attestationResult: attestation });
}
function trustedWorkload(releaseDna) {
  return createTrustedWorkloadIdentityAdapter({ authenticate(x) { return x?.ok ? x.result : null; }, clock: () => NOW }).admit({ ok: true, result: {
    schema: 'TIGER_WORKLOAD_IDENTITY_V2', identity_class: 'AUTHENTICATED_PROOF_BOUND_WORKLOAD_IDENTITY', environment: 'staging', release_dna_sha256: releaseDna,
    runtime_artifact_sha256: ARTIFACT, trust_domain_sha256: TRUST_DOMAIN, workload_ref_sha256: WORKLOAD, identity_public_key_sha256: IDENTITY_PUBLIC_KEY,
    issuer_ref_sha256: HEX('e'), evidence_sha256: HEX('f'), issued_at_ms: NOW - 1_000, fresh_until_ms: NOW + 90_000, state: 'PASS',
  } });
}
function trustedTransparency(releaseDna) {
  return createTrustedTransparencyAdapter({ authenticate(x) { return x?.ok ? x.result : null; }, clock: () => NOW }).admit({ ok: true, result: {
    schema: 'TIGER_TRANSPARENCY_RESULT_V1', result_class: 'VERIFIED_TRANSPARENCY_STATEMENT', release_dna_sha256: releaseDna, runtime_artifact_sha256: ARTIFACT,
    statement_sha256: STATEMENT, registry_ref_sha256: REGISTRY, verifier_ref_sha256: HEX('a'), receipt_sha256: HEX('b'), verified_at_ms: NOW - 1_000, fresh_until_ms: NOW + 60_000, state: 'PASS',
  } });
}
function factory(releaseDna) {
  return createIdentityTransparencyConstellation({ expectedReleaseDnaSha256: releaseDna, expectedEnvironment: 'staging', expectedArtifactSha256: ARTIFACT, expectedWorkloadRefSha256: WORKLOAD, expectedStatementSha256: STATEMENT, expectedRegistryRefSha256: REGISTRY, clock: () => NOW });
}
function expectCode(fn, code) { assert.throws(fn, (e) => e?.code === code && e?.message === code); }

test('trusted M13 + workload + transparency derive one bounded trusted constellation', () => {
  const bridge = trustedBridge(); const releaseDna = bridge.trust_dna_sha256;
  const result = factory(releaseDna).derive({ bridgeResult: bridge, workloadIdentity: trustedWorkload(releaseDna), transparencyResult: trustedTransparency(releaseDna) });
  assert.equal(result.schema, 'TIGER_IDENTITY_TRANSPARENCY_CONSTELLATION_V1');
  assert.equal(IDENTITY_TRANSPARENCY_CONSTELLATION_SCHEMA, result.schema);
  assert.equal(result.fresh_until_ms, NOW + 60_000);
  assert.equal(isTrustedIdentityTransparencyConstellation(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.match(digestIdentityTransparencyConstellation(result, { nowMs: NOW }), /^[0-9a-f]{64}$/);
  assert.deepEqual(validateIdentityTransparencyConstellation({ ...result }, { nowMs: NOW }), { ...result });
  assert.equal(isTrustedIdentityTransparencyConstellation({ ...result }), false);
});

test('copied trusted inputs cannot mint constellation provenance', () => {
  const bridge = trustedBridge(); const releaseDna = bridge.trust_dna_sha256;
  const workload = trustedWorkload(releaseDna); const transparency = trustedTransparency(releaseDna);
  expectCode(() => factory(releaseDna).derive({ bridgeResult: { ...bridge }, workloadIdentity: workload, transparencyResult: transparency }), 'TRUST_CONSTELLATION_UNTRUSTED');
  expectCode(() => factory(releaseDna).derive({ bridgeResult: bridge, workloadIdentity: { ...workload }, transparencyResult: transparency }), 'TRUST_CONSTELLATION_UNTRUSTED');
  expectCode(() => factory(releaseDna).derive({ bridgeResult: bridge, workloadIdentity: workload, transparencyResult: { ...transparency } }), 'TRUST_CONSTELLATION_UNTRUSTED');
});

test('release, artifact, environment, workload, statement and registry mismatches fail closed', () => {
  const bridge = trustedBridge(); const releaseDna = bridge.trust_dna_sha256; const workload = trustedWorkload(releaseDna); const transparency = trustedTransparency(releaseDna);
  expectCode(() => createIdentityTransparencyConstellation({ expectedReleaseDnaSha256: HEX('d'), expectedEnvironment: 'staging', expectedArtifactSha256: ARTIFACT, expectedWorkloadRefSha256: WORKLOAD, expectedStatementSha256: STATEMENT, expectedRegistryRefSha256: REGISTRY, clock: () => NOW }).derive({ bridgeResult: bridge, workloadIdentity: workload, transparencyResult: transparency }), 'TRUST_CONSTELLATION_RUNTIME_MISMATCH');
  expectCode(() => createIdentityTransparencyConstellation({ expectedReleaseDnaSha256: releaseDna, expectedEnvironment: 'production', expectedArtifactSha256: ARTIFACT, expectedWorkloadRefSha256: WORKLOAD, expectedStatementSha256: STATEMENT, expectedRegistryRefSha256: REGISTRY, clock: () => NOW }).derive({ bridgeResult: bridge, workloadIdentity: workload, transparencyResult: transparency }), 'TRUST_CONSTELLATION_RUNTIME_MISMATCH');
  expectCode(() => createIdentityTransparencyConstellation({ expectedReleaseDnaSha256: releaseDna, expectedEnvironment: 'staging', expectedArtifactSha256: HEX('9'), expectedWorkloadRefSha256: WORKLOAD, expectedStatementSha256: STATEMENT, expectedRegistryRefSha256: REGISTRY, clock: () => NOW }).derive({ bridgeResult: bridge, workloadIdentity: workload, transparencyResult: transparency }), 'TRUST_CONSTELLATION_RUNTIME_MISMATCH');
  expectCode(() => createIdentityTransparencyConstellation({ expectedReleaseDnaSha256: releaseDna, expectedEnvironment: 'staging', expectedArtifactSha256: ARTIFACT, expectedWorkloadRefSha256: HEX('9'), expectedStatementSha256: STATEMENT, expectedRegistryRefSha256: REGISTRY, clock: () => NOW }).derive({ bridgeResult: bridge, workloadIdentity: workload, transparencyResult: transparency }), 'TRUST_WORKLOAD_IDENTITY_MISMATCH');
  expectCode(() => createIdentityTransparencyConstellation({ expectedReleaseDnaSha256: releaseDna, expectedEnvironment: 'staging', expectedArtifactSha256: ARTIFACT, expectedWorkloadRefSha256: WORKLOAD, expectedStatementSha256: HEX('9'), expectedRegistryRefSha256: REGISTRY, clock: () => NOW }).derive({ bridgeResult: bridge, workloadIdentity: workload, transparencyResult: transparency }), 'TRUST_TRANSPARENCY_MISMATCH');
  expectCode(() => createIdentityTransparencyConstellation({ expectedReleaseDnaSha256: releaseDna, expectedEnvironment: 'staging', expectedArtifactSha256: ARTIFACT, expectedWorkloadRefSha256: WORKLOAD, expectedStatementSha256: STATEMENT, expectedRegistryRefSha256: HEX('9'), clock: () => NOW }).derive({ bridgeResult: bridge, workloadIdentity: workload, transparencyResult: transparency }), 'TRUST_TRANSPARENCY_MISMATCH');
});
