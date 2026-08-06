import {
  RELEASE_CONTRACT,
  RELEASE_EVIDENCE_TYPES,
  RELEASE_ISSUER_CLASSES,
  RELEASE_LIMITS,
  deepFreeze,
  isCommitSha,
  isIsoTimestamp,
  isReleaseIdentifier,
  isSha256
} from "./v13-release-contracts.js";

const ALLOWED_FIELDS = Object.freeze([
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

const ALLOWED_FIELD_SET = new Set(ALLOWED_FIELDS);
const FORBIDDEN_FIELDS = new Set([
  "token",
  "secret",
  "password",
  "rawlog",
  "event_payload",
  "envelope",
  "connectionstring",
  "environmentvalues"
]);

const VALID_STATUSES = new Set(["PASS", "FAIL"]);
const INCONCLUSIVE_STATUSES = new Set(["TIMEOUT", "INCONCLUSIVE"]);
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const summaryPattern = /^[A-Z][A-Z0-9_:-]*$/;

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

function hasForbiddenField(input) {
  return Object.keys(input).some((key) => FORBIDDEN_FIELDS.has(key.toLowerCase()));
}

function hasUnknownField(input) {
  return Object.keys(input).some((key) => !ALLOWED_FIELD_SET.has(key));
}

function isValidContext(context) {
  return isPlainDataObject(context)
    && typeof context.expectedRepository === "string"
    && repositoryPattern.test(context.expectedRepository)
    && Number.isInteger(context.expectedPullRequest)
    && context.expectedPullRequest > 0
    && isCommitSha(context.expectedHeadSha)
    && Number.isFinite(context.nowMs);
}

function isValidSummaryCode(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= RELEASE_LIMITS.MAX_SUMMARY_LENGTH
    && summaryPattern.test(value);
}

function issuerCanProduceEvidence(evidenceType, issuerClass) {
  if (evidenceType === "INDEPENDENT_REVIEW") {
    return issuerClass === "INDEPENDENT_REVIEWER";
  }
  if (evidenceType === "PRODUCTION_APPROVAL") {
    return issuerClass === "RELEASE_MANAGER" || issuerClass === "OWNER_ROOT";
  }
  if (evidenceType === "LEGAL_REVIEW") {
    return issuerClass === "LEGAL_APPROVER" || issuerClass === "OWNER_ROOT";
  }
  if (evidenceType === "PRIVACY_REVIEW") {
    return issuerClass === "PRIVACY_APPROVER" || issuerClass === "OWNER_ROOT";
  }
  if (evidenceType === "COUNTRY_ACTIVATION") {
    return issuerClass === "COUNTRY_APPROVER" || issuerClass === "OWNER_ROOT";
  }
  return true;
}

function normalizeProjection(input) {
  return {
    schemaVersion: input.schemaVersion,
    policyVersion: input.policyVersion,
    evidenceType: input.evidenceType,
    subjectRepository: input.subjectRepository,
    subjectPullRequest: input.subjectPullRequest,
    subjectHeadSha: input.subjectHeadSha,
    issuerClass: input.issuerClass,
    issuerIdHash: input.issuerIdHash,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    status: input.status,
    summaryCode: input.summaryCode,
    evidenceDigest: input.evidenceDigest,
    correlationId: input.correlationId
  };
}

export function normalizeReleaseEvidence(input, context) {
  if (!isValidContext(context) || !isPlainDataObject(input)) {
    return fail("RELEASE_EVIDENCE_INVALID");
  }

  if (hasForbiddenField(input)) {
    return fail("RELEASE_CLIENT_FIELDS_DENIED");
  }

  if (hasUnknownField(input)) {
    return fail("RELEASE_CONTRACT_INVALID");
  }

  if (input.schemaVersion !== RELEASE_CONTRACT.version
      || input.policyVersion !== RELEASE_CONTRACT.policyVersion
      || !RELEASE_EVIDENCE_TYPES.includes(input.evidenceType)
      || !RELEASE_ISSUER_CLASSES.includes(input.issuerClass)
      || !isSha256(input.issuerIdHash)
      || !isSha256(input.evidenceDigest)
      || !isReleaseIdentifier(input.correlationId, "release_corr_")
      || !isValidSummaryCode(input.summaryCode)
      || !Number.isInteger(input.subjectPullRequest)
      || input.subjectPullRequest <= 0
      || typeof input.subjectRepository !== "string"
      || !repositoryPattern.test(input.subjectRepository)
      || !isCommitSha(input.subjectHeadSha)
      || !isIsoTimestamp(input.issuedAt)
      || !isIsoTimestamp(input.expiresAt)
      || !issuerCanProduceEvidence(input.evidenceType, input.issuerClass)) {
    return fail("RELEASE_EVIDENCE_INVALID");
  }

  if (input.subjectRepository !== context.expectedRepository
      || input.subjectPullRequest !== context.expectedPullRequest
      || input.subjectHeadSha !== context.expectedHeadSha) {
    return fail("RELEASE_HEAD_MISMATCH");
  }

  if (INCONCLUSIVE_STATUSES.has(input.status)) {
    return fail("RELEASE_TIMEOUT_INCONCLUSIVE");
  }

  if (!VALID_STATUSES.has(input.status)) {
    return fail("RELEASE_EVIDENCE_INVALID");
  }

  const issuedAtMs = Date.parse(input.issuedAt);
  const expiresAtMs = Date.parse(input.expiresAt);

  if (!Number.isFinite(issuedAtMs)
      || !Number.isFinite(expiresAtMs)
      || issuedAtMs >= expiresAtMs
      || issuedAtMs > context.nowMs + RELEASE_LIMITS.MAX_CLOCK_SKEW_MS) {
    return fail("RELEASE_EVIDENCE_INVALID");
  }

  if (expiresAtMs <= context.nowMs) {
    return fail("RELEASE_EVIDENCE_STALE");
  }

  const evidence = deepFreeze(normalizeProjection(input));
  return deepFreeze({ ok: true, evidence });
}

function semanticIdentity(evidence) {
  return [
    evidence.schemaVersion,
    evidence.policyVersion,
    evidence.evidenceType,
    evidence.subjectRepository,
    evidence.subjectPullRequest,
    evidence.subjectHeadSha,
    evidence.issuerClass,
    evidence.issuerIdHash,
    evidence.correlationId
  ].join("|");
}

function canonicalEvidence(evidence) {
  return JSON.stringify(normalizeProjection(evidence));
}

function compareEvidence(left, right) {
  return semanticIdentity(left).localeCompare(semanticIdentity(right))
    || canonicalEvidence(left).localeCompare(canonicalEvidence(right));
}

export function validateEvidenceSet(evidenceList, context) {
  if (!Array.isArray(evidenceList)) {
    return fail("RELEASE_EVIDENCE_INVALID");
  }
  if (evidenceList.length === 0) {
    return fail("RELEASE_EVIDENCE_REQUIRED");
  }
  if (evidenceList.length > RELEASE_LIMITS.MAX_EVIDENCE) {
    return fail("RELEASE_EVIDENCE_INVALID");
  }

  const byIdentity = new Map();

  for (const candidate of evidenceList) {
    const normalized = normalizeReleaseEvidence(candidate, context);
    if (!normalized.ok) return normalized;

    const identity = semanticIdentity(normalized.evidence);
    const canonical = canonicalEvidence(normalized.evidence);
    const existing = byIdentity.get(identity);

    if (existing && existing.canonical !== canonical) {
      return fail("RELEASE_EVIDENCE_CONFLICT");
    }

    if (!existing) {
      byIdentity.set(identity, {
        canonical,
        evidence: normalized.evidence
      });
    }
  }

  const evidence = [...byIdentity.values()]
    .map((entry) => entry.evidence)
    .sort(compareEvidence);

  return deepFreeze({ ok: true, evidence });
}
