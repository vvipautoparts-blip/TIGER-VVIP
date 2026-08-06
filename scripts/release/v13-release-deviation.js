import {
  RELEASE_CONTRACT,
  RELEASE_ISSUER_CLASSES,
  RELEASE_LIMITS,
  ZERO_TOLERANCE_DOMAINS,
  deepFreeze,
  isCommitSha,
  isIsoTimestamp,
  isReleaseIdentifier
} from "./v13-release-contracts.js";

const MAX_DEVIATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TEXT_LENGTH = 1024;

const ALLOWED_FIELDS = Object.freeze([
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

const ALLOWED_FIELD_SET = new Set(ALLOWED_FIELDS);
const ZERO_TOLERANCE_SET = new Set(ZERO_TOLERANCE_DOMAINS);
const HUMAN_APPROVERS = new Set(
  RELEASE_ISSUER_CLASSES.filter((value) => value !== "CI_SYSTEM")
);
const codePattern = /^[A-Z][A-Z0-9_:-]*$/;
const safePathPattern = /^[A-Za-z0-9._/-]+$/;

function fail(code) {
  return deepFreeze({ ok: false, code });
}

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

function isBoundedText(value) {
  return typeof value === "string"
    && value.trim() === value
    && value.length > 0
    && value.length <= MAX_TEXT_LENGTH;
}

function isCode(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= RELEASE_LIMITS.MAX_SUMMARY_LENGTH
    && codePattern.test(value);
}

function isSafeScopePath(value) {
  if (typeof value !== "string"
      || value.length === 0
      || value.length > RELEASE_LIMITS.MAX_SUMMARY_LENGTH
      || value.startsWith("/")
      || value.includes("\\")
      || value.includes("?")
      || value.includes("#")
      || value.includes("*")
      || !safePathPattern.test(value)) {
    return false;
  }

  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isValidContext(context) {
  return isPlainDataObject(context)
    && isCommitSha(context.expectedHeadSha)
    && Number.isFinite(context.nowMs)
    && Array.isArray(context.classifiedDomains)
    && context.classifiedDomains.length > 0
    && context.classifiedDomains.length <= RELEASE_LIMITS.MAX_BLOCKING_REASONS
    && context.classifiedDomains.every(isCode);
}

function normalizeProjection(input) {
  return {
    deviationId: input.deviationId,
    schemaVersion: input.schemaVersion,
    policyVersion: input.policyVersion,
    subjectHeadSha: input.subjectHeadSha,
    scopePaths: Object.freeze([...input.scopePaths]),
    scopeCapability: input.scopeCapability,
    reasonCode: input.reasonCode,
    riskOwner: input.riskOwner,
    approvedByClass: input.approvedByClass,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    compensatingControl: input.compensatingControl,
    remediationTicket: input.remediationTicket,
    rollbackPlan: input.rollbackPlan,
    verificationPlan: input.verificationPlan,
    maximumBlastRadius: input.maximumBlastRadius,
    automaticFailClosedAtExpiry: input.automaticFailClosedAtExpiry
  };
}

export function normalizeTemporaryDeviation(input, context) {
  if (!isValidContext(context) || !isPlainDataObject(input)) {
    return fail("RELEASE_DEVIATION_INVALID");
  }

  if (Object.keys(input).some((key) => !ALLOWED_FIELD_SET.has(key))) {
    return fail("RELEASE_DEVIATION_INVALID");
  }

  if (input.schemaVersion !== RELEASE_CONTRACT.version
      || input.policyVersion !== RELEASE_CONTRACT.policyVersion
      || !isCommitSha(input.subjectHeadSha)) {
    return fail("RELEASE_DEVIATION_INVALID");
  }

  if (input.subjectHeadSha !== context.expectedHeadSha) {
    return fail("RELEASE_HEAD_MISMATCH");
  }

  if (!isReleaseIdentifier(input.deviationId, "deviation_")
      || !isReleaseIdentifier(input.riskOwner, "risk_owner_")
      || !isReleaseIdentifier(input.remediationTicket, "remediation_")
      || !isCode(input.scopeCapability)
      || !isCode(input.reasonCode)
      || !HUMAN_APPROVERS.has(input.approvedByClass)
      || !isIsoTimestamp(input.issuedAt)
      || !isIsoTimestamp(input.expiresAt)
      || input.automaticFailClosedAtExpiry !== true
      || !isBoundedText(input.compensatingControl)
      || !isBoundedText(input.rollbackPlan)
      || !isBoundedText(input.verificationPlan)
      || !isBoundedText(input.maximumBlastRadius)
      || !Array.isArray(input.scopePaths)
      || input.scopePaths.length === 0
      || input.scopePaths.length > RELEASE_LIMITS.MAX_SCOPE_PATHS
      || !input.scopePaths.every(isSafeScopePath)
      || new Set(input.scopePaths).size !== input.scopePaths.length) {
    return fail("RELEASE_DEVIATION_INVALID");
  }

  if (ZERO_TOLERANCE_SET.has(input.scopeCapability)
      || context.classifiedDomains.some((domain) => ZERO_TOLERANCE_SET.has(domain))) {
    return fail("RELEASE_DEVIATION_FORBIDDEN");
  }

  const issuedAtMs = Date.parse(input.issuedAt);
  const expiresAtMs = Date.parse(input.expiresAt);

  if (!Number.isFinite(issuedAtMs)
      || !Number.isFinite(expiresAtMs)
      || issuedAtMs >= expiresAtMs
      || issuedAtMs > context.nowMs + RELEASE_LIMITS.MAX_CLOCK_SKEW_MS
      || expiresAtMs - issuedAtMs > MAX_DEVIATION_TTL_MS) {
    return fail("RELEASE_DEVIATION_INVALID");
  }

  if (expiresAtMs <= context.nowMs) {
    return fail("RELEASE_DEVIATION_EXPIRED");
  }

  const deviation = deepFreeze(normalizeProjection(input));
  return deepFreeze({ ok: true, deviation });
}
