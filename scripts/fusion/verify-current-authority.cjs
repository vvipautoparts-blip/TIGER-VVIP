'use strict';

const REQUIRED_SUPERSEDED_IDS = Object.freeze([
  'LEGACY_JORDAN_FIRST',
  'LEGACY_FIXED_THREE_SECTORS',
  'LEGACY_FOUR_POSTS_WEEK',
  'LEGACY_120_DAY_LIFETIME',
  'LEGACY_TIGER_CARE',
  'LEGACY_BLUE_LOGIN',
  'LEGACY_SEPARATE_ADMIN_SURFACE'
]);

const EXPECTED_PHASES = Object.freeze(
  Array.from({ length: 17 }, (_, index) => `F${String(index).padStart(2, '0')}`)
);

const FINAL_REFERENCE =
  'docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md';

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

const REQUIRED_REFERENCE_FIELDS = Object.freeze({
  ownerOperationalIndex: 'docs/fusion/FUSION_CURRENT_AUTHORITY.md',
  ownerRequirementsTraceability: 'docs/fusion/OWNER_REQUIREMENTS_TRACEABILITY_2026.md',
  ownerVisionReference: 'docs/fusion/OWNER_VISION_VVIP_TIGER_2026.md',
  ownerMarketplaceBoundaryReference: 'docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md',
  aiPrivateCoreReference: 'docs/fusion/OWNER_REFERENCE_AI_REVERSE_ENGINEERING_SHIELD_2026.md',
  tigerPulseOwnerReference: 'docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md',
  tigerPulseEngineeringSpec: 'docs/superpowers/specs/2026-08-18-tiger-pulse-ring-attention-allocation-engine-design.md',
  tigerPulseCampaignFoundationReference: 'docs/fusion/OWNER_REFERENCE_F07_TIGER_PULSE.md',
  tigerPulseCampaignFoundationSpec: 'docs/superpowers/specs/2026-08-13-f07-tiger-pulse-hero-dynamic-ad-ribbon-design.md',
  tigerSocialCoreOwnerReference: 'docs/owner-control/TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md',
  tigerSocialCoreEngineeringSpec: 'docs/superpowers/specs/2026-08-18-tiger-social-core-golden-architecture-design.md',
  tigerSocialCoreParityMatrix: 'docs/owner-control/TIGER_SOCIAL_FUNCTIONAL_PARITY_MATRIX.md'
});

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

  if (manifest.schemaVersion !== 'VVIP_TIGER_FUSION_AUTHORITY_V1') {
    errors.push('schemaVersion must be VVIP_TIGER_FUSION_AUTHORITY_V1');
  }
  if (manifest.productIdentity !== 'GLOBAL_FIRST') {
    errors.push('productIdentity must be GLOBAL_FIRST');
  }
  if (manifest.primaryProductIdentity !== 'SOCIAL_NETWORK_FIRST') {
    errors.push('primaryProductIdentity must be SOCIAL_NETWORK_FIRST');
  }
  if (manifest.currentReference !== FINAL_REFERENCE) {
    errors.push('currentReference must point to the FUSION FINAL owner constitution');
  }

  for (const [field, expected] of Object.entries(REQUIRED_REFERENCE_FIELDS)) {
    if (manifest[field] !== expected) {
      errors.push(`${field} must equal ${expected}`);
    }
  }

  const marketplaceBoundary = manifest.ownerMarketplaceBoundary;
  if (!marketplaceBoundary || typeof marketplaceBoundary !== 'object' || Array.isArray(marketplaceBoundary)) {
    errors.push('ownerMarketplaceBoundary must be an object');
  } else {
    if (marketplaceBoundary.mode !== 'ADVERTISING_DISCOVERY_DIRECT_CONTACT_ONLY') {
      errors.push('ownerMarketplaceBoundary.mode must be ADVERTISING_DISCOVERY_DIRECT_CONTACT_ONLY');
    }
    if (marketplaceBoundary.platformIsMarketplaceTransactionParty !== false) {
      errors.push('platform must not be a party to marketplace transactions');
    }
    if (marketplaceBoundary.marketplaceTransactionHandledDirectlyByParties !== true) {
      errors.push('marketplace transactions must be handled directly by their parties');
    }
    if (marketplaceBoundary.platformDoesNotBrokerOrRepresentParties !== true) {
      errors.push('platform must not broker or represent marketplace parties');
    }
    if (marketplaceBoundary.platformDoesNotGuaranteeCounterparty !== true) {
      errors.push('platform must not guarantee marketplace counterparties or outcomes');
    }
    if (!hasExactStringSet(marketplaceBoundary.role, REQUIRED_MARKETPLACE_ROLES)) {
      errors.push('marketplace platform role must be limited to advertising, discovery, direct contact, and distance reduction');
    }
    if (!hasExactStringSet(marketplaceBoundary.connects, REQUIRED_MARKETPLACE_CONNECTIONS)) {
      errors.push('marketplace connections must remain seller-to-buyer and service-provider-to-beneficiary');
    }

    const forbidden = Array.isArray(marketplaceBoundary.forbiddenMarketplaceIntermediation)
      ? marketplaceBoundary.forbiddenMarketplaceIntermediation
      : [];
    for (const item of REQUIRED_FORBIDDEN_MARKETPLACE_INTERMEDIATION) {
      if (!forbidden.includes(item)) {
        errors.push(`missing forbidden marketplace intermediation: ${item}`);
      }
    }

    if (!hasExactStringSet(
      marketplaceBoundary.platformOwnedFinancialScope,
      ALLOWED_PLATFORM_OWNED_FINANCIAL_SCOPE
    )) {
      errors.push('platformOwnedFinancialScope must be limited to platform-owned advertising services');
    }
  }

  if (manifest.historicalEvidencePolicy !== 'PRESERVE_OUTSIDE_CURRENT_AUTHORITY') {
    errors.push('historical evidence policy must preserve evidence outside current authority');
  }

  const phases = Array.isArray(manifest.implementationPhases) ? manifest.implementationPhases : [];
  if (phases.length !== EXPECTED_PHASES.length || phases.some((phase, index) => phase !== EXPECTED_PHASES[index])) {
    errors.push('implementationPhases must equal F00 through F16 in order');
  }

  const decisions = Array.isArray(manifest.supersededDecisions) ? manifest.supersededDecisions : [];
  const seen = new Set();
  for (const entry of decisions) {
    if (!entry || typeof entry.id !== 'string') {
      errors.push('every superseded decision must have a string id');
      continue;
    }
    if (seen.has(entry.id)) errors.push(`duplicate superseded decision: ${entry.id}`);
    seen.add(entry.id);
  }

  for (const id of REQUIRED_SUPERSEDED_IDS) {
    const entry = decisions.find((item) => item && item.id === id);
    if (!entry) errors.push(`missing superseded decision: ${id}`);
    else if (entry.status !== 'SUPERSEDED') errors.push(`${id} must be SUPERSEDED`);
  }

  const uniqueActors = manifest.digitalTwin && manifest.digitalTwin.uniqueActors;
  const simultaneous = manifest.digitalTwin && manifest.digitalTwin.simultaneousActiveUsers;
  if (uniqueActors !== 4_000_000) errors.push('digitalTwin.uniqueActors must be 4000000');
  if (simultaneous !== 4_000_000) errors.push('digitalTwin.simultaneousActiveUsers must be 4000000');
  if (manifest.globalLaunchEligibilityRequiresBoth4M !== true) {
    errors.push('globalLaunchEligibilityRequiresBoth4M must be true');
  }
  if (manifest.launchTruth !== 'EVIDENCE_FIRST') {
    errors.push('launchTruth must be EVIDENCE_FIRST');
  }
  if (manifest.globalLaunchStatementAllowedOnlyWhen !== 'F16_LAUNCH_PASSPORT_PASS') {
    errors.push('global launch statement must remain gated by F16 Launch Passport');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = Object.freeze({
  verifyCurrentAuthority,
  REQUIRED_SUPERSEDED_IDS,
  REQUIRED_REFERENCE_FIELDS,
  EXPECTED_PHASES,
  FINAL_REFERENCE,
  REQUIRED_MARKETPLACE_ROLES,
  REQUIRED_MARKETPLACE_CONNECTIONS,
  REQUIRED_FORBIDDEN_MARKETPLACE_INTERMEDIATION,
  ALLOWED_PLATFORM_OWNED_FINANCIAL_SCOPE
});
