'use strict';

const { createPayloadDigest } = require('./sovereign-security-kernel.js');

const LEVEL_RANK = Object.freeze({ L1: 1, L2: 2, L3: 3, L4: 4 });
const TRUSTED_APPROVAL_RECEIPTS = new WeakSet();
const REQUEST_KEYS = Object.freeze(new Set([
  'toolId',
  'agentId',
  'arguments',
  'correlationId',
  'idempotencyKey',
]));
const DANGEROUS_KEYS = Object.freeze(new Set(['__proto__', 'prototype', 'constructor']));
const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const SHA_PATTERN = /^[0-9a-f]{7,64}$/i;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const SAFE_BRANCH_PATTERN = /^[A-Za-z0-9._/-]{1,200}$/;

function freezeDefinition(definition) {
  return Object.freeze({
    ...definition,
    allowedAgents: Object.freeze([...definition.allowedAgents]),
    argumentKeys: Object.freeze([...definition.argumentKeys]),
  });
}

const TOOL_REGISTRY = Object.freeze({
  'engineering.run_tests': freezeDefinition({
    id: 'engineering.run_tests',
    level: 'L3',
    allowedAgents: ['technical_manager'],
    mutating: false,
    timeoutMs: 30000,
    requiresIdempotency: false,
    requiresOwnerApproval: false,
    argumentKeys: ['suite'],
  }),
  'engineering.create_pr': freezeDefinition({
    id: 'engineering.create_pr',
    level: 'L3',
    allowedAgents: ['technical_manager'],
    mutating: true,
    timeoutMs: 30000,
    requiresIdempotency: true,
    requiresOwnerApproval: false,
    argumentKeys: ['branch', 'title', 'body', 'base'],
  }),
  'engineering.merge_pr': freezeDefinition({
    id: 'engineering.merge_pr',
    level: 'L4',
    allowedAgents: ['technical_manager'],
    mutating: true,
    timeoutMs: 30000,
    requiresIdempotency: true,
    requiresOwnerApproval: true,
    argumentKeys: ['prNumber', 'expectedHeadSha'],
  }),
  'engineering.deploy_production': freezeDefinition({
    id: 'engineering.deploy_production',
    level: 'L4',
    allowedAgents: ['technical_manager'],
    mutating: true,
    timeoutMs: 60000,
    requiresIdempotency: true,
    requiresOwnerApproval: true,
    argumentKeys: ['releaseId', 'environment', 'expectedHeadSha'],
  }),
  'finance.change_prices': freezeDefinition({
    id: 'finance.change_prices',
    level: 'L4',
    allowedAgents: ['financial_analytics_manager'],
    mutating: true,
    timeoutMs: 15000,
    requiresIdempotency: true,
    requiresOwnerApproval: true,
    argumentKeys: ['country', 'currency', 'price', 'resourceId'],
  }),
  'finance.read_metrics': freezeDefinition({
    id: 'finance.read_metrics',
    level: 'L1',
    allowedAgents: ['financial_analytics_manager'],
    mutating: false,
    timeoutMs: 10000,
    requiresIdempotency: false,
    requiresOwnerApproval: false,
    argumentKeys: ['country', 'period'],
  }),
  'platform.read_analytics': freezeDefinition({
    id: 'platform.read_analytics',
    level: 'L1',
    allowedAgents: ['general_manager', 'technical_manager', 'financial_analytics_manager'],
    mutating: false,
    timeoutMs: 10000,
    requiresIdempotency: false,
    requiresOwnerApproval: false,
    argumentKeys: ['country', 'metricSet'],
  }),
  'user.assist_writing': freezeDefinition({
    id: 'user.assist_writing',
    level: 'L1',
    allowedAgents: ['user_assistant'],
    mutating: false,
    timeoutMs: 10000,
    requiresIdempotency: false,
    requiresOwnerApproval: false,
    argumentKeys: ['task', 'text'],
  }),
});

const TOOL_IDS = Object.freeze(Object.keys(TOOL_REGISTRY));

