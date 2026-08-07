'use strict';

const { createPayloadDigest } = require('./sovereign-security-kernel.js');
const {
  validateToolRequest,
  evaluateToolRequest,
  executeRegisteredTool,
} = require('./sovereign-tool-registry.js');
const { consumeVerifiedStepUp } = require('./sovereign-owner-stepup-authorization.js');

const HEX_256 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const L4_BINDINGS = Object.freeze({
  'engineering.merge_pr': Object.freeze({ stepUpAction: 'MERGE_RELEASE', environment: 'REPOSITORY' }),
  'engineering.deploy_production': Object.freeze({ stepUpAction: 'ACTIVATE_PRODUCTION', environment: 'PRODUCTION' }),
  'finance.change_prices': Object.freeze({ stepUpAction: 'CHANGE_PRICES', environment: 'PRODUCTION' }),
});

const TRUSTED_PERSISTENCE_CONSUMERS = new WeakSet();
const PERSISTENCE_CONSUMER_MATERIAL = new WeakMap();

function result(ok, reasonCode, extra = {}) {
  return Object.freeze({ ok, reasonCode, ...extra });
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, allowed) {
  if (!isPlainObject(value)) return false;
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => !UNSAFE_KEYS.has(key) && allowedSet.has(key));
}

function hash(value, code) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!HEX_256.test(normalized)) {
    const error = new Error(code);
    error.code = code;
    throw error;
  }
  return normalized;
}

function requestMaterial(request) {
  return Object.freeze({
    toolId: request.toolId,
    agentId: request.agentId,
    arguments: request.arguments,
    idempotencyKey: request.idempotencyKey || null,
    correlationId: request.correlationId,
  });
}

function createProtectedToolBinding({ request, releaseDigest, scopeDigest } = {}) {
  const validated = validateToolRequest(request);
  if (!validated.ok) {
    const error = new Error(validated.reasonCode);
    error.code = validated.reasonCode;
    throw error;
  }
  const binding = L4_BINDINGS[validated.value.toolId];
  if (!binding || validated.definition.level !== 'L4' || validated.definition.requiresOwnerApproval !== true) {
    const error = new Error('STEPUP_NOT_REQUIRED_FOR_TOOL');
    error.code = 'STEPUP_NOT_REQUIRED_FOR_TOOL';
    throw error;
  }
  return Object.freeze({
    toolId: validated.value.toolId,
    stepUpAction: binding.stepUpAction,
    environment: binding.environment,
    releaseDigest: hash(releaseDigest, 'STEPUP_RELEASE_DIGEST_INVALID'),
    payloadDigest: createPayloadDigest(requestMaterial(validated.value)),
    scopeDigest: hash(scopeDigest, 'STEPUP_SCOPE_DIGEST_INVALID'),
  });
}

function createTrustedPersistentStepUpConsumer({ consumerId, consume } = {}) {
  if (typeof consumerId !== 'string' || consumerId.trim().length < 3 || consumerId.trim().length > 128) {
    throw new TypeError('STEPUP_PERSISTENCE_CONSUMER_ID_INVALID');
  }
  if (typeof consume !== 'function') throw new TypeError('STEPUP_PERSISTENCE_CONSUMER_FUNCTION_INVALID');
  const consumer = Object.freeze({
    schemaVersion: 'TIGER_TRUSTED_STEPUP_PERSISTENCE_CONSUMER_V1',
    consumerId: consumerId.trim(),
  });
  TRUSTED_PERSISTENCE_CONSUMERS.add(consumer);
  PERSISTENCE_CONSUMER_MATERIAL.set(consumer, consume);
  return consumer;
}

function persistenceConsumerTrusted(consumer) {
  return Boolean(
    consumer
    && typeof consumer === 'object'
    && TRUSTED_PERSISTENCE_CONSUMERS.has(consumer)
    && PERSISTENCE_CONSUMER_MATERIAL.has(consumer),
  );
}

function safeErrorReason(error, fallback) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (/^[A-Z0-9_]{3,128}$/.test(code)) return code;
  const message = typeof error?.message === 'string' ? error.message : '';
  if (/^[A-Z0-9_]{3,128}$/.test(message)) return message;
  return fallback;
}

