'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../scripts/marketplace/market-source-readiness-evidence.js');
const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260823190000_market_genesis_durable_replay.sql');
const moduleExists = fs.existsSync(modulePath);

const SOURCE_SHA = '1111111111111111111111111111111111111111';
const SOURCE_TREE = '2222222222222222222222222222222222222222';
const REVIEWED_MIGRATION_SHA256 = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';
const migrationBytes = fs.readFileSync(migrationPath);

test('M11 source-readiness evidence module exists before source attestation can be trusted', () => {
  assert.equal(moduleExists, true, 'market-source-readiness-evidence.js must exist before M11 can pass');
});

if (moduleExists) {
  const contract = require(modulePath);
  const {
    createMarketSourceReadinessEvidence,
    serializeMarketSourceReadinessEvidence,
    validateMarketSourceReadinessEvidence,
  } = contract;

  function createValid() {
    return createMarketSourceReadinessEvidence({
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      replayMigrationBytes: migrationBytes,
    });
  }

  function validate(evidence, expectedSourceSha = SOURCE_SHA, expectedSourceTree = SOURCE_TREE) {
    return validateMarketSourceReadinessEvidence(evidence, {
      expectedSourceSha,
      expectedSourceTree,
    });
  }

  test('exports only the approved M11 contract interfaces', () => {
    assert.deepEqual(Object.keys(contract).sort(), [
      'createMarketSourceReadinessEvidence',
      'serializeMarketSourceReadinessEvidence',
      'validateMarketSourceReadinessEvidence',
    ]);
    assert.equal(typeof createMarketSourceReadinessEvidence, 'function');
    assert.equal(typeof serializeMarketSourceReadinessEvidence, 'function');
    assert.equal(typeof validateMarketSourceReadinessEvidence, 'function');
  });

  test('creates the exact closed SOURCE_VERIFIED evidence contract', () => {
    const evidence = createValid();
    assert.deepEqual(evidence, {
      schema: 'TIGER_MARKET_GENESIS_SOURCE_READINESS_V1',
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      state: 'SOURCE_VERIFIED',
      deployed_durable_verified: false,
      reviewed_replay_migration_sha256: REVIEWED_MIGRATION_SHA256,
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
    });
    assert.equal(Object.isFrozen(evidence), true);
    assert.equal(Object.isFrozen(evidence.authority), true);
    assert.equal(Object.isFrozen(evidence.source_contract), true);
  });

  test('serializes canonical JSON deterministically', () => {
    const evidence = createValid();
    const first = serializeMarketSourceReadinessEvidence(evidence);
    const second = serializeMarketSourceReadinessEvidence(evidence);
    assert.equal(first, second);
    assert.equal(typeof first, 'string');
    assert.equal(first.endsWith('\n'), false);
    assert.deepEqual(JSON.parse(first), evidence);

    const topLevelKeys = Object.keys(JSON.parse(first));
    assert.deepEqual(topLevelKeys, [...topLevelKeys].sort());
  });

  test('valid exact evidence returns a frozen bounded verdict', () => {
    const verdict = validate(createValid());
    assert.deepEqual(verdict, {
      ok: true,
      reason_code: 'MARKET_SOURCE_READINESS_VERIFIED',
    });
    assert.equal(Object.isFrozen(verdict), true);
  });

  test('creation requires exact lowercase source SHA and tree', () => {
    assert.throws(
      () => createMarketSourceReadinessEvidence({
        sourceSha: SOURCE_SHA.toUpperCase().replaceAll('1', 'A'),
        sourceTree: SOURCE_TREE,
        replayMigrationBytes: migrationBytes,
      }),
      (error) => error && error.code === 'MARKET_SOURCE_READINESS_INVALID',
    );

    assert.throws(
      () => createMarketSourceReadinessEvidence({
        sourceSha: SOURCE_SHA,
        sourceTree: 'short',
        replayMigrationBytes: migrationBytes,
      }),
      (error) => error && error.code === 'MARKET_SOURCE_READINESS_INVALID',
    );
  });

  test('creation hashes supplied migration bytes and rejects anything except reviewed bytes', () => {
    assert.throws(
      () => createMarketSourceReadinessEvidence({
        sourceSha: SOURCE_SHA,
        sourceTree: SOURCE_TREE,
        replayMigrationBytes: Buffer.from('tampered migration', 'utf8'),
      }),
      (error) => error && error.code === 'MARKET_REPLAY_MIGRATION_DIGEST_MISMATCH',
    );
  });

  test('validator rejects missing or unknown top-level, authority, and source-contract keys', () => {
    assert.equal(validate(undefined).reason_code, 'MARKET_SOURCE_READINESS_MISSING');

    const top = structuredClone(createValid());
    top.database_url = 'forbidden';
    assert.equal(validate(top).reason_code, 'MARKET_SOURCE_READINESS_INVALID');

    const authority = structuredClone(createValid());
    authority.authority.runtime_host = 'forbidden';
    assert.equal(validate(authority).reason_code, 'MARKET_SOURCE_READINESS_INVALID');

    const sourceContract = structuredClone(createValid());
    sourceContract.source_contract.checkout_enabled = false;
    assert.equal(validate(sourceContract).reason_code, 'MARKET_SOURCE_READINESS_INVALID');
  });

  test('validator rejects source SHA and source tree mismatch distinctly', () => {
    assert.equal(
      validate(createValid(), 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', SOURCE_TREE).reason_code,
      'MARKET_SOURCE_SHA_MISMATCH',
    );
    assert.equal(
      validate(createValid(), SOURCE_SHA, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb').reason_code,
      'MARKET_SOURCE_TREE_MISMATCH',
    );
  });

  test('validator rejects reviewed migration digest mismatch', () => {
    const evidence = structuredClone(createValid());
    evidence.reviewed_replay_migration_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    assert.equal(validate(evidence).reason_code, 'MARKET_REPLAY_MIGRATION_DIGEST_MISMATCH');
  });

  test('deployed durability can never be claimed by M11 source evidence', () => {
    const evidence = structuredClone(createValid());
    evidence.deployed_durable_verified = true;
    assert.equal(validate(evidence).reason_code, 'MARKET_DEPLOYED_DURABLE_SOURCE_CLAIM_FORBIDDEN');
  });

  test('all Market Genesis authority and source-contract invariants fail closed', () => {
    const mutations = [
      (value) => { value.authority.market_genesis_active = false; },
      (value) => { value.authority.living_classified_fabric_active = true; },
      (value) => { value.authority.transaction_capabilities_enabled = true; },
      (value) => { value.authority.pulse_ad_billing_authority_preserved = false; },
      (value) => { value.authority.contact_replay_protection_durable = false; },
      (value) => { value.source_contract.contract_version = 'legacy'; },
      (value) => { value.source_contract.whole_vehicle_ads_forbidden = false; },
      (value) => { value.source_contract.no_transaction = false; },
      (value) => { value.source_contract.release_evidence_required_for_contact = false; },
      (value) => { value.source_contract.retired_fallback_forbidden = false; },
    ];

    for (const mutate of mutations) {
      const evidence = structuredClone(createValid());
      mutate(evidence);
      assert.equal(validate(evidence).reason_code, 'MARKET_SOURCE_CONTRACT_MISMATCH');
    }
  });

  test('serializer refuses invalid or authority-mutated evidence instead of sealing it', () => {
    const evidence = structuredClone(createValid());
    evidence.authority.transaction_capabilities_enabled = true;
    assert.throws(
      () => serializeMarketSourceReadinessEvidence(evidence),
      (error) => error && error.code === 'MARKET_SOURCE_CONTRACT_MISMATCH',
    );
  });
}
