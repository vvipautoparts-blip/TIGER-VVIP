(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VVIP_TIGER_CAMPAIGN_INTELLIGENCE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GOALS = Object.freeze([
    'SELL_FASTER',
    'MORE_REACH',
    'LOCAL_REACH',
    'LAUNCH',
    'MORE_ENGAGEMENT'
  ]);

  const STRATEGIES = Object.freeze(['ECONOMY', 'BALANCED', 'BOOST']);

  const LEGACY_FIELDS = Object.freeze([
    'tier',
    'durationDays',
    'expiresAfterDays',
    'featured',
    'visualPriority',
    'rankBoost',
    'subscription'
  ]);

  function fail(code) {
    const error = new Error(code);
    error.code = code;
    throw error;
  }

  function owns(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function nonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function positiveSafeInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function normalizeCampaignQuote(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      fail('CAMPAIGN_QUOTE_INVALID');
    }

    for (const key of LEGACY_FIELDS) {
      if (owns(input, key)) {
        fail('LEGACY_CAMPAIGN_AUTHORITY_FORBIDDEN');
      }
    }

    if (
      !nonEmptyString(input.quoteId) ||
      input.productType !== 'distribution-credit' ||
      !/^[A-Z]{2}$/.test(input.marketCountry || '') ||
      !/^[A-Z]{3}$/.test(input.currency || '') ||
      !positiveSafeInteger(input.priceMinor) ||
      !positiveSafeInteger(input.committedImpressions) ||
      !nonEmptyString(input.pricingVersion) ||
      !nonEmptyString(input.lifecyclePolicyId) ||
      !nonEmptyString(input.deliveryPolicyId) ||
      (owns(input, 'expiresAt') && !nonEmptyString(input.expiresAt))
    ) {
      fail('CAMPAIGN_QUOTE_INVALID');
    }

    const safeQuote = {
      quoteId: input.quoteId.trim(),
      productType: input.productType,
      marketCountry: input.marketCountry,
      currency: input.currency,
      priceMinor: input.priceMinor,
      committedImpressions: input.committedImpressions,
      pricingVersion: input.pricingVersion.trim(),
      lifecyclePolicyId: input.lifecyclePolicyId.trim(),
      deliveryPolicyId: input.deliveryPolicyId.trim()
    };

    if (owns(input, 'expiresAt')) {
      safeQuote.expiresAt = input.expiresAt.trim();
    }

    return Object.freeze(safeQuote);
  }

  function campaignSuccessAllowed(state) {
    return !!state &&
      state.paymentState === 'CONFIRMED' &&
      state.ledgerState === 'POSTED' &&
      state.campaignState === 'ACTIVE';
  }

  function publicCampaignStatus(state) {
    if (campaignSuccessAllowed(state)) return 'ACTIVE';
    if (!state || typeof state !== 'object') return 'UNAVAILABLE';

    if (
      ['FAILED', 'DECLINED', 'CANCELLED'].includes(state.paymentState) ||
      ['REJECTED', 'FAILED'].includes(state.ledgerState) ||
      ['FAILED', 'CANCELLED'].includes(state.campaignState)
    ) {
      return 'FAILED';
    }

    return 'PROCESSING';
  }

  return Object.freeze({
    GOALS,
    STRATEGIES,
    normalizeCampaignQuote,
    campaignSuccessAllowed,
    publicCampaignStatus
  });
});
