const AUTHORITY_FIELD_NAMES = Object.freeze(new Set([
  "authorityClass",
  "roleIds",
  "permissionIds",
  "assignmentRevision",
  "policyVersion",
  "countrySealVersion",
  "legalEntityCountry",
  "dataResidencyRegion",
  "billingCountry",
  "taxCountry"
]));

const PROTOTYPE_KEYS = Object.freeze(new Set([
  "__proto__",
  "prototype",
  "constructor"
]));

export const AUTHORIZATION_OPERATION_RPCS = Object.freeze({
  createAssignment: "vvip_authorization_create_assignment",
  suspendAssignment: "vvip_authorization_suspend_assignment",
  revokeAssignment: "vvip_authorization_revoke_assignment",
  createPartnerMembership: "vvip_authorization_create_partner_membership",
  suspendPartnerMembership: "vvip_authorization_suspend_partner_membership",
  revokePartnerMembership: "vvip_authorization_revoke_partner_membership",
  listAssignments: "vvip_authorization_list_assignments",
  listAuditEvents: "vvip_authorization_list_audit_events"
});

const WRITE_OPERATIONS = Object.freeze(new Set([
  "createAssignment",
  "suspendAssignment",
  "revokeAssignment",
  "createPartnerMembership",
  "suspendPartnerMembership",
  "revokePartnerMembership"
]));

const REQUEST_KEYS = Object.freeze(new Set([
  "operation",
  "command",
  "envelopeRef",
  "correlationKey",
  "idempotencyKey",
  "reason"
]));

const LIMITS = Object.freeze({
  DEPTH: 8,
  KEYS: 50,
  ARRAY: 50,
  STRING: 2000,
  RESULT_BYTES: 128 * 1024,
  REASON: 500
});

const STABLE_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitize(value, depth = 0, seen = new WeakSet()) {
  if (depth > LIMITS.DEPTH) throw new Error("INVALID_COMMAND");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > LIMITS.STRING) throw new Error("INVALID_COMMAND");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("INVALID_COMMAND");
    return value;
  }
  if (typeof value !== "object") throw new Error("INVALID_COMMAND");
  if (seen.has(value)) throw new Error("INVALID_COMMAND");
  seen.add(value);

  if (Array.isArray(value)) {
    if (value.length > LIMITS.ARRAY) throw new Error("INVALID_COMMAND");
    return Object.freeze(value.map((entry) => sanitize(entry, depth + 1, seen)));
  }

  if (!isPlainObject(value)) throw new Error("INVALID_COMMAND");
  const keys = Object.keys(value);
  if (keys.length > LIMITS.KEYS) throw new Error("INVALID_COMMAND");
  const output = Object.create(null);
  for (const key of keys.sort()) {
    if (PROTOTYPE_KEYS.has(key)) throw new Error("INVALID_COMMAND");
    if (AUTHORITY_FIELD_NAMES.has(key)) throw new Error("CLIENT_AUTHORITY_FIELDS_DENIED");
    output[key] = sanitize(value[key], depth + 1, seen);
  }
  return Object.freeze(output);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function cloneFrozen(value) {
  return deepFreeze(structuredClone(value));
}

function validStableKey(value, prefix) {
  return typeof value === "string"
    && value.startsWith(prefix)
    && STABLE_KEY.test(value);
}

