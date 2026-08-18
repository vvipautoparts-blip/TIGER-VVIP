export const ATTRIBUTION_POLICY_VERSION = "VVIP_ATTRIBUTION_2026_08_19_V2_1";

const DAY_MS = 24 * 60 * 60 * 1000;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._/-]{7,159}$/;

export const ATTRIBUTION_EVIDENCE_POLICY = Object.freeze({
  CHECKOUT_CODE: Object.freeze({
    priority: 1,
    orderOnly: true,
    maxAgeMs: 0,
    commissionEligible: true
  }),
  VERIFIED_LEAD: Object.freeze({
    priority: 2,
    orderOnly: false,
    maxAgeMs: 60 * DAY_MS,
    commissionEligible: true
  }),
  VERIFIED_ORDER_START: Object.freeze({
    priority: 3,
    orderOnly: false,
    maxAgeMs: 30 * DAY_MS,
    commissionEligible: true
  }),
  CONSENTED_FIRST_PARTY_COOKIE: Object.freeze({
    priority: 4,
    orderOnly: false,
    maxAgeMs: 7 * DAY_MS,
    commissionEligible: true
  }),
  DEVICE_RISK_SIGNAL: Object.freeze({
    priority: 5,
    orderOnly: false,
    maxAgeMs: null,
    commissionEligible: false
  }),
  PAYMENT_RISK_SIGNAL: Object.freeze({
    priority: 5,
    orderOnly: false,
    maxAgeMs: null,
    commissionEligible: false
  })
});

function assertIdentifier(value) {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) {
    throw new TypeError("VVIP_INVALID_ATTRIBUTION_EVIDENCE");
  }
  return value;
}

function normalizeTime(value) {
  if (typeof value !== "string") {
    throw new TypeError("VVIP_INVALID_ATTRIBUTION_TIME");
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError("VVIP_INVALID_ATTRIBUTION_TIME");
  }
  return {
    iso: new Date(timestamp).toISOString(),
    timestamp
  };
}

function normalizeEvidence(rawEvidence, lockedTimestamp) {
  if (!rawEvidence
    || typeof rawEvidence !== "object"
    || Array.isArray(rawEvidence)) {
    throw new TypeError("VVIP_INVALID_ATTRIBUTION_EVIDENCE");
  }

  const policy = ATTRIBUTION_EVIDENCE_POLICY[rawEvidence.type];
  if (!policy) {
    throw new TypeError("VVIP_INVALID_ATTRIBUTION_EVIDENCE");
  }

  const evidenceId = assertIdentifier(rawEvidence.evidenceId);
  const captured = normalizeTime(rawEvidence.capturedAt);
  if (captured.timestamp > lockedTimestamp) {
    throw new TypeError("VVIP_INVALID_ATTRIBUTION_TIME");
  }

  if (!policy.commissionEligible) {
    return Object.freeze({
      evidenceId,
      type: rawEvidence.type,
      capturedAt: captured.iso,
      capturedTimestamp: captured.timestamp,
      policy
    });
  }

  return Object.freeze({
    evidenceId,
    type: rawEvidence.type,
    capturedAt: captured.iso,
    capturedTimestamp: captured.timestamp,
    marketerId: assertIdentifier(rawEvidence.marketerId),
    managerAssignmentId: assertIdentifier(rawEvidence.managerAssignmentId),
    sectorId: assertIdentifier(rawEvidence.sectorId),
    policy
  });
}

function isEligibleAtLock(evidence, locked) {
  if (!evidence.policy.commissionEligible) return false;
  if (evidence.policy.orderOnly) {
    return evidence.capturedAt.slice(0, 10) === locked.iso.slice(0, 10);
  }
  return locked.timestamp - evidence.capturedTimestamp <= evidence.policy.maxAgeMs;
}

function createEmptyDecision({
  transactionId,
  lockedAt,
  status,
  saleChannel
}) {
  return Object.freeze({
    policyVersion: ATTRIBUTION_POLICY_VERSION,
    transactionId,
    status,
    saleChannel,
    lockedAt,
    winningEvidenceId: null,
    evidenceType: null,
    marketerId: null,
    managerAssignmentId: null,
    sectorId: null
  });
}

export function resolveAttribution({
  transactionId,
  lockedAt,
  fraudReviewRequired = false,
  evidence = []
} = {}) {
  const normalizedTransactionId = assertIdentifier(transactionId);
  const normalizedLockedAt = normalizeTime(lockedAt);
  if (typeof fraudReviewRequired !== "boolean" || !Array.isArray(evidence)) {
    throw new TypeError("VVIP_INVALID_ATTRIBUTION_EVIDENCE");
  }

  const normalizedEvidence = evidence.map((item) => (
    normalizeEvidence(item, normalizedLockedAt.timestamp)
  ));

  if (fraudReviewRequired) {
    return createEmptyDecision({
      transactionId: normalizedTransactionId,
      lockedAt: normalizedLockedAt.iso,
      status: "ATTRIBUTION_REVIEW",
      saleChannel: null
    });
  }

  const candidates = normalizedEvidence
    .filter((item) => isEligibleAtLock(item, normalizedLockedAt))
    .sort((left, right) => {
      if (left.policy.priority !== right.policy.priority) {
        return left.policy.priority - right.policy.priority;
      }
      if (left.capturedTimestamp !== right.capturedTimestamp) {
        return right.capturedTimestamp - left.capturedTimestamp;
      }
      return left.evidenceId.localeCompare(right.evidenceId);
    });

  if (candidates.length === 0) {
    return createEmptyDecision({
      transactionId: normalizedTransactionId,
      lockedAt: normalizedLockedAt.iso,
      status: "DIRECT_PLATFORM",
      saleChannel: "DIRECT_PLATFORM"
    });
  }

  const winner = candidates[0];
  return Object.freeze({
    policyVersion: ATTRIBUTION_POLICY_VERSION,
    transactionId: normalizedTransactionId,
    status: "ATTRIBUTED",
    saleChannel: "REFERRED_SALE",
    lockedAt: normalizedLockedAt.iso,
    winningEvidenceId: winner.evidenceId,
    evidenceType: winner.type,
    marketerId: winner.marketerId,
    managerAssignmentId: winner.managerAssignmentId,
    sectorId: winner.sectorId
  });
}
