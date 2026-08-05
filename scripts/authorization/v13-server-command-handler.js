import { LIMITS } from "./v13-authority-contracts.js";
import {
  rejectClientAuthorityFields,
  validateAuthorizationEnvelope
} from "./v13-authorization-envelope.js";
import {
  canDelegateAuthority,
  validatePartnerMembershipCommand
} from "./v13-delegation-policy.js";

const POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const OPERATION_POLICY = Object.freeze({
  createAssignment: Object.freeze({
    permission: "authorization.assignment.manage",
    kind: "governance",
    family: "assignment",
    action: "create"
  }),
  suspendAssignment: Object.freeze({
    permission: "authorization.assignment.manage",
    kind: "governance",
    family: "assignment",
    action: "suspend"
  }),
  revokeAssignment: Object.freeze({
    permission: "authorization.assignment.manage",
    kind: "governance",
    family: "assignment",
    action: "revoke"
  }),
  createPartnerMembership: Object.freeze({
    permission: "authorization.partner.manage",
    kind: "governance",
    family: "partner",
    action: "create"
  }),
  suspendPartnerMembership: Object.freeze({
    permission: "authorization.partner.manage",
    kind: "governance",
    family: "partner",
    action: "suspend"
  }),
  revokePartnerMembership: Object.freeze({
    permission: "authorization.partner.manage",
    kind: "governance",
    family: "partner",
    action: "revoke"
  })
});

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function boundedActorId(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= LIMITS.IDENTIFIER;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function containsPollutionKey(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return true;
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (POLLUTION_KEYS.has(key) || containsPollutionKey(value[key], seen)) return true;
  }
  seen.delete(value);
  return false;
}

function actorFromValidatedEnvelope(envelope, trustedState) {
  return Object.freeze({
    id: envelope.actorId,
    accountState: trustedState.accountState,
    authorityClass: envelope.authorityClass,
    roleIds: Object.freeze([...envelope.roleIds]),
    permissionIds: Object.freeze([...envelope.permissionIds]),
    effectiveAssignmentIds: Object.freeze([...envelope.effectiveAssignmentIds]),
    scope: envelope.scope
  });
}

function assignmentPolicyDecision(request, actor, policy) {
  if (policy.action !== "create") return Object.freeze({ allowed: true, code: "AUTHORIZED" });
  const command = request.command;
  return canDelegateAuthority({
    actor,
    target: {
      actorId: command.subjectId,
      authorityClass: "DELEGATED",
      roleId: command.roleId
    },
    requestedPermissionIds: command.requestedPermissionIds,
    requestedScope: command.scope
  });
}

function partnerPolicyDecision(request, actor) {
  const command = request.command;
  return validatePartnerMembershipCommand({
    subjectId: command.subjectId,
    reason: request.reason,
    legalDecisionReference: command.legalDecisionReference
  }, {
    actor,
    online: true,
    trustedEnforcement: true,
    correlationKey: request.correlationKey,
    idempotencyKey: request.idempotencyKey
  });
}

export function createAuthorizationServerCommandHandler({
  loadTrustedState,
  runTransaction,
  clock
} = {}) {
  const configured = typeof loadTrustedState === "function"
    && typeof runTransaction === "function"
    && typeof clock === "function";

  async function execute(request) {
    if (!configured) return fail("CONFIGURATION_REQUIRED");
    if (!boundedActorId(request?.authenticatedActorId)) return fail("IDENTITY_REQUIRED");
    if (request?.envelope?.actorId !== request.authenticatedActorId) {
      return fail("IDENTITY_DENIED");
    }
    if (!isPlainObject(request?.command) || containsPollutionKey(request.command)) {
      return fail("CLIENT_AUTHORITY_FIELDS_DENIED");
    }
    const clientFieldDecision = rejectClientAuthorityFields(request.command);
    if (!clientFieldDecision.ok) return fail(clientFieldDecision.code);

    const policy = OPERATION_POLICY[request.operation];
    if (!policy) return fail("INVALID_ASSIGNMENT");

    let trustedState;
    try {
      trustedState = await loadTrustedState(request.authenticatedActorId);
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }

    const envelopeDecision = validateAuthorizationEnvelope({
      envelope: request.envelope,
      trustedState,
      resource: request.resource,
      operation: {
        permission: policy.permission,
        kind: policy.kind
      },
      now: clock()
    });
    if (!envelopeDecision.allowed) return fail(envelopeDecision.code);

    const actor = actorFromValidatedEnvelope(request.envelope, trustedState);
    const policyDecision = policy.family === "partner"
      ? partnerPolicyDecision(request, actor)
      : assignmentPolicyDecision(request, actor, policy);
    const allowed = policy.family === "partner" ? policyDecision.ok : policyDecision.allowed;
    if (!allowed) return fail(policyDecision.code);

    return fail("REMOTE_ENFORCEMENT_FAILED");
  }

  return Object.freeze({ execute });
}
