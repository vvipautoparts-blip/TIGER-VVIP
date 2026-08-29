'use strict';

const CAPABILITIES = Object.freeze([
  'SOCIAL',
  'DISCOVERY',
  'MESSAGING',
  'ADS_DELIVERY',
  'ADS_BILLING',
  'PULSE',
  'AI_RECOMMENDATION',
  'DATA_EXPORT'
]);

const DEFAULT_FIELDS = Object.freeze([
  'country',
  'currency',
  'paymentProvider',
  'legalEntity',
  'taxProfile',
  'dataRegion',
  'market'
]);

const REQUIRED_COMPONENTS = Object.freeze({
  marketResolver: 'scripts/sovereignty/explicit-market-context.cjs',
  capabilityLifecycle: 'scripts/sovereignty/market-capability-lifecycle.cjs',
  marketGenome: 'scripts/sovereignty/market-genome.cjs',
  sovereignCompiler: 'scripts/sovereignty/sovereign-compiler.cjs',
  marketPassport: 'scripts/sovereignty/market-activation-passport.cjs',
  ownerExecutionLease: 'scripts/sovereignty/owner-execution-lease.cjs',
  executionSeal: 'scripts/sovereignty/genome-execution-seal.cjs',
  signedPolicyBundle: 'scripts/sovereignty/signed-policy-bundle.cjs',
  killGrid: 'scripts/sovereignty/sovereign-kill-grid.cjs',
  cryptoInventoryVerifier: 'scripts/security/verify-crypto-inventory.cjs',
  evidenceGraph: 'scripts/sovereignty/sovereign-evidence-graph.cjs',
  ciEvidenceClassifier: 'scripts/release/ci-evidence-classifier.cjs',
  cryptoDigitalTwin: 'scripts/security/crypto-digital-twin.cjs',
  releaseBirthCertificate: 'scripts/release/release-birth-certificate.cjs',
  technologyMaturityFirewall: 'scripts/security/technology-maturity-firewall.cjs',
  witnessQuorum: 'scripts/release/witness-quorum.cjs',
  proofCapsuleVerifier: 'scripts/sovereignty/sovereign-proof-capsule.cjs'
});

function exactArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && new Set(actual).size === actual.length
    && expected.every((item, index) => actual[index] === item);
}

function verifySpgfAuthority(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, errors: ['manifest must be an object'] };
  }

  if (manifest.schemaVersion !== 'TIGER_SPGF_V1') errors.push('schemaVersion must be TIGER_SPGF_V1');

  const owner = manifest.ownerRoot || {};
  if (owner.id !== 'OWNER_ROOT') errors.push('ownerRoot.id must be OWNER_ROOT');
  if (owner.country !== null) errors.push('OWNER_ROOT country must be null');
  if (owner.currency !== null) errors.push('OWNER_ROOT currency must be null');
  if (owner.market !== null) errors.push('OWNER_ROOT market must be null');
  if (owner.standingRuntimePrivilege !== false) errors.push('standing root privilege must be false');

  const defaults = manifest.defaults || {};
  for (const field of DEFAULT_FIELDS) {
    if (defaults[field] !== null) errors.push(`defaults.${field} must be null`);
  }

  if (!exactArray(manifest.capabilityRegistry, CAPABILITIES)) errors.push('capabilityRegistry mismatch');
  if (!Array.isArray(manifest.markets)) errors.push('markets must be an array');
  if (manifest.marketSelectionPolicy !== 'EXPLICIT_ONLY') errors.push('marketSelectionPolicy must be EXPLICIT_ONLY');
  if (manifest.publicReadMarketPolicy !== 'OPTIONAL_EXPLICIT_OR_GLOBAL') errors.push('publicReadMarketPolicy mismatch');
  if (manifest.trustModel !== 'PROOF_CAPSULE_REQUIRED_FAIL_CLOSED') errors.push('trustModel mismatch');
  if (manifest.activationAuthority !== 'MARKET_CAPABILITY_PASSPORT') errors.push('activationAuthority mismatch');
  if (manifest.pricingAuthority !== 'SIGNED_MARKET_PRICING_CONTRACT') errors.push('pricingAuthority mismatch');
  if (manifest.releaseAuthority !== 'EXACT_RELEASE_BIRTH_CERTIFICATE') errors.push('releaseAuthority mismatch');
  if (manifest.fallbackPolicy !== 'DENY_NO_SOVEREIGN_FALLBACK') errors.push('fallbackPolicy mismatch');
  if (manifest.technologyMaturityPolicy !== 'STABLE_ONLY_FOR_SOVEREIGN_PRODUCTION') errors.push('technologyMaturityPolicy mismatch');

  const cryptoPolicy = manifest.cryptoPolicy || {};
  if (
    cryptoPolicy.noCustomCryptography !== true
    || cryptoPolicy.noCustomPqc !== true
    || cryptoPolicy.cryptoAgilityRequired !== true
  ) {
    errors.push('cryptoPolicy must require standards-only crypto agility');
  }
  if (cryptoPolicy.inventory !== 'config/security/crypto-inventory.v1.json') {
    errors.push('crypto inventory path mismatch');
  }

  const components = manifest.canonicalComponents || {};
  for (const [key, value] of Object.entries(REQUIRED_COMPONENTS)) {
    if (components[key] !== value) errors.push(`canonicalComponents.${key} mismatch`);
  }

  const governance = manifest.governance || {};
  if (governance.predecessorPullRequest !== 346) errors.push('predecessorPullRequest must be 346');
  if (governance.predecessorBypassAllowed !== false) errors.push('predecessor bypass forbidden');
  if (governance.productionMutationAuthorized !== false) errors.push('production mutation must be false');
  if (governance.countryActivationAuthorized !== false) errors.push('country activation must be false');
  if (governance.paymentProviderActivationAuthorized !== false) errors.push('payment provider activation must be false');

  return { ok: errors.length === 0, errors };
}

module.exports = Object.freeze({
  verifySpgfAuthority,
  CAPABILITIES,
  DEFAULT_FIELDS,
  REQUIRED_COMPONENTS
});
