'use strict';

const EXPECTED_PHASES = Object.freeze(
  Array.from({ length: 17 }, (_, index) => `F${String(index).padStart(2, '0')}`)
);

const FINAL_REFERENCE = 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md';
const REQUIRED_PREFLIGHT = 'OWNER_BINDING_CURRENT_FIRST';
const REQUIRED_DISPOSITION = 'DELETE_FROM_CURRENT_TREE_NO_FALLBACK_NO_IN_TREE_ARCHIVE_NO_TRASH_NO_LEGACY_COMPATIBILITY';
const REQUIRED_PULSE_COUNTRY_PRICING_MODE = 'REMOVE_REFERENCE_16_THEN_APPLY_VERIFIED_COUNTRY_TAX';
const REQUIRED_PULSE_TAX_AUTHORITY = 'docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md';
const REQUIRED_PULSE_TAX_MODULE = 'project-control/finance/statutory-tax-boundary.cjs';

const REQUIRED_REFERENCE_FIELDS = Object.freeze({
  ownerOperationalIndex: 'docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md',
  tigerPulseOwnerReference: 'docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md',
  tigerFinancialDistributionReference: 'docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md',
  tigerFinancialDistributionConfig: 'config/finance/current-distribution.json',
  tigerSocialCoreOwnerReference: 'docs/owner-control/TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md',
  tigerPhoenixOwnerReference: 'docs/owner-control/TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md',
  tigerAionOwnerReference: 'docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md'
});

const REQUIRED_MARKETPLACE_ROLES = Object.freeze([
  'advertising',
  'discovery',
  'direct_contact',
  'distance_reduction'
]);

const REQUIRED_MARKETPLACE_CONNECTIONS = Object.freeze([
  'seller_to_buyer',
  'service_provider_to_beneficiary'
]);

const REQUIRED_FORBIDDEN_MARKETPLACE_INTERMEDIATION = Object.freeze([
  'checkout',
  'escrow',
  'platform_delivery_shipping',
  'marketplace_transaction_payment',
  'marketplace_transaction_settlement',
  'marketplace_transaction_commission_payout',
  'marketplace_transaction_brokerage_or_agency',
  'marketplace_transaction_funds_custody',
  'marketplace_transaction_guarantee',
  'marketplace_warranty_compensation_execution',
  'platform_run_marketplace_dispute_resolution'
]);

const ALLOWED_PLATFORM_OWNED_FINANCIAL_SCOPE = Object.freeze([
  'advertising_pricing',
  'advertising_billing',
  'platform_applicable_taxes_fees',
  'platform_accounting',
  'advertising_profitability_protection',
  'platform_receipt_reconciliation'
]);

function hasExactStringSet(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((item) => actual.includes(item));
}

