'use strict';

const LEVELS = new Set(['L1', 'L2', 'L3', 'L4']);
const ENVIRONMENTS = new Set(['DEVELOPMENT', 'TEST', 'STAGING', 'PRODUCTION']);

function bounded(value, max = 256) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function createOwnerAuditEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('OWNER_AUDIT_INPUT_INVALID');
  const required = ['actorSubject', 'actionCode', 'targetType', 'targetId', 'resultCode', 'assuranceLevel', 'environment', 'policyVersion', 'correlationId'];
  for (const key of required) if (!bounded(input[key])) throw new TypeError('OWNER_AUDIT_INPUT_INVALID');
  if (!LEVELS.has(input.assuranceLevel) || !ENVIRONMENTS.has(input.environment)) throw new TypeError('OWNER_AUDIT_INPUT_INVALID');
  if (input.releaseDigest !== undefined && !bounded(input.releaseDigest, 512)) throw new TypeError('OWNER_AUDIT_INPUT_INVALID');
  return Object.freeze({
    actorSubject: input.actorSubject,
    actionCode: input.actionCode,
    targetType: input.targetType,
    targetId: input.targetId,
    resultCode: input.resultCode,
    assuranceLevel: input.assuranceLevel,
    environment: input.environment,
    policyVersion: input.policyVersion,
    correlationId: input.correlationId,
    releaseDigest: input.releaseDigest || null,
  });
}

module.exports = Object.freeze({ createOwnerAuditEvent });
