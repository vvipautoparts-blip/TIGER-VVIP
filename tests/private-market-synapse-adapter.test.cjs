'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSynapseMarketGenesisAdapter } = require('../scripts/marketplace/synapse-market-genesis-adapter.js');
const { createIntentRuntimeAdapter } = require('../scripts/synapse/intent-runtime-adapters.js');
const { validateMarketGenesisRequest } = require('../scripts/marketplace/private-market-contracts.js');

const NOW = '2026-08-23T13:30:00.000Z';

function confirmedIntent(overrides = {}) {
  return {
    intentId: 'intent-001',
    actorSubject: 'user_owner_1',
    direction: 'NEED',
    sector: 'AUTO_PARTS',
    category: 'brakes',
    summary: 'PRIVATE: need OEM front brake pads for my vehicle',
    requiredConstraints: { fitment: 'private-fitment-value' },
    preferences: { brand: 'private-brand-preference' },
    market: { country: 'UNTRUSTED_CLIENT_COUNTRY' },
    activationMode: 'LIVE_NETWORK',
    visibilityClass: 'MATCHING_NETWORK',
    createdAt: NOW,
    expiresAt: '2026-08-30T13:30:00.000Z',
    status: 'CONFIRMED',
    sourceProvenance: 'USER_DECLARED',
    schemaVersion: 'S1',
    policyVersion: 'SYNAPSE-S1',
    revision: 1,
    ...overrides,
  };
}

function authority(overrides = {}) {
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
    ...overrides,
  };
}

function liveIntentInput(overrides = {}) {
  return {
    direction: 'NEED',
    sector: 'AUTO_PARTS',
    category: 'brakes',
    summary: 'PRIVATE: need OEM front brake pads for my vehicle',
    requiredConstraints: { fitment: 'private-fitment-value' },
    preferences: { brand: 'private-brand-preference' },
    market: { country: 'UNTRUSTED_CLIENT_COUNTRY' },
    activationMode: 'LIVE_NETWORK',
    visibilityClass: 'MATCHING_NETWORK',
    expiresAt: '2026-08-30T13:30:00.000Z',
    sourceProvenance: 'USER_DECLARED',
    ...overrides,
  };
}

function assertPrivateIntentAbsent(value) {
  const encoded = JSON.stringify(value);
  for (const privateValue of [
    'PRIVATE: need OEM front brake pads for my vehicle',
    'private-fitment-value',
    'private-brand-preference',
    'UNTRUSTED_CLIENT_COUNTRY',
  ]) {
    assert.equal(encoded.includes(privateValue), false, `private value leaked: ${privateValue}`);
  }
  for (const forbiddenKey of ['summary', 'normalized_summary', 'semantic_trace', 'embedding', 'vector']) {
    assert.equal(new RegExp(`"${forbiddenKey}"`, 'i').test(encoded), false, `private key leaked: ${forbiddenKey}`);
  }
}

test('builds and dispatches a contract-valid Market Genesis request from confirmed SYNAPSE authority without leaking private intent', async () => {
  const calls = [];
  const adapter = createSynapseMarketGenesisAdapter({
    dispatch: async (request) => {
      calls.push(request);
      return { ok: true, generation_id: 'generation-001' };
    },
    requestIdFactory: () => 'request-001',
    now: () => new Date(NOW),
  });

  const trustedAuthority = authority();
  const result = await adapter.dispatchConfirmedIntent(confirmedIntent(), trustedAuthority);

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);

  const request = calls[0];
  assert.equal(request.request_id, 'request-001');
  assert.equal(request.actor_subject, trustedAuthority.actorSubject);
  assert.equal(request.intent_id, 'intent-001');
  assert.equal(request.intent_revision, trustedAuthority.intentRevision);
  assert.equal(request.intent_direction, 'NEED');
  assert.equal(request.sector_id, trustedAuthority.sectorId);
  assert.equal(request.sector_physics_version, trustedAuthority.sectorPhysicsVersion);
  assert.deepEqual(request.market_scope, { country: trustedAuthority.country });
  assert.equal(request.purpose, 'DISCOVERY');
  assert.deepEqual(request.visibility_context, { visibility: 'MATCHING_NETWORK' });
  assert.deepEqual(request.policy_context, { policy_version: trustedAuthority.policyVersion });
  assert.equal(request.requested_result_bound, trustedAuthority.requestedResultBound);
  assert.equal(request.request_time, NOW);

  const validation = validateMarketGenesisRequest(request, trustedAuthority);
  assert.equal(validation.ok, true, JSON.stringify(validation));
  assertPrivateIntentAbsent(request);
});

test('fails closed for unconfirmed, terminal, or malformed persisted intent states', async () => {
  const adapter = createSynapseMarketGenesisAdapter({ dispatch: async () => ({ ok: true }) });

  for (const status of ['DRAFT_LOCAL', 'REJECTED', 'CANCELLED', 'EXPIRED', undefined]) {
    await assert.rejects(
      () => adapter.dispatchConfirmedIntent(confirmedIntent({ status }), authority()),
      (error) => error && error.code === 'INTENT_NOT_MARKET_ELIGIBLE',
      String(status),
    );
  }
});

