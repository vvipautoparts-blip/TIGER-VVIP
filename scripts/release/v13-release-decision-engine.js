import {
  RELEASE_EVIDENCE_TYPES,
  RELEASE_LIMITS,
  RELEASE_STATES,
  ZERO_TOLERANCE_DOMAINS,
  deepFreeze,
  isCommitSha,
  isReleaseIdentifier
} from "./v13-release-contracts.js";

const TOP_LEVEL_FIELDS = new Set([
  "subject",
  "changeSurface",
  "evidence",
  "deviations",
  "dependencyResult",
  "requestedState",
  "nowMs"
]);

const SUBJECT_FIELDS = new Set([
  "repository",
  "pullRequest",
  "headSha",
  "baseSha"
]);

const SURFACE_FIELDS = Object.freeze([
  "code",
  "authorization",
  "media",
  "database",
  "storage",
  "production",
  "privacy",
  "legal",
  "country",
  "payment",
  "accessibility",
  "performance",
  "stateful"
]);
const SURFACE_FIELD_SET = new Set(SURFACE_FIELDS);

const EVIDENCE_FIELDS = new Set([
  "schemaVersion",
  "policyVersion",
  "evidenceType",
  "subjectRepository",
  "subjectPullRequest",
  "subjectHeadSha",
  "issuerClass",
  "issuerIdHash",
  "issuedAt",
  "expiresAt",
  "status",
  "summaryCode",
  "evidenceDigest",
  "correlationId"
]);

const DEVIATION_FIELDS = new Set([
  "deviationId",
  "schemaVersion",
  "policyVersion",
  "subjectHeadSha",
  "scopePaths",
  "scopeCapability",
  "reasonCode",
  "riskOwner",
  "approvedByClass",
  "issuedAt",
  "expiresAt",
  "compensatingControl",
  "remediationTicket",
  "rollbackPlan",
  "verificationPlan",
  "maximumBlastRadius",
  "automaticFailClosedAtExpiry"
]);

const REQUESTED_STATES = new Set([
  "SHA_LOCKED",
  "REVIEW_ELIGIBLE",
  "MERGE_ELIGIBLE",
  "RELEASE_ELIGIBLE"
]);

const EVIDENCE_STATUSES = new Set([
  "PASS",
  "FAIL",
  "TIMEOUT",
  "INCONCLUSIVE"
]);

const BASELINE_TECHNICAL = Object.freeze([
  "QUALITY_GATE",
  "PROJECT_CONTROL",
  "DEPENDENCY_REVIEW",
  "STATIC_ANALYSIS",
  "SECRET_SCAN",
  "DANGEROUS_SQL_SCAN",
  "LISTING_CONTRACT"
]);

const ZERO_TOLERANCE_EVIDENCE = new Set([
  "AUTHORIZATION_INTEGRITY",
  "MEDIA_INTEGRITY",
  "RLS_CONTRACT",
  "STORAGE_ISOLATION",
  "SECRET_SCAN",
  "DANGEROUS_SQL_SCAN",
  "PRIVACY_REVIEW",
  "COUNTRY_ACTIVATION",
  "PROVENANCE",
  "ARTIFACT_DIGEST",
  "ROLLBACK_DRY_RUN"
]);

const ZERO_TOLERANCE_CAPABILITIES = new Set(ZERO_TOLERANCE_DOMAINS);
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const codePattern = /^[A-Z][A-Z0-9_:-]*$/;

function isPlainDataObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.get || descriptor.set || !descriptor.enumerable) return false;
  }
  return true;
}

