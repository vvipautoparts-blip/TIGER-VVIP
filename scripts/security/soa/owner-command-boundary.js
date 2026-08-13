'use strict';

const { evaluateOwnerAccess, MAX_L4_LEASE_SECONDS } = require('./owner-access-policy.js');
const { createOwnerAuditEvent } = require('./owner-audit.js');

const ENVIRONMENTS = new Set(['DEVELOPMENT', 'TEST', 'STAGING', 'PRODUCTION']);
const PUBLIC_FIELDS = Object.freeze(['publicDisplayName', 'publicTitle', 'publicCountryCode', 'publicBio', 'publicAvatarUrl', 'approvedPublicContactUrl']);
const VAULT_FIELDS = Object.freeze(['encryptedPayload', 'keyVersion', 'cipherSuite', 'classification', 'retentionPolicy', 'dataVersion']);
const OPERATIONS = Object.freeze({
  UPDATE_PUBLIC_PROFILE: Object.freeze({ level: 'L2', kind: 'PUBLIC_PROFILE' }),
  UPDATE_PRIVATE_VAULT: Object.freeze({ level: 'L3', kind: 'PRIVATE_VAULT' }),
  PUBLISH_PUBLIC_PROFILE: Object.freeze({ level: 'L3', kind: 'PUBLICATION' }),
  ROTATE_OWNER_SECURITY_POLICY: Object.freeze({ level: 'L4', kind: 'SECURITY_POLICY' }),
});

function fail(code) { return Object.freeze({ ok: false, code }); }
function bounded(value, max = 512) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max; }
function isPlainObject(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) return false; const proto = Object.getPrototypeOf(value); return proto === Object.prototype || proto === null; }
function hasPollutionKey(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return true;
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || hasPollutionKey(value[key], seen)) return true;
  }
  seen.delete(value);
  return false;
}
function exactSubset(payload, allowlist) {
  if (!isPlainObject(payload) || hasPollutionKey(payload)) return null;
  const keys = Object.keys(payload);
  if (keys.length === 0 || keys.some((key) => !allowlist.includes(key))) return null;
  return keys.reduce((out, key) => { out[key] = payload[key]; return out; }, {});
}
function normalizePublic(payload) {
  const normalized = exactSubset(payload, PUBLIC_FIELDS);
  if (!normalized) return null;
  for (const [key, value] of Object.entries(normalized)) {
    if (value !== null && typeof value !== 'string') return null;
    if (typeof value === 'string' && value.length > (key === 'publicBio' ? 2000 : 512)) return null;
  }
  return Object.freeze(normalized);
}
function normalizeVault(payload) {
  if (!isPlainObject(payload) || hasPollutionKey(payload)) return null;
  const keys = Object.keys(payload).sort();
  if (keys.length !== VAULT_FIELDS.length || keys.some((key, index) => key !== [...VAULT_FIELDS].sort()[index])) return null;
  if (!bounded(payload.encryptedPayload, 65536) || !bounded(payload.keyVersion, 128) || !bounded(payload.cipherSuite, 128)) return null;
  if (payload.classification !== 'OWNER_RESTRICTED' || !bounded(payload.retentionPolicy, 128)) return null;
  if (!Number.isSafeInteger(payload.dataVersion) || payload.dataVersion < 1) return null;
  return Object.freeze({ ...payload });
}
function normalizePublication(payload) {
  if (!isPlainObject(payload) || hasPollutionKey(payload)) return null;
  const keys = Object.keys(payload).sort();
  if (keys.join(',') !== 'expectedPublicVersion,publicationStatus') return null;
  if (payload.publicationStatus !== 'PUBLISHED' || !Number.isSafeInteger(payload.expectedPublicVersion) || payload.expectedPublicVersion < 1) return null;
  return Object.freeze({ publicationStatus: 'PUBLISHED', expectedPublicVersion: payload.expectedPublicVersion });
}
function normalizeSecurityPolicy(payload) {
  if (!isPlainObject(payload) || hasPollutionKey(payload) || Object.keys(payload).length !== 1 || !bounded(payload.nextPolicyVersion, 128)) return null;
  return Object.freeze({ nextPolicyVersion: payload.nextPolicyVersion.trim() });
}
function normalizePayload(operation, payload) {
  if (operation === 'UPDATE_PUBLIC_PROFILE') return normalizePublic(payload);
  if (operation === 'UPDATE_PRIVATE_VAULT') return normalizeVault(payload);
  if (operation === 'PUBLISH_PUBLIC_PROFILE') return normalizePublication(payload);
  if (operation === 'ROTATE_OWNER_SECURITY_POLICY') return normalizeSecurityPolicy(payload);
  return null;
}
function validDependencies(deps) {
  return deps && typeof deps.loadOwnerContext === 'function' && typeof deps.runTransaction === 'function' && typeof deps.clock === 'function';
}
function validRequest(request) {
  return isPlainObject(request)
    && bounded(request.authenticatedClerkUserId, 256)
    && bounded(request.sessionId, 256)
    && bounded(request.actionCode, 128)
    && bounded(request.targetResource, 512)
    && ENVIRONMENTS.has(request.environment)
    && bounded(request.correlationId, 256)
    && bounded(request.idempotencyKey, 256)
    && bounded(request.releaseDigest, 512);
}
function leaseMatches(lease, request, context, nowMs) {
  if (!isPlainObject(lease)) return false;
  const issuedAt = Date.parse(lease.issuedAt);
  const expiresAt = Date.parse(lease.expiresAt);
  const maxWindowMs = MAX_L4_LEASE_SECONDS * 1000;
  return bounded(lease.leaseId, 256)
    && lease.leaseId === request.leaseId
    && lease.ownerAuthorityId === context.authority.ownerAuthorityId
    && lease.clerkUserId === request.authenticatedClerkUserId
    && lease.sessionId === request.sessionId
    && lease.actionCode === request.actionCode
    && lease.targetResource === request.targetResource
    && lease.environment === request.environment
    && bounded(lease.policyVersion, 128)
    && lease.policyVersion === context.policyVersion
    && lease.releaseDigest === request.releaseDigest
    && bounded(lease.nonce, 256)
    && lease.consumedAt == null
    && lease.revokedAt == null
    && Number.isFinite(issuedAt)
    && Number.isFinite(expiresAt)
    && issuedAt <= nowMs
    && expiresAt > nowMs
    && expiresAt > issuedAt
    && expiresAt - issuedAt <= maxWindowMs;
}

