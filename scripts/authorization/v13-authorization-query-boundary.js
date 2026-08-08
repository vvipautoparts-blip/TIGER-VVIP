import { isStableIdentifier } from "./v13-authority-contracts.js";
import {
  AUTHORIZATION_QUERY_LIMITS,
  AUTHORIZATION_QUERY_OPERATIONS
} from "./v13-authorization-query-contracts.js";

const REQUEST_KEYS = new Set([
  "operation",
  "query",
  "envelopeRef",
  "correlationKey"
]);
const POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const REQUEST_BOUNDS = Object.freeze({
  MAX_DEPTH: 8,
  MAX_ENTRIES: 200,
  MAX_ARRAY_ITEMS: 100,
  MAX_STRING_LENGTH: 4096
});
const RESULT_STRING_LIMIT = AUTHORIZATION_QUERY_LIMITS.MAX_RESULT_BYTES * 2;
const ASSIGNMENT_FIELDS = Object.freeze([
  "id",
  "subjectId",
  "authorityClass",
  "roleId",
  "permissionIds",
  "scope",
  "state",
  "startsAt",
  "expiresAt",
  "grantedBy",
  "createdAt",
  "legalDecisionReference"
]);
const AUDIT_FIELDS = Object.freeze([
  "sequenceNo",
  "eventHash",
  "previousHash",
  "actorId",
  "action",
  "targetType",
  "targetId",
  "reason",
  "correlationKey",
  "scope",
  "createdAt"
]);

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, allowed) {
  return isPlainObject(value)
    && Object.keys(value).every((key) => allowed.has(key));
}

function validText(value, max = 128) {
  return typeof value === "string"
    && value.trim().length > 0
    && value.length <= max;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function cloneBounded(value, state, bounds, depth = 0) {
  if (depth > bounds.MAX_DEPTH) throw new TypeError("DEPTH_EXCEEDED");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > bounds.MAX_STRING_LENGTH) throw new TypeError("STRING_TOO_LONG");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("NUMBER_INVALID");
    return value;
  }
  if (typeof value === "undefined"
    || typeof value === "function"
    || typeof value === "symbol"
    || typeof value === "bigint") {
    throw new TypeError("VALUE_INVALID");
  }
  if (Array.isArray(value)) {
    if (value.length > bounds.MAX_ARRAY_ITEMS) throw new TypeError("ARRAY_TOO_LARGE");
    if (state.seen.has(value)) throw new TypeError("CYCLE");
    state.seen.add(value);
    const cloned = value.map((entry) => cloneBounded(entry, state, bounds, depth + 1));
    state.seen.delete(value);
    return Object.freeze(cloned);
  }
  if (!isPlainObject(value)) throw new TypeError("OBJECT_INVALID");
  if (state.seen.has(value)) throw new TypeError("CYCLE");
  const keys = Object.keys(value);
  state.entries += keys.length;
  if (keys.length > bounds.MAX_ENTRIES || state.entries > bounds.MAX_ENTRIES) {
    throw new TypeError("OBJECT_TOO_LARGE");
  }
  state.seen.add(value);
  const cloned = {};
  for (const key of keys) {
    if (POLLUTION_KEYS.has(key)) throw new TypeError("POLLUTION_KEY");
    cloned[key] = cloneBounded(value[key], state, bounds, depth + 1);
  }
  state.seen.delete(value);
  return Object.freeze(cloned);
}

function frozenRequestClone(value) {
  return cloneBounded(value, { seen: new Set(), entries: 0 }, REQUEST_BOUNDS);
}

function frozenAuthorityClone(value) {
  return cloneBounded(value, { seen: new Set(), entries: 0 }, {
    MAX_DEPTH: 10,
    MAX_ENTRIES: 500,
    MAX_ARRAY_ITEMS: 100,
    MAX_STRING_LENGTH: 4096
  });
}

function copyResultValue(value, state, depth = 0) {
  if (depth > 10) throw new TypeError("RESULT_DEPTH_EXCEEDED");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > RESULT_STRING_LIMIT) throw new TypeError("RESULT_STRING_TOO_LONG");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("RESULT_NUMBER_INVALID");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 100 || state.seen.has(value)) throw new TypeError("RESULT_ARRAY_INVALID");
    state.seen.add(value);
    const copied = value.map((entry) => copyResultValue(entry, state, depth + 1));
    state.seen.delete(value);
    return Object.freeze(copied);
  }
  if (!isPlainObject(value) || state.seen.has(value)) {
    throw new TypeError("RESULT_OBJECT_INVALID");
  }
  const keys = Object.keys(value);
  state.entries += keys.length;
  if (keys.length > 100 || state.entries > 500) throw new TypeError("RESULT_OBJECT_TOO_LARGE");
  state.seen.add(value);
  const copied = {};
  for (const key of keys) {
    if (POLLUTION_KEYS.has(key)) throw new TypeError("RESULT_KEY_INVALID");
    copied[key] = copyResultValue(value[key], state, depth + 1);
  }
  state.seen.delete(value);
  return Object.freeze(copied);
}

function copyAllowedFields(item, fields) {
  if (!isPlainObject(item)) throw new TypeError("ITEM_INVALID");
  const projected = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(item, field)) {
      projected[field] = copyResultValue(item[field], { seen: new Set(), entries: 0 });
    }
  }
  return deepFreeze(projected);
}

function validIsoTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function projectAssignment(item) {
  if (!isPlainObject(item)
    || !validText(item.id)
    || !validText(item.subjectId, RESULT_STRING_LIMIT)
    || !validText(item.roleId)
    || !Array.isArray(item.permissionIds)
    || item.permissionIds.length > 50
    || !isPlainObject(item.scope)
    || !validText(item.state, 64)
    || !validIsoTimestamp(item.startsAt)
    || !(item.expiresAt === null || validIsoTimestamp(item.expiresAt))) {
    throw new TypeError("ASSIGNMENT_INVALID");
  }
  return copyAllowedFields(item, ASSIGNMENT_FIELDS);
}

