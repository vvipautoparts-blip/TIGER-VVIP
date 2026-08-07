'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createSovereignRuntime,
} = require('../scripts/ai/sovereign-runtime.js');

const REQUEST = Object.freeze({
  agentId: 'general_manager',
  input: 'أعطني ملخص حالة المنصة اعتماداً على الأدلة المتاحة.',
  correlationId: 'corr-runtime-0001',
  locale: 'ar',
});

function createHarness(overrides = {}) {
  const calls = [];
  const persisted = { audit: [], usage: [] };

  const adapters = {
    identityVerifier: {
      verify: async () => {
        calls.push('identity');
        return { authenticated: true, subject: 'owner_001', roles: ['OWNER'], scopes: [{ country: 'JO', sector: '*' }] };
      },
    },
    runtimeStateStore: {
      load: async () => {
        calls.push('runtime');
        return { enabled: true, killSwitch: false, maxLevel: 'L2', dailyBudgetMicrousd: 500000, requestsPerMinute: 10 };
      },
    },
    quotaManager: {
      reserve: async () => {
        calls.push('quota.reserve');
        return { ok: true, reservationId: 'reservation-001', maxCostMicrousd: 50000 };
      },
      settle: async () => calls.push('quota.settle'),
      release: async () => calls.push('quota.release'),
    },
    evidenceProvider: {
      load: async () => {
        calls.push('evidence');
        return [
          { sourceId: 'analytics:JO:1', content: 'activeListings=120', freshness: 'fresh', confidence: 0.95 },
        ];
      },
    },
    modelAdapter: {
      run: async () => {
        calls.push('model');
        return {
          envelope: {
            status: 'OK',
            summary: 'الحالة مستقرة حسب البيانات المتاحة.',
            evidence: [{ sourceId: 'analytics:JO:1', freshness: 'fresh', confidence: 0.95 }],
            recommendations: [{ title: 'استمر بالمراقبة', rationale: 'المؤشرات الحالية مستقرة', risk: 'LOW' }],
            confidence: 0.9,
          },
          usage: {
            provider: 'openai', model: 'server-model', promptVersion: 'gm-v1',
            inputTokens: 100, outputTokens: 50, cachedInputTokens: 0,
            costMicrousd: 1200, latencyMs: 450,
          },
        };
      },
    },
    usageStore: {
      append: async (event) => {
        calls.push('usage.persist');
        persisted.usage.push(event);
      },
    },
    auditStore: {
      append: async (event) => {
        calls.push('audit.persist');
        persisted.audit.push(event);
      },
    },
    clock: () => '2026-08-07T10:40:00.000Z',
    ...overrides,
  };

  return { runtime: createSovereignRuntime(adapters), calls, persisted };
}

test('runtime enforces identity → state → quota → evidence → model → usage → audit → settlement order', async () => {
  const { runtime, calls } = createHarness();
  const result = await runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    'identity', 'runtime', 'quota.reserve', 'evidence', 'model',
    'usage.persist', 'audit.persist', 'quota.settle',
  ]);
});

test('management agent cannot reach model when verified identity is not owner', async () => {
  let modelCalled = false;
  const { runtime } = createHarness({
    identityVerifier: { verify: async () => ({ authenticated: true, subject: 'user_001', roles: ['USER'], scopes: [{ country: 'JO', sector: '*' }] }) },
    modelAdapter: { run: async () => { modelCalled = true; throw new Error('must not run'); } },
  });
  const result = await runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'OWNER_REQUIRED');
  assert.equal(modelCalled, false);
});

test('disabled or killed runtime blocks before quota and model', async () => {
  for (const state of [
    { enabled: false, killSwitch: false, maxLevel: 'L2', dailyBudgetMicrousd: 500000, requestsPerMinute: 10 },
    { enabled: true, killSwitch: true, maxLevel: 'L2', dailyBudgetMicrousd: 500000, requestsPerMinute: 10 },
  ]) {
    const calls = [];
    const { runtime } = createHarness({
      runtimeStateStore: { load: async () => state },
      quotaManager: { reserve: async () => { calls.push('quota'); return { ok: true, reservationId: 'x' }; }, settle: async () => {}, release: async () => {} },
      modelAdapter: { run: async () => { calls.push('model'); return {}; } },
    });
    const result = await runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
    assert.equal(result.ok, false);
    assert.ok(['AGENT_DISABLED', 'KILL_SWITCH_ACTIVE'].includes(result.reasonCode));
    assert.deepEqual(calls, []);
  }
});

