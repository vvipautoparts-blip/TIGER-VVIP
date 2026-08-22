'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const semanticCore = require('../scripts/discovery/one-field-semantic-core.js');
const intentScene = require('../scripts/discovery/one-field-intent-scene.js');
const semanticCapsule = require('../scripts/discovery/one-field-semantic-capsule.js');
const hybrid = require('../scripts/discovery/one-field-hybrid-retrieval.js');
const fitFacets = require('../scripts/discovery/one-field-fit-facets.js');
const { createMarketplaceCandidateAdapter } = require('../scripts/discovery/one-field-runtime-adapters.js');
const { createOneFieldRuntimeOrchestrator } = require('../scripts/discovery/one-field-runtime-orchestrator.js');
const {
  createIntentInterpreter,
  createCapsuleBuilder,
  createOrganicRanker,
  createFitBuilder
} = require('../scripts/discovery/one-field-runtime-view.js');

const ACCEPTANCE_TEXT = 'أريد كورن فليكس للأطفال بدون سكر';

function semanticApis() {
  return Object.freeze({ semanticCore, intentScene, semanticCapsule, hybrid, fitFacets });
}

function createAcceptanceRuntime(options = {}) {
  const repositoryCalls = [];
  const repository = {
    async listPublic(filters) {
      repositoryCalls.push(filters);
      return [
        Object.freeze({
          listing_id: 'listing-free',
          title: 'كورن فليكس للأطفال بدون سكر',
          summary: 'خالي من السكر ومتوفر للتواصل المباشر',
          sector: 'trade-supply',
          active_market_country: 'JO',
          location_label: 'عمّان',
          contact_phone: '+962700000001',
          price_minor: 2250,
          currency_code: 'JOD'
        }),
        Object.freeze({
          listing_id: 'listing-sugar',
          title: 'كورن فليكس للأطفال',
          summary: 'تحتوي على سكر',
          sector: 'trade-supply',
          active_market_country: 'JO',
          location_label: 'عمّان',
          contact_phone: '+962700000002',
          price_minor: 1750,
          currency_code: 'JOD'
        }),
        Object.freeze({
          listing_id: 'listing-other',
          title: 'معدات مطبخ',
          summary: 'منتج آخر لا يطابق نوع الطلب',
          sector: 'equipment',
          active_market_country: 'JO',
          location_label: 'الزرقاء',
          contact_phone: '+962700000003'
        })
      ];
    }
  };

  const apis = semanticApis();
  const rank = createOrganicRanker(apis);
  const seenByRanker = [];
  const orchestrator = createOneFieldRuntimeOrchestrator({
    interpret: createIntentInterpreter(apis),
    organicSources: [createMarketplaceCandidateAdapter(repository)],
    buildCapsule: createCapsuleBuilder(apis),
    rankOrganic(intent, candidates) {
      seenByRanker.push(...candidates.map((candidate) => candidate.id));
      return rank(intent, candidates);
    },
    buildFit: createFitBuilder(apis),
    sponsoredSource: options.sponsored
      ? Object.freeze({
          name: 'advertising',
          async discover() {
            return [Object.freeze({
              id: 'sponsored-1',
              source: 'advertising',
              kind: 'listing',
              label: 'إعلان ممول منفصل',
              summary: 'عرض ممول لا يدخل ترتيب النتائج العضوية',
              facts: Object.freeze({ noAddedSugar: true }),
              sponsored: true,
              campaignId: 'campaign_paid_1',
              paidRank: 999999
            })];
          }
        })
      : null
  });

  return { orchestrator, repositoryCalls, seenByRanker };
}

test('approved Arabic intent reaches evidence-backed sugar-free discovery and direct contact', async () => {
  const runtime = createAcceptanceRuntime();
  const result = await runtime.orchestrator.run({
    text: ACCEPTANCE_TEXT,
    locale: 'ar',
    context: Object.freeze({ countryCode: 'JO' })
  });

  assert.equal(result.intent.productFamily, 'breakfast_cereal');
  assert.equal(result.intent.audience, 'children');
  assert.deepEqual(result.intent.constraints, ['no_added_sugar']);
  assert.deepEqual(runtime.repositoryCalls, [{ search: ACCEPTANCE_TEXT, limit: 60 }]);
  assert.equal(Object.hasOwn(runtime.repositoryCalls[0], 'sector'), false, 'natural language must not require a rigid legacy sector/category');

  assert.deepEqual(runtime.seenByRanker, ['listing-free'], 'sugar-containing and unrelated candidates must be excluded before ranking');
  assert.deepEqual(result.organic.map((item) => item.id), ['listing-free']);
  assert.equal(result.status, 'results');
  assert.equal(result.organic[0].contact.kind, 'phone');
  assert.equal(result.organic[0].contact.value, '+962700000001');
  assert.ok(result.organic[0].fit.reasons.includes('matches_product_family'));
  assert.ok(result.organic[0].fit.reasons.includes('matches_no_added_sugar'));

  const serialized = JSON.stringify(result.organic[0]).toLowerCase();
  for (const denied of ['checkout', 'order', 'payment', 'escrow', 'commission', 'dealclose']) {
    assert.equal(serialized.includes(denied), false, `terminal discovery result must not expose ${denied}`);
  }
});

test('sponsored delivery cannot alter organic order or FitExplanation', async () => {
  const organicRuntime = createAcceptanceRuntime();
  const sponsoredRuntime = createAcceptanceRuntime({ sponsored: true });

  const organicOnly = await organicRuntime.orchestrator.run({
    text: ACCEPTANCE_TEXT,
    locale: 'ar',
    context: Object.freeze({ countryCode: 'JO' })
  });
  const withSponsored = await sponsoredRuntime.orchestrator.run({
    text: ACCEPTANCE_TEXT,
    locale: 'ar',
    context: Object.freeze({ countryCode: 'JO' })
  });

  assert.deepEqual(withSponsored.organic.map((item) => item.id), organicOnly.organic.map((item) => item.id));
  assert.deepEqual(withSponsored.organic[0].fit.reasons, organicOnly.organic[0].fit.reasons);
  assert.equal(JSON.stringify(withSponsored.organic).includes('campaign_paid_1'), false);
  assert.equal(JSON.stringify(withSponsored.organic).includes('paidRank'), false);
  assert.equal(withSponsored.sponsored.length, 1);
  assert.equal(withSponsored.sponsored[0].sponsored, true);
  assert.equal(withSponsored.sponsored[0].campaignId, 'campaign_paid_1');
});