function result(ok, reasonCode, extra = {}) {
  return Object.freeze({ ok, reasonCode, ...extra });
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function boundedString(value, { min = 1, max, pattern } = {}) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) return null;
  if (pattern && !pattern.test(normalized)) return null;
  return normalized;
}

function rejectDangerousKeys(value) {
  if (!isPlainObject(value)) return false;
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) return true;
  }
  return false;
}

function exactArgumentKeys(args, definition) {
  const allowed = new Set(definition.argumentKeys);
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) return result(false, 'ARGUMENT_UNKNOWN_FIELD', { field: key });
  }
  for (const key of definition.argumentKeys) {
    if (!Object.prototype.hasOwnProperty.call(args, key)) return result(false, 'ARGUMENT_INVALID', { field: key });
  }
  return null;
}

function validateArguments(toolId, args) {
  switch (toolId) {
    case 'engineering.run_tests': {
      const suite = boundedString(args.suite, { max: 256 });
      return suite ? result(true, 'ARGUMENTS_VALID', { value: Object.freeze({ suite }) }) : result(false, 'ARGUMENT_INVALID');
    }
    case 'engineering.create_pr': {
      const branch = boundedString(args.branch, { max: 200, pattern: SAFE_BRANCH_PATTERN });
      const title = boundedString(args.title, { max: 256 });
      const body = boundedString(args.body, { max: 12000 });
      const base = boundedString(args.base, { max: 200, pattern: SAFE_BRANCH_PATTERN });
      if (!branch || !title || !body || !base) return result(false, 'ARGUMENT_INVALID');
      return result(true, 'ARGUMENTS_VALID', { value: Object.freeze({ branch, title, body, base }) });
    }
    case 'engineering.merge_pr': {
      if (!Number.isInteger(args.prNumber) || args.prNumber <= 0) return result(false, 'ARGUMENT_INVALID');
      const expectedHeadSha = boundedString(args.expectedHeadSha, { max: 64, pattern: SHA_PATTERN });
      if (!expectedHeadSha) return result(false, 'ARGUMENT_INVALID');
      return result(true, 'ARGUMENTS_VALID', { value: Object.freeze({ prNumber: args.prNumber, expectedHeadSha: expectedHeadSha.toLowerCase() }) });
    }
    case 'engineering.deploy_production': {
      const releaseId = boundedString(args.releaseId, { max: 128 });
      const expectedHeadSha = boundedString(args.expectedHeadSha, { max: 64, pattern: SHA_PATTERN });
      if (!releaseId || args.environment !== 'production' || !expectedHeadSha) return result(false, 'ARGUMENT_INVALID');
      return result(true, 'ARGUMENTS_VALID', { value: Object.freeze({ releaseId, environment: 'production', expectedHeadSha: expectedHeadSha.toLowerCase() }) });
    }
    case 'finance.change_prices': {
      const country = boundedString(args.country, { max: 2, pattern: COUNTRY_PATTERN });
      const currency = boundedString(args.currency, { max: 3, pattern: CURRENCY_PATTERN });
      const resourceId = boundedString(args.resourceId, { max: 128 });
      if (!country || !currency || !resourceId || !Number.isFinite(args.price) || args.price < 0 || args.price > 1000000000) {
        return result(false, 'ARGUMENT_INVALID');
      }
      return result(true, 'ARGUMENTS_VALID', { value: Object.freeze({ country, currency, price: args.price, resourceId }) });
    }
    case 'finance.read_metrics': {
      const country = boundedString(args.country, { max: 2, pattern: COUNTRY_PATTERN });
      const period = boundedString(args.period, { max: 64 });
      if (!country || !period) return result(false, 'ARGUMENT_INVALID');
      return result(true, 'ARGUMENTS_VALID', { value: Object.freeze({ country, period }) });
    }
    case 'platform.read_analytics': {
      const country = boundedString(args.country, { max: 2, pattern: COUNTRY_PATTERN });
      const metricSet = boundedString(args.metricSet, { max: 128 });
      if (!country || !metricSet) return result(false, 'ARGUMENT_INVALID');
      return result(true, 'ARGUMENTS_VALID', { value: Object.freeze({ country, metricSet }) });
    }
    case 'user.assist_writing': {
      const task = boundedString(args.task, { max: 64 });
      const text = boundedString(args.text, { max: 12000 });
      if (!task || !text) return result(false, 'ARGUMENT_INVALID');
      return result(true, 'ARGUMENTS_VALID', { value: Object.freeze({ task, text }) });
    }
    default:
      return result(false, 'UNKNOWN_TOOL');
  }
}

