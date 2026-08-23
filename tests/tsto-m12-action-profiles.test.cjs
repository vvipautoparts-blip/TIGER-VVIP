'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTION_PROFILE_IDS,
  getActionProfile,
  compileProofGeometry,
} = require('../scripts/trust/action-profiles.cjs');

const EXPECTED_DIMENSIONS = [
  'IDENTITY',
  'SOURCE',
  'ARTIFACT',
  'RUNTIME',
  'POLICY',
  'COUNTRY',
  'RISK_SIGNAL',
  'REPLAY',
  'FRESHNESS',
];

const EXPECTED_CONSTRAINTS = {
  whole_vehicle_forbidden: true,
  transaction_authority_forbidden: true,
  source_durable_required: true,
  deployed_durable_verified_required: true,
  release_evidence_schema: 'market-contact-replay-release-evidence-v1',
};

const EXPECTED_LEASE_POLICY = {
  ttl_ms: 45_000,
  max_uses: 1,
};

test('Market Genesis Contact/Handoff profile is exact and deeply immutable', () => {
  const id = ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF;
  assert.equal(id, 'MARKET_GENESIS.CONTACT_HANDOFF');

  const profile = getActionProfile(id);
  assert.deepEqual(profile, {
    profile_id: id,
    profile_version: 1,
    required_dimensions: EXPECTED_DIMENSIONS,
    constraints: EXPECTED_CONSTRAINTS,
    lease_policy: EXPECTED_LEASE_POLICY,
  });

  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(profile.required_dimensions));
  assert.ok(Object.isFrozen(profile.constraints));
  assert.ok(Object.isFrozen(profile.lease_policy));
  assert.throws(() => { profile.constraints.whole_vehicle_forbidden = false; }, TypeError);
  assert.throws(() => { profile.required_dimensions.pop(); }, TypeError);
});

test('caller cannot reduce dimensions, constraints, TTL, or max uses through arguments', () => {
  const id = ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF;
  const attackerOverride = {
    required_dimensions: ['IDENTITY'],
    constraints: {
      whole_vehicle_forbidden: false,
      deployed_durable_verified_required: false,
    },
    lease_policy: { ttl_ms: Number.MAX_SAFE_INTEGER, max_uses: 999 },
  };

  const profile = getActionProfile(id, attackerOverride);
  assert.deepEqual(profile.required_dimensions, EXPECTED_DIMENSIONS);
  assert.deepEqual(profile.constraints, EXPECTED_CONSTRAINTS);
  assert.deepEqual(profile.lease_policy, EXPECTED_LEASE_POLICY);
});

test('unknown action profile fails closed with bounded reason', () => {
  assert.throws(
    () => getActionProfile('UNKNOWN.ACTION'),
    (error) => error && error.code === 'TRUST_ACTION_PROFILE_UNKNOWN'
      && error.message === 'TRUST_ACTION_PROFILE_UNKNOWN',
  );
});

test('Adaptive Proof Geometry is deterministic and binds immutable profile requirements', () => {
  const id = ACTION_PROFILE_IDS.MARKET_GENESIS_CONTACT_HANDOFF;
  const one = compileProofGeometry(id);
  const two = compileProofGeometry(id);

  assert.deepEqual(one, two);
  assert.equal(one.profile_id, id);
  assert.equal(one.profile_version, 1);
  assert.deepEqual(one.required_dimensions, EXPECTED_DIMENSIONS);
  assert.match(one.geometry_sha256, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(one));
  assert.ok(Object.isFrozen(one.required_dimensions));
});
