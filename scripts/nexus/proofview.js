export const PROOFVIEW_POLICY = Object.freeze({
  version: 'PROOFVIEW_V1',
  minViewportRatio: 0.5,
  minContinuousMs: 2000
});

function verdict(qualified, code, consumeUnits) {
  return Object.freeze({
    qualified,
    code,
    consumeUnits,
    policyVersion: PROOFVIEW_POLICY.version
  });
}

function validEvidence(evidence) {
  return Boolean(
    evidence
    && typeof evidence === 'object'
    && !Array.isArray(evidence)
    && Number.isFinite(evidence.viewportRatio)
    && evidence.viewportRatio >= 0
    && evidence.viewportRatio <= 1
    && Number.isFinite(evidence.continuousMs)
    && evidence.continuousMs >= 0
    && typeof evidence.foreground === 'boolean'
    && typeof evidence.placementEligible === 'boolean'
    && typeof evidence.objectEligible === 'boolean'
    && typeof evidence.reservationValid === 'boolean'
    && typeof evidence.invalidTraffic === 'boolean'
    && typeof evidence.duplicate === 'boolean'
  );
}

export function qualifyProofView(evidence) {
  if (!validEvidence(evidence)) return verdict(false, 'PROOFVIEW_EVIDENCE_INVALID', 0);
  if (!evidence.reservationValid) return verdict(false, 'PROOFVIEW_RESERVATION_INVALID', 0);
  if (!evidence.objectEligible) return verdict(false, 'PROOFVIEW_OBJECT_INELIGIBLE', 0);
  if (!evidence.placementEligible) return verdict(false, 'PROOFVIEW_PLACEMENT_INELIGIBLE', 0);
  if (evidence.invalidTraffic) return verdict(false, 'PROOFVIEW_INVALID_TRAFFIC', 0);
  if (evidence.duplicate) return verdict(false, 'PROOFVIEW_DUPLICATE', 0);
  if (!evidence.foreground) return verdict(false, 'PROOFVIEW_BACKGROUND', 0);
  if (evidence.viewportRatio < PROOFVIEW_POLICY.minViewportRatio) {
    return verdict(false, 'PROOFVIEW_MIN_VIEWPORT_NOT_MET', 0);
  }
  if (evidence.continuousMs < PROOFVIEW_POLICY.minContinuousMs) {
    return verdict(false, 'PROOFVIEW_MIN_TIME_NOT_MET', 0);
  }
  return verdict(true, 'PROOFVIEW_QUALIFIED', 1);
}
