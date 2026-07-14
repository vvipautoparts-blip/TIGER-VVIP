import { validateCorrelationKey, validateIdempotencyKey, validatePageRequest, ROLE_IDS, PERMISSION_IDS } from './pr35-contracts.js';
import { normalizeText } from './pr35-sanitize.js';
import { normalizeScope, scopeContains } from './pr35-scope.js';
import { authorize, canDelegate } from './pr35-policy.js';
import { createAuditEvent } from './pr35-audit.js';

const clone = (value) => structuredClone(value);
const fail = (code) => Object.freeze({ ok: false, code });
const AUTHORIZATION_READS = new Set(['listAssignments', 'listAuditEvents']);
function confirmedRemoteResult(result, operation) {
  if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean' || typeof result.code !== 'string') {
    return fail('REMOTE_ENFORCEMENT_FAILED');
  }
  if (!result.ok) return Object.freeze(clone(result));
  if (!AUTHORIZATION_READS.has(operation) && result.receipt?.confirmed !== true) {
    return fail('REMOTE_CONFIRMATION_REQUIRED');
  }
  return Object.freeze(clone(result));
}
function validateContext(context) {
  if (!validateCorrelationKey(context?.correlationKey).ok) return 'INVALID_CORRELATION_KEY';
  if (!validateIdempotencyKey(context?.idempotencyKey).ok) return 'INVALID_IDEMPOTENCY_KEY';
  if (!Number.isFinite(Date.parse(context?.now))) return 'INVALID_TIMESTAMP';
  try { normalizeText(context?.reason, { max: 500, required: true }); } catch (error) { return error.code; }
  return null;
}
function page(items, query) {
  const valid = validatePageRequest(query); if (!valid.ok) return valid;
  const offset = valid.value.cursor === null ? 0 : Number(valid.value.cursor);
  if (!Number.isSafeInteger(offset) || offset < 0) return fail('INVALID_CURSOR');
  const selected = items.slice(offset, offset + valid.value.limit).map(clone);
  return Object.freeze({ ok: true, code: 'OK', items: Object.freeze(selected), nextCursor: offset + selected.length < items.length ? String(offset + selected.length) : null });
}

