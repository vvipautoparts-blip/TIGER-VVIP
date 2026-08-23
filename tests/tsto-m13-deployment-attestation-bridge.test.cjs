'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonicalJson,
  sha256Hex,
  validateTrustDna,
  validateEpochVector,
  digestValidated,
} = require('../scripts/trust/contracts.cjs');
const {
  createTrustedVerifierAdapter,
  digestAttestationResult,
} = require('../scripts/trust/runtime-attestation.cjs');
const {
  DEPLOYMENT_ATTESTATION_BRIDGE_SCHEMA,
  createDeploymentAttestationBridge,
  isTrustedDeploymentAttestationBridge,
} = require('../scripts/trust/deployment-attestation-bridge.cjs');

const SHA = 'a'.repeat(40);
const TREE = 'b'.repeat(40);
const ARTIFACT = '1'.repeat(64);
const NOW = 1_700_000_000_000;
const MIGRATION = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';

function sourceReadiness(overrides = {}) {
  return {
    schema: 'TIGER_MARKET_GENESIS_SOURCE_READINESS_V1',
    source_sha: SHA,
    source_tree: TREE,
    state: 'SOURCE_VERIFIED',
    deployed_durable_verified: false,
    reviewed_replay_migration_sha256: MIGRATION,
    authority: {
      market_genesis_active: true,
      living_classified_fabric_active: false,
      transaction_capabilities_enabled: false,
      pulse_ad_billing_authority_preserved: true,
      contact_replay_protection_durable: true,
    },
    source_contract: {
      contract_version: 'market-genesis-source-contract-v1',
      whole_vehicle_ads_forbidden: true,
      no_transaction: true,
      release_evidence_required_for_contact: true,
      retired_fallback_forbidden: true,
    },
    ...overrides,
  };
}

function releaseEvidence(overrides = {}) {
  const evidence = {
    schema_version: 'market-contact-replay-release-evidence-v1',
    environment: 'staging',
    release_sha: SHA,
    migration_sha256: MIGRATION,
    migration_applied: true,
    migration_applied_at: '2026-08-24T00:00:00.000Z',
    probe_completed_at: '2026-08-24T00:01:00.000Z',
    probe_run_id: 'm13-source-test',
    runtime_instance_count: 2,
    duplicate_nonce_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
    duplicate_consume_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
    ...(overrides.contact_replay_release_evidence || {}),
  };
  return {
    target_environment: overrides.target_environment || 'staging',
    contact_replay_release_evidence: evidence,
  };
}

function trustDna(source = sourceReadiness()) {
  return {
    schema: 'TIGER_TRUST_DNA_V1',
    repository: 'vvipautoparts-blip/TIGER-VVIP',
    source_sha: SHA,
    source_tree: TREE,
    source_readiness_sha256: sha256Hex(canonicalJson(source)),
    release_evidence_contract_sha256: '2'.repeat(64),
    authority_policy_sha256: '3'.repeat(64),
  };
}

function epochVector() {
  return {
    schema: 'TIGER_SOVEREIGN_EPOCH_VECTOR_V1',
    owner_epoch: 1,
    policy_epoch: 2,
    market_epoch: 3,
    ai_policy_epoch: 4,
    crypto_epoch: 5,
    country_epochs: [{ country_code: 'JO', epoch: 6 }],
  };
}

function rawAttestation(overrides = {}) {
  return {
    schema: 'TIGER_ATTESTATION_RESULT_V1',
    result_class: 'VERIFIED_RUNTIME_APPRAISAL',
    environment: 'staging',
    release_sha: SHA,
    runtime_artifact_sha256: ARTIFACT,
    verifier_ref_sha256: '4'.repeat(64),
    attester_ref_sha256: '5'.repeat(64),
    evidence_sha256: '6'.repeat(64),
    appraisal_policy_sha256: '7'.repeat(64),
    freshness_binding_sha256: '8'.repeat(64),
    issued_at_ms: NOW - 30_000,
    fresh_until_ms: NOW + 120_000,
    state: 'PASS',
    ...overrides,
  };
}

function trustedAttestation(overrides = {}) {
  const adapter = createTrustedVerifierAdapter({
    authenticate(external) {
      return external?.authenticated === true ? external.result : null;
    },
  });
  return adapter.admit({ authenticated: true, result: rawAttestation(overrides) }, { nowMs: NOW });
}

function bridgeFactory({ source = sourceReadiness(), dna = null, epochs = epochVector(), artifact = ARTIFACT } = {}) {
  return createDeploymentAttestationBridge({
    expectedSourceSha: SHA,
    expectedSourceTree: TREE,
    observedHeadSha: SHA,
    expectedEnvironment: 'staging',
    expectedArtifactSha256: artifact,
    trustDna: dna || trustDna(source),
    epochVector: epochs,
    clock: () => NOW,
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    assert.equal(error?.message, code);
    return true;
  });
}

