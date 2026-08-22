'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOneFieldRuntimeOrchestrator } = require('../scripts/discovery/one-field-runtime-orchestrator.js');

function baseDependencies(overrides) {
  return Object.assign({
    interpret: ({ text }) => Object.freeze({ text, hardConstraints: Object.freeze([]) }),
    organicSources: Object.freeze([]),
    buildCapsule: (candidate) => candidate,
    rankOrganic: (_intent, candidates) => candidates,
    buildFit: () => Object.freeze({ reasons: Object.freeze([]) })
  }, overrides || {});
}

test('acceptance intent excludes sugar candidates before organic ranking', async () => {
  const seenByRanker = [];
  const orchestrator = createOneFieldRuntimeOrchestrator(baseDependencies({
    interpret: () => Object.freeze({
      text: 'أريد كورن فليكس للأطفال بدون سكر',
      hardConstraints: [Object.freeze({ key: 'sugarFree', value: true })]
    }),
    organicSources: [Object.freeze({
      name: 'marketplace',
      discover: async () => [
        Object.freeze({ id: 'a', label: 'حبوب أطفال بدون سكر', facts: Object.freeze({ sugarFree: true }), sponsored: false }),
        Object.freeze({ id: 'b', label: 'حبوب أطفال محلاة', facts: Object.freeze({ sugarFree: false }), sponsored: false })
      ]
    })],
    rankOrganic: (_intent, candidates) => {
      seenByRanker.push(...candidates.map((item) => item.id));
      return candidates;
    },
    buildFit: (_intent, candidate) => Object.freeze({
      reasons: candidate.facts.sugarFree ? Object.freeze(['بدون سكر']) : Object.freeze([])
    })
  }));

  const result = await orchestrator.run({
    text: 'أريد كورن فليكس للأطفال بدون سكر',
    locale: 'ar',
    context: Object.freeze({})
  });

  assert.deepEqual(seenByRanker, ['a']);
  assert.deepEqual(result.organic.map((item) => item.id), ['a']);
  assert.equal(result.organic[0].fit.reasons[0], 'بدون سكر');
  assert.equal(result.status, 'results');
});

test('sponsored candidates stay outside the organic ranking and fit lanes', async () => {
  const rankedIds = [];
  const fitIds = [];
  const orchestrator = createOneFieldRuntimeOrchestrator(baseDependencies({
    organicSources: [Object.freeze({
      name: 'marketplace',
      discover: async () => [
        Object.freeze({ id: 'organic-1', label: 'نتيجة عضوية', facts: Object.freeze({}), sponsored: false }),
        Object.freeze({ id: 'misrouted-paid', label: 'إعلان ممول', facts: Object.freeze({ paidBoost: 999 }), sponsored: true })
      ]
    })],
    sponsoredSource: Object.freeze({
      name: 'advertising',
      discover: async () => [
        Object.freeze({ id: 'sponsored-1', label: 'إعلان ممول', sponsored: true, paidBoost: 1000 })
      ]
    }),
    rankOrganic: (_intent, candidates) => {
      rankedIds.push(...candidates.map((item) => item.id));
      return candidates;
    },
    buildFit: (_intent, candidate) => {
      fitIds.push(candidate.id);
      assert.equal(candidate.sponsored, false);
      assert.equal('paidBoost' in candidate, false);
      return Object.freeze({ reasons: Object.freeze(['دليل عضوي']) });
    }
  }));

  const result = await orchestrator.run({ text: 'أريد نتيجة مناسبة', locale: 'ar', context: Object.freeze({}) });

  assert.deepEqual(rankedIds, ['organic-1']);
  assert.deepEqual(fitIds, ['organic-1']);
  assert.deepEqual(result.organic.map((item) => item.id), ['organic-1']);
  assert.deepEqual(result.sponsored.map((item) => item.id), ['sponsored-1']);
  assert.equal(result.sponsored[0].sponsored, true);
});

test('one failed source plus one successful source returns truthful degraded results', async () => {
  const orchestrator = createOneFieldRuntimeOrchestrator(baseDependencies({
    organicSources: [
      Object.freeze({ name: 'social_posts', discover: async () => { throw new Error('UPSTREAM_PRIVATE_DETAIL'); } }),
      Object.freeze({
        name: 'marketplace',
        discover: async () => [Object.freeze({ id: 'a', label: 'نتيجة متاحة', facts: Object.freeze({}), sponsored: false })]
      })
    ]
  }));

  const result = await orchestrator.run({ text: 'ابحث لي', locale: 'ar', context: Object.freeze({}) });

  assert.equal(result.status, 'degraded');
  assert.deepEqual(result.organic.map((item) => item.id), ['a']);
  assert.deepEqual(result.degradedSources, ['social_posts']);
  assert.equal(JSON.stringify(result).includes('UPSTREAM_PRIVATE_DETAIL'), false);
});

test('successful sources with no eligible candidates return empty', async () => {
  const orchestrator = createOneFieldRuntimeOrchestrator(baseDependencies({
    organicSources: [Object.freeze({ name: 'marketplace', discover: async () => [] })]
  }));

  const result = await orchestrator.run({ text: 'لا توجد نتيجة', locale: 'ar', context: Object.freeze({}) });
  assert.equal(result.status, 'empty');
  assert.deepEqual(result.organic, []);
  assert.deepEqual(result.degradedSources, []);
});
