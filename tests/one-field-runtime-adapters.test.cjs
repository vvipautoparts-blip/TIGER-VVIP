'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMarketplaceCandidateAdapter } = require('../scripts/discovery/one-field-runtime-adapters.js');

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
});
