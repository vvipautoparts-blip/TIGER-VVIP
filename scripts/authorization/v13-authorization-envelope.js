import {
  AUTHORITY_CLASSES,
  LIMITS,
  PERMISSION_IDS,
  ROLE_IDS,
  isStableIdentifier
} from "./v13-authority-contracts.js";
import {
  assertResourceCountry,
  countryScopeContains,
  normalizeCountryScope
} from "./v13-country-scope.js";

const CLIENT_AUTHORITY_FIELDS = Object.freeze(new Set([
  "authorityClass",
  "roleIds",
  "permissionIds",
  "legalEntityCountry",
  "dataResidencyRegion",
  "billingCountry",
  "taxCountry",
  "countrySealVersion",
  "assignmentRevision",
  "policyVersion"
]));

function domainError(code) {
  return Object.assign(new Error(code), { code });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function parseTimestamp(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw domainError("MALFORMED_ENVELOPE");
  return timestamp;
}

function normalizeStringList(values, allowed = null) {
  if (!Array.isArray(values) || values.length > 50) throw domainError("MALFORMED_ENVELOPE");
  const normalized = values.map((value) => {
    if (typeof value !== "string" || value.length < 1 || value.length > 128) {
      throw domainError("MALFORMED_ENVELOPE");
    }
    if (allowed && !allowed.includes(value)) throw domainError("MALFORMED_ENVELOPE");
    return value;
  });
  if (new Set(normalized).size !== normalized.length) throw domainError("MALFORMED_ENVELOPE");
  return Object.freeze([...normalized].sort());
}

function normalizeNullableCountry(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^[A-Za-z]{2}$/.test(value.trim())) {
    throw domainError("MALFORMED_ENVELOPE");
  }
  return value.trim().toUpperCase();
}

function normalizeNullableIdentifier(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length < 1 || value.length > LIMITS.IDENTIFIER) {
    throw domainError("MALFORMED_ENVELOPE");
  }
  return value;
}

function denial(code) {
  return Object.freeze({
    allowed: false,
    code,
    effectiveAssignmentIds: Object.freeze([]),
    authorityClass: "NONE"
  });
}

function authorization(envelope) {
  return Object.freeze({
    allowed: true,
    code: "AUTHORIZED",
    effectiveAssignmentIds: Object.freeze([...envelope.effectiveAssignmentIds]),
    authorityClass: envelope.authorityClass
  });
}

export function rejectClientAuthorityFields(input) {
  const denied = input
    && typeof input === "object"
    && !Array.isArray(input)
    && Object.keys(input).some((key) => CLIENT_AUTHORITY_FIELDS.has(key));
  return Object.freeze(denied
    ? { ok: false, code: "CLIENT_AUTHORITY_FIELDS_DENIED" }
    : { ok: true, code: "OK" });
}

export function createAuthorizationEnvelope(trustedInput) {
  if (!trustedInput || typeof trustedInput !== "object" || Array.isArray(trustedInput)) {
    throw domainError("MALFORMED_ENVELOPE");
  }
  if (!isStableIdentifier(trustedInput.envelopeId, "authz_env_")) {
    throw domainError("MALFORMED_ENVELOPE");
  }
  if (typeof trustedInput.actorId !== "string" || trustedInput.actorId.length < 1 || trustedInput.actorId.length > LIMITS.IDENTIFIER) {
    throw domainError("MALFORMED_ENVELOPE");
  }
  if (!AUTHORITY_CLASSES.includes(trustedInput.authorityClass)) {
    throw domainError("MALFORMED_ENVELOPE");
  }
  if (!isStableIdentifier(trustedInput.correlationId, "corr_")) {
    throw domainError("MALFORMED_ENVELOPE");
  }
  if (trustedInput.policyVersion !== "V13.1") {
    throw domainError("MALFORMED_ENVELOPE");
  }
  if (!Number.isSafeInteger(trustedInput.assignmentRevision) || trustedInput.assignmentRevision < 0) {
    throw domainError("MALFORMED_ENVELOPE");
  }

  const sessionIssuedAt = parseTimestamp(trustedInput.sessionIssuedAt);
  const issuedAt = parseTimestamp(trustedInput.issuedAt);
  const expiresAt = parseTimestamp(trustedInput.expiresAt);
  const ttl = (expiresAt - issuedAt) / 1000;
  if (sessionIssuedAt > issuedAt || ttl <= 0 || ttl > LIMITS.ENVELOPE_TTL_SECONDS) {
    throw domainError("MALFORMED_ENVELOPE");
  }

  const envelope = {
    envelopeId: trustedInput.envelopeId,
    actorId: trustedInput.actorId,
    authorityClass: trustedInput.authorityClass,
    roleIds: normalizeStringList(trustedInput.roleIds, ROLE_IDS),
    permissionIds: normalizeStringList(trustedInput.permissionIds, PERMISSION_IDS),
    effectiveAssignmentIds: normalizeStringList(trustedInput.effectiveAssignmentIds),
    scope: normalizeCountryScope(trustedInput.scope),
    activeMarketCountry: normalizeNullableCountry(trustedInput.activeMarketCountry),
    countrySealVersion: normalizeNullableIdentifier(trustedInput.countrySealVersion),
    policyVersion: "V13.1",
    assignmentRevision: trustedInput.assignmentRevision,
    sessionIssuedAt: new Date(sessionIssuedAt).toISOString(),
    issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    correlationId: trustedInput.correlationId
  };

  return deepFreeze(envelope);
}

