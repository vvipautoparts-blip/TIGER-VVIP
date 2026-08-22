'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOneFieldRuntimeOrchestrator } = require('../scripts/discovery/one-field-runtime-orchestrator.js');

test('acceptance intent excludes sugar candidates before organic ranking', async () => {
  const seenByRanker = [];
  const orchestrator = createOneFieldRuntimeOrchestrator({
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
    buildCapsule: (candidate) => candidate,
    rankOrganic: (_intent, candidates) => {
      seenByRanker.push(...candidates.map((item) => item.id));
      return candidates;
    },
    buildFit: (_intent, candidate) => Object.freeze({
      reasons: candidate.facts.sugarFree ? Object.freeze(['بدون سكر']) : Object.freeze([])
    })
  });

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
