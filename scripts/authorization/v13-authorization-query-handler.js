import {
  AUTHORITY_CLASSES,
  LIMITS
} from "./v13-authority-contracts.js";
import { validateAuthorizationEnvelope } from "./v13-authorization-envelope.js";
import {
  countryScopeContains,
  normalizeCountryScope
} from "./v13-country-scope.js";
import {
  AUTHORIZATION_ASSIGNMENT_STATES,
  AUTHORIZATION_QUERY_CONTRACT,
  AUTHORIZATION_QUERY_CURSOR_CONTRACT,
  AUTHORIZATION_QUERY_LIMITS,
  AUTHORIZATION_QUERY_OPERATIONS
} from "./v13-authorization-query-contracts.js";

const POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const ACTION_PATTERN = /^[a-z][a-z0-9_.:-]{2,127}$/;
const COMMON_QUERY_KEYS = new Set(["limit", "cursor", "scope"]);
const ASSIGNMENT_QUERY_KEYS = new Set([
  ...COMMON_QUERY_KEYS,
  "states",
  "authorityClasses"
]);
const AUDIT_QUERY_KEYS = new Set([
  ...COMMON_QUERY_KEYS,
  "actions",
  "from",
  "to"
]);

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
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

function cloneBounded(value, state, depth = 0) {
  const limits = AUTHORIZATION_QUERY_LIMITS;
  if (depth > limits.MAX_STRUCTURE_DEPTH) throw new TypeError("STRUCTURE_DEPTH_EXCEEDED");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > limits.MAX_STRING_LENGTH) throw new TypeError("STRING_TOO_LONG");
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
    if (value.length > limits.MAX_ARRAY_ITEMS) throw new TypeError("ARRAY_TOO_LARGE");
    if (state.seen.has(value)) throw new TypeError("STRUCTURE_CYCLE");
    state.seen.add(value);
    const cloned = value.map((entry) => cloneBounded(entry, state, depth + 1));
    state.seen.delete(value);
    return Object.freeze(cloned);
  }
  if (!isPlainObject(value)) throw new TypeError("OBJECT_INVALID");
  if (state.seen.has(value)) throw new TypeError("STRUCTURE_CYCLE");
  const keys = Object.keys(value);
  state.entries += keys.length;
  if (keys.length > limits.MAX_STRUCTURE_ENTRIES
    || state.entries > limits.MAX_STRUCTURE_ENTRIES) {
    throw new TypeError("STRUCTURE_TOO_LARGE");
  }
  state.seen.add(value);
  const cloned = {};
  for (const key of keys) {
    if (POLLUTION_KEYS.has(key)) throw new TypeError("POLLUTION_KEY");
    cloned[key] = cloneBounded(value[key], state, depth + 1);
  }
  state.seen.delete(value);
  return Object.freeze(cloned);
}

function frozenClone(value) {
  return cloneBounded(value, { seen: new Set(), entries: 0 });
}

function exactKeys(value, allowed) {
  return isPlainObject(value)
    && Object.keys(value).every((key) => allowed.has(key));
}

function normalizeStringSet(values, allowed, maxLength = 50) {
  if (values === undefined) return undefined;
  if (!Array.isArray(values) || values.length === 0 || values.length > maxLength) {
    throw new TypeError("SET_INVALID");
  }
  const normalized = values.map((value) => {
    if (!boundedText(value)) throw new TypeError("SET_INVALID");
    const item = value.trim();
    if (allowed && !allowed.includes(item)) throw new TypeError("SET_INVALID");
    return item;
  });
  return Object.freeze([...new Set(normalized)].sort());
}

function normalizeActionSet(values) {
  if (values === undefined) return undefined;
  if (!Array.isArray(values)
    || values.length === 0
    || values.length > AUTHORIZATION_QUERY_LIMITS.MAX_ACTION_FILTERS) {
    throw new TypeError("ACTION_SET_INVALID");
  }
  const normalized = values.map((value) => {
    if (typeof value !== "string" || !ACTION_PATTERN.test(value.trim())) {
      throw new TypeError("ACTION_SET_INVALID");
    }
    return value.trim();
  });
  return Object.freeze([...new Set(normalized)].sort());
}