function createOwnerCommandBoundary(deps) {
  if (!validDependencies(deps)) return Object.freeze({ execute: async () => fail('ERR_OWNER_BOUNDARY_CONFIGURATION') });
  return Object.freeze({
    async execute(request) {
      if (!validRequest(request)) return fail('ERR_OWNER_COMMAND_INVALID');
      const operation = OPERATIONS[request.actionCode];
      if (!operation) return fail('ERR_OWNER_ACTION_UNKNOWN');
      const payload = normalizePayload(request.actionCode, request.payload);
      if (!payload) {
        if (request.actionCode === 'UPDATE_PUBLIC_PROFILE') return fail('ERR_OWNER_PUBLIC_FIELDS_INVALID');
        if (request.actionCode === 'UPDATE_PRIVATE_VAULT') return fail('ERR_OWNER_VAULT_ENVELOPE_REQUIRED');
        return fail('ERR_OWNER_COMMAND_INVALID');
      }

      let context;
      try {
        context = await deps.loadOwnerContext({ clerkUserId: request.authenticatedClerkUserId, sessionId: request.sessionId });
      } catch { return fail('ERR_OWNER_TRUSTED_CONTEXT_UNAVAILABLE'); }
      if (!isPlainObject(context) || !isPlainObject(context.auth) || context.auth.clerkUserId !== request.authenticatedClerkUserId || context.auth.sessionId !== request.sessionId) return fail('ERR_OWNER_TRUSTED_CONTEXT_MISMATCH');
      const access = evaluateOwnerAccess({ authority: context.authority, security: context.security, auth: context.auth, requiredLevel: operation.level }, { now: deps.clock });
      if (!access.allowed) return fail(access.code);
      if (operation.level === 'L4' && !bounded(request.leaseId, 256)) return fail('ERR_OWNER_L4_LEASE_REQUIRED');

      try {
        const txResult = await deps.runTransaction(async (tx) => {
          if (!tx || typeof tx.persistOwnerCommand !== 'function' || typeof tx.appendOwnerAudit !== 'function') throw new TypeError('OWNER_TX_INVALID');
          const nowIso = deps.clock();
          const nowMs = Date.parse(nowIso);
          if (!Number.isFinite(nowMs)) throw new TypeError('OWNER_CLOCK_INVALID');
          let lease = null;
          if (operation.level === 'L4') {
            if (typeof tx.loadAuthorizationLease !== 'function' || typeof tx.consumeAuthorizationLease !== 'function') throw new TypeError('OWNER_L4_TX_INVALID');
            lease = await tx.loadAuthorizationLease(request.leaseId);
            if (!leaseMatches(lease, request, context, nowMs)) return fail('ERR_OWNER_L4_LEASE_MISMATCH');
            const attempt = createOwnerAuditEvent({
              actorSubject: request.authenticatedClerkUserId, actionCode: request.actionCode, targetType: operation.kind,
              targetId: request.targetResource, resultCode: 'OWNER_L4_ATTEMPT', assuranceLevel: operation.level,
              environment: request.environment, policyVersion: context.policyVersion, correlationId: request.correlationId,
              releaseDigest: request.releaseDigest,
            });
            const pre = await tx.appendOwnerAudit(attempt);
            if (!pre || !bounded(pre.eventId, 256)) throw new TypeError('OWNER_AUDIT_REQUIRED');
            if (await tx.consumeAuthorizationLease({ leaseId: lease.leaseId, nonce: lease.nonce }) !== true) return fail('ERR_OWNER_L4_LEASE_REPLAY');
          }

          const persisted = await tx.persistOwnerCommand(Object.freeze({
            ownerAuthorityId: context.authority.ownerAuthorityId,
            actionCode: request.actionCode,
            targetResource: request.targetResource,
            environment: request.environment,
            idempotencyKey: request.idempotencyKey,
            payload,
          }));
          if (!persisted || persisted.ok !== true) throw new TypeError('OWNER_PERSISTENCE_REQUIRED');
          const successAudit = createOwnerAuditEvent({
            actorSubject: request.authenticatedClerkUserId, actionCode: request.actionCode, targetType: operation.kind,
            targetId: request.targetResource, resultCode: 'OWNER_COMMAND_COMMITTED', assuranceLevel: operation.level,
            environment: request.environment, policyVersion: context.policyVersion, correlationId: request.correlationId,
            releaseDigest: request.releaseDigest,
          });
          const audit = await tx.appendOwnerAudit(successAudit);
          if (!audit || !bounded(audit.eventId, 256)) throw new TypeError('OWNER_AUDIT_REQUIRED');
          return Object.freeze({ ok: true, auditEventId: audit.eventId });
        });
        if (!txResult || txResult.committed !== true || !txResult.value || txResult.value.ok !== true) {
          return txResult?.value?.code ? txResult.value : fail('ERR_OWNER_ENFORCEMENT_FAILED');
        }
        return Object.freeze({
          ok: true,
          code: 'OWNER_COMMAND_COMMITTED',
          data: Object.freeze({ actionCode: request.actionCode, targetResource: request.targetResource }),
          receipt: Object.freeze({ correlationId: request.correlationId, auditEventId: txResult.value.auditEventId }),
        });
      } catch { return fail('ERR_OWNER_ENFORCEMENT_FAILED'); }
    },
  });
}

module.exports = Object.freeze({ createOwnerCommandBoundary, OPERATIONS, PUBLIC_FIELDS, VAULT_FIELDS });
