import { LIMITS, PERMISSION_IDS, isStableIdentifier } from "./v13-authority-contracts.js";
import { countryScopeContains, normalizeCountryScope } from "./v13-country-scope.js";
import { canDelegateAuthority, validatePartnerMembershipCommand } from "./v13-delegation-policy.js";

const PARTNER_PERMISSIONS = Object.freeze(PERMISSION_IDS.filter(
  (permission) => permission !== "authorization.partner.manage"
));
const WRITE_OPERATIONS = new Set([
  "createAssignment",
  "suspendAssignment",
  "revokeAssignment",
  "createPartnerMembership",
  "suspendPartnerMembership",
  "revokePartnerMembership"
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function frozenClone(value) {
  return deepFreeze(structuredClone(value));
}

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function digest(value) {
  const input = new TextEncoder().encode(canonicalize(value));
  if (globalThis.crypto?.subtle) {
    const bytes = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", input));
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 2166136261;
  for (const byte of input) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function validReason(value) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= LIMITS.REASON;
}

function validateWriteContext(context) {
  if (!context || typeof context !== "object") return "IDENTITY_DENIED";
  if (!Number.isFinite(Date.parse(context.now))) return "INVALID_TIMESTAMP";
  if (!validReason(context.reason)) return "REASON_REQUIRED";
  if (!isStableIdentifier(context.correlationKey, "corr_")) return "INVALID_CORRELATION_KEY";
  if (!isStableIdentifier(context.idempotencyKey, "idem_")) return "INVALID_IDEMPOTENCY_KEY";
  return null;
}

function normalizeWindow(command) {
  const startsAt = Date.parse(command?.startsAt);
  const expiresAt = Date.parse(command?.expiresAt);
  if (!Number.isFinite(startsAt) || !Number.isFinite(expiresAt) || startsAt >= expiresAt) {
    return null;
  }
  return Object.freeze({
    startsAt: new Date(startsAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString()
  });
}

function canRead(actor, permission) {
  return actor
    && actor.accountState === "active"
    && (actor.authorityClass === "OWNER_ROOT"
      || actor.authorityClass === "PARTNER_GLOBAL_ADMIN"
      || actor.permissionIds?.includes(permission));
}

function page(items, query = {}) {
  const limit = query.limit === undefined ? 50 : query.limit;
  const offset = query.cursor === undefined || query.cursor === null ? 0 : Number(query.cursor);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger(offset) || offset < 0) {
    return fail("INVALID_ASSIGNMENT");
  }
  const selected = items.slice(offset, offset + limit).map((item) => frozenClone(item));
  return deepFreeze({
    ok: true,
    code: "OK",
    items: selected,
    nextCursor: offset + selected.length < items.length ? String(offset + selected.length) : null
  });
}

export function createVolatileAuthorizationRepository({ clock = () => new Date().toISOString() } = {}) {
  const assignments = [];
  const audits = [];
  const receipts = new Map();
  let assignmentSequence = 0;
  let partnerSequence = 0;
  let auditSequence = 0;

  async function appendAudit(record, action, context) {
    const event = {
      id: `authorization-audit-${++auditSequence}`,
      sequence: auditSequence,
      previousHash: audits.at(-1)?.hash ?? null,
      actorId: context.actor.id,
      action,
      target: { type: "authority_assignment", id: record.id },
      scope: record.scope,
      reason: context.reason.trim(),
      at: new Date(Date.parse(context.now || clock())).toISOString(),
      correlationKey: context.correlationKey,
      idempotencyKey: context.idempotencyKey
    };
    const hash = await digest(event);
    const audit = deepFreeze({ ...event, hash });
    audits.push(audit);
    return audit;
  }

  async function runIdempotent(operation, command, context, execute) {
    const invalid = validateWriteContext(context);
    if (invalid) return fail(invalid);
    const key = context.idempotencyKey;
    const canonicalCommand = canonicalize({ operation, command });
    const prior = receipts.get(key);
    if (prior) {
      return prior.canonicalCommand === canonicalCommand
        ? prior.result
        : fail("IDEMPOTENCY_CONFLICT");
    }
    try {
      const result = await execute();
      if (result.ok) receipts.set(key, { canonicalCommand, result });
      return result;
    } catch {
      return fail("INVALID_ASSIGNMENT");
    }
  }

  async function createAssignment(command, context) {
    return runIdempotent("createAssignment", command, context, async () => {
      const delegation = canDelegateAuthority({
        actor: context.actor,
        target: {
          actorId: command?.subjectId,
          authorityClass: command?.authorityClass,
          roleId: command?.roleId
        },
        requestedPermissionIds: command?.permissionIds,
        requestedScope: command?.scope
      });
      if (!delegation.allowed) return fail(delegation.code);
      const window = normalizeWindow(command);
      if (!window) return fail("INVALID_ASSIGNMENT_WINDOW");
      const record = deepFreeze({
        id: `assignment-${++assignmentSequence}`,
        subjectId: command.subjectId,
        authorityClass: "DELEGATED",
        roleId: command.roleId,
        permissionIds: [...command.permissionIds].sort(),
        scope: normalizeCountryScope(command.scope),
        state: "active",
        startsAt: window.startsAt,
        expiresAt: window.expiresAt,
        grantedBy: context.actor.id
      });
      assignments.push(record);
      const audit = await appendAudit(record, "assignment.create", context);
      return deepFreeze({
        ok: true,
        code: "ASSIGNMENT_CREATED",
        data: frozenClone(record),
        receipt: {
          correlationKey: context.correlationKey,
          idempotencyKey: context.idempotencyKey,
          persistence: "volatile",
          auditHash: audit.hash
        }
      });
    });
  }

  async function mutateAssignment(command, context, state) {
    return runIdempotent(`${state}Assignment`, command, context, async () => {
      const index = assignments.findIndex((item) => item.id === command?.assignmentId);
      if (index < 0) return fail("ASSIGNMENT_NOT_FOUND");
      const current = assignments[index];
      if (current.authorityClass === "PARTNER_GLOBAL_ADMIN") {
        return fail("PEER_PARTNER_MUTATION_DENIED");
      }
      if (current.authorityClass === "OWNER_ROOT") return fail("OWNER_ROOT_IMMUTABLE");
      const delegation = canDelegateAuthority({
        actor: context.actor,
        target: {
          actorId: current.subjectId,
          authorityClass: current.authorityClass,
          roleId: current.roleId
        },
        requestedPermissionIds: current.permissionIds,
        requestedScope: current.scope
      });
      if (!delegation.allowed) return fail(delegation.code);
      if (current.state === "revoked") return fail("ASSIGNMENT_TERMINAL");
      const changed = deepFreeze({ ...current, state });
      assignments[index] = changed;
      const audit = await appendAudit(changed, `assignment.${state}`, context);
      return deepFreeze({
        ok: true,
        code: `ASSIGNMENT_${state.toUpperCase()}`,
        data: frozenClone(changed),
        receipt: {
          correlationKey: context.correlationKey,
          idempotencyKey: context.idempotencyKey,
          persistence: "volatile",
          auditHash: audit.hash
        }
      });
    });
  }

  async function createPartnerMembership(command, context) {
    return runIdempotent("createPartnerMembership", command, context, async () => {
      const validation = validatePartnerMembershipCommand(command, context);
      if (!validation.ok) return fail(validation.code);
      if (assignments.some((item) => item.authorityClass === "PARTNER_GLOBAL_ADMIN"
        && item.subjectId === command.subjectId && item.state === "active")) {
        return fail("INVALID_ASSIGNMENT");
      }
      const record = deepFreeze({
        id: `partner-membership-${++partnerSequence}`,
        subjectId: command.subjectId,
        authorityClass: "PARTNER_GLOBAL_ADMIN",
        roleId: "partner",
        permissionIds: [...PARTNER_PERMISSIONS],
        scope: normalizeCountryScope({ level: "platform" }),
        state: "active",
        startsAt: new Date(Date.parse(context.now)).toISOString(),
        expiresAt: null,
        grantedBy: context.actor.id,
        legalDecisionReference: command.legalDecisionReference.trim()
      });
      assignments.push(record);
      const audit = await appendAudit(record, "partner_membership.create", context);
      return deepFreeze({
        ok: true,
        code: "PARTNER_MEMBERSHIP_CREATED",
        data: frozenClone(record),
        receipt: {
          correlationKey: context.correlationKey,
          idempotencyKey: context.idempotencyKey,
          persistence: "volatile",
          auditHash: audit.hash
        }
      });
    });
  }

  async function mutatePartnerMembership(command, context, state) {
    return runIdempotent(`${state}PartnerMembership`, command, context, async () => {
      const index = assignments.findIndex((item) => item.id === command?.membershipId
        && item.authorityClass === "PARTNER_GLOBAL_ADMIN");
      if (index < 0) return fail("ASSIGNMENT_NOT_FOUND");
      const current = assignments[index];
      const validation = validatePartnerMembershipCommand({
        subjectId: current.subjectId,
        reason: command.reason,
        legalDecisionReference: command.legalDecisionReference
      }, context);
      if (!validation.ok) return fail(validation.code);
      if (current.state === "revoked") return fail("ASSIGNMENT_TERMINAL");
      const changed = deepFreeze({ ...current, state });
      assignments[index] = changed;
      const audit = await appendAudit(changed, `partner_membership.${state}`, context);
      return deepFreeze({
        ok: true,
        code: `PARTNER_MEMBERSHIP_${state.toUpperCase()}`,
        data: frozenClone(changed),
        receipt: {
          correlationKey: context.correlationKey,
          idempotencyKey: context.idempotencyKey,
          persistence: "volatile",
          auditHash: audit.hash
        }
      });
    });
  }

  function listAssignments(query = {}, context = {}) {
    if (!canRead(context.actor, "authorization.assignment.read")) return fail("PERMISSION_DENIED");
    let visible = assignments;
    if (!["OWNER_ROOT", "PARTNER_GLOBAL_ADMIN"].includes(context.actor.authorityClass)) {
      visible = assignments.filter((item) => countryScopeContains(context.actor.scope, item.scope));
    }
    return page(visible, query);
  }

  function listAuditEvents(query = {}, context = {}) {
    if (!canRead(context.actor, "authorization.audit.read")) return fail("PERMISSION_DENIED");
    return page(audits, query);
  }

  return Object.freeze({
    createAssignment,
    suspendAssignment: (command, context) => mutateAssignment(command, context, "suspended"),
    revokeAssignment: (command, context) => mutateAssignment(command, context, "revoked"),
    createPartnerMembership,
    suspendPartnerMembership: (command, context) => mutatePartnerMembership(command, context, "suspended"),
    revokePartnerMembership: (command, context) => mutatePartnerMembership(command, context, "revoked"),
    listAssignments,
    listAuditEvents
  });
}

function validRemoteResult(result) {
  return result
    && typeof result === "object"
    && typeof result.ok === "boolean"
    && typeof result.code === "string";
}

export function createRemoteAuthorizationRepository({
  transport,
  verified = false,
  online = () => true,
  envelopeVerifier
} = {}) {
  async function invoke(operation, command, context) {
    if (verified !== true || typeof transport !== "function" || typeof envelopeVerifier !== "function") {
      return fail("CONFIGURATION_REQUIRED");
    }
    if (typeof online !== "function" || !online()) return fail("OFFLINE_PRIVILEGED_DENIED");

    let envelopeDecision;
    try {
      envelopeDecision = envelopeVerifier(context?.envelope, command, operation);
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
    if (!envelopeDecision?.allowed) return fail(envelopeDecision?.code || "REMOTE_ENFORCEMENT_FAILED");

    let remoteResult;
    try {
      const request = frozenClone({ operation, command, context });
      remoteResult = await transport(request);
    } catch {
      return fail("REMOTE_ENFORCEMENT_FAILED");
    }
    if (!validRemoteResult(remoteResult)) return fail("REMOTE_ENFORCEMENT_FAILED");
    if (!remoteResult.ok) return frozenClone(remoteResult);
    if (WRITE_OPERATIONS.has(operation) && remoteResult.receipt?.confirmed !== true) {
      return fail("REMOTE_CONFIRMATION_REQUIRED");
    }
    return frozenClone(remoteResult);
  }

  return Object.freeze({
    createAssignment: (command, context) => invoke("createAssignment", command, context),
    suspendAssignment: (command, context) => invoke("suspendAssignment", command, context),
    revokeAssignment: (command, context) => invoke("revokeAssignment", command, context),
    createPartnerMembership: (command, context) => invoke("createPartnerMembership", command, context),
    suspendPartnerMembership: (command, context) => invoke("suspendPartnerMembership", command, context),
    revokePartnerMembership: (command, context) => invoke("revokePartnerMembership", command, context),
    listAssignments: (query, context) => invoke("listAssignments", query, context),
    listAuditEvents: (query, context) => invoke("listAuditEvents", query, context)
  });
}
