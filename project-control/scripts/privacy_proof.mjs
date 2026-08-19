import fs from 'node:fs';

const contract = JSON.parse(
  fs.readFileSync(new URL('../privacy-proof/contract.v1.json', import.meta.url), 'utf8'),
);

function hasEvidence(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function reason(code, dimension) {
  return dimension ? { code, dimension } : { code };
}

export function evaluatePrivacyProof(input = {}) {
  const reasons = [];
  const dimensions = input?.dimensions && typeof input.dimensions === 'object'
    ? input.dimensions
    : {};

  for (const dimension of contract.requiredDimensions) {
    const proof = dimensions[dimension];
    if (!proof || typeof proof !== 'object') {
      reasons.push(reason('MISSING_PRIVACY_DIMENSION', dimension));
      continue;
    }

    if (!contract.dimensionStatuses.includes(proof.status)) {
      reasons.push(reason('INVALID_PRIVACY_STATUS', dimension));
      continue;
    }

    if (!Number.isInteger(proof.unauthorizedCount) || proof.unauthorizedCount < 0) {
      reasons.push(reason('INVALID_UNAUTHORIZED_COUNT', dimension));
      continue;
    }

    if (proof.status === 'UNBOUND') {
      reasons.push(reason('PRIVACY_DIMENSION_UNBOUND', dimension));
      continue;
    }

    if (proof.status === 'FAIL' || proof.unauthorizedCount !== contract.safeUnauthorizedCount) {
      reasons.push(reason('PRIVACY_EXPOSURE_DETECTED', dimension));
      continue;
    }

    if (proof.status === 'PASS' && contract.passRequiresEvidence && !hasEvidence(proof.evidence)) {
      reasons.push(reason('PASS_WITHOUT_EVIDENCE', dimension));
    }
  }

  if (reasons.length > 0) {
    return {
      schemaVersion: contract.schemaVersion,
      decision: 'BLOCKED',
      eligible: false,
      requiredDimensions: [...contract.requiredDimensions],
      reasons,
    };
  }

  return {
    schemaVersion: contract.schemaVersion,
    decision: 'SAFE',
    eligible: true,
    requiredDimensions: [...contract.requiredDimensions],
    reasons: [],
  };
}

export const privacyProofContract = Object.freeze({
  schemaVersion: contract.schemaVersion,
  requiredDimensions: Object.freeze([...contract.requiredDimensions]),
  dimensionStatuses: Object.freeze([...contract.dimensionStatuses]),
  safeUnauthorizedCount: contract.safeUnauthorizedCount,
  passRequiresEvidence: contract.passRequiresEvidence === true,
});