function validTrustedState(trustedState, envelope) {
  return trustedState
    && typeof trustedState === "object"
    && trustedState.actorId === envelope.actorId
    && trustedState.accountState === "active";
}

export function validateAuthorizationEnvelope({ envelope, trustedState, resource, operation, now } = {}) {
  let normalizedEnvelope;
  try {
    normalizedEnvelope = createAuthorizationEnvelope(envelope);
  } catch {
    return denial("MALFORMED_ENVELOPE");
  }

  if (!validTrustedState(trustedState, normalizedEnvelope)) {
    return denial("IDENTITY_DENIED");
  }

  const sessionIssuedAt = Date.parse(normalizedEnvelope.sessionIssuedAt);
  const sessionValidAfter = Date.parse(trustedState.sessionValidAfter);
  if (!Number.isFinite(sessionValidAfter) || sessionIssuedAt < sessionValidAfter) {
    return denial("SESSION_INVALIDATED");
  }

  const at = Date.parse(now);
  if (!Number.isFinite(at)) return denial("MALFORMED_ENVELOPE");
  if (Date.parse(normalizedEnvelope.expiresAt) <= at) return denial("ENVELOPE_EXPIRED");

  if (normalizedEnvelope.policyVersion !== "V13.1"
    || trustedState.policyVersion !== "V13.1"
    || normalizedEnvelope.policyVersion !== trustedState.policyVersion
    || normalizedEnvelope.assignmentRevision !== trustedState.assignmentRevision) {
    return denial("STALE_AUTHORIZATION_ENVELOPE");
  }

  if (!operation
    || !["governance", "operational"].includes(operation.kind)
    || !PERMISSION_IDS.includes(operation.permission)
    || !resource
    || typeof resource !== "object") {
    return denial("MALFORMED_ENVELOPE");
  }

  let normalizedResourceScope;
  try {
    normalizedResourceScope = normalizeCountryScope(resource.scope);
  } catch {
    return denial("INVALID_SCOPE");
  }

  if (!countryScopeContains(normalizedEnvelope.scope, normalizedResourceScope)) {
    return denial("COUNTRY_SCOPE_MISMATCH");
  }

  if (resource.countryCode !== null && resource.countryCode !== undefined) {
    const countryDecision = assertResourceCountry(normalizedEnvelope.scope, resource.countryCode);
    if (!countryDecision.ok) return denial(countryDecision.code);
  }

  if (operation.kind === "operational") {
    const country = trustedState.country;
    const resourceCountry = typeof resource.countryCode === "string"
      ? resource.countryCode.trim().toUpperCase()
      : normalizedResourceScope.countryCode ?? null;
    const countryMatches = country
      && typeof country.code === "string"
      && country.code.trim().toUpperCase() === resourceCountry;
    const sealValid = countryMatches
      && country.state === "ACTIVE"
      && country.sealStatus === "VALID"
      && typeof country.sealVersion === "string"
      && country.sealVersion.length > 0
      && normalizedEnvelope.countrySealVersion === country.sealVersion;
    if (!sealValid) return denial("COUNTRY_SEAL_REQUIRED");
  }

  if (!normalizedEnvelope.permissionIds.includes(operation.permission)) {
    return denial("PERMISSION_DENIED");
  }

  return authorization(normalizedEnvelope);
}