function validateToolRequest(value) {
  if (!isPlainObject(value)) return result(false, 'INVALID_REQUEST');
  for (const key of Object.keys(value)) {
    if (!REQUEST_KEYS.has(key)) return result(false, 'UNKNOWN_FIELD', { field: key });
  }

  const toolId = typeof value.toolId === 'string' ? value.toolId.trim() : '';
  const definition = TOOL_REGISTRY[toolId];
  if (!definition) return result(false, 'UNKNOWN_TOOL');

  const agentId = typeof value.agentId === 'string' ? value.agentId.trim() : '';
  if (!agentId) return result(false, 'AGENT_REQUIRED');

  const correlationId = boundedString(value.correlationId, { max: 128, pattern: CORRELATION_PATTERN });
  if (!correlationId) return result(false, 'CORRELATION_ID_INVALID');

  if (!isPlainObject(value.arguments)) return result(false, 'ARGUMENT_INVALID');
  if (rejectDangerousKeys(value.arguments)) return result(false, 'ARGUMENT_KEY_DENIED');

  const exactKeys = exactArgumentKeys(value.arguments, definition);
  if (exactKeys) return exactKeys;
  const args = validateArguments(toolId, value.arguments);
  if (!args.ok) return args;

  let idempotencyKey = null;
  if (definition.requiresIdempotency) {
    idempotencyKey = boundedString(value.idempotencyKey, { max: 128, pattern: IDEMPOTENCY_PATTERN });
    if (!idempotencyKey) return result(false, 'IDEMPOTENCY_REQUIRED');
  } else if (value.idempotencyKey !== undefined) {
    idempotencyKey = boundedString(value.idempotencyKey, { max: 128, pattern: IDEMPOTENCY_PATTERN });
    if (!idempotencyKey) return result(false, 'IDEMPOTENCY_INVALID');
  }

  return result(true, 'TOOL_REQUEST_VALID', {
    value: Object.freeze({
      toolId,
      agentId,
      arguments: args.value,
      correlationId,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    }),
    definition,
  });
}

function createApprovalMaterial(request) {
  return {
    toolId: request.toolId,
    agentId: request.agentId,
    arguments: request.arguments,
    idempotencyKey: request.idempotencyKey || null,
    correlationId: request.correlationId,
  };
}

function createTrustedApprovalReceipt({ ownerId, request, approvalId } = {}) {
  const validated = validateToolRequest(request);
  if (!validated.ok) throw new TypeError(`Invalid tool request: ${validated.reasonCode}`);
  if (!validated.definition.requiresOwnerApproval) throw new TypeError('Tool does not require owner approval.');
  const normalizedOwnerId = boundedString(ownerId, { max: 256 });
  const normalizedApprovalId = boundedString(approvalId, { max: 256 });
  if (!normalizedOwnerId || !normalizedApprovalId) throw new TypeError('Approval receipt identity is invalid.');

  const receipt = Object.freeze({
    approvalId: normalizedApprovalId,
    ownerId: normalizedOwnerId,
    toolId: validated.value.toolId,
    agentId: validated.value.agentId,
    requestDigest: createPayloadDigest(createApprovalMaterial(validated.value)),
    status: 'CONSUMED_BY_TRUST_FABRIC',
    issuer: 'TIGER_SOVEREIGN_TRUST_FABRIC',
  });
  TRUSTED_APPROVAL_RECEIPTS.add(receipt);
  return receipt;
}

