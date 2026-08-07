const ASSET_ID_PATTERN = /^asset:[a-z0-9_-]+(?::[a-z0-9_-]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const POLICY_VERSION = "CVGE_REPOSITORY_V1";

export const VALUE_GOVERNANCE_LIMITS = Object.freeze({
  ASSET_ID: 160
});

export const ACTION_CLASSES = Object.freeze(["A", "B", "C"]);

export const LIFECYCLE_STATES = Object.freeze([
  "DISCOVERED",
  "ACTIVE",
  "WATCH",
  "DEPRECATION_CANDIDATE",
  "QUARANTINED",
  "REMOVAL_READY",
  "REMOVED",
  "RESTORED",
  "PROTECTED"
]);

export const VALUE_REASON_CODES = Object.freeze([
  "ASSET_UNREGISTERED",
  "ASSET_REGISTRY_INVALID",
  "ASSET_ID_DUPLICATE",
  "REGISTRY_PATH_DUPLICATE",
  "ASSET_MISSING",
  "PATH_ESCAPE_DENIED",
  "EVIDENCE_INCOMPLETE",
  "EVIDENCE_STALE",
  "EVIDENCE_INVALID",
  "VALUE_NOT_PROVEN_ZERO",
  "VALUE_NOT_PRESENT",
  "DEPENDENCY_UNRESOLVED",
  "DEPENDENCY_FREE",
  "PROTECTED_OBLIGATION",
  "ACTION_CLASS_DENIED",
  "QUARANTINE_REQUIRED",
  "ROLLBACK_NOT_VERIFIED",
  "ROLLBACK_REPRODUCIBLE",
  "BLAST_RADIUS_EXCEEDED",
  "POST_REMOVAL_HEALTH_FAILED",
  "POLICY_VERSION_INVALID",
  "AUDIT_APPEND_FAILED"
]);

export function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, seen);
  return Object.freeze(value);
}

export function validateAssetId(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= VALUE_GOVERNANCE_LIMITS.ASSET_ID
    && ASSET_ID_PATTERN.test(value);
}

export function validateSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}