test('M13 bridge derives only mutually consistent M10 + M11 + trusted attestation state', () => {
  const source = sourceReadiness();
  const release = releaseEvidence();
  const attestation = trustedAttestation();
  const bridge = bridgeFactory({ source }).derive({
    sourceReadinessEvidence: source,
    releaseEvidence: release,
    attestationResult: attestation,
  });

  assert.equal(bridge.schema, DEPLOYMENT_ATTESTATION_BRIDGE_SCHEMA);
  assert.equal(bridge.release_sha, SHA);
  assert.equal(bridge.source_tree, TREE);
  assert.equal(bridge.environment, 'staging');
  assert.equal(bridge.runtime_artifact_sha256, ARTIFACT);
  assert.equal(bridge.source_readiness_sha256, sha256Hex(canonicalJson(source)));
  assert.equal(bridge.deployment_evidence_sha256, sha256Hex(canonicalJson(release)));
  assert.equal(bridge.trust_dna_sha256, digestValidated(trustDna(source), validateTrustDna));
  assert.equal(bridge.epoch_vector_sha256, digestValidated(epochVector(), validateEpochVector));
  assert.equal(bridge.attestation_result_sha256, digestAttestationResult(attestation, { nowMs: NOW }));
  assert.equal(bridge.source_readiness_verified, true);
  assert.equal(bridge.deployment_evidence_verified, true);
  assert.equal(bridge.runtime_attestation_verified, true);
  assert.equal(bridge.production_activation_authorized, false);
  assert.equal(bridge.transaction_authority_enabled, false);
  assert.equal(bridge.state, 'PASS');
  assert.equal(isTrustedDeploymentAttestationBridge(bridge), true);
  assert.ok(Object.isFrozen(bridge));
});

test('shape-valid attestation without trusted verifier provenance is rejected', () => {
  expectCode(
    () => bridgeFactory().derive({
      sourceReadinessEvidence: sourceReadiness(),
      releaseEvidence: releaseEvidence(),
      attestationResult: rawAttestation(),
    }),
    'ATTESTATION_VERIFIER_UNTRUSTED',
  );
});

test('release, environment, and artifact mismatches fail with bounded reason codes', () => {
  expectCode(
    () => bridgeFactory().derive({
      sourceReadinessEvidence: sourceReadiness(),
      releaseEvidence: releaseEvidence(),
      attestationResult: trustedAttestation({ release_sha: 'c'.repeat(40) }),
    }),
    'ATTESTATION_RELEASE_MISMATCH',
  );
  expectCode(
    () => bridgeFactory().derive({
      sourceReadinessEvidence: sourceReadiness(),
      releaseEvidence: releaseEvidence(),
      attestationResult: trustedAttestation({ environment: 'production' }),
    }),
    'ATTESTATION_ENVIRONMENT_MISMATCH',
  );
  expectCode(
    () => bridgeFactory().derive({
      sourceReadinessEvidence: sourceReadiness(),
      releaseEvidence: releaseEvidence(),
      attestationResult: trustedAttestation({ runtime_artifact_sha256: '9'.repeat(64) }),
    }),
    'ATTESTATION_ARTIFACT_MISMATCH',
  );
});

test('M11 or M10 evidence failure blocks before runtime trust is derived', () => {
  const badSource = sourceReadiness({ source_sha: 'c'.repeat(40) });
  expectCode(
    () => bridgeFactory().derive({
      sourceReadinessEvidence: badSource,
      releaseEvidence: releaseEvidence(),
      attestationResult: trustedAttestation(),
    }),
    'SOURCE_READINESS_UNVERIFIED',
  );

  expectCode(
    () => bridgeFactory().derive({
      sourceReadinessEvidence: sourceReadiness(),
      releaseEvidence: releaseEvidence({
        contact_replay_release_evidence: { runtime_instance_count: 1 },
      }),
      attestationResult: trustedAttestation(),
    }),
    'DEPLOYMENT_EVIDENCE_UNVERIFIED',
  );
});

test('Trust DNA is bound to exact source readiness evidence', () => {
  const source = sourceReadiness();
  const dna = trustDna(source);
  const mismatchedDna = { ...dna, source_readiness_sha256: 'f'.repeat(64) };
  expectCode(
    () => bridgeFactory({ source, dna: mismatchedDna }).derive({
      sourceReadinessEvidence: source,
      releaseEvidence: releaseEvidence(),
      attestationResult: trustedAttestation(),
    }),
    'TRUST_DNA_BINDING_MISMATCH',
  );
});

test('bridge output is evidence-minimized and carries no raw nonce, secrets, or runtime host data', () => {
  const bridge = bridgeFactory().derive({
    sourceReadinessEvidence: sourceReadiness(),
    releaseEvidence: releaseEvidence(),
    attestationResult: trustedAttestation(),
  });
  const serialized = JSON.stringify(bridge);
  for (const forbidden of ['nonce', 'password', 'credential', 'hostname', 'private_key', 'database_url']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
