import {
  AUTHORITY_CLASSES,
  LIMITS,
  isStableIdentifier
} from "./v13-authority-contracts.js";
import {
  rejectClientAuthorityFields,
  validateAuthorizationEnvelope
} from "./v13-authorization-envelope.js";
import {
  canDelegateAuthority,
  validatePartnerMembershipCommand
} from "./v13-delegation-policy.js";
import {
  AUTHORIZATION_IDEMPOTENCY_CONTRACT,
  createSemanticIdempotencyProjection,
  normalizeAuthorizationCommandForPersistence
} from "./v13-semantic-idempotency.js";

export { AUTHORIZATION_IDEMPOTENCY_CONTRACT };

const POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_CANONICAL_DEPTH = 12;
const MAX_CANONICAL_ENTRIES = 256;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

const TRANSACTION_DENIAL_CODES = new Set([
  "IDEMPOTENCY_CONFLICT",
  "OWNER_ROOT_IMMUTABLE",
  "PEER_PARTNER_MUTATION_DENIED",
  "SELF_ELEVATION_DENIED",
  "UNKNOWN_ROLE",
  "UNKNOWN_PERMISSION",
  "INVALID_PERMISSION_LIST",
  "PERMISSION_DENIED",
  "UNOWNED_PERMISSION_DENIED",
  "DELEGATION_AUTHORITY_EXCEEDED",
  "INVALID_SCOPE",
  "SCOPE_ESCALATION_DENIED"
]);

const OPERATION_POLICY = Object.freeze({
  createAssignment: Object.freeze({
    permission: "authorization.assignment.manage",
    kind: "governance",
    family: "assignment",
    action: "create",
    idempotencyVersion: 1,
    resultAuthorityClass: "DELEGATED",
    resultState: "active"
  }),
  suspendAssignment: Object.freeze({
    permission: "authorization.assignment.manage",
    kind: "governance",
    family: "assignment",
    action: "suspend",
    idempotencyVersion: 1,
    resultAuthorityClass: "DELEGATED",
    resultState: "suspended"
  }),
  revokeAssignment: Object.freeze({
    permission: "authorization.assignment.manage",
    kind: "governance",
    family: "assignment",
    action: "revoke",
    idempotencyVersion: 1,
    resultAuthorityClass: "DELEGATED",
    resultState: "revoked"
  }),
  createPartnerMembership: Object.freeze({
    permission: "authorization.partner.manage",
    kind: "governance",
    family: "partner",
    action: "create",
    idempotencyVersion: 1,
    resultAuthorityClass: "PARTNER_GLOBAL_ADMIN",
    resultState: "active"
  }),
  suspendPartnerMembership: Object.freeze({
    permission: "authorization.partner.manage",
    kind: "governance",
    family: "partner",
    action: "suspend",
    idempotencyVersion: 1,
    resultAuthorityClass: "PARTNER_GLOBAL_ADMIN",
    resultState: "suspended"
  }),
  revokePartnerMembership: Object.freeze({
    permission: "authorization.partner.manage",
    kind: "governance",
    family: "partner",
    action: "revoke",
    idempotencyVersion: 1,
    resultAuthorityClass: "PARTNER_GLOBAL_ADMIN",
    resultState: "revoked"
  })
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function boundedText(value, max) {
  return typeof value === "string"
    && value.trim().length > 0
    && value.trim().length <= max;
}

function boundedActorId(value) {
  return boundedText(value, LIMITS.IDENTIFIER);
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

function normalizeCanonicalValue(value, state, depth = 0) {
  if (depth > MAX_CANONICAL_DEPTH) throw new TypeError("CANONICAL_DEPTH_EXCEEDED");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > 4_096) throw new TypeError("CANONICAL_STRING_TOO_LONG");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("CANONICAL_NUMBER_INVALID");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_CANONICAL_ENTRIES) throw new TypeError("CANONICAL_ARRAY_TOO_LARGE");
    if (state.seen.has(value)) throw new TypeError("CANONICAL_CYCLE");
    state.seen.add(value);
    const normalized = value.map((entry) => normalizeCanonicalValue(entry, state, depth + 1));
    state.seen.delete(value);
    return normalized;
  }
  if (!isPlainObject(value)) throw new TypeError("CANONICAL_OBJECT_INVALID");
  if (state.seen.has(value)) throw new TypeError("CANONICAL_CYCLE");
  const keys = Object.keys(value).sort();
  if (keys.length > MAX_CANONICAL_ENTRIES) throw new TypeError("CANONICAL_OBJECT_TOO_LARGE");
  state.entryCount += keys.length;
  if (state.entryCount > MAX_CANONICAL_ENTRIES) {
    throw new TypeError("CANONICAL_ENTRY_LIMIT_EXCEEDED");
  }
  state.seen.add(value);
  const normalized = {};
  for (const key of keys) {
    if (POLLUTION_KEYS.has(key)) throw new TypeError("CANONICAL_POLLUTION_KEY");
    normalized[key] = normalizeCanonicalValue(value[key], state, depth + 1);
  }
  state.seen.delete(value);
  return normalized;
}

