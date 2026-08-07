import { normalizeCountryScope } from "./v13-country-scope.js";

export const AUTHORIZATION_IDEMPOTENCY_CONTRACT = Object.freeze({
  name: "V13.1_AUTHORIZATION_COMMAND",
  version: 1
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function normalizedText(value, code = "SEMANTIC_COMMAND_INVALID") {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(code);
  }
  return value.trim();
}

function normalizedStringSet(values) {
  if (!Array.isArray(values)) throw new TypeError("SEMANTIC_COMMAND_INVALID");
  return Object.freeze(values.map((value) => normalizedText(value)).sort());
}

function normalizeCountryCode(value) {
  if (value === null || value === undefined) return null;
  const normalized = normalizedText(value, "SEMANTIC_RESOURCE_INVALID").toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new TypeError("SEMANTIC_RESOURCE_INVALID");
  }
  return normalized;
}

function normalizeAssignmentCreateCommand(command) {
  return deepFreeze({
    subjectId: normalizedText(command.subjectId),
    roleId: normalizedText(command.roleId),
    requestedPermissionIds: normalizedStringSet(command.requestedPermissionIds),
    scope: normalizeCountryScope(command.scope),
    startsAt: normalizedText(command.startsAt),
    expiresAt: normalizedText(command.expiresAt)
  });
}

function normalizePartnerCreateCommand(command) {
  return deepFreeze({
    subjectId: normalizedText(command.subjectId),
    legalDecisionReference: normalizedText(command.legalDecisionReference)
  });
}

export function normalizeAuthorizationCommandForPersistence(request, policy, targetId) {
  if (policy.action === "create") {
    return policy.family === "assignment"
      ? normalizeAssignmentCreateCommand(request.command)
      : normalizePartnerCreateCommand(request.command);
  }
  if (policy.family === "assignment") {
    return Object.freeze({ assignmentId: normalizedText(targetId) });
  }
  return Object.freeze({
    membershipId: normalizedText(targetId),
    legalDecisionReference: normalizedText(request.command.legalDecisionReference)
  });
}

function normalizeSemanticResource(resource) {
  const normalized = {
    scope: normalizeCountryScope(resource.scope)
  };
  const countryCode = normalizeCountryCode(resource.countryCode);
  if (countryCode !== null) normalized.countryCode = countryCode;
  return deepFreeze(normalized);
}

function normalizeAuthorityContext(envelope) {
  return deepFreeze({
    assignmentRevision: envelope.assignmentRevision,
    authorityClass: normalizedText(envelope.authorityClass),
    countrySealVersion: envelope.countrySealVersion === null
      || envelope.countrySealVersion === undefined
      ? null
      : normalizedText(envelope.countrySealVersion),
    effectiveAssignmentIds: normalizedStringSet(envelope.effectiveAssignmentIds),
    permissionIds: normalizedStringSet(envelope.permissionIds),
    policyVersion: normalizedText(envelope.policyVersion),
    roleIds: normalizedStringSet(envelope.roleIds),
    scope: normalizeCountryScope(envelope.scope)
  });
}

export function createSemanticIdempotencyProjection({ request, policy, targetId }) {
  if (!Number.isSafeInteger(policy.idempotencyVersion)
    || policy.idempotencyVersion < 1) {
    throw new TypeError("SEMANTIC_CONTRACT_VERSION_INVALID");
  }
  return deepFreeze({
    contract: AUTHORIZATION_IDEMPOTENCY_CONTRACT,
    operationContractVersion: policy.idempotencyVersion,
    operation: normalizedText(request.operation),
    family: normalizedText(policy.family),
    action: normalizedText(policy.action),
    actorId: normalizedText(request.authenticatedActorId),
    command: normalizeAuthorizationCommandForPersistence(request, policy, targetId),
    reason: normalizedText(request.reason),
    resource: normalizeSemanticResource(request.resource),
    authorityContext: normalizeAuthorityContext(request.envelope)
  });
}
