const test = require('node:test');
const assert = require('node:assert/strict');
const campaign = require('../scripts/advertising/vvip-tiger-campaign-intelligence.js');

test('campaign quote exposes only user-safe delivery facts', () => {
  const quote = campaign.normalizeCampaignQuote({
    quoteId: 'CQ-20260818-001',
    productType: 'distribution-credit',
    marketCountry: 'JO',
    currency: 'JOD',
    priceMinor: 10000,
    committedImpressions: 2400,
    pricingVersion: 'JO-2026-08-18-v1',
    lifecyclePolicyId: 'JO-LIFE-v1',
    deliveryPolicyId: 'QVI-2S-60S-v1',
    expiresAt: '2026-08-18T21:30:00Z',
    eCPM: 3.4,
    margin: 0.37,
    opCostPerImpression: 0.0004,
    dideFormula: 'secret'
  });

  assert.deepEqual(Object.keys(quote).sort(), [
    'committedImpressions',
    'currency',
    'deliveryPolicyId',
    'expiresAt',
    'lifecyclePolicyId',
    'marketCountry',
    'priceMinor',
    'pricingVersion',
    'productType',
    'quoteId'
  ]);
  assert.equal(quote.productType, 'distribution-credit');
  assert.equal(quote.committedImpressions, 2400);
  assert.equal(Object.hasOwn(quote, 'eCPM'), false);
  assert.equal(Object.hasOwn(quote, 'margin'), false);
  assert.equal(Object.hasOwn(quote, 'opCostPerImpression'), false);
  assert.equal(Object.hasOwn(quote, 'dideFormula'), false);
  assert.equal(Object.isFrozen(quote), true);
});

test('campaign quote fails closed when trusted delivery facts are incomplete', () => {
  assert.throws(() => campaign.normalizeCampaignQuote({
    quoteId: 'CQ-1',
    productType: 'distribution-credit',
    marketCountry: 'JO',
    currency: 'JOD',
    priceMinor: 1000
  }), /CAMPAIGN_QUOTE_INVALID/);
});

test('campaign quote rejects legacy tier and fixed-duration commercial authority', () => {
  assert.throws(() => campaign.normalizeCampaignQuote({
    quoteId: 'CQ-2',
    productType: 'distribution-credit',
    marketCountry: 'JO',
    currency: 'JOD',
    priceMinor: 3000,
    committedImpressions: 700,
    pricingVersion: 'JO-v1',
    lifecyclePolicyId: 'JO-LIFE-v1',
    deliveryPolicyId: 'QVI-v1',
    tier: 'GOLD'
  }), /LEGACY_CAMPAIGN_AUTHORITY_FORBIDDEN/);

  assert.throws(() => campaign.normalizeCampaignQuote({
    quoteId: 'CQ-3',
    productType: 'distribution-credit',
    marketCountry: 'JO',
    currency: 'JOD',
    priceMinor: 3000,
    committedImpressions: 700,
    pricingVersion: 'JO-v1',
    lifecyclePolicyId: 'JO-LIFE-v1',
    deliveryPolicyId: 'QVI-v1',
    durationDays: 7
  }), /LEGACY_CAMPAIGN_AUTHORITY_FORBIDDEN/);
});

test('campaign success requires trusted payment ledger and activation states together', () => {
  assert.equal(campaign.campaignSuccessAllowed({
    paymentState: 'CONFIRMED',
    ledgerState: 'POSTED',
    campaignState: 'ACTIVE'
  }), true);

  assert.equal(campaign.campaignSuccessAllowed({
    paymentState: 'CONFIRMED',
    ledgerState: 'PENDING',
    campaignState: 'ACTIVE'
  }), false);

  assert.equal(campaign.campaignSuccessAllowed({
    paymentState: 'BROWSER_SUCCESS',
    ledgerState: 'POSTED',
    campaignState: 'ACTIVE'
  }), false);
});

test('campaign goals and strategies stay small and user-facing', () => {
  assert.deepEqual(campaign.GOALS, [
    'SELL_FASTER',
    'MORE_REACH',
    'LOCAL_REACH',
    'LAUNCH',
    'MORE_ENGAGEMENT'
  ]);
  assert.deepEqual(campaign.STRATEGIES, ['ECONOMY', 'BALANCED', 'BOOST']);
});
