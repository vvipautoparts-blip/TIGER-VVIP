import fs from 'node:fs';

const contract = JSON.parse(
  fs.readFileSync(new URL('../release-passport/contract.v1.json', import.meta.url), 'utf8'),
);

const SHA40 = /^[0-9a-f]{40}$/;

function blocked(targetRing, requiredRings, reasons) {
  return {
    schemaVersion: contract.schemaVersion,
    targetRing,
    decision: 'BLOCKED',
    eligible: false,
    requiredRings,
    reasons,
  };
}

function evidenceIsValid(evidence) {
  return Array.isArray(evidence)
    && evidence.length > 0
    && evidence.every(item => typeof item === 'string' && item.trim().length > 0);
}

export function evaluateReleasePassport(input = {}) {
  const targetRing = typeof input?.targetRing === 'string' ? input.targetRing : '';
  const targetIndex = contract.rings.indexOf(targetRing);
  const requiredRings = targetIndex >= 0 ? contract.rings.slice(0, targetIndex + 1) : [];
  const reasons = [];

  if (targetIndex < 0) {
    reasons.push({ code: 'INVALID_TARGET_RING', ring: targetRing || null });
    return blocked(targetRing || null, requiredRings, reasons);
  }

  const source = input?.source && typeof input.source === 'object' ? input.source : {};
  if (!SHA40.test(source.commitSha ?? '')) {
    reasons.push({ code: 'INVALID_COMMIT_SHA' });
  }

  if (targetRing === 'R6_PRODUCTION' && contract.productionRequiresTreeSha) {
    if (!SHA40.test(source.treeSha ?? '')) {
      reasons.push({ code: 'TREE_SHA_REQUIRED' });
    }
  }

  const rings = input?.rings && typeof input.rings === 'object' ? input.rings : {};

  for (const ring of requiredRings) {
    const entry = rings[ring];
    if (!entry || typeof entry !== 'object') {
      reasons.push({ code: 'MISSING_RING_EVIDENCE', ring });
      continue;
    }

    if (!contract.ringStatuses.includes(entry.status)) {
      reasons.push({ code: 'INVALID_RING_STATUS', ring });
      continue;
    }

    if (entry.status === 'FAIL') {
      reasons.push({ code: 'RING_FAILED', ring });
      continue;
    }

    if (entry.status === 'NOT_RUN') {
      reasons.push({ code: 'RING_NOT_RUN', ring });
      continue;
    }

    if (entry.status === 'PASS' && contract.passRequiresEvidence && !evidenceIsValid(entry.evidence)) {
      reasons.push({ code: 'PASS_WITHOUT_EVIDENCE', ring });
    }
  }

  if (reasons.length > 0) {
    return blocked(targetRing, requiredRings, reasons);
  }

  return {
    schemaVersion: contract.schemaVersion,
    targetRing,
    decision: 'SAFE',
    eligible: true,
    requiredRings,
    reasons: [],
  };
}

export const releasePassportContract = Object.freeze({
  schemaVersion: contract.schemaVersion,
  rings: Object.freeze([...contract.rings]),
  ringStatuses: Object.freeze([...contract.ringStatuses]),
  decisions: Object.freeze([...contract.decisions]),
  passRequiresEvidence: contract.passRequiresEvidence === true,
  productionRequiresTreeSha: contract.productionRequiresTreeSha === true,
});
