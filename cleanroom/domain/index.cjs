'use strict';

module.exports = Object.freeze({
  ...require('./policy/current-owner-policy.cjs'),
  ...require('./identity/verified-session.cjs'),
  ...require('./actors/financial-eligibility.cjs'),
  ...require('./sectors/sector-registry.cjs'),
  ...require('./finance/purchase-quote.cjs'),
  ...require('./visibility/visibility-card.cjs'),
  ...require('./social/post-lifecycle.cjs'),
  ...require('./purchase/purchase-visibility-card.cjs'),
});