function normalizeTimeWindow(query) {
  if (query.from === undefined && query.to === undefined) return {};
  if (typeof query.from !== "string" || typeof query.to !== "string") {
    throw new TypeError("TIME_WINDOW_INVALID");
  }
  const from = Date.parse(query.from);
  const to = Date.parse(query.to);
  if (!Number.isFinite(from)
    || !Number.isFinite(to)
    || from >= to
    || to - from > AUTHORIZATION_QUERY_LIMITS.MAX_AUDIT_WINDOW_MS) {
    throw new TypeError("TIME_WINDOW_INVALID");
  }
  return Object.freeze({
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString()
  });
}

function normalizeQuery(operation, rawQuery) {
  if (!isPlainObject(rawQuery)) throw new TypeError("QUERY_INVALID");
  frozenClone(rawQuery);
  const allowedKeys = operation === "listAssignments"
    ? ASSIGNMENT_QUERY_KEYS
    : AUDIT_QUERY_KEYS;
  if (!exactKeys(rawQuery, allowedKeys)) throw new TypeError("QUERY_INVALID");

  const limit = rawQuery.limit === undefined
    ? AUTHORIZATION_QUERY_LIMITS.DEFAULT_PAGE_SIZE
    : rawQuery.limit;
  if (!Number.isInteger(limit)
    || limit < 1
    || limit > AUTHORIZATION_QUERY_LIMITS.MAX_PAGE_SIZE) {
    throw new TypeError("QUERY_INVALID");
  }
  if (rawQuery.cursor !== undefined
    && rawQuery.cursor !== null
    && (typeof rawQuery.cursor !== "string"
      || rawQuery.cursor.length === 0
      || rawQuery.cursor.length > AUTHORIZATION_QUERY_LIMITS.MAX_CURSOR_LENGTH)) {
    throw new TypeError("QUERY_INVALID");
  }

  const normalized = {
    limit,
    scope: rawQuery.scope === undefined
      ? normalizeCountryScope({ level: "platform" })
      : normalizeCountryScope(rawQuery.scope)
  };

  if (operation === "listAssignments") {
    const states = normalizeStringSet(rawQuery.states, AUTHORIZATION_ASSIGNMENT_STATES);
    const authorityClasses = normalizeStringSet(rawQuery.authorityClasses, AUTHORITY_CLASSES);
    if (states) normalized.states = states;
    if (authorityClasses) normalized.authorityClasses = authorityClasses;
  } else {
    const actions = normalizeActionSet(rawQuery.actions);
    if (actions) normalized.actions = actions;
    Object.assign(normalized, normalizeTimeWindow(rawQuery));
  }

  return Object.freeze({
    query: deepFreeze(normalized),
    cursor: rawQuery.cursor ?? null
  });
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function exactDigest(value, digestSha256) {
  const digest = await digestSha256(canonicalize(value));
  if (typeof digest !== "string" || !SHA256_HEX_PATTERN.test(digest)) {
    throw new TypeError("SHA256_DIGEST_INVALID");
  }
  return digest;
}

function actorFromEnvelope(envelope, state) {
  return deepFreeze({
    id: envelope.actorId,
    accountState: state.accountState,
    authorityClass: envelope.authorityClass,
    roleIds: Object.freeze([...envelope.roleIds].sort()),
    permissionIds: Object.freeze([...envelope.permissionIds].sort()),
    effectiveAssignmentIds: Object.freeze([...envelope.effectiveAssignmentIds].sort()),
    scope: normalizeCountryScope(envelope.scope),
    policyVersion: envelope.policyVersion,
    assignmentRevision: envelope.assignmentRevision,
    countrySealVersion: envelope.countrySealVersion ?? null
  });
}

function semanticProjection(request, operationContract, actor, query) {
  return deepFreeze({
    contract: AUTHORIZATION_QUERY_CONTRACT,
    operationContractVersion: operationContract.version,
    operation: request.operation,
    actorId: actor.id,
    query,
    authorityContext: {
      authorityClass: actor.authorityClass,
      policyVersion: actor.policyVersion,
      assignmentRevision: actor.assignmentRevision,
      countrySealVersion: actor.countrySealVersion,
      roleIds: actor.roleIds,
      permissionIds: actor.permissionIds,
      effectiveAssignmentIds: actor.effectiveAssignmentIds,
      scope: actor.scope
    }
  });
}

function validateCursorPayload(payload, request, contract, queryHash, nowMs) {
  if (!isPlainObject(payload)
    || !isPlainObject(payload.contract)
    || payload.contract.name !== AUTHORIZATION_QUERY_CURSOR_CONTRACT.name
    || payload.contract.version !== AUTHORIZATION_QUERY_CURSOR_CONTRACT.version
    || payload.operationContractVersion !== contract.version
    || payload.operation !== request.operation
    || payload.actorId !== request.authenticatedActorId
    || payload.queryHash !== queryHash) {
    return fail("CURSOR_CONTEXT_MISMATCH");
  }
  if (!boundedText(payload.snapshotRevision)
    || !boundedText(payload.position, 512)
    || !boundedText(payload.issuedAt, 64)
    || !boundedText(payload.expiresAt, 64)) {
    return fail("INVALID_CURSOR");
  }
  const issued = Date.parse(payload.issuedAt);
  const expires = Date.parse(payload.expiresAt);
  if (!Number.isFinite(issued)
    || !Number.isFinite(expires)
    || issued > nowMs
    || issued >= expires
    || expires - issued > AUTHORIZATION_QUERY_LIMITS.CURSOR_TTL_MS) {
    return fail("INVALID_CURSOR");
  }
  if (nowMs >= expires) return fail("CURSOR_EXPIRED");
  return Object.freeze({
    ok: true,
    position: payload.position.trim(),
    snapshotRevision: payload.snapshotRevision.trim()
  });
}

function scopeAllowed(actor, requestedScope, itemScope) {
  return countryScopeContains(actor.scope, requestedScope)
    && countryScopeContains(requestedScope, itemScope)
    && countryScopeContains(actor.scope, itemScope);
}

function requiredTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function nullableTimestamp(value) {
  return value === null || requiredTimestamp(value);
}

function normalizedPermissionList(value) {
  if (!Array.isArray(value)
    || value.length > LIMITS.PERMISSION_LIST
    || value.some((permission) => !boundedText(permission))) {
    throw new TypeError("PERMISSION_LIST_INVALID");
  }
  return Object.freeze([...new Set(value.map((permission) => permission.trim()))].sort());
}

function normalizeAssignmentItem(item, actor, requestedScope) {
  if (!isPlainObject(item)) throw new TypeError("ASSIGNMENT_ITEM_INVALID");
  frozenClone(item);
  if (!boundedText(item.id)
    || !boundedText(item.subjectId)
    || !AUTHORITY_CLASSES.includes(item.authorityClass)
    || !boundedText(item.roleId)
    || !AUTHORIZATION_ASSIGNMENT_STATES.includes(item.state)
    || !requiredTimestamp(item.startsAt)
    || !nullableTimestamp(item.expiresAt)) {
    throw new TypeError("ASSIGNMENT_ITEM_INVALID");
  }
  const scope = normalizeCountryScope(item.scope);
  if (!scopeAllowed(actor, requestedScope, scope)) {
    const error = new TypeError("QUERY_SCOPE_DENIED");
    error.code = "QUERY_SCOPE_DENIED";
    throw error;
  }
  if (actor.authorityClass === "DELEGATED"
    && item.authorityClass !== "DELEGATED") {
    const error = new TypeError("QUERY_SCOPE_DENIED");
    error.code = "QUERY_SCOPE_DENIED";
    throw error;
  }
  const permissionIds = normalizedPermissionList(item.permissionIds);
  const common = {
    id: item.id.trim(),
    subjectId: item.subjectId.trim(),
    roleId: item.roleId.trim(),
    permissionIds,
    scope,
    state: item.state,
    startsAt: new Date(Date.parse(item.startsAt)).toISOString(),
    expiresAt: item.expiresAt === null
      ? null
      : new Date(Date.parse(item.expiresAt)).toISOString()
  };
  if (actor.authorityClass === "DELEGATED") return deepFreeze(common);
  const elevated = {
    id: common.id,
    subjectId: common.subjectId,
    authorityClass: item.authorityClass,
    roleId: common.roleId,
    permissionIds: common.permissionIds,
    scope: common.scope,
    state: common.state,
    startsAt: common.startsAt,
    expiresAt: common.expiresAt,
    grantedBy: boundedText(item.grantedBy) ? item.grantedBy.trim() : null,
    createdAt: requiredTimestamp(item.createdAt)
      ? new Date(Date.parse(item.createdAt)).toISOString()
      : null
  };
  if (actor.authorityClass === "OWNER_ROOT"
    && boundedText(item.legalDecisionReference, LIMITS.LEGAL_REFERENCE)) {
    elevated.legalDecisionReference = item.legalDecisionReference.trim();
  }
  return deepFreeze(elevated);
}

function normalizeAuditItem(item, actor, requestedScope) {
  if (!isPlainObject(item)) throw new TypeError("AUDIT_ITEM_INVALID");
  frozenClone(item);
  if (!Number.isSafeInteger(item.sequenceNo)
    || item.sequenceNo < 1
    || !boundedText(item.eventHash, 128)
    || !(item.previousHash === null || boundedText(item.previousHash, 128))
    || !boundedText(item.action)
    || !boundedText(item.targetType)
    || !boundedText(item.targetId)
    || !requiredTimestamp(item.createdAt)) {
    throw new TypeError("AUDIT_ITEM_INVALID");
  }
  let scope;
  try {
    scope = normalizeCountryScope(item.scope);
  } catch {
    const error = new TypeError("QUERY_SCOPE_DENIED");
    error.code = "QUERY_SCOPE_DENIED";
    throw error;
  }
  if (!scopeAllowed(actor, requestedScope, scope)) {
    const error = new TypeError("QUERY_SCOPE_DENIED");
    error.code = "QUERY_SCOPE_DENIED";
    throw error;
  }
  const common = {
    sequenceNo: item.sequenceNo,
    eventHash: item.eventHash.trim(),
    previousHash: item.previousHash === null ? null : item.previousHash.trim(),
    action: item.action.trim(),
    targetType: item.targetType.trim(),
    targetId: item.targetId.trim(),
    scope,
    createdAt: new Date(Date.parse(item.createdAt)).toISOString()
  };
  if (actor.authorityClass === "DELEGATED") return deepFreeze(common);
  return deepFreeze({
    sequenceNo: common.sequenceNo,
    eventHash: common.eventHash,
    previousHash: common.previousHash,
    actorId: boundedText(item.actorId) ? item.actorId.trim() : null,
    action: common.action,
    targetType: common.targetType,
    targetId: common.targetId,
    reason: boundedText(item.reason, LIMITS.REASON) ? item.reason.trim() : null,
    correlationKey: boundedText(item.correlationKey) ? item.correlationKey.trim() : null,
    scope: common.scope,
    createdAt: common.createdAt
  });
}

function encodedSize(value) {
  const json = JSON.stringify(value);
  if (typeof json !== "string") throw new TypeError("RESULT_INVALID");
  return new TextEncoder().encode(json).length;
}

export function createAuthorizationQueryHandler({
  loadTrustedState,
  readAuthorizationPage,
  clock,
  digestSha256,
  cursorCodec
} = {}) {
  const configured = typeof loadTrustedState === "function"
    && typeof readAuthorizationPage === "function"
    && typeof clock === "function"
    && typeof digestSha256 === "function"
    && cursorCodec
    && typeof cursorCodec.decode === "function"
    && typeof cursorCodec.encode === "function";

  async function execute(request) {
    if (!configured) return fail("CONFIGURATION_REQUIRED");
    const operationContract = AUTHORIZATION_QUERY_OPERATIONS[request?.operation];
    if (!operationContract) return fail("UNKNOWN_AUTHORIZATION_QUERY");

    let normalized;
    try {
      normalized = normalizeQuery(request.operation, request.query);
    } catch {
      return fail("INVALID_QUERY");
    }

    if (!boundedText(request?.authenticatedActorId)
      || request?.envelope?.actorId !== request.authenticatedActorId) {
      return fail("IDENTITY_DENIED");
    }
    if (!boundedText(request?.correlationKey)) return fail("INVALID_CORRELATION_KEY");
    if (!isPlainObject(request?.resource)) return fail("INVALID_QUERY");

    const now = clock();
    const nowMs = Date.parse(now);
    if (!Number.isFinite(nowMs)) return fail("REMOTE_ENFORCEMENT_FAILED");

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
        permission: operationContract.permission,
        kind: operationContract.kind
      },
      now
    });
    if (!envelopeDecision.allowed) return fail(envelopeDecision.code);

    let actor;
    try {
      actor = actorFromEnvelope(request.envelope, trustedState);
      if (!countryScopeContains(actor.scope, normalized.query.scope)) {
        return fail("QUERY_SCOPE_DENIED");
      }
      if (actor.authorityClass === "DELEGATED"
        && normalized.query.authorityClasses
        && normalized.query.authorityClasses.some((value) => value !== "DELEGATED")) {
        return fail("QUERY_SCOPE_DENIED");
      }
    } catch {
      return fail("QUERY_SCOPE_DENIED");
    }

    let queryHash;
    try {
      queryHash = await exactDigest(
        semanticProjection(request, operationContract, actor, normalized.query),
        digestSha256
      );
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }

    let position = null;
    let snapshotRevision = null;
    if (normalized.cursor !== null) {
      let decoded;
      try {
        decoded = await cursorCodec.decode(normalized.cursor);
      } catch {
        return fail("INVALID_CURSOR");
      }
      const cursorDecision = validateCursorPayload(
        decoded,
        request,
        operationContract,
        queryHash,
        nowMs
      );
      if (!cursorDecision.ok) return cursorDecision;
      position = cursorDecision.position;
      snapshotRevision = cursorDecision.snapshotRevision;
    }

    let page;
    try {
      page = await readAuthorizationPage(deepFreeze({
        operation: request.operation,
        actor,
        query: normalized.query,
        position,
        snapshotRevision,
        limit: normalized.query.limit,
        now: new Date(nowMs).toISOString()
      }));
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }

    if (!isPlainObject(page)
      || !Array.isArray(page.items)
      || page.items.length > normalized.query.limit
      || !boundedText(page.snapshotRevision)
      || !(page.nextPosition === null || boundedText(page.nextPosition, 512))
      || (snapshotRevision !== null && page.snapshotRevision !== snapshotRevision)) {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }

    let items;
    try {
      items = Object.freeze(page.items.map((item) => operationContract.family === "assignment"
        ? normalizeAssignmentItem(item, actor, normalized.query.scope)
        : normalizeAuditItem(item, actor, normalized.query.scope)));
    } catch (error) {
      return fail(error?.code === "QUERY_SCOPE_DENIED"
        ? "QUERY_SCOPE_DENIED"
        : "REMOTE_ENFORCEMENT_FAILED");
    }

    let nextCursor = null;
    if (page.nextPosition !== null) {
      const payload = deepFreeze({
        contract: AUTHORIZATION_QUERY_CURSOR_CONTRACT,
        operationContractVersion: operationContract.version,
        operation: request.operation,
        actorId: request.authenticatedActorId,
        queryHash,
        snapshotRevision: page.snapshotRevision.trim(),
        position: page.nextPosition.trim(),
        issuedAt: new Date(nowMs).toISOString(),
        expiresAt: new Date(nowMs + AUTHORIZATION_QUERY_LIMITS.CURSOR_TTL_MS).toISOString()
      });
      try {
        nextCursor = await cursorCodec.encode(payload);
      } catch {
        return fail("REMOTE_ENFORCEMENT_FAILED");
      }
      if (typeof nextCursor !== "string"
        || nextCursor.length === 0
        || nextCursor.length > AUTHORIZATION_QUERY_LIMITS.MAX_CURSOR_LENGTH) {
        return fail("REMOTE_ENFORCEMENT_FAILED");
      }
    }

    const result = deepFreeze({
      ok: true,
      code: "AUTHORIZATION_QUERY_OK",
      items,
      page: {
        nextCursor,
        snapshotRevision: page.snapshotRevision.trim(),
        hasMore: page.nextPosition !== null
      },
      correlationKey: request.correlationKey.trim()
    });
    try {
      return encodedSize(result) <= AUTHORIZATION_QUERY_LIMITS.MAX_RESULT_BYTES
        ? result
        : fail("RESPONSE_TOO_LARGE");
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
  }

  return Object.freeze({ execute });
}