function resultSize(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function validateRequest(request) {
  if (!isPlainObject(request)) return fail("INVALID_COMMAND");
  if (Object.keys(request).some((key) => !REQUEST_KEYS.has(key))) return fail("INVALID_COMMAND");
  if (!Object.hasOwn(AUTHORIZATION_OPERATION_RPCS, request.operation)) {
    return fail("UNKNOWN_AUTHORIZATION_OPERATION");
  }
  if (!validStableKey(request.envelopeRef, "authz_env_ref_")) return fail("INVALID_COMMAND");
  if (!validStableKey(request.correlationKey, "corr_")) return fail("INVALID_CORRELATION_KEY");

  const write = WRITE_OPERATIONS.has(request.operation);
  if (write && !validStableKey(request.idempotencyKey, "idem_")) {
    return fail("INVALID_IDEMPOTENCY_KEY");
  }
  if (write && (typeof request.reason !== "string"
    || request.reason.trim().length < 1
    || request.reason.trim().length > LIMITS.REASON)) {
    return fail("REASON_REQUIRED");
  }

  try {
    const command = sanitize(request.command ?? Object.freeze({}));
    return Object.freeze({
      ok: true,
      code: "OK",
      value: Object.freeze({
        operation: request.operation,
        command,
        envelopeRef: request.envelopeRef,
        correlationKey: request.correlationKey,
        idempotencyKey: write ? request.idempotencyKey : null,
        reason: write ? request.reason.trim() : null,
        write
      })
    });
  } catch (error) {
    return fail(error?.message === "CLIENT_AUTHORITY_FIELDS_DENIED"
      ? "CLIENT_AUTHORITY_FIELDS_DENIED"
      : "INVALID_COMMAND");
  }
}

function validSession(session) {
  return isPlainObject(session)
    && typeof session.actorId === "string"
    && session.actorId.length >= 1
    && session.actorId.length <= 128
    && session.accountState === "active"
    && Number.isFinite(Date.parse(session.sessionIssuedAt))
    && Number.isSafeInteger(session.assignmentRevision)
    && session.assignmentRevision >= 0;
}

function validResponse(response) {
  return isPlainObject(response)
    && typeof response.ok === "boolean"
    && typeof response.code === "string"
    && response.code.length >= 1
    && response.code.length <= 128;
}

export function createAuthorizationServerBoundary({
  runtime,
  sessionResolver,
  envelopeVerifier,
  transport,
  clock = () => new Date().toISOString()
} = {}) {
  async function execute(request, trustedContext) {
    if (runtime !== "server") return fail("SERVER_RUNTIME_REQUIRED");
    if (typeof sessionResolver !== "function"
      || typeof envelopeVerifier !== "function"
      || typeof transport !== "function"
      || typeof clock !== "function") {
      return fail("CONFIGURATION_REQUIRED");
    }

    const validated = validateRequest(request);
    if (!validated.ok) return validated;

    let session;
    try {
      session = await sessionResolver(trustedContext);
    } catch {
      return fail("IDENTITY_DENIED");
    }
    if (!validSession(session)) return fail("IDENTITY_DENIED");

    let envelopeDecision;
    try {
      envelopeDecision = await envelopeVerifier(Object.freeze({
        envelopeRef: validated.value.envelopeRef,
        session: cloneFrozen(session),
        operation: validated.value.operation,
        command: validated.value.command,
        now: clock()
      }));
    } catch {
      return fail("AUTHORIZATION_DENIED");
    }
    if (!envelopeDecision?.allowed) {
      return fail(typeof envelopeDecision?.code === "string"
        ? envelopeDecision.code
        : "AUTHORIZATION_DENIED");
    }

    const payload = deepFreeze({
      rpcName: AUTHORIZATION_OPERATION_RPCS[validated.value.operation],
      operation: validated.value.operation,
      actorId: session.actorId,
      command: validated.value.command,
      correlationKey: validated.value.correlationKey,
      idempotencyKey: validated.value.idempotencyKey,
      reason: validated.value.reason,
      envelopeRef: validated.value.envelopeRef
    });

    let response;
    try {
      response = await transport(payload);
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
    if (!validResponse(response)) return fail("REMOTE_ENFORCEMENT_FAILED");
    if (resultSize(response) > LIMITS.RESULT_BYTES) return fail("RESPONSE_TOO_LARGE");
    if (!response.ok) return cloneFrozen(response);

    if (validated.value.write) {
      const receipt = response.receipt;
      if (!isPlainObject(receipt)
        || receipt.confirmed !== true
        || receipt.persistence !== "remote"
        || receipt.correlationKey !== validated.value.correlationKey
        || receipt.idempotencyKey !== validated.value.idempotencyKey) {
        return fail("REMOTE_CONFIRMATION_REQUIRED");
      }
    }

    return cloneFrozen(response);
  }

  return Object.freeze({ execute });
}