function canonicalJson(value) {
  return JSON.stringify(normalizeCanonicalValue(value, {
    seen: new Set(),
    entryCount: 0
  }));
}

async function hashCanonicalValue(value, digestSha256) {
  const digest = await digestSha256(canonicalJson(value));
  if (typeof digest !== "string" || !SHA256_HEX_PATTERN.test(digest)) {
    throw new TypeError("SHA256_DIGEST_INVALID");
  }
  return digest;
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

function partnerPolicyDecision(request, actor, policy) {
  const command = request.command;
  if (policy.action !== "create") {
    if (actor.authorityClass !== "OWNER_ROOT"
      || !actor.permissionIds?.includes("authorization.partner.manage")) {
      return Object.freeze({ ok: false, code: "PEER_PARTNER_MUTATION_DENIED" });
    }
    if (!boundedText(command.membershipId, LIMITS.IDENTIFIER)) {
      return Object.freeze({ ok: false, code: "INVALID_ASSIGNMENT" });
    }
    if (!boundedText(command.legalDecisionReference, LIMITS.LEGAL_REFERENCE)) {
      return Object.freeze({ ok: false, code: "LEGAL_DECISION_REFERENCE_REQUIRED" });
    }
    return Object.freeze({ ok: true, code: "OK" });
  }
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

function mutationTargetId(request, policy) {
  if (policy.action === "create") return null;
  const value = policy.family === "assignment"
    ? request.command.assignmentId
    : request.command.membershipId;
  return boundedText(value, LIMITS.IDENTIFIER) ? value.trim() : null;
}

function validTransactionPort(tx, requiresTrustedTarget) {
  return tx
    && typeof tx === "object"
    && typeof tx.findIdempotencyReceipt === "function"
    && (!requiresTrustedTarget || typeof tx.loadAuthorizationTarget === "function")
    && typeof tx.persistAuthorizationCommand === "function"
    && typeof tx.appendAuthorizationAudit === "function"
    && typeof tx.storeIdempotencyReceipt === "function";
}

function normalizeTrustedTarget(value, policy, targetId) {
  if (!isPlainObject(value) || containsPollutionKey(value)) {
    throw new TypeError("TRUSTED_TARGET_INVALID");
  }
  const normalized = normalizeCanonicalValue(value, {
    seen: new Set(),
    entryCount: 0
  });
  if (!boundedText(normalized.id, LIMITS.IDENTIFIER)
    || normalized.id !== targetId
    || !boundedActorId(normalized.subjectId)
    || !AUTHORITY_CLASSES.includes(normalized.authorityClass)
    || !boundedText(normalized.roleId, LIMITS.IDENTIFIER)
    || !Array.isArray(normalized.permissionIds)
    || normalized.permissionIds.length > LIMITS.PERMISSION_LIST
    || normalized.permissionIds.some((permission) => !boundedText(permission, LIMITS.IDENTIFIER))
    || new Set(normalized.permissionIds).size !== normalized.permissionIds.length
    || !isPlainObject(normalized.scope)
    || !boundedText(normalized.state, LIMITS.IDENTIFIER)) {
    throw new TypeError("TRUSTED_TARGET_INVALID");
  }
  if (policy.family === "assignment" && normalized.authorityClass === "PARTNER_GLOBAL_ADMIN") {
    return deepFreeze(normalized);
  }
  if (policy.family === "partner" && normalized.authorityClass !== "PARTNER_GLOBAL_ADMIN") {
    throw new TypeError("TRUSTED_TARGET_CLASS_INVALID");
  }
  return deepFreeze(normalized);
}

function trustedTargetPolicyDecision(actor, policy, trustedTarget) {
  if (trustedTarget.authorityClass === "OWNER_ROOT" || trustedTarget.roleId === "owner") {
    return Object.freeze({ allowed: false, code: "OWNER_ROOT_IMMUTABLE" });
  }
  if (policy.family === "assignment") {
    if (trustedTarget.authorityClass === "PARTNER_GLOBAL_ADMIN" || trustedTarget.roleId === "partner") {
      return Object.freeze({ allowed: false, code: "PEER_PARTNER_MUTATION_DENIED" });
    }
    return canDelegateAuthority({
      actor,
      target: {
        actorId: trustedTarget.subjectId,
        authorityClass: trustedTarget.authorityClass,
        roleId: trustedTarget.roleId
      },
      requestedPermissionIds: [],
      requestedScope: trustedTarget.scope
    });
  }
  return Object.freeze({
    allowed: trustedTarget.authorityClass === "PARTNER_GLOBAL_ADMIN",
    code: trustedTarget.authorityClass === "PARTNER_GLOBAL_ADMIN"
      ? "AUTHORIZED"
      : "PEER_PARTNER_MUTATION_DENIED"
  });
}

function stableDataFromPersistence(persisted, policy) {
  if (!persisted
    || typeof persisted !== "object"
    || !boundedText(persisted.id, LIMITS.IDENTIFIER)
    || persisted.state !== policy.resultState
    || persisted.authorityClass !== policy.resultAuthorityClass
    || !AUTHORITY_CLASSES.includes(persisted.authorityClass)) {
    throw new TypeError("PERSISTENCE_RESULT_INVALID");
  }
  return Object.freeze({
    id: persisted.id,
    state: persisted.state,
    authorityClass: persisted.authorityClass
  });
}

function stableSuccess({ data, correlationKey, idempotencyKey, auditHash }) {
  if (!data
    || !boundedText(auditHash, 128)
    || auditHash.length < 32
    || !isStableIdentifier(correlationKey, "corr_")
    || !isStableIdentifier(idempotencyKey, "idem_")) {
    throw new TypeError("SUCCESS_RESULT_INVALID");
  }
  return deepFreeze({
    ok: true,
    code: "AUTHORIZATION_COMMAND_COMMITTED",
    data: {
      id: data.id,
      state: data.state,
      authorityClass: data.authorityClass
    },
    receipt: {
      confirmed: true,
      persisted: true,
      correlationKey,
      idempotencyKey,
      auditHash
    }
  });
}

function projectStoredSuccess(value) {
  if (!value
    || value.ok !== true
    || value.code !== "AUTHORIZATION_COMMAND_COMMITTED"
    || value.receipt?.confirmed !== true
    || value.receipt?.persisted !== true
    || !boundedText(value.data?.id, LIMITS.IDENTIFIER)
    || !boundedText(value.data?.state, LIMITS.IDENTIFIER)
    || !AUTHORITY_CLASSES.includes(value.data?.authorityClass)) {
    throw new TypeError("STORED_RECEIPT_INVALID");
  }
  return stableSuccess({
    data: value.data,
    correlationKey: value.receipt.correlationKey,
    idempotencyKey: value.receipt.idempotencyKey,
    auditHash: value.receipt.auditHash
  });
}

export function createAuthorizationServerCommandHandler({
  loadTrustedState,
  runTransaction,
  clock,
  digestSha256
} = {}) {
  const configured = typeof loadTrustedState === "function"
    && typeof runTransaction === "function"
    && typeof clock === "function"
    && typeof digestSha256 === "function";

  async function execute(request) {
    if (!configured) return fail("CONFIGURATION_REQUIRED");
    if (!boundedActorId(request?.authenticatedActorId)) return fail("IDENTITY_REQUIRED");
    if (request?.envelope?.actorId !== request.authenticatedActorId) {
      return fail("IDENTITY_DENIED");
    }
    if (!isPlainObject(request?.command) || containsPollutionKey(request.command)) {
      return fail("CLIENT_AUTHORITY_FIELDS_DENIED");
    }
    if (!isPlainObject(request?.resource) || containsPollutionKey(request.resource)) {
      return fail("CLIENT_AUTHORITY_FIELDS_DENIED");
    }

    const policy = OPERATION_POLICY[request.operation];
    if (!policy) return fail("INVALID_ASSIGNMENT");
    if (policy.action === "create") {
      const clientFieldDecision = rejectClientAuthorityFields(request.command);
      if (!clientFieldDecision.ok) return fail(clientFieldDecision.code);
    }
    if (!isStableIdentifier(request.correlationKey, "corr_")) {
      return fail("INVALID_CORRELATION_KEY");
    }
    if (!isStableIdentifier(request.idempotencyKey, "idem_")) {
      return fail("INVALID_IDEMPOTENCY_KEY");
    }
    if (!boundedText(request.reason, LIMITS.REASON)) return fail("REASON_REQUIRED");

    const targetId = mutationTargetId(request, policy);
    if (policy.action !== "create" && !targetId) return fail("INVALID_ASSIGNMENT");

    const now = clock();
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
      now
    });
    if (!envelopeDecision.allowed) return fail(envelopeDecision.code);

    const actor = actorFromValidatedEnvelope(request.envelope, trustedState);
    const policyDecision = policy.family === "partner"
      ? partnerPolicyDecision(request, actor, policy)
      : assignmentPolicyDecision(request, actor, policy);
    const allowed = policy.family === "partner" ? policyDecision.ok : policyDecision.allowed;
    if (!allowed) return fail(policyDecision.code);

    let requestHash;
    try {
      requestHash = await hashCanonicalValue(
        createSemanticIdempotencyProjection({ request, policy, targetId }),
        digestSha256
      );
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }

    let transactionResult;
    try {
      transactionResult = await runTransaction(async (tx) => {
        const requiresTrustedTarget = policy.action !== "create";
        if (!validTransactionPort(tx, requiresTrustedTarget)) {
          throw new TypeError("TRANSACTION_PORT_INVALID");
        }
        const prior = await tx.findIdempotencyReceipt(request.idempotencyKey);
        if (prior !== null && prior !== undefined) {
          if (!prior || typeof prior !== "object" || prior.requestHash !== requestHash) {
            return fail("IDEMPOTENCY_CONFLICT");
          }
          return projectStoredSuccess(prior.result);
        }

        let trustedTarget = null;
        if (requiresTrustedTarget) {
          const rawTarget = await tx.loadAuthorizationTarget({
            operation: request.operation,
            family: policy.family,
            targetId
          });
          trustedTarget = normalizeTrustedTarget(rawTarget, policy, targetId);
          const targetDecision = trustedTargetPolicyDecision(actor, policy, trustedTarget);
          if (!targetDecision.allowed) return fail(targetDecision.code);
        }

        const persistenceInput = {
          operation: request.operation,
          command: normalizeAuthorizationCommandForPersistence(request, policy, targetId),
          actorId: request.authenticatedActorId,
          now
        };
        if (trustedTarget) persistenceInput.trustedTarget = trustedTarget;

        const persisted = await tx.persistAuthorizationCommand(deepFreeze(persistenceInput));
        const data = stableDataFromPersistence(persisted, policy);
        const audit = await tx.appendAuthorizationAudit({
          operation: request.operation,
          actorId: request.authenticatedActorId,
          targetId: data.id,
          reason: request.reason.trim(),
          correlationKey: request.correlationKey,
          idempotencyKey: request.idempotencyKey,
          data,
          now
        });
        if (!audit || typeof audit !== "object") {
          throw new TypeError("AUDIT_RESULT_INVALID");
        }
        const result = stableSuccess({
          data,
          correlationKey: request.correlationKey,
          idempotencyKey: request.idempotencyKey,
          auditHash: audit.auditHash
        });
        const stored = await tx.storeIdempotencyReceipt({
          idempotencyKey: request.idempotencyKey,
          requestHash,
          result
        });
        if (!stored || stored.stored !== true) {
          throw new TypeError("IDEMPOTENCY_RECEIPT_NOT_STORED");
        }
        return result;
      });
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }

    if (!transactionResult
      || transactionResult.committed !== true
      || !transactionResult.value) {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
    if (transactionResult.value.ok === false
      && TRANSACTION_DENIAL_CODES.has(transactionResult.value.code)) {
      return fail(transactionResult.value.code);
    }
    try {
      return projectStoredSuccess(transactionResult.value);
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
  }

  return Object.freeze({ execute });
}
