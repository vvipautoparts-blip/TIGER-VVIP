import {
  AUTHORITY_CLASSES,
  LIMITS,
  isStableIdentifier
} from "./v13-authority-contracts.js";

const MAX_COMMAND_DEPTH = 8;
const MAX_COMMAND_ENTRIES = 50;
const MAX_COMMAND_ARRAY = 50;
const MAX_COMMAND_STRING = 2_000;
const MAX_TRUSTED_DEPTH = 12;
const MAX_TRUSTED_ENTRIES = 256;
const MAX_TRUSTED_ARRAY = 256;
const MAX_TRUSTED_STRING = 4_096;
const MAX_RESULT_BYTES = 128 * 1024;
const POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ENVELOPE_REF_PATTERN = /^authz_env_ref_[A-Za-z0-9_-]{8,96}$/;

const REQUEST_KEYS = Object.freeze([
  "operation",
  "command",
  "envelopeRef",
  "correlationKey",
  "idempotencyKey",
  "reason"
]);

const OPERATION_CONTRACTS = Object.freeze({
  createAssignment: Object.freeze({
    family: "assignment",
    action: "create",
    allowedFields: Object.freeze([
      "subjectId",
      "roleId",
      "requestedPermissionIds",
      "scope",
      "startsAt",
      "expiresAt"
    ])
  }),
  suspendAssignment: Object.freeze({
    family: "assignment",
    action: "suspend",
    allowedFields: Object.freeze(["assignmentId"])
  }),
  revokeAssignment: Object.freeze({
    family: "assignment",
    action: "revoke",
    allowedFields: Object.freeze(["assignmentId"])
  }),
  createPartnerMembership: Object.freeze({
    family: "partner",
    action: "create",
    allowedFields: Object.freeze(["subjectId", "legalDecisionReference"])
  }),
  suspendPartnerMembership: Object.freeze({
    family: "partner",
    action: "suspend",
    allowedFields: Object.freeze(["membershipId", "legalDecisionReference"])
  }),
  revokePartnerMembership: Object.freeze({
    family: "partner",
    action: "revoke",
    allowedFields: Object.freeze(["membershipId", "legalDecisionReference"])
  })
});

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function boundedText(value, max = LIMITS.IDENTIFIER) {
  return typeof value === "string"
    && value.trim().length > 0
    && value.trim().length <= max;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function cloneBounded(value, limits, state, depth = 0) {
  if (depth > limits.depth) throw new TypeError("STRUCTURE_DEPTH_EXCEEDED");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > limits.string) throw new TypeError("STRING_TOO_LONG");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("NUMBER_INVALID");
    return value;
  }
  if (typeof value === "undefined") throw new TypeError("VALUE_UNDEFINED");
  if (typeof value === "function"
    || typeof value === "symbol"
    || typeof value === "bigint") {
    throw new TypeError("VALUE_TYPE_INVALID");
  }
  if (Array.isArray(value)) {
    if (value.length > limits.array) throw new TypeError("ARRAY_TOO_LARGE");
    if (state.seen.has(value)) throw new TypeError("STRUCTURE_CYCLE");
    state.seen.add(value);
    const result = value.map((entry) => cloneBounded(entry, limits, state, depth + 1));
    state.seen.delete(value);
    return Object.freeze(result);
  }
  if (!isPlainObject(value)) throw new TypeError("OBJECT_INVALID");
  if (state.seen.has(value)) throw new TypeError("STRUCTURE_CYCLE");
  const keys = Object.keys(value);
  if (keys.length > limits.entries) throw new TypeError("OBJECT_TOO_LARGE");
  state.count += keys.length;
  if (state.count > limits.entries) throw new TypeError("ENTRY_LIMIT_EXCEEDED");
  state.seen.add(value);
  const result = {};
  for (const key of keys) {
    if (POLLUTION_KEYS.has(key)) throw new TypeError("POLLUTION_KEY");
    result[key] = cloneBounded(value[key], limits, state, depth + 1);
  }
  state.seen.delete(value);
  return Object.freeze(result);
}