test('rejects trusted authority mismatches instead of accepting client or stale values', async () => {
  const adapter = createSynapseMarketGenesisAdapter({ dispatch: async () => ({ ok: true }) });
  const cases = [
    [confirmedIntent({ actorSubject: 'user_other' }), authority(), 'ACTOR_AUTHORITY_MISMATCH'],
    [confirmedIntent({ revision: 2 }), authority(), 'STALE_INTENT_REVISION'],
    [confirmedIntent({ policyVersion: 'SYNAPSE-OLD' }), authority(), 'POLICY_VERSION_MISMATCH'],
    [confirmedIntent({ sector: 'REAL_ESTATE' }), authority(), 'SECTOR_AUTHORITY_MISMATCH'],
  ];

  for (const [intent, trustedAuthority, code] of cases) {
    await assert.rejects(
      () => adapter.dispatchConfirmedIntent(intent, trustedAuthority),
      (error) => error && error.code === code,
      code,
    );
  }
});

test('uses only trusted server authority and ignores injected marketplace authority fields on the persisted intent object', async () => {
  const calls = [];
  const adapter = createSynapseMarketGenesisAdapter({
    dispatch: async (request) => {
      calls.push(request);
      return { ok: true };
    },
    requestIdFactory: () => 'request-002',
    now: () => new Date(NOW),
  });

  await adapter.dispatchConfirmedIntent(confirmedIntent({
    sectorPhysicsVersion: 'ATTACKER-PHYSICS',
    policy_context: { policy_version: 'ATTACKER-POLICY' },
    requested_result_bound: 999999,
    country: 'ATTACKER-COUNTRY',
    role: 'OWNER',
    trust_level: 'ROOT',
    ad_entitlement: 'BYPASS',
  }), authority());

  assert.equal(calls.length, 1);
  assert.equal(calls[0].sector_physics_version, 'AUTO_PARTS-1');
  assert.deepEqual(calls[0].policy_context, { policy_version: 'SYNAPSE-S1' });
  assert.equal(calls[0].requested_result_bound, 12);
  assert.deepEqual(calls[0].market_scope, { country: 'JO' });
  assert.equal(Object.hasOwn(calls[0], 'role'), false);
  assert.equal(Object.hasOwn(calls[0], 'trust_level'), false);
  assert.equal(Object.hasOwn(calls[0], 'ad_entitlement'), false);
  assertPrivateIntentAbsent(calls[0]);
});

test('rejects incomplete server authority rather than guessing versions, country, or result bounds', async () => {
  const adapter = createSynapseMarketGenesisAdapter({ dispatch: async () => ({ ok: true }) });

  for (const key of ['actorSubject', 'intentRevision', 'sectorId', 'sectorPhysicsVersion', 'policyVersion', 'country', 'maxResultBound']) {
    const incomplete = authority();
    delete incomplete[key];
    await assert.rejects(
      () => adapter.dispatchConfirmedIntent(confirmedIntent(), incomplete),
      (error) => error && error.code === 'MARKET_AUTHORITY_INCOMPLETE',
      key,
    );
  }
});

test('integrates Market Genesis behind successful confirmed LIVE_NETWORK persistence', async () => {
  const persisted = confirmedIntent();
  const bridgeCalls = [];
  const rpcCalls = [];
  const marketGenesisBridge = {
    async dispatchConfirmedIntent(intent, trustedAuthority) {
      bridgeCalls.push({ intent, trustedAuthority });
      return { ok: true, generation_id: 'generation-runtime-001' };
    },
  };
  const runtime = createIntentRuntimeAdapter({
    rpc: async (name, payload) => {
      rpcCalls.push({ name, payload });
      return { data: persisted };
    },
    marketGenesisBridge,
  });
  const trustedAuthority = authority();

  const result = await runtime.create(liveIntentInput(), {
    actorSubject: 'user_owner_1',
    explicitConfirmation: true,
    policyVersion: 'SYNAPSE-S1',
    now: new Date(NOW),
    marketGenesisAuthority: trustedAuthority,
  });

  assert.equal(result.ok, true);
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, 'vvip_synapse_intent_create');
  assert.equal(bridgeCalls.length, 1);
  assert.equal(bridgeCalls[0].intent, persisted);
  assert.equal(bridgeCalls[0].trustedAuthority, trustedAuthority);
  assert.deepEqual(result.marketGenesis, { ok: true, generation_id: 'generation-runtime-001' });
});

test('does not invoke Market Genesis for local-only intent creation', async () => {
  let bridgeCalls = 0;
  const runtime = createIntentRuntimeAdapter({
    rpc: async () => {
      throw new Error('RPC should not run for PRIVATE_LOCAL');
    },
    marketGenesisBridge: {
      async dispatchConfirmedIntent() {
        bridgeCalls += 1;
        return { ok: true };
      },
    },
  });

  const result = await runtime.create(liveIntentInput({ activationMode: 'PRIVATE_LOCAL' }), {
    actorSubject: 'user_owner_1',
    policyVersion: 'SYNAPSE-S1',
    now: new Date(NOW),
    marketGenesisAuthority: authority(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.localOnly, true);
  assert.equal(bridgeCalls, 0);
});

test('preserves existing runtime behavior when Market Genesis bridge is not configured', async () => {
  const persisted = confirmedIntent();
  const runtime = createIntentRuntimeAdapter({
    rpc: async () => ({ data: persisted }),
  });

  const result = await runtime.create(liveIntentInput(), {
    actorSubject: 'user_owner_1',
    explicitConfirmation: true,
    policyVersion: 'SYNAPSE-S1',
    now: new Date(NOW),
  });

  assert.deepEqual(result, { ok: true, value: persisted });
});