async function executeProtectedRegisteredTool({
  request,
  actor,
  featureEnabled = false,
  runtimeState,
  approvalReceipt,
  stepUpVerification,
  stepUpAuthorizationId,
  releaseDigest,
  scopeDigest,
  persistentStepUpConsumer,
  executors = {},
  idempotencyStore,
  now = new Date().toISOString(),
} = {}) {
  const validated = validateToolRequest(request);
  if (!validated.ok) return validated;

  if (validated.definition.level !== 'L4') {
    return executeRegisteredTool({
      request,
      actor,
      featureEnabled,
      runtimeState,
      approvalReceipt,
      executors,
      idempotencyStore,
    });
  }

  // First verify the existing owner approval and all ordinary tool policy gates.
  // This deliberately happens before consuming the stronger step-up authorization.
  const ordinaryAuthorization = evaluateToolRequest({
    request,
    actor,
    featureEnabled,
    runtimeState,
    approvalReceipt,
  });
  if (!ordinaryAuthorization.ok) return ordinaryAuthorization;

  if (!stepUpVerification) return result(false, 'OWNER_STEPUP_REQUIRED');
  if (!persistenceConsumerTrusted(persistentStepUpConsumer)) {
    return result(false, 'STEPUP_PERSISTENCE_CONSUMER_UNTRUSTED');
  }
  if (typeof stepUpAuthorizationId !== 'string' || !UUID.test(stepUpAuthorizationId)) {
    return result(false, 'STEPUP_AUTHORIZATION_ID_INVALID');
  }

  let binding;
  try {
    binding = createProtectedToolBinding({ request: ordinaryAuthorization.request, releaseDigest, scopeDigest });
  } catch (error) {
    return result(false, safeErrorReason(error, 'STEPUP_BINDING_INVALID'));
  }

  let localConsumption;
  try {
    localConsumption = consumeVerifiedStepUp({
      verification: stepUpVerification,
      expectedOwnerSubject: String(actor.id || ''),
      expectedAction: binding.stepUpAction,
      expectedReleaseDigest: binding.releaseDigest,
      expectedPayloadDigest: binding.payloadDigest,
      expectedScopeDigest: binding.scopeDigest,
      expectedEnvironment: binding.environment,
      now,
    });
  } catch (error) {
    return result(false, safeErrorReason(error, 'STEPUP_VERIFICATION_FAILED'));
  }

  const consumePersistent = PERSISTENCE_CONSUMER_MATERIAL.get(persistentStepUpConsumer);
  let persisted;
  try {
    persisted = await consumePersistent(Object.freeze({
      authorizationId: stepUpAuthorizationId,
      verificationDigest: localConsumption.verificationDigest,
      ownerSubject: String(actor.id || ''),
      action: binding.stepUpAction,
      releaseDigest: binding.releaseDigest,
      payloadDigest: binding.payloadDigest,
      scopeDigest: binding.scopeDigest,
      environment: binding.environment,
      now: String(now),
    }));
  } catch {
    return result(false, 'STEPUP_PERSISTENCE_UNAVAILABLE');
  }

  if (!exactKeys(persisted, ['ok', 'reasonCode']) || typeof persisted.ok !== 'boolean' || typeof persisted.reasonCode !== 'string') {
    return result(false, 'STEPUP_PERSISTENCE_RESULT_INVALID');
  }
  if (!persisted.ok) return result(false, persisted.reasonCode || 'STEPUP_PERSISTENCE_DENIED');
  if (persisted.reasonCode !== 'STEPUP_CONSUMED') return result(false, 'STEPUP_PERSISTENCE_RESULT_INVALID');

  // The low-level registry executor remains the bounded execution primitive.
  // All L4 production call sites are required by repository sentinel tests to use
  // this protected wrapper rather than importing executeRegisteredTool directly.
  return executeRegisteredTool({
    request: ordinaryAuthorization.request,
    actor,
    featureEnabled,
    runtimeState,
    approvalReceipt,
    executors,
    idempotencyStore,
  });
}

module.exports = Object.freeze({
  L4_BINDINGS,
  createProtectedToolBinding,
  createTrustedPersistentStepUpConsumer,
  executeProtectedRegisteredTool,
});