function cloneCommand(value) {
  return cloneBounded(value, {
    depth: MAX_COMMAND_DEPTH,
    entries: MAX_COMMAND_ENTRIES,
    array: MAX_COMMAND_ARRAY,
    string: MAX_COMMAND_STRING
  }, { seen: new Set(), count: 0 });
}

function cloneTrusted(value) {
  return cloneBounded(value, {
    depth: MAX_TRUSTED_DEPTH,
    entries: MAX_TRUSTED_ENTRIES,
    array: MAX_TRUSTED_ARRAY,
    string: MAX_TRUSTED_STRING
  }, { seen: new Set(), count: 0 });
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function exactAllowedFields(value, allowedFields) {
  const allowed = new Set(allowedFields);
  return Object.keys(value).every((key) => allowed.has(key));
}

function requiredText(value, max = LIMITS.IDENTIFIER) {
  if (!boundedText(value, max)) throw new TypeError("TEXT_INVALID");
  return value.trim();
}

function sanitizeCreateAssignment(command, contract) {
  if (!exactAllowedFields(command, contract.allowedFields)) {
    throw new TypeError("UNKNOWN_COMMAND_FIELD");
  }
  if (!Array.isArray(command.requestedPermissionIds)
    || command.requestedPermissionIds.length === 0
    || command.requestedPermissionIds.length > LIMITS.PERMISSION_LIST) {
    throw new TypeError("PERMISSION_LIST_INVALID");
  }
  return deepFreeze({
    subjectId: requiredText(command.subjectId),
    roleId: requiredText(command.roleId),
    requestedPermissionIds: Object.freeze(command.requestedPermissionIds.map((value) => requiredText(value))),
    scope: cloneCommand(command.scope),
    startsAt: requiredText(command.startsAt, 64),
    expiresAt: requiredText(command.expiresAt, 64)
  });
}

function sanitizeCreatePartner(command, contract) {
  if (!exactAllowedFields(command, contract.allowedFields)) {
    throw new TypeError("UNKNOWN_COMMAND_FIELD");
  }
  return Object.freeze({
    subjectId: requiredText(command.subjectId),
    legalDecisionReference: requiredText(command.legalDecisionReference, LIMITS.LEGAL_REFERENCE)
  });
}

function sanitizeOperationCommand(command, contract) {
  cloneCommand(command);
  if (contract.action === "create" && contract.family === "assignment") {
    return sanitizeCreateAssignment(command, contract);
  }
  if (contract.action === "create") return sanitizeCreatePartner(command, contract);
  if (contract.family === "assignment") {
    return Object.freeze({ assignmentId: requiredText(command.assignmentId) });
  }
  return Object.freeze({
    membershipId: requiredText(command.membershipId),
    legalDecisionReference: requiredText(command.legalDecisionReference, LIMITS.LEGAL_REFERENCE)
  });
}

function validateSession(value) {
  return isPlainObject(value)
    && boundedText(value.actorId)
    && value.accountState === "active"
    && boundedText(value.sessionIssuedAt, 64)
    && Number.isFinite(Date.parse(value.sessionIssuedAt));
}

function validateTrustedContext(value, actorId) {
  if (!isPlainObject(value)
    || !isPlainObject(value.envelope)
    || !isPlainObject(value.resource)
    || value.envelope.actorId !== actorId) {
    throw new TypeError("AUTHORIZATION_CONTEXT_INVALID");
  }
  return Object.freeze({
    envelope: cloneTrusted(value.envelope),
    resource: cloneTrusted(value.resource)
  });
}

function rawResultSize(value) {
  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string") throw new TypeError("RESULT_INVALID");
  return Buffer.byteLength(encoded, "utf8");
}

function projectResult(value, request) {
  if (rawResultSize(value) > MAX_RESULT_BYTES) return fail("RESPONSE_TOO_LARGE");
  if (!isPlainObject(value) || value.ok !== true) {
    if (isPlainObject(value) && value.ok === false && boundedText(value.code, 128)) {
      return fail(value.code.trim());
    }
    return fail("REMOTE_CONFIRMATION_REQUIRED");
  }
  if (value.code !== "AUTHORIZATION_COMMAND_COMMITTED"
    || !isPlainObject(value.data)
    || !isPlainObject(value.receipt)
    || !boundedText(value.data.id)
    || !boundedText(value.data.state)
    || !AUTHORITY_CLASSES.includes(value.data.authorityClass)
    || value.receipt.confirmed !== true
    || value.receipt.persisted !== true
    || value.receipt.correlationKey !== request.correlationKey
    || value.receipt.idempotencyKey !== request.idempotencyKey
    || !boundedText(value.receipt.auditHash, 128)
    || value.receipt.auditHash.length < 32) {
    return fail("REMOTE_CONFIRMATION_REQUIRED");
  }
  return deepFreeze({
    ok: true,
    code: "AUTHORIZATION_COMMAND_COMMITTED",
    data: {
      id: value.data.id.trim(),
      state: value.data.state.trim(),
      authorityClass: value.data.authorityClass
    },
    receipt: {
      confirmed: true,
      persisted: true,
      correlationKey: request.correlationKey,
      idempotencyKey: request.idempotencyKey,
      auditHash: value.receipt.auditHash.trim()
    }
  });
}

export function createAuthorizationCommandBoundary({
  runtime,
  sessionResolver,
  authorizationContextResolver,
  commandHandler
} = {}) {
  const serverRuntime = runtime === "server";
  const configured = typeof sessionResolver === "function"
    && typeof authorizationContextResolver === "function"
    && commandHandler
    && typeof commandHandler.execute === "function";

  async function execute(request, trustedContext) {
    if (!serverRuntime) return fail("SERVER_RUNTIME_REQUIRED");
    if (!configured) return fail("CONFIGURATION_REQUIRED");
    if (!hasExactKeys(request, REQUEST_KEYS)) return fail("INVALID_COMMAND");

    const contract = OPERATION_CONTRACTS[request.operation];
    if (!contract) return fail("UNKNOWN_AUTHORIZATION_OPERATION");
    if (!ENVELOPE_REF_PATTERN.test(request.envelopeRef || "")) return fail("INVALID_COMMAND");
    if (!isStableIdentifier(request.correlationKey, "corr_")) {
      return fail("INVALID_CORRELATION_KEY");
    }
    if (!isStableIdentifier(request.idempotencyKey, "idem_")) {
      return fail("INVALID_IDEMPOTENCY_KEY");
    }
    if (!boundedText(request.reason, LIMITS.REASON)) return fail("REASON_REQUIRED");
    if (!isPlainObject(request.command)) return fail("INVALID_COMMAND");

    let command;
    try {
      command = sanitizeOperationCommand(request.command, contract);
    } catch {
      return fail("INVALID_COMMAND");
    }

    let session;
    try {
      session = await sessionResolver(trustedContext);
    } catch {
      return fail("IDENTITY_DENIED");
    }
    if (!validateSession(session)) return fail("IDENTITY_DENIED");

    let resolved;
    try {
      const resolverInput = Object.freeze({
        envelopeRef: request.envelopeRef,
        operation: request.operation,
        actorId: session.actorId.trim(),
        command,
        trustedContext
      });
      resolved = validateTrustedContext(
        await authorizationContextResolver(resolverInput),
        session.actorId.trim()
      );
    } catch {
      return fail("AUTHORIZATION_CONTEXT_INVALID");
    }

    const handlerRequest = deepFreeze({
      operation: request.operation,
      command,
      envelope: resolved.envelope,
      authenticatedActorId: session.actorId.trim(),
      correlationKey: request.correlationKey,
      idempotencyKey: request.idempotencyKey,
      reason: request.reason.trim(),
      resource: resolved.resource
    });

    try {
      return projectResult(await commandHandler.execute(handlerRequest), request);
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
  }

  return Object.freeze({ execute });
}
