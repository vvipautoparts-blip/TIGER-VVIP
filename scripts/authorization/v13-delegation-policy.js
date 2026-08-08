import {
  AUTHORITY_CLASSES,
  LIMITS,
  PERMISSION_IDS,
  ROLE_IDS,
  ROLE_RANK,
  isStableIdentifier
} from "./v13-authority-contracts.js";
import { countryScopeContains, normalizeCountryScope } from "./v13-country-scope.js";
import { validateAuthorizationEnvelope } from "./v13-authorization-envelope.js";

function decision(allowed, code, actor = null) {
  return Object.freeze({
    allowed,
    code,
    effectiveAssignmentIds: Object.freeze(
      allowed && Array.isArray(actor?.effectiveAssignmentIds)
        ? [...actor.effectiveAssignmentIds].sort()
        : []
    ),
    authorityClass: allowed ? actor.authorityClass : "NONE"
  });
}

function result(ok, code, value = null) {
  return Object.freeze(value === null ? { ok, code } : { ok, code, value: Object.freeze(value) });
}

function validIdentity(actor) {
  return actor
    && typeof actor === "object"
    && typeof actor.id === "string"
    && actor.id.length > 0
    && actor.accountState === "active"
    && AUTHORITY_CLASSES.includes(actor.authorityClass);
}

function actorRank(actor) {
  if (actor.authorityClass === "OWNER_ROOT") return ROLE_RANK.owner;
  if (actor.authorityClass === "PARTNER_GLOBAL_ADMIN") return ROLE_RANK.partner;
  if (!Array.isArray(actor.roleIds) || actor.roleIds.length === 0) return -1;
  return Math.max(...actor.roleIds.map((roleId) => ROLE_RANK[roleId] ?? -1));
}

function validPermissionRequest(values) {
  return Array.isArray(values)
    && values.length <= LIMITS.PERMISSION_LIST
    && new Set(values).size === values.length
    && values.every((value) => PERMISSION_IDS.includes(value));
}

export function authorizeProtectedOperation(input) {
  return validateAuthorizationEnvelope(input);
}

export function canDelegateAuthority({
  actor,
  target,
  requestedPermissionIds,
  requestedScope
} = {}) {
  if (!validIdentity(actor)) return decision(false, "IDENTITY_DENIED");

  if (target?.authorityClass === "OWNER_ROOT" || target?.roleId === "owner") {
    return decision(false, "OWNER_ROOT_IMMUTABLE");
  }
  if (target?.authorityClass === "PARTNER_GLOBAL_ADMIN" || target?.roleId === "partner") {
    return decision(false, "PEER_PARTNER_MUTATION_DENIED");
  }
  if (target?.actorId === actor.id) return decision(false, "SELF_ELEVATION_DENIED");

  if (!target
    || target.authorityClass !== "DELEGATED"
    || !ROLE_IDS.includes(target.roleId)
    || ["owner", "partner"].includes(target.roleId)) {
    return decision(false, "UNKNOWN_ROLE");
  }
  if (!validPermissionRequest(requestedPermissionIds)) {
    const unknown = Array.isArray(requestedPermissionIds)
      && requestedPermissionIds.some((permission) => !PERMISSION_IDS.includes(permission));
    return decision(false, unknown ? "UNKNOWN_PERMISSION" : "INVALID_PERMISSION_LIST");
  }

  if (!actor.permissionIds?.includes("authorization.permission.delegate")) {
    return decision(false, "PERMISSION_DENIED");
  }

  let actorScope;
  let normalizedRequestedScope;
  try {
    actorScope = normalizeCountryScope(actor.scope);
    normalizedRequestedScope = normalizeCountryScope(requestedScope);
  } catch {
    return decision(false, "INVALID_SCOPE");
  }

  const owned = new Set(Array.isArray(actor.permissionIds) ? actor.permissionIds : []);
  if (requestedPermissionIds.some((permission) => !owned.has(permission))) {
    return decision(false, "UNOWNED_PERMISSION_DENIED");
  }

  const ceiling = actorRank(actor);
  const requestedRank = ROLE_RANK[target.roleId] ?? Number.POSITIVE_INFINITY;
  if (requestedRank >= ceiling) {
    return decision(false, "DELEGATION_AUTHORITY_EXCEEDED");
  }

  if (!countryScopeContains(actorScope, normalizedRequestedScope)) {
    return decision(false, "SCOPE_ESCALATION_DENIED");
  }

  return decision(true, "AUTHORIZED", actor);
}

function boundedText(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

export function validatePartnerMembershipCommand(command, context) {
  const actor = context?.actor;
  if (!validIdentity(actor)) return result(false, "IDENTITY_DENIED");
  if (actor.authorityClass !== "OWNER_ROOT" || !actor.permissionIds?.includes("authorization.partner.manage")) {
    return result(false, "PEER_PARTNER_MUTATION_DENIED");
  }
  if (!command || typeof command !== "object" || typeof command.subjectId !== "string"
    || command.subjectId.length < 1 || command.subjectId.length > LIMITS.IDENTIFIER
    || command.subjectId === actor.id) {
    return result(false, "INVALID_ASSIGNMENT");
  }
  if (!boundedText(command.reason, LIMITS.REASON)) return result(false, "REASON_REQUIRED");
  if (!boundedText(command.legalDecisionReference, LIMITS.LEGAL_REFERENCE)) {
    return result(false, "LEGAL_DECISION_REFERENCE_REQUIRED");
  }
  if (!context.online || context.trustedEnforcement !== true) {
    return result(false, "TRUSTED_ENFORCEMENT_REQUIRED");
  }
  if (!isStableIdentifier(context.correlationKey, "corr_")) {
    return result(false, "INVALID_CORRELATION_KEY");
  }
  if (!isStableIdentifier(context.idempotencyKey, "idem_")) {
    return result(false, "INVALID_IDEMPOTENCY_KEY");
  }

  return result(true, "OK", {
    subjectId: command.subjectId,
    reason: command.reason.trim(),
    legalDecisionReference: command.legalDecisionReference.trim(),
    actorId: actor.id,
    correlationKey: context.correlationKey,
    idempotencyKey: context.idempotencyKey
  });
}