export function createVolatileAuthorizationRepository() {
  const assignments = []; const audits = []; const receipts = new Map(); let sequence = 0;
  async function appendAudit(assignment, action, context) {
    const entry = await createAuditEvent({ previousHash: audits.at(-1)?.hash ?? null, actorId: context.actor.id,
      action, target: { type: 'assignment', id: assignment.id }, scope: assignment.scope,
      reason: context.reason, at: context.now, correlationKey: context.correlationKey,
      idempotencyKey: context.idempotencyKey, metadata: { roleId: assignment.roleId, subjectId: assignment.subjectId, state: assignment.state } });
    audits.push(entry);
  }
  async function runIdempotent(context, operation) {
    const invalid = validateContext(context); if (invalid) return fail(invalid);
    if (receipts.has(context.idempotencyKey)) return receipts.get(context.idempotencyKey);
    try {
      const result = await operation();
      if (result.ok) receipts.set(context.idempotencyKey, result);
      return result;
    } catch (error) { return fail(error.code || 'INVALID_COMMAND'); }
  }
  async function createAssignment(command, context) {
    return runIdempotent(context, async () => {
      if (!command || !ROLE_IDS.includes(command.roleId) || !Array.isArray(command.permissionIds) || command.permissionIds.some((id) => !PERMISSION_IDS.includes(id))) return fail('INVALID_ASSIGNMENT');
      const delegation = canDelegate({ actor: context.actor, subjectId: command.subjectId,
        permissionIds: command.permissionIds, scope: command.scope, roleId: command.roleId, now: context.now });
      if (!delegation.allowed) return fail(delegation.code);
      const startsAt = new Date(command.startsAt); const expiresAt = new Date(command.expiresAt);
      if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(expiresAt.getTime()) || startsAt >= expiresAt) return fail('INVALID_ASSIGNMENT_WINDOW');
      const record = Object.freeze({ id: `assignment-${++sequence}`, subjectId: normalizeText(command.subjectId, { max: 128, required: true }),
        roleId: command.roleId, permissionIds: Object.freeze([...new Set(command.permissionIds)].sort()), scope: normalizeScope(command.scope),
        state: 'active', startsAt: startsAt.toISOString(), expiresAt: expiresAt.toISOString(), grantedBy: context.actor.id });
      assignments.push(record); await appendAudit(record, 'assignment.create', context);
      return Object.freeze({ ok: true, code: 'ASSIGNMENT_CREATED', data: clone(record), receipt: Object.freeze({ correlationKey: context.correlationKey, idempotencyKey: context.idempotencyKey, persistence: 'volatile' }) });
    });
  }
  async function changeState(command, context, state) {
    return runIdempotent(context, async () => {
      const index = assignments.findIndex((item) => item.id === command?.assignmentId);
      if (index < 0) return fail('ASSIGNMENT_NOT_FOUND');
      const current = assignments[index];
      const permission = current.roleId === 'owner' ? 'authorization.owner.manage' : 'authorization.assignment.manage';
      const auth = authorize({ actor: context.actor, permission, resourceScope: current.scope, now: context.now });
      if (!auth.allowed || current.subjectId === context.actor.id) return fail(current.subjectId === context.actor.id ? 'SELF_ELEVATION_DENIED' : auth.code);
      const delegation = canDelegate({ actor: context.actor, subjectId: current.subjectId,
        permissionIds: current.permissionIds, scope: current.scope, roleId: current.roleId, now: context.now });
      if (!delegation.allowed) return fail(delegation.code);
      if (current.state === 'revoked') return fail('ASSIGNMENT_TERMINAL');
      const changed = Object.freeze({ ...current, state }); assignments[index] = changed;
      await appendAudit(changed, `assignment.${state === 'suspended' ? 'suspend' : 'revoke'}`, context);
      return Object.freeze({ ok: true, code: `ASSIGNMENT_${state.toUpperCase()}`, data: clone(changed), receipt: Object.freeze({ correlationKey: context.correlationKey, idempotencyKey: context.idempotencyKey, persistence: 'volatile' }) });
    });
  }
  function listProtected(items, query, context, permission) {
    const scope = query?.scope || { level: 'platform' };
    const auth = authorize({ actor: context?.actor, permission, resourceScope: scope, now: context?.now });
    if (!auth.allowed) return fail(auth.code);
    return page(items.filter((item) => scopeContains(scope, item.event?.scope || item.scope)), query);
  }
  return Object.freeze({
    createAssignment, suspendAssignment: (command, context) => changeState(command, context, 'suspended'),
    revokeAssignment: (command, context) => changeState(command, context, 'revoked'),
    listAssignments: (query = {}, context) => listProtected(assignments, query, context, 'authorization.assignment.read'),
    listAuditEvents: (query = {}, context) => listProtected(audits, query, context, 'audit.event.read.scoped')
  });
}

export function createRemoteAuthorizationRepository({ transport, verified = false, online = () => true } = {}) {
  const invoke = async (operation, command, context) => {
    if (typeof transport !== 'function' || verified !== true) return fail('CONFIGURATION_REQUIRED');
    const invalid = validateContext(context); if (invalid) return fail(invalid);
    try {
      if (!online()) return fail('OFFLINE_PRIVILEGED_DENIED');
      const result = await transport(Object.freeze({ operation, command: clone(command), context: clone(context) }));
      return confirmedRemoteResult(result, operation);
    }
    catch { return fail('REMOTE_ENFORCEMENT_FAILED'); }
  };
  return Object.freeze({ createAssignment: (c, x) => invoke('createAssignment', c, x),
    suspendAssignment: (c, x) => invoke('suspendAssignment', c, x), revokeAssignment: (c, x) => invoke('revokeAssignment', c, x),
    listAssignments: (c, x) => invoke('listAssignments', c, x), listAuditEvents: (c, x) => invoke('listAuditEvents', c, x) });
}