function projectAudit(item) {
  if (!isPlainObject(item)
    || !Number.isSafeInteger(item.sequenceNo)
    || item.sequenceNo < 1
    || !validText(item.eventHash)
    || !(item.previousHash === null || validText(item.previousHash))
    || !validText(item.action)
    || !validText(item.targetType)
    || !validText(item.targetId)
    || !isPlainObject(item.scope)
    || !validIsoTimestamp(item.createdAt)) {
    throw new TypeError("AUDIT_INVALID");
  }
  return copyAllowedFields(item, AUDIT_FIELDS);
}

function encodedSize(value) {
  const json = JSON.stringify(value);
  if (typeof json !== "string") throw new TypeError("RESULT_INVALID");
  return new TextEncoder().encode(json).length;
}

function projectSuccess(result, request) {
  if (!isPlainObject(result)
    || result.ok !== true
    || result.code !== "AUTHORIZATION_QUERY_OK"
    || !Array.isArray(result.items)
    || result.items.length > AUTHORIZATION_QUERY_LIMITS.MAX_PAGE_SIZE
    || !isPlainObject(result.page)
    || !(result.page.nextCursor === null
      || (validText(result.page.nextCursor, AUTHORIZATION_QUERY_LIMITS.MAX_CURSOR_LENGTH)))
    || !validText(result.page.snapshotRevision)
    || typeof result.page.hasMore !== "boolean"
    || result.correlationKey !== request.correlationKey
    || (result.page.hasMore && result.page.nextCursor === null)
    || (!result.page.hasMore && result.page.nextCursor !== null)) {
    return fail("REMOTE_ENFORCEMENT_FAILED");
  }

  let items;
  try {
    items = Object.freeze(result.items.map((item) => request.operation === "listAssignments"
      ? projectAssignment(item)
      : projectAudit(item)));
  } catch {
    return fail("REMOTE_ENFORCEMENT_FAILED");
  }

  const projected = deepFreeze({
    ok: true,
    code: "AUTHORIZATION_QUERY_OK",
    items,
    page: {
      nextCursor: result.page.nextCursor,
      snapshotRevision: result.page.snapshotRevision.trim(),
      hasMore: result.page.hasMore
    },
    correlationKey: request.correlationKey
  });

  try {
    return encodedSize(projected) <= AUTHORIZATION_QUERY_LIMITS.MAX_RESULT_BYTES
      ? projected
      : fail("RESPONSE_TOO_LARGE");
  } catch {
    return fail("REMOTE_ENFORCEMENT_FAILED");
  }
}

export function createAuthorizationQueryBoundary({
  runtime,
  sessionResolver,
  authorizationContextResolver,
  queryHandler
} = {}) {
  const configured = typeof sessionResolver === "function"
    && typeof authorizationContextResolver === "function"
    && queryHandler
    && typeof queryHandler.execute === "function";

  async function execute(request, trustedContext) {
    if (runtime !== "server") return fail("SERVER_RUNTIME_REQUIRED");
    if (!configured) return fail("CONFIGURATION_REQUIRED");
    if (!AUTHORIZATION_QUERY_OPERATIONS[request?.operation]) {
      return fail("UNKNOWN_AUTHORIZATION_QUERY");
    }
    if (!hasExactKeys(request, REQUEST_KEYS)) return fail("INVALID_QUERY");
    if (!isStableIdentifier(request.envelopeRef, "authz_env_ref_")) {
      return fail("INVALID_QUERY");
    }
    if (!isStableIdentifier(request.correlationKey, "corr_")) {
      return fail("INVALID_CORRELATION_KEY");
    }

    let query;
    try {
      query = frozenRequestClone(request.query);
      if (!isPlainObject(query)) return fail("INVALID_QUERY");
    } catch {
      return fail("INVALID_QUERY");
    }

    let session;
    try {
      session = await sessionResolver(trustedContext);
    } catch {
      return fail("IDENTITY_DENIED");
    }
    if (!isPlainObject(session)
      || !validText(session.actorId)
      || session.accountState !== "active"
      || !validIsoTimestamp(session.sessionIssuedAt)) {
      return fail("IDENTITY_DENIED");
    }

    let resolved;
    try {
      resolved = await authorizationContextResolver(Object.freeze({
        envelopeRef: request.envelopeRef,
        operation: request.operation,
        actorId: session.actorId,
        query,
        trustedContext
      }));
    } catch {
      return fail("AUTHORIZATION_CONTEXT_INVALID");
    }
    if (!isPlainObject(resolved)
      || !isPlainObject(resolved.envelope)
      || !isPlainObject(resolved.resource)
      || resolved.envelope.actorId !== session.actorId) {
      return fail("AUTHORIZATION_CONTEXT_INVALID");
    }

    let handlerRequest;
    try {
      handlerRequest = deepFreeze({
        operation: request.operation,
        query,
        envelope: frozenAuthorityClone(resolved.envelope),
        authenticatedActorId: session.actorId,
        correlationKey: request.correlationKey,
        resource: frozenAuthorityClone(resolved.resource)
      });
    } catch {
      return fail("AUTHORIZATION_CONTEXT_INVALID");
    }

    let result;
    try {
      result = await queryHandler.execute(handlerRequest);
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
    if (!isPlainObject(result)
      || typeof result.ok !== "boolean"
      || !validText(result.code)) {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
    if (!result.ok) return fail(result.code);
    return projectSuccess(result, request);
  }

  return Object.freeze({ execute });
}
