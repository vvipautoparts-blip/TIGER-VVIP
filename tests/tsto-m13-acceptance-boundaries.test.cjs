'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonicalJson,
  sha256Hex,
} = require('../scripts/trust/contracts.cjs');
const { createTrustedVerifierAdapter } = require('../scripts/trust/runtime-attestation.cjs');
const { createDeploymentAttestationBridge } = require('../scripts/trust/deployment-attestation-bridge.cjs');

const SHA = 'a'.repeat(40);
const TREE = 'b'.repeat(40);
const ARTIFACT = '1'.repeat(64);
const NOW = 1_700_000_000_000;
const MIGRATION = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';

function sourceReadiness() {
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
  };
}

function releaseEvidence() {
  return {
    target_environment: 'staging',
    contact_replay_release_evidence: {
      schema_version: 'market-contact-replay-release-evidence-v1',
      environment: 'staging',
      release_sha: SHA,
      migration_sha256: MIGRATION,
      migration_applied: true,
      migration_applied_at: '2026-08-24T00:00:00.000Z',
      probe_completed_at: '2026-08-24T00:01:00.000Z',
      probe_run_id: 'm13-acceptance-boundary',
      runtime_instance_count: 2,
      duplicate_nonce_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
      duplicate_consume_probe: { attempts: 2, successes: 1, replay_rejections: 1 },
    },
  };
}

function trustDna(source) {
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

function epochs() {
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

function trustedAttestation() {
  const adapter = createTrustedVerifierAdapter({
    authenticate(external) {
      return external?.authenticated === true ? external.result : null;
    },
  });
  return adapter.admit({
    authenticated: true,
    result: {
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
    },
  }, { nowMs: NOW });
}

function factory() {
  const source = sourceReadiness();
  return createDeploymentAttestationBridge({
    expectedSourceSha: SHA,
    expectedSourceTree: TREE,
    observedHeadSha: SHA,
    expectedEnvironment: 'staging',
    expectedArtifactSha256: ARTIFACT,
    trustDna: trustDna(source),
    epochVector: epochs(),
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

test('valid M11 source readiness alone cannot derive runtime attestation truth', () => {
  expectCode(
    () => factory().derive({
      sourceReadinessEvidence: sourceReadiness(),
      releaseEvidence: null,
      attestationResult: null,
    }),
    'DEPLOYMENT_EVIDENCE_UNVERIFIED',
  );
});

test('valid M10 deployment evidence alone cannot derive runtime attestation truth', () => {
  expectCode(
    () => factory().derive({
      sourceReadinessEvidence: null,
      releaseEvidence: releaseEvidence(),
      attestationResult: null,
    }),
    'SOURCE_READINESS_UNVERIFIED',
  );
});

test('valid trusted attestation alone cannot derive deployed-durable truth', () => {
  expectCode(
    () => factory().derive({
      sourceReadinessEvidence: null,
      releaseEvidence: null,
      attestationResult: trustedAttestation(),
    }),
    'SOURCE_READINESS_UNVERIFIED',
  );
});

test('caller cannot inject trusted time, release, environment, artifact, or proof requirements into Bridge derive input', () => {
  const base = {
    sourceReadinessEvidence: sourceReadiness(),
    releaseEvidence: releaseEvidence(),
    attestationResult: trustedAttestation(),
  };
  const attempts = [
    { now_ms: NOW + 1 },
    { expected_release_sha: 'c'.repeat(40) },
    { expected_environment: 'production' },
    { expected_artifact_sha256: '9'.repeat(64) },
    { required_dimensions: ['RUNTIME'] },
    { verifier_ref_sha256: 'f'.repeat(64) },
  ];

  for (const extra of attempts) {
    expectCode(
      () => factory().derive({ ...base, ...extra }),
      'DEPLOYMENT_EVIDENCE_UNVERIFIED',
    );
  }
});
