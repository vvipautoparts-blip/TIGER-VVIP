import {
  RELEASE_CONTRACT,
  RELEASE_EVIDENCE_TYPES,
  RELEASE_LIMITS,
  RELEASE_STATES,
  RELEASE_TERMINAL_STATES,
  deepFreeze,
  isCommitSha,
  isReleaseIdentifier,
  isSha256
} from "./v13-release-contracts.js";

const INPUT_FIELDS = new Set([
  "subjectHeadSha",
  "state",
  "decisionCode",
  "requiredEvidence",
  "acceptedEvidence",
  "rejectedEvidence",
  "missingEvidence",
  "activeDeviations",
  "blockingReasons",
  "nextEligibleState"
]);

const DECISION_STATES = new Set([
  ...RELEASE_STATES,
  ...RELEASE_TERMINAL_STATES
]);
const EVIDENCE_TYPES = new Set(RELEASE_EVIDENCE_TYPES);
const decisionCodePattern = /^[A-Z][A-Z0-9_:-]*$/;
const blockingReasonPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function contractError(code) {
  return new TypeError(code);
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

function hasExactFields(value, allowed) {
  const keys = Object.keys(value);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}

function isBoundedCode(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= RELEASE_LIMITS.MAX_SUMMARY_LENGTH
    && decisionCodePattern.test(value);
}

function isBoundedBlockingReason(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= RELEASE_LIMITS.MAX_SUMMARY_LENGTH
    && blockingReasonPattern.test(value);
}

function isBoundedStringArray(value, maximum, validator = isBoundedCode) {
  return Array.isArray(value)
    && value.length <= maximum
    && value.every(validator);
}

function canonicalSet(values) {
  return Object.freeze([...new Set(values)].sort());
}

function rawProjection(input) {
  return {
    schemaVersion: RELEASE_CONTRACT.version,
    policyVersion: RELEASE_CONTRACT.policyVersion,
    subjectHeadSha: input.subjectHeadSha,
    state: input.state,
    decisionCode: input.decisionCode,
    requiredEvidence: canonicalSet(input.requiredEvidence),
    acceptedEvidence: canonicalSet(input.acceptedEvidence),
    rejectedEvidence: canonicalSet(input.rejectedEvidence),
    missingEvidence: canonicalSet(input.missingEvidence),
    activeDeviations: canonicalSet(input.activeDeviations),
    blockingReasons: canonicalSet(input.blockingReasons),
    nextEligibleState: input.nextEligibleState
  };
}

function assertInputStructure(input) {
  if (!isPlainDataObject(input)
      || !hasExactFields(input, INPUT_FIELDS)
      || !isCommitSha(input.subjectHeadSha)
      || !DECISION_STATES.has(input.state)
      || !isBoundedCode(input.decisionCode)
      || !DECISION_STATES.has(input.nextEligibleState)
      || !isBoundedStringArray(input.requiredEvidence, RELEASE_LIMITS.MAX_EVIDENCE)
      || !isBoundedStringArray(input.acceptedEvidence, RELEASE_LIMITS.MAX_EVIDENCE)
      || !isBoundedStringArray(input.rejectedEvidence, RELEASE_LIMITS.MAX_EVIDENCE)
      || !isBoundedStringArray(input.missingEvidence, RELEASE_LIMITS.MAX_EVIDENCE)
      || !Array.isArray(input.activeDeviations)
      || input.activeDeviations.length > RELEASE_LIMITS.MAX_DEVIATIONS
      || !input.activeDeviations.every((value) => isReleaseIdentifier(value, "deviation_"))
      || !isBoundedStringArray(
        input.blockingReasons,
        RELEASE_LIMITS.MAX_BLOCKING_REASONS,
        isBoundedBlockingReason
      )) {
    throw contractError("RELEASE_CONTRACT_INVALID");
  }
}

function assertSemanticCatalogs(projection) {
  for (const key of [
    "requiredEvidence",
    "acceptedEvidence",
    "rejectedEvidence",
    "missingEvidence"
  ]) {
    if (!projection[key].every((value) => EVIDENCE_TYPES.has(value))) {
      throw contractError("RELEASE_CONTRACT_INVALID");
    }
  }
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

export async function createReleaseDecisionRecord(input, dependencies) {
  assertInputStructure(input);

  if (!isPlainDataObject(dependencies)
      || !hasExactFields(dependencies, new Set(["digestSha256"]))
      || typeof dependencies.digestSha256 !== "function") {
    throw contractError("RELEASE_EVIDENCE_INVALID");
  }

  const projection = rawProjection(input);
  const canonicalJson = JSON.stringify(projection);

  if (byteLength(canonicalJson) > RELEASE_LIMITS.MAX_DECISION_BYTES) {
    throw contractError("RELEASE_BLOCKED");
  }

  assertSemanticCatalogs(projection);

  let decisionDigest;
  try {
    decisionDigest = await dependencies.digestSha256(canonicalJson);
  } catch {
    throw contractError("RELEASE_EVIDENCE_INVALID");
  }

  if (!isSha256(decisionDigest)) {
    throw contractError("RELEASE_EVIDENCE_INVALID");
  }

  const record = {
    ...projection,
    decisionDigest
  };

  if (byteLength(JSON.stringify(record)) > RELEASE_LIMITS.MAX_DECISION_BYTES) {
    throw contractError("RELEASE_BLOCKED");
  }

  return deepFreeze(record);
}
