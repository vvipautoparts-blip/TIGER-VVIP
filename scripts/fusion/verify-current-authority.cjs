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
  if (manifest.currentReference !== FINAL_REFERENCE) {
    errors.push('currentReference must point to the FUSION FINAL owner constitution');
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

  return { ok: errors.length === 0, errors };
}

module.exports = Object.freeze({
  verifyCurrentAuthority,
  REQUIRED_SUPERSEDED_IDS,
  EXPECTED_PHASES,
  FINAL_REFERENCE
});