test('quota denial prevents evidence/model calls and returns bounded denial', async () => {
  const calls = [];
  const { runtime } = createHarness({
    quotaManager: {
      reserve: async () => ({ ok: false, reasonCode: 'BUDGET_EXCEEDED' }),
      settle: async () => calls.push('settle'),
      release: async () => calls.push('release'),
    },
    evidenceProvider: { load: async () => { calls.push('evidence'); return []; } },
    modelAdapter: { run: async () => { calls.push('model'); return {}; } },
  });
  const result = await runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'BUDGET_EXCEEDED');
  assert.deepEqual(calls, []);
});

test('client authority fields are rejected before identity verification', async () => {
  let identityCalled = false;
  const { runtime } = createHarness({
    identityVerifier: { verify: async () => { identityCalled = true; return {}; } },
  });
  const result = await runtime.execute({ request: { ...REQUEST, model: 'client-choice' }, authorization: 'Bearer fixture-credential' });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'UNKNOWN_FIELD');
  assert.equal(identityCalled, false);
});

test('malformed authority-shaped model output fails closed, settles incurred usage, and never returns success', async () => {
  const calls = [];
  const { runtime } = createHarness({
    quotaManager: {
      reserve: async () => ({ ok: true, reservationId: 'reservation-002', maxCostMicrousd: 50000 }),
      settle: async () => calls.push('settle'),
      release: async () => calls.push('release'),
    },
    modelAdapter: {
      run: async () => ({
        envelope: { status: 'OK', summary: 'x', evidence: [], recommendations: [], confidence: 0.8, toolCall: { name: 'invented' } },
        usage: { provider: 'openai', model: 'server-model', promptVersion: 'gm-v1', inputTokens: 10, outputTokens: 10, cachedInputTokens: 0, costMicrousd: 100, latencyMs: 50 },
      }),
    },
  });
  const result = await runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'MODEL_OUTPUT_UNKNOWN_FIELD');
  assert.deepEqual(calls, ['settle']);
});

test('successful runtime persists sanitized usage/audit without request body or credentials', async () => {
  const { runtime, persisted } = createHarness();
  const result = await runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
  assert.equal(result.ok, true);
  assert.equal(persisted.usage.length, 1);
  assert.equal(persisted.audit.length, 1);
  const serialized = JSON.stringify(persisted);
  assert.equal(serialized.includes('fixture-credential'), false);
  assert.equal(serialized.includes(REQUEST.input), false);
  assert.equal(persisted.audit[0].correlationId, REQUEST.correlationId);
  assert.equal(persisted.usage[0].agentId, REQUEST.agentId);
});

test('audit persistence failure blocks success while incurred provider usage is still settled', async () => {
  const calls = [];
  const { runtime } = createHarness({
    quotaManager: {
      reserve: async () => ({ ok: true, reservationId: 'reservation-003', maxCostMicrousd: 50000 }),
      settle: async () => calls.push('settle'),
      release: async () => calls.push('release'),
    },
    auditStore: { append: async () => { throw new Error('audit unavailable'); } },
  });
  const result = await runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'AUDIT_PERSISTENCE_FAILED');
  assert.deepEqual(calls, ['settle']);
});

test('pre-provider failure releases quota reservation; provider-attempted failure settles it', async () => {
  const preCalls = [];
  const pre = createHarness({
    quotaManager: {
      reserve: async () => ({ ok: true, reservationId: 'reservation-004', maxCostMicrousd: 50000 }),
      settle: async () => preCalls.push('settle'),
      release: async () => preCalls.push('release'),
    },
    evidenceProvider: { load: async () => { throw new Error('evidence unavailable'); } },
  });
  const preResult = await pre.runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
  assert.equal(preResult.ok, false);
  assert.deepEqual(preCalls, ['release']);

  const postCalls = [];
  const post = createHarness({
    quotaManager: {
      reserve: async () => ({ ok: true, reservationId: 'reservation-005', maxCostMicrousd: 50000 }),
      settle: async () => postCalls.push('settle'),
      release: async () => postCalls.push('release'),
    },
    modelAdapter: { run: async () => { throw new Error('provider failed'); } },
  });
  const postResult = await post.runtime.execute({ request: REQUEST, authorization: 'Bearer fixture-credential' });
  assert.equal(postResult.ok, false);
  assert.deepEqual(postCalls, ['settle']);
});