function verifyCurrentAuthority(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, errors: ['manifest must be an object'] };
  }

  if (manifest.schemaVersion !== 'VVIP_TIGER_FUSION_AUTHORITY_V2') errors.push('schemaVersion must be VVIP_TIGER_FUSION_AUTHORITY_V2');
  if (manifest.productIdentity !== 'GLOBAL_FIRST') errors.push('productIdentity must be GLOBAL_FIRST');
  if (manifest.primaryProductIdentity !== 'SOCIAL_NETWORK_FIRST') errors.push('primaryProductIdentity must be SOCIAL_NETWORK_FIRST');
  if (manifest.currentReference !== FINAL_REFERENCE) errors.push('currentReference must point to TIGER_OWNER_BINDING_CURRENT.md');
  if (manifest.firstReferenceRequired !== true) errors.push('TIGER_OWNER_BINDING_CURRENT.md must be the mandatory first reference');
  if (manifest.authorityPreflight !== REQUIRED_PREFLIGHT) errors.push(`authorityPreflight must equal ${REQUIRED_PREFLIGHT}`);
  if (manifest.supersededMaterialDisposition !== REQUIRED_DISPOSITION) errors.push(`supersededMaterialDisposition must equal ${REQUIRED_DISPOSITION}`);
  if (manifest.recheckOnNewOwnerDecision !== true) errors.push('in-progress work must be rechecked when a new owner decision is issued');

  for (const [field, expected] of Object.entries(REQUIRED_REFERENCE_FIELDS)) {
    if (manifest[field] !== expected) errors.push(`${field} must equal ${expected}`);
  }

  const publication = manifest.ordinaryPublication || {};
  if (publication.paidPublishingGate !== false) errors.push('ordinary publication must not be payment gated');
  if (publication.publishingSubscription !== false) errors.push('publishing subscriptions must remain disabled');
  if (publication.publishingCard !== false) errors.push('publishing cards must remain disabled');
  if (publication.fixedCommercialPostQuota !== null) errors.push('ordinary publication must not restore a fixed commercial/weekly post quota');
  if (publication.maximumMarketplaceListingImages !== 7) errors.push('current ordinary Marketplace listing image maximum must be 7');
  if (publication.productLifetime !== null) errors.push('ordinary publication must not have a product/content lifetime');
  if (publication.submitContract !== 'SUBMIT_FOR_REVIEW') errors.push('ordinary publication submit contract must be SUBMIT_FOR_REVIEW');

  const pulse = manifest.pulseRing || {};
  if (JSON.stringify(pulse.tiersJod) !== JSON.stringify([2, 10, 20, 45])) errors.push('Pulse tiers must be exactly 2/10/20/45 JOD');
  if (pulse.referencePriceIncludesBaselineTaxBps !== 1600) errors.push('Pulse reference prices must include the approved 16 percent pricing baseline');
  if (pulse.countryPricingMode !== REQUIRED_PULSE_COUNTRY_PRICING_MODE) errors.push(`Pulse country pricing mode must equal ${REQUIRED_PULSE_COUNTRY_PRICING_MODE}`);
  if (pulse.countryTaxAppliedToUntaxedBase !== true) errors.push('Pulse verified country tax must be applied to the untaxed reference base');
  if (pulse.displayedCountryPriceIsFinalCharge !== true) errors.push('Pulse displayed country price must be the final user charge');
  if (pulse.additionalTaxAtCapture !== false) errors.push('Pulse must not add a second tax surcharge at capture');
  if (pulse.statutoryTaxAuthority !== REQUIRED_PULSE_TAX_AUTHORITY) errors.push(`Pulse statutory tax authority must equal ${REQUIRED_PULSE_TAX_AUTHORITY}`);
  if (pulse.canonicalTaxModule !== REQUIRED_PULSE_TAX_MODULE) errors.push(`Pulse canonical tax module must equal ${REQUIRED_PULSE_TAX_MODULE}`);
  if (pulse.purchasedValue !== 'SERVER_AUTHORITATIVE_VISIBILITY_ALLOCATION') errors.push('Pulse purchased value must be a server-authoritative visibility allocation');
  if (pulse.productTimeExpiry !== null) errors.push('Pulse visibility value must not have product-time expiry');
  if (pulse.ordinaryPublicationPrerequisite !== false) errors.push('Pulse must not be an ordinary-publication prerequisite');
  if (pulse.selfServiceDiscountPercent !== 7) errors.push('Pulse self-service discount must be 7 percent when no sales claimant exists');
  if (pulse.oneSaleOneSalesWinner !== true) errors.push('Pulse sales attribution must enforce one sale / one sales winner');

  const marketplaceBoundary = manifest.ownerMarketplaceBoundary;
  if (!marketplaceBoundary || typeof marketplaceBoundary !== 'object' || Array.isArray(marketplaceBoundary)) {
    errors.push('ownerMarketplaceBoundary must be an object');
  } else {
    if (marketplaceBoundary.mode !== 'ADVERTISING_DISCOVERY_DIRECT_CONTACT_ONLY') errors.push('ownerMarketplaceBoundary.mode must be ADVERTISING_DISCOVERY_DIRECT_CONTACT_ONLY');
    if (marketplaceBoundary.platformIsMarketplaceTransactionParty !== false) errors.push('platform must not be a party to marketplace transactions');
    if (marketplaceBoundary.marketplaceTransactionHandledDirectlyByParties !== true) errors.push('marketplace transactions must be handled directly by their parties');
    if (marketplaceBoundary.platformDoesNotBrokerOrRepresentParties !== true) errors.push('platform must not broker or represent marketplace parties');
    if (marketplaceBoundary.platformDoesNotGuaranteeCounterparty !== true) errors.push('platform must not guarantee marketplace counterparties or outcomes');
    if (!hasExactStringSet(marketplaceBoundary.role, REQUIRED_MARKETPLACE_ROLES)) errors.push('marketplace platform role must be limited to advertising, discovery, direct contact, and distance reduction');
    if (!hasExactStringSet(marketplaceBoundary.connects, REQUIRED_MARKETPLACE_CONNECTIONS)) errors.push('marketplace connections must remain seller-to-buyer and service-provider-to-beneficiary');
    const forbidden = Array.isArray(marketplaceBoundary.forbiddenMarketplaceIntermediation) ? marketplaceBoundary.forbiddenMarketplaceIntermediation : [];
    for (const item of REQUIRED_FORBIDDEN_MARKETPLACE_INTERMEDIATION) {
      if (!forbidden.includes(item)) errors.push(`missing forbidden marketplace intermediation: ${item}`);
    }
    if (!hasExactStringSet(marketplaceBoundary.platformOwnedFinancialScope, ALLOWED_PLATFORM_OWNED_FINANCIAL_SCOPE)) {
      errors.push('platformOwnedFinancialScope must be limited to platform-owned advertising services');
    }
  }

  if (manifest.historicalEvidencePolicy !== 'GIT_HISTORY_ONLY_FOR_SUPERSEDED_CONFLICTING_MATERIAL') {
    errors.push('superseded conflicting material must not be archived inside the current tree');
  }

  const phases = Array.isArray(manifest.implementationPhases) ? manifest.implementationPhases : [];
  if (phases.length !== EXPECTED_PHASES.length || phases.some((phase, index) => phase !== EXPECTED_PHASES[index])) {
    errors.push('implementationPhases must equal F00 through F16 in order');
  }

  const uniqueActors = manifest.digitalTwin && manifest.digitalTwin.uniqueActors;
  const simultaneous = manifest.digitalTwin && manifest.digitalTwin.simultaneousActiveUsers;
  if (uniqueActors !== 4_000_000) errors.push('digitalTwin.uniqueActors must be 4000000');
  if (simultaneous !== 4_000_000) errors.push('digitalTwin.simultaneousActiveUsers must be 4000000');
  if (manifest.globalLaunchEligibilityRequiresBoth4M !== true) errors.push('globalLaunchEligibilityRequiresBoth4M must be true');
  if (manifest.launchTruth !== 'EVIDENCE_FIRST') errors.push('launchTruth must be EVIDENCE_FIRST');
  if (manifest.globalLaunchStatementAllowedOnlyWhen !== 'F16_LAUNCH_PASSPORT_PASS') errors.push('global launch statement must remain gated by F16 Launch Passport');

  return { ok: errors.length === 0, errors };
}

module.exports = Object.freeze({
  verifyCurrentAuthority,
  REQUIRED_REFERENCE_FIELDS,
  EXPECTED_PHASES,
  FINAL_REFERENCE,
  REQUIRED_PREFLIGHT,
  REQUIRED_DISPOSITION,
  REQUIRED_PULSE_COUNTRY_PRICING_MODE,
  REQUIRED_PULSE_TAX_AUTHORITY,
  REQUIRED_PULSE_TAX_MODULE,
  REQUIRED_MARKETPLACE_ROLES,
  REQUIRED_MARKETPLACE_CONNECTIONS,
  REQUIRED_FORBIDDEN_MARKETPLACE_INTERMEDIATION,
  ALLOWED_PLATFORM_OWNED_FINANCIAL_SCOPE
});
