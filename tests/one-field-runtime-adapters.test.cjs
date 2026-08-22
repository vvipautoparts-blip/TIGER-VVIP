'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMarketplaceCandidateAdapter,
  createSocialSearchCandidateAdapter
} = require('../scripts/discovery/one-field-runtime-adapters.js');

test('marketplace adapter strips private identifiers and preserves direct contact handoff', async () => {
  const calls = [];
  const adapter = createMarketplaceCandidateAdapter({
    listPublic: async (filters) => {
      calls.push(filters);
      return [Object.freeze({
        listing_id: 'listing-1',
        title: 'حبوب أطفال بدون سكر',
        summary: 'مناسبة للأطفال',
        sector: 'trade-supply',
        active_market_country: 'JO',
        location_label: 'عمّان',
        contact_phone: '+962700000000',
        whatsapp_enabled: true,
        price_minor: 2500,
        currency_code: 'JOD',
        owner_subject: 'user_private_subject',
        provider_secret: 'DO_NOT_LEAK',
        paid_boost: 999
      })];
    }
  });

  const rows = await adapter.discover({
    intent: Object.freeze({ text: 'أريد كورن فليكس للأطفال بدون سكر' })
  });

  assert.deepEqual(calls, [{ search: 'أريد كورن فليكس للأطفال بدون سكر', limit: 60 }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'listing-1');
  assert.equal(rows[0].source, 'marketplace');
  assert.equal(rows[0].kind, 'listing');
  assert.equal(rows[0].label, 'حبوب أطفال بدون سكر');
  assert.equal(rows[0].contact.kind, 'phone');
  assert.equal(rows[0].contact.value, '+962700000000');
  assert.equal(rows[0].sponsored, false);
  assert.equal(rows[0].facts.sector, 'trade-supply');
  assert.equal(rows[0].facts.noAddedSugar, true);
  assert.equal(JSON.stringify(rows[0]).includes('user_private_subject'), false);
  assert.equal(JSON.stringify(rows[0]).includes('DO_NOT_LEAK'), false);
  assert.equal(JSON.stringify(rows[0]).includes('paid_boost'), false);
});

test('marketplace adapter does not require a legacy sector to discover by natural-language intent', async () => {
  let received = null;
  const adapter = createMarketplaceCandidateAdapter({
    listPublic: async (filters) => {
      received = filters;
      return [Object.freeze({ listing_id: 'freeform-1', title: 'نتيجة حرة', summary: '', sector: null })];
    }
  });

  const rows = await adapter.discover({ intent: Object.freeze({ text: 'شيء جديد لا يطابق اسم قطاع ثابت' }) });

  assert.deepEqual(received, { search: 'شيء جديد لا يطابق اسم قطاع ثابت', limit: 60 });
  assert.equal(rows[0].id, 'freeform-1');
  assert.equal(rows[0].facts.sector, null);
  assert.equal(rows[0].facts.noAddedSugar, null);
});

test('social people adapter reuses reviewed search API and emits only public projection fields', async () => {
  const calls = [];
  const search = {
    people: async (query, options) => {
      calls.push({ query, options });
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          items: Object.freeze([
            Object.freeze({
              profile_id: 'profile_1',
              display_name: 'شركة الغذاء',
              business_name: 'شركة الغذاء',
              specialization: 'أغذية أطفال',
              location: 'عمّان',
              clerk_subject: 'user_PRIVATE',
              provider_secret: 'DO_NOT_LEAK',
              sponsored_score: 42
            })
          ]),
          next_cursor: null
        })
      });
    }
  };
  const adapter = createSocialSearchCandidateAdapter(search, 'people');

  const rows = await adapter.discover({ intent: Object.freeze({ text: 'أغذية أطفال' }) });

  assert.deepEqual(calls, [{ query: 'أغذية أطفال', options: { limit: 20 } }]);
  assert.equal(adapter.name, 'social_people');
  assert.equal(rows[0].id, 'profile_1');
  assert.equal(rows[0].source, 'social_people');
  assert.equal(rows[0].kind, 'person');
  assert.equal(rows[0].label, 'شركة الغذاء');
  assert.equal(rows[0].facts.location, 'عمّان');
  assert.equal(rows[0].sponsored, false);
  assert.equal(JSON.stringify(rows[0]).includes('user_PRIVATE'), false);
  assert.equal(JSON.stringify(rows[0]).includes('DO_NOT_LEAK'), false);
  assert.equal(JSON.stringify(rows[0]).includes('sponsored_score'), false);
});

test('social post adapter projects visible post search results without private author subjects', async () => {
  const calls = [];
  const search = {
    posts: async (query, options) => {
      calls.push({ query, options });
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          items: Object.freeze([
            Object.freeze({
              post_id: 'post_1',
              author_display_name: 'عضو متاح',
              body: 'لدينا كورن فليكس للأطفال بدون سكر',
              author_subject: 'user_PRIVATE_AUTHOR'
            })
          ]),
          next_cursor: null
        })
      });
    }
  };
  const adapter = createSocialSearchCandidateAdapter(search, 'posts');

  const rows = await adapter.discover({ intent: Object.freeze({ text: 'منتجات للأطفال' }) });

  assert.deepEqual(calls, [{ query: 'منتجات للأطفال', options: { limit: 20 } }]);
  assert.equal(adapter.name, 'social_posts');
  assert.equal(rows[0].id, 'post_1');
  assert.equal(rows[0].source, 'social_posts');
  assert.equal(rows[0].kind, 'post');
  assert.equal(rows[0].label, 'عضو متاح');
  assert.equal(rows[0].summary, 'لدينا كورن فليكس للأطفال بدون سكر');
  assert.equal(rows[0].facts.noAddedSugar, true);
  assert.equal(JSON.stringify(rows[0]).includes('user_PRIVATE_AUTHOR'), false);
});

test('sugar fact extraction is explicit-evidence-only and never guesses', async () => {
  const marketplace = createMarketplaceCandidateAdapter({
    listPublic: async () => [
      Object.freeze({ listing_id: 'plain-1', title: 'حبوب إفطار للأطفال', summary: 'طعم لطيف' }),
      Object.freeze({ listing_id: 'sugar-1', title: 'حبوب إفطار محلاة', summary: 'تحتوي على سكر' }),
      Object.freeze({ listing_id: 'free-1', title: 'حبوب إفطار', summary: 'خالي من السكر' })
    ]
  });

  const rows = await marketplace.discover({ intent: Object.freeze({ text: 'حبوب إفطار للأطفال' }) });
  assert.equal(rows[0].facts.noAddedSugar, null);
  assert.equal(rows[1].facts.noAddedSugar, false);
  assert.equal(rows[2].facts.noAddedSugar, true);
});

test('social search failure is reduced to a bounded adapter error', async () => {
  const adapter = createSocialSearchCandidateAdapter({
    people: async () => Object.freeze({ ok: false, code: 'SOCIAL_RATE_LIMITED', retryAfterMs: 30000 })
  }, 'people');

  await assert.rejects(
    adapter.discover({ intent: Object.freeze({ text: 'بحث' }) }),
    (error) => error && error.code === 'ONE_FIELD_SOCIAL_SEARCH_UNAVAILABLE' && !String(error.message).includes('SOCIAL_RATE_LIMITED')
  );
});