function hasOnlyFields(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function hasExactFields(value, allowed) {
  return Object.keys(value).length === allowed.size && hasOnlyFields(value, allowed);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function frozenDecision({
  state,
  decisionCode,
  requiredEvidence = [],
  acceptedEvidence = [],
  rejectedEvidence = [],
  missingEvidence = [],
  activeDeviations = [],
  blockingReasons = [],
  nextEligibleState
}) {
  return deepFreeze({
    state,
    decisionCode,
    requiredEvidence: uniqueSorted(requiredEvidence),
    acceptedEvidence: uniqueSorted(acceptedEvidence),
    rejectedEvidence: uniqueSorted(rejectedEvidence),
    missingEvidence: uniqueSorted(missingEvidence),
    activeDeviations: uniqueSorted(activeDeviations),
    blockingReasons: uniqueSorted(blockingReasons),
    nextEligibleState
  });
}

function blocked(code = "RELEASE_CONTRACT_INVALID") {
  return frozenDecision({
    state: "BLOCKED",
    decisionCode: code,
    nextEligibleState: "SHA_LOCKED"
  });
}

function isValidSubject(subject) {
  return isPlainDataObject(subject)
    && hasExactFields(subject, SUBJECT_FIELDS)
    && typeof subject.repository === "string"
    && repositoryPattern.test(subject.repository)
    && Number.isInteger(subject.pullRequest)
    && subject.pullRequest > 0
    && isCommitSha(subject.headSha)
    && isCommitSha(subject.baseSha);
}

function isValidSurface(surface) {
  return isPlainDataObject(surface)
    && hasExactFields(surface, SURFACE_FIELD_SET)
    && SURFACE_FIELDS.every((field) => typeof surface[field] === "boolean");
}

function isValidEvidenceShape(item) {
  return isPlainDataObject(item)
    && hasOnlyFields(item, EVIDENCE_FIELDS)
    && typeof item.evidenceType === "string"
    && RELEASE_EVIDENCE_TYPES.includes(item.evidenceType)
    && isCommitSha(item.subjectHeadSha)
    && typeof item.status === "string"
    && EVIDENCE_STATUSES.has(item.status)
    && typeof item.issuerClass === "string"
    && typeof item.summaryCode === "string"
    && item.summaryCode.length > 0
    && item.summaryCode.length <= RELEASE_LIMITS.MAX_SUMMARY_LENGTH
    && typeof item.evidenceDigest === "string"
    && item.evidenceDigest.length > 0
    && item.evidenceDigest.length <= RELEASE_LIMITS.MAX_SUMMARY_LENGTH;
}

function isValidDeviationShape(item) {
  return isPlainDataObject(item)
    && hasOnlyFields(item, DEVIATION_FIELDS)
    && isReleaseIdentifier(item.deviationId, "deviation_")
    && isCommitSha(item.subjectHeadSha)
    && typeof item.scopeCapability === "string"
    && codePattern.test(item.scopeCapability)
    && typeof item.expiresAt === "string"
    && Number.isFinite(Date.parse(item.expiresAt));
}

function isValidDependencyResult(result) {
  if (!isPlainDataObject(result) || typeof result.ok !== "boolean") return false;

  if (result.ok) {
    return hasExactFields(result, new Set(["ok", "orderedDependencies"]))
      && Array.isArray(result.orderedDependencies)
      && result.orderedDependencies.length <= RELEASE_LIMITS.MAX_DEPENDENCIES
      && result.orderedDependencies.every((id) => isReleaseIdentifier(id, "pr_"));
  }

  return hasExactFields(result, new Set(["ok", "code", "blockingNodeIds"]))
    && typeof result.code === "string"
    && codePattern.test(result.code)
    && Array.isArray(result.blockingNodeIds)
    && result.blockingNodeIds.length <= RELEASE_LIMITS.MAX_DEPENDENCIES
    && result.blockingNodeIds.every((id) => isReleaseIdentifier(id, "pr_"));
}

function isValidInput(input) {
  return isPlainDataObject(input)
    && hasExactFields(input, TOP_LEVEL_FIELDS)
    && isValidSubject(input.subject)
    && isValidSurface(input.changeSurface)
    && Array.isArray(input.evidence)
    && input.evidence.length <= RELEASE_LIMITS.MAX_EVIDENCE
    && input.evidence.every(isValidEvidenceShape)
    && Array.isArray(input.deviations)
    && input.deviations.length <= RELEASE_LIMITS.MAX_DEVIATIONS
    && input.deviations.every(isValidDeviationShape)
    && isValidDependencyResult(input.dependencyResult)
    && REQUESTED_STATES.has(input.requestedState)
    && Number.isFinite(input.nowMs);
}

function deriveTechnicalEvidence(surface) {
  const required = new Set(BASELINE_TECHNICAL);

  if (surface.authorization) required.add("AUTHORIZATION_INTEGRITY");
  if (surface.media) required.add("MEDIA_INTEGRITY");
  if (surface.database) {
    required.add("MIGRATION_LOCAL_REPEATABILITY");
    required.add("RLS_CONTRACT");
    required.add("BACKUP_RECOVERY");
  }
  if (surface.storage) required.add("STORAGE_ISOLATION");
  if (surface.privacy) required.add("PRIVACY_REVIEW");
  if (surface.legal) required.add("LEGAL_REVIEW");
  if (surface.country) required.add("COUNTRY_ACTIVATION");
  if (surface.payment) required.add("PAYMENT_READINESS");
  if (surface.accessibility) required.add("ACCESSIBILITY");
  if (surface.performance) required.add("PERFORMANCE_BUDGET");

  return uniqueSorted(required);
}

function deriveTargetEvidence(input, technicalRequired) {
  const required = new Set(technicalRequired);
  const requested = input.requestedState;

  if (requested === "REVIEW_ELIGIBLE"
      || requested === "MERGE_ELIGIBLE"
      || requested === "RELEASE_ELIGIBLE") {
    required.add("INDEPENDENT_REVIEW");
  }

  if ((requested === "MERGE_ELIGIBLE" || requested === "RELEASE_ELIGIBLE")
      && input.changeSurface.stateful
      && !input.changeSurface.production) {
    required.add("ROLLBACK_DRY_RUN");
  }

  if (requested === "RELEASE_ELIGIBLE") {
    for (const type of [
      "PROVENANCE",
      "ARTIFACT_DIGEST",
      "ROLLBACK_DRY_RUN",
      "CANARY_PLAN",
      "KILL_SWITCH",
      "OBSERVABILITY",
      "INCIDENT_READINESS",
      "PRODUCTION_APPROVAL"
    ]) {
      required.add(type);
    }
  }

  return uniqueSorted(required);
}

function analyzeEvidence(evidenceList, expectedHeadSha) {
  const accepted = new Set();
  const rejected = new Set();
  const statusesByType = new Map();
  let timeout = false;
  let foreignHead = false;
  let staleReview = false;
  let conflict = false;

  for (const item of evidenceList) {
    if (item.subjectHeadSha !== expectedHeadSha) {
      rejected.add(item.evidenceType);
      if (item.evidenceType === "INDEPENDENT_REVIEW") staleReview = true;
      else foreignHead = true;
      continue;
    }

    if (item.status === "TIMEOUT" || item.status === "INCONCLUSIVE") {
      timeout = true;
      rejected.add(item.evidenceType);
      continue;
    }

    const previousStatus = statusesByType.get(item.evidenceType);
    if (previousStatus && previousStatus !== item.status) conflict = true;
    statusesByType.set(item.evidenceType, item.status);

    if (item.status === "PASS") accepted.add(item.evidenceType);
    else rejected.add(item.evidenceType);
  }

  return {
    accepted,
    rejected,
    timeout,
    foreignHead,
    staleReview,
    conflict
  };
}

function analyzeDeviations(deviations, subject, nowMs) {
  const activeIds = [];
  const activeCapabilities = new Set();

  for (const deviation of deviations) {
    if (deviation.subjectHeadSha !== subject.headSha) {
      return { ok: false, code: "RELEASE_HEAD_MISMATCH" };
    }

    const expiresAtMs = Date.parse(deviation.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) continue;
    if (ZERO_TOLERANCE_CAPABILITIES.has(deviation.scopeCapability)) continue;

    activeIds.push(deviation.deviationId);
    activeCapabilities.add(deviation.scopeCapability);
  }

  return {
    ok: true,
    activeIds: uniqueSorted(activeIds),
    activeCapabilities
  };
}

function waivedMissingEvidence(missing, activeCapabilities) {
  const waivable = new Map([
    ["PERFORMANCE_BUDGET", "PERFORMANCE_NON_SECURITY"]
  ]);

  return missing.filter((type) => {
    const capability = waivable.get(type);
    return capability && activeCapabilities.has(capability);
  });
}

function releaseMissing(accepted, requiredTypes) {
  return requiredTypes.filter((type) => !accepted.has(type));
}

export function evaluateReleaseDecision(input) {
  if (!isValidInput(input)) return blocked();

  const technicalRequired = deriveTechnicalEvidence(input.changeSurface);
  const requiredEvidence = deriveTargetEvidence(input, technicalRequired);
  const evidenceAnalysis = analyzeEvidence(input.evidence, input.subject.headSha);
  const common = {
    requiredEvidence,
    acceptedEvidence: [...evidenceAnalysis.accepted],
    rejectedEvidence: [...evidenceAnalysis.rejected]
  };

  if (evidenceAnalysis.timeout) {
    return frozenDecision({
      ...common,
      state: "BLOCKED",
      decisionCode: "RELEASE_TIMEOUT_INCONCLUSIVE",
      nextEligibleState: "SHA_LOCKED"
    });
  }

  if (evidenceAnalysis.foreignHead) {
    return frozenDecision({
      ...common,
      state: "BLOCKED",
      decisionCode: "RELEASE_HEAD_MISMATCH",
      nextEligibleState: "SHA_LOCKED"
    });
  }

  if (evidenceAnalysis.conflict) {
    return frozenDecision({
      ...common,
      state: "BLOCKED",
      decisionCode: "RELEASE_EVIDENCE_CONFLICT",
      nextEligibleState: "SHA_LOCKED"
    });
  }

  const zeroToleranceFailures = [...evidenceAnalysis.rejected]
    .filter((type) => ZERO_TOLERANCE_EVIDENCE.has(type));
  if (zeroToleranceFailures.length > 0) {
    return frozenDecision({
      ...common,
      state: "BLOCKED",
      decisionCode: "RELEASE_ZERO_TOLERANCE_FAILURE",
      rejectedEvidence: zeroToleranceFailures,
      nextEligibleState: "SHA_LOCKED"
    });
  }

  if (evidenceAnalysis.rejected.size > 0) {
    return frozenDecision({
      ...common,
      state: "BLOCKED",
      decisionCode: "RELEASE_BLOCKED",
      nextEligibleState: "SHA_LOCKED"
    });
  }

  const deviationAnalysis = analyzeDeviations(input.deviations, input.subject, input.nowMs);
  if (!deviationAnalysis.ok) {
    return frozenDecision({
      ...common,
      state: "BLOCKED",
      decisionCode: deviationAnalysis.code,
      nextEligibleState: "SHA_LOCKED"
    });
  }

  const technicalMissing = releaseMissing(evidenceAnalysis.accepted, technicalRequired);
  const waivedMissing = waivedMissingEvidence(
    technicalMissing,
    deviationAnalysis.activeCapabilities
  );
  const unwaivedMissing = technicalMissing.filter((type) => !waivedMissing.includes(type));

  if (unwaivedMissing.length > 0) {
    return frozenDecision({
      ...common,
      state: "BLOCKED",
      decisionCode: "RELEASE_EVIDENCE_REQUIRED",
      missingEvidence: unwaivedMissing,
      activeDeviations: deviationAnalysis.activeIds,
      nextEligibleState: "SHA_LOCKED"
    });
  }

  const wantsReview = input.requestedState !== "SHA_LOCKED";
  if (!wantsReview) {
    return frozenDecision({
      ...common,
      state: "SHA_LOCKED",
      decisionCode: "SHA_LOCKED",
      activeDeviations: deviationAnalysis.activeIds,
      nextEligibleState: "REVIEW_ELIGIBLE"
    });
  }

  if (!evidenceAnalysis.accepted.has("INDEPENDENT_REVIEW")) {
    return frozenDecision({
      ...common,
      state: "SHA_LOCKED",
      decisionCode: evidenceAnalysis.staleReview
        ? "RELEASE_REVIEW_STALE"
        : "RELEASE_REVIEW_REQUIRED",
      missingEvidence: evidenceAnalysis.staleReview ? [] : ["INDEPENDENT_REVIEW"],
      activeDeviations: deviationAnalysis.activeIds,
      nextEligibleState: "REVIEW_ELIGIBLE"
    });
  }

  const reviewState = {
    ...common,
    state: "REVIEW_ELIGIBLE",
    activeDeviations: deviationAnalysis.activeIds,
    nextEligibleState: "MERGE_ELIGIBLE"
  };

  if (waivedMissing.length > 0) {
    return frozenDecision({
      ...reviewState,
      decisionCode: "RELEASE_EVIDENCE_REQUIRED",
      missingEvidence: waivedMissing
    });
  }

  if (input.requestedState === "REVIEW_ELIGIBLE") {
    return frozenDecision({
      ...reviewState,
      decisionCode: "REVIEW_ELIGIBLE"
    });
  }

  if (!input.dependencyResult.ok) {
    return frozenDecision({
      ...reviewState,
      decisionCode: input.dependencyResult.code,
      blockingReasons: input.dependencyResult.blockingNodeIds.map(
        (id) => `${input.dependencyResult.code}:${id}`
      )
    });
  }

  const mergeNeedsRollback = input.changeSurface.stateful
    && !input.changeSurface.production
    && (input.changeSurface.database || input.changeSurface.storage)
    && !evidenceAnalysis.accepted.has("ROLLBACK_DRY_RUN");

  if (mergeNeedsRollback) {
    return frozenDecision({
      ...reviewState,
      decisionCode: "RELEASE_ROLLBACK_REQUIRED",
      missingEvidence: ["ROLLBACK_DRY_RUN"]
    });
  }

  const mergeState = {
    ...common,
    state: "MERGE_ELIGIBLE",
    activeDeviations: deviationAnalysis.activeIds,
    nextEligibleState: "RELEASE_CANDIDATE"
  };

  if (input.requestedState === "MERGE_ELIGIBLE") {
    return frozenDecision({
      ...mergeState,
      decisionCode: "MERGE_ELIGIBLE"
    });
  }

  const provenanceMissing = releaseMissing(evidenceAnalysis.accepted, [
    "ARTIFACT_DIGEST",
    "PROVENANCE"
  ]);
  if (provenanceMissing.length > 0) {
    return frozenDecision({
      ...mergeState,
      decisionCode: "RELEASE_PROVENANCE_REQUIRED",
      missingEvidence: provenanceMissing
    });
  }

  const releasePrecedence = [
    ["ROLLBACK_DRY_RUN", "RELEASE_ROLLBACK_REQUIRED"],
    ["CANARY_PLAN", "RELEASE_CANARY_REQUIRED"],
    ["KILL_SWITCH", "RELEASE_KILL_SWITCH_REQUIRED"],
    ["OBSERVABILITY", "RELEASE_OBSERVABILITY_REQUIRED"],
    ["INCIDENT_READINESS", "RELEASE_INCIDENT_READINESS_REQUIRED"],
    ["PRODUCTION_APPROVAL", "RELEASE_PRODUCTION_APPROVAL_REQUIRED"]
  ];

  for (const [evidenceType, code] of releasePrecedence) {
    if (!evidenceAnalysis.accepted.has(evidenceType)) {
      return frozenDecision({
        ...mergeState,
        decisionCode: code,
        missingEvidence: [evidenceType]
      });
    }
  }

  return frozenDecision({
    ...common,
    state: "RELEASE_ELIGIBLE",
    decisionCode: "RELEASE_ELIGIBLE",
    activeDeviations: deviationAnalysis.activeIds,
    nextEligibleState: "CANARY_ACTIVE"
  });
}
