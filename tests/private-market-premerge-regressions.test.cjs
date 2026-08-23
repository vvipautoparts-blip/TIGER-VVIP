'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createIntentRuntimeAdapter } = require('../scripts/synapse/intent-runtime-adapters.js');
const { createSectorPhysicsRegistry } = require('../scripts/marketplace/private-market-contracts.js');

function liveIntentInput() {
  return {
    direction: 'NEED',
    sector: 'AUTO_PARTS',
    category: 'brakes',
    summary: 'Need brake pads',
    requiredConstraints: {},
    preferences: {},
    market: { country: 'JO' },
    activationMode: 'LIVE_NETWORK',
    visibilityClass: 'MATCHING_NETWORK',
    expiresAt: '2026-08-30T13:30:00.000Z',
    sourceProvenance: 'USER_DECLARED',
  };
}

function persistedIntent() {
  return {
    intentId: 'intent-persisted-001',
    actorSubject: 'user_owner_1',
    direction: 'NEED',
    sector: 'AUTO_PARTS',
    activationMode: 'LIVE_NETWORK',
    visibilityClass: 'MATCHING_NETWORK',
    status: 'CONFIRMED',
    policyVersion: 'SYNAPSE-S1',
    revision: 1,
  };
}

function marketAuthority() {
  return {
    actorSubject: 'user_owner_1',
    intentRevision: 1,
    sectorId: 'AUTO_PARTS',
    sectorPhysicsVersion: 'AUTO_PARTS-1',
    policyVersion: 'SYNAPSE-S1',
    country: 'JO',
    maxResultBound: 20,
    requestedResultBound: 12,
    purpose: 'DISCOVERY',
  };
}

test('persisted SYNAPSE intent remains a successful create when downstream Market Genesis dispatch fails', async () => {
  const persisted = persistedIntent();
  const runtime = createIntentRuntimeAdapter({
    rpc: async () => ({ data: persisted }),
    marketGenesisBridge: {
      async dispatchConfirmedIntent() {
        const error = new Error('temporary market compiler outage');
        error.code = 'MARKET_GENESIS_TEMPORARY_FAILURE';
        throw error;
      },
    },
  });

  const result = await runtime.create(liveIntentInput(), {
    actorSubject: 'user_owner_1',
    explicitConfirmation: true,
    policyVersion: 'SYNAPSE-S1',
    now: new Date('2026-08-23T13:30:00.000Z'),
    marketGenesisAuthority: marketAuthority(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.value, persisted);
  assert.deepEqual(result.marketGenesis, {
    ok: false,
    code: 'MARKET_GENESIS_TEMPORARY_FAILURE',
    retryable: true,
  });
});

function physicsWithOverlay(overlay) {
  return {
    sector_id: 'automotive',
    version: '1.0.0',
    allowed_entity_types: ['AUTO_PART'],
    forbidden_entity_types: ['WHOLE_VEHICLE'],
    required_dimensions: ['part_type'],
    country_overlays: { JO: overlay },
    hard_invariants: {
      transaction_features_forbidden: true,
      sponsored_cannot_bypass_eligibility: true,
      whole_vehicle_ads_forbidden: true,
    },
  };
}

test('country overlay cannot relax global entity admission or hard prohibition fields', () => {
  const registry = createSectorPhysicsRegistry();

  assert.throws(
    () => registry.activate(physicsWithOverlay({ forbidden_entity_types: [] })),
    /country overlay.*forbidden_entity_types|protected/i,
  );

  assert.throws(
    () => registry.activate(physicsWithOverlay({ allowed_entity_types: ['AUTO_PART', 'WHOLE_VEHICLE'] })),
    /country overlay.*allowed_entity_types|protected/i,
  );

  assert.throws(
    () => registry.activate(physicsWithOverlay({ category_firewall: { whole_vehicle_ads_forbidden: false } })),
    /country overlay.*category_firewall|protected/i,
  );
});
