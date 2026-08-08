function deepFreezeInternal(value, seen) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) deepFreezeInternal(nested, seen);
  return Object.freeze(value);
}

export function deepFreeze(value) {
  return deepFreezeInternal(value, new WeakSet());
}

const frozen = (values) => Object.freeze([...values]);

export const RELEASE_CONTRACT = deepFreeze({
  name: "V13.1_ZERO_TRUST_RELEASE_DECISION",
  version: 1,
  policyVersion: "V13.1_RELEASE_POLICY_1"
});

export const RELEASE_STATES = frozen([
  "DIAGNOSING",
  "RED_CONFIRMED",
  "FIX_IN_PROGRESS",
  "GREEN_CANDIDATE",
  "SHA_LOCKED",
  "REVIEW_ELIGIBLE",
  "MERGE_ELIGIBLE",
  "RELEASE_CANDIDATE",
  "RELEASE_ELIGIBLE",
  "CANARY_ACTIVE",
  "RELEASED"
]);

export const RELEASE_TERMINAL_STATES = frozen([
  "BLOCKED",
  "QUARANTINED",
  "ROLLBACK_REQUIRED",
  "ROLLED_BACK"
]);

export const RELEASE_EVIDENCE_TYPES = frozen([
  "QUALITY_GATE",
  "PROJECT_CONTROL",
  "DEPENDENCY_REVIEW",
  "STATIC_ANALYSIS",
  "SECRET_SCAN",
  "DANGEROUS_SQL_SCAN",
  "AUTHORIZATION_INTEGRITY",
  "MEDIA_INTEGRITY",
  "LISTING_CONTRACT",
  "MIGRATION_LOCAL_REPEATABILITY",
  "RLS_CONTRACT",
  "STORAGE_ISOLATION",
  "PROVENANCE",
  "ARTIFACT_DIGEST",
  "ROLLBACK_DRY_RUN",
  "CANARY_PLAN",
  "KILL_SWITCH",
  "OBSERVABILITY",
  "INCIDENT_READINESS",
  "BACKUP_RECOVERY",
  "PERFORMANCE_BUDGET",
  "ACCESSIBILITY",
  "PRIVACY_REVIEW",
  "LEGAL_REVIEW",
  "COUNTRY_ACTIVATION",
  "PAYMENT_READINESS",
  "INDEPENDENT_REVIEW",
  "PRODUCTION_APPROVAL"
]);

export const RELEASE_ISSUER_CLASSES = frozen([
  "CI_SYSTEM",
  "INDEPENDENT_REVIEWER",
  "SECURITY_REVIEWER",
  "LEGAL_APPROVER",
  "PRIVACY_APPROVER",
  "COUNTRY_APPROVER",
  "DATABASE_APPROVER",
  "RELEASE_MANAGER",
  "INCIDENT_COMMANDER",
  "OWNER_ROOT"
]);

export const ZERO_TOLERANCE_DOMAINS = frozen([
  "AUTHENTICATION",
  "AUTHORIZATION",
  "OWNER_PARTNER_AUTHORITY",
  "PRIVACY",
  "MEDIA_INTEGRITY",
  "RLS_TENANT_ISOLATION",
  "STORAGE_ISOLATION",
  "SECRET_MANAGEMENT",
  "DANGEROUS_SQL",
  "FAIL_CLOSED",
  "COUNTRY_BOUNDARIES",
  "LEGAL_ENTITY_BOUNDARIES",
  "DATA_RESIDENCY",
  "AUDIT_APPEND_ONLY",
  "ARTIFACT_PROVENANCE",
  "PRODUCTION_CREDENTIALS",
  "ROLLBACK_STATEFUL"
]);

export const RELEASE_LIMITS = Object.freeze({
  MAX_EVIDENCE: 128,
  MAX_BLOCKING_REASONS: 64,
  MAX_DEPENDENCIES: 64,
  MAX_DEVIATIONS: 16,
  MAX_SCOPE_PATHS: 32,
  MAX_SUMMARY_LENGTH: 256,
  MAX_DECISION_BYTES: 128 * 1024,
  MAX_CLOCK_SKEW_MS: 300_000,
  IDENTIFIER: 128
});

const errorCodes = [
  "RELEASE_CONTRACT_INVALID",
  "RELEASE_CLIENT_FIELDS_DENIED",
  "RELEASE_IDENTIFIER_INVALID",
  "RELEASE_EVIDENCE_REQUIRED",
  "RELEASE_EVIDENCE_INVALID",
  "RELEASE_EVIDENCE_STALE",
  "RELEASE_EVIDENCE_CONFLICT",
  "RELEASE_HEAD_MISMATCH",
  "RELEASE_BASE_CHANGED",
  "RELEASE_DEPENDENCY_BLOCKED",
  "RELEASE_DEPENDENCY_CYCLE",
  "RELEASE_REVIEW_REQUIRED",
  "RELEASE_REVIEW_STALE",
  "RELEASE_ZERO_TOLERANCE_FAILURE",
  "RELEASE_DEVIATION_FORBIDDEN",
  "RELEASE_DEVIATION_INVALID",
  "RELEASE_DEVIATION_EXPIRED",
  "RELEASE_PROVENANCE_REQUIRED",
  "RELEASE_ARTIFACT_MISMATCH",
  "RELEASE_ROLLBACK_REQUIRED",
  "RELEASE_CANARY_REQUIRED",
  "RELEASE_KILL_SWITCH_REQUIRED",
  "RELEASE_OBSERVABILITY_REQUIRED",
  "RELEASE_INCIDENT_READINESS_REQUIRED",
  "RELEASE_PRODUCTION_APPROVAL_REQUIRED",
  "RELEASE_TIMEOUT_INCONCLUSIVE",
  "RELEASE_BLOCKED"
];

export const RELEASE_ERROR_CODES = Object.freeze(
  Object.fromEntries(errorCodes.map((code) => [code, code]))
);

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export function isReleaseIdentifier(value, prefix) {
  return typeof value === "string"
    && typeof prefix === "string"
    && prefix.length > 0
    && value.length > prefix.length
    && value.length <= RELEASE_LIMITS.IDENTIFIER
    && value.startsWith(prefix)
    && identifierPattern.test(value);
}

export function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function isCommitSha(value) {
  return typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
}

export function isIsoTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