function verifyApprovalReceipt({ receipt, actor, request }) {
  if (!receipt || typeof receipt !== 'object' || !TRUSTED_APPROVAL_RECEIPTS.has(receipt)) {
    return result(false, 'UNTRUSTED_APPROVAL_RECEIPT');
  }
  if (!actor?.authenticated || actor.role !== 'OWNER') return result(false, 'OWNER_REQUIRED');
  if (String(actor.id || '') !== receipt.ownerId) return result(false, 'OWNER_ID_MISMATCH');
  const digest = createPayloadDigest(createApprovalMaterial(request));
  if (receipt.toolId !== request.toolId || receipt.agentId !== request.agentId || receipt.requestDigest !== digest) {
    return result(false, 'APPROVAL_RECEIPT_MISMATCH');
  }
  return result(true, 'APPROVAL_RECEIPT_VALID');
}

function evaluateToolRequest({ request, actor, featureEnabled = false, runtimeState, approvalReceipt } = {}) {
  const validated = validateToolRequest(request);
  if (!validated.ok) return validated;
  const { value, definition } = validated;

  if (!actor?.authenticated) return result(false, 'AUTHENTICATION_REQUIRED');
  if (!featureEnabled) return result(false, 'FEATURE_DISABLED');
  if (!runtimeState || runtimeState.enabled !== true) return result(false, 'AGENT_DISABLED');
  if (runtimeState.killSwitch === true) return result(false, 'KILL_SWITCH_ACTIVE');
  if (!definition.allowedAgents.includes(value.agentId)) return result(false, 'TOOL_AGENT_SCOPE_DENIED');

  const ceiling = LEVEL_RANK[runtimeState.maxLevel];
  if (!ceiling || LEVEL_RANK[definition.level] > ceiling) return result(false, 'RUNTIME_LEVEL_CEILING');

  if (definition.requiresOwnerApproval) {
    if (!approvalReceipt) return result(false, 'OWNER_APPROVAL_REQUIRED');
    const verification = verifyApprovalReceipt({ receipt: approvalReceipt, actor, request: value });
    if (!verification.ok) return verification;
  }

  return result(true, 'TOOL_AUTHORIZED', { request: value, definition });
}

function safeResultProjection(value) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return Object.freeze(value.slice(0, 100).map(safeResultProjection));
  if (!isPlainObject(value)) return null;
  const output = {};
  let count = 0;
  for (const [key, item] of Object.entries(value)) {
    if (count >= 100 || DANGEROUS_KEYS.has(key)) break;
    if (key.length > 128) continue;
    output[key] = safeResultProjection(item);
    count += 1;
  }
  return Object.freeze(output);
}

async function withTimeout(promise, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('EXECUTION_TIMEOUT')), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function executeRegisteredTool({
  request,
  actor,
  featureEnabled = false,
  runtimeState,
  approvalReceipt,
  executors = {},
  idempotencyStore,
} = {}) {
  const authorization = evaluateToolRequest({ request, actor, featureEnabled, runtimeState, approvalReceipt });
  if (!authorization.ok) return authorization;

  const executor = executors?.[authorization.request.toolId];
  if (typeof executor !== 'function') return result(false, 'EXECUTOR_NOT_REGISTERED');

  const operationDigest = createPayloadDigest(createApprovalMaterial(authorization.request));
  if (authorization.definition.requiresIdempotency && idempotencyStore instanceof Map) {
    const existing = idempotencyStore.get(authorization.request.idempotencyKey);
    if (existing && existing !== operationDigest) return result(false, 'IDEMPOTENCY_CONFLICT');
    if (existing === operationDigest) return result(false, 'IDEMPOTENCY_REPLAY');
    idempotencyStore.set(authorization.request.idempotencyKey, operationDigest);
  }

  try {
    const executionResult = await withTimeout(
      Promise.resolve(executor(authorization.request)),
      authorization.definition.timeoutMs,
    );
    return result(true, 'EXECUTION_SUCCEEDED', { result: safeResultProjection(executionResult) });
  } catch {
    return result(false, 'EXECUTION_FAILED');
  }
}

module.exports = Object.freeze({
  TOOL_IDS,
  TOOL_REGISTRY,
  validateToolRequest,
  evaluateToolRequest,
  createTrustedApprovalReceipt,
  verifyApprovalReceipt,
  executeRegisteredTool,
});
