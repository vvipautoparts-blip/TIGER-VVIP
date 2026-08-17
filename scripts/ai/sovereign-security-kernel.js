'use strict';

const crypto = require('node:crypto');
const {
  ACTIONS,
  DECISIONS,
  POLICY,
  AGENT_ACTIONS,
  ACTOR_AGENT_SCOPES,
  TOOL_REGISTRY,
  PROFILES,
  INTELLIGENCE_LADDER,
  INFERENCE_POLICY,
} = require('./sovereign-intelligence-registry.js');

const BLACK_BOX_METADATA_KEYS = Object.freeze([
  'target',
  'resource',
  'country',
  'sector',
  'reasonCode',
  'ticketId',
  'prNumber',
  'approvalId',
  'toolId',
  'model',
  'promptVersion',
]);

function deny(reasonCode, extra = {}) {
  return Object.freeze({ decision: DECISIONS.DENY, reasonCode, ...extra });
}

function allow(reasonCode, extra = {}) {
  return Object.freeze({ decision: DECISIONS.ALLOW, reasonCode, ...extra });
}

function authorizeInferenceProvider({ kind } = {}) {
  if (kind === 'remote_paid') {
    return deny('PAID_REMOTE_INFERENCE_FORBIDDEN', { kind });
  }

  if (INTELLIGENCE_LADDER.includes(kind)) {
    return allow('INFERENCE_PROVIDER_ALLOWED', { kind });
  }

  return deny('UNKNOWN_INFERENCE_PROVIDER', { kind: String(kind || 'unknown') });
}

function selectIntelligenceRoute({
  deterministicAvailable = false,
  metricAvailable = false,
  localModelAvailable = false,
  browserAiAvailable = false,
  allowLocalModel = false,
  allowBrowserAi = false,
} = {}) {
  if (deterministicAvailable === true) {
    return Object.freeze({ route: 'deterministic_rule', reasonCode: 'DETERMINISTIC_RULE_AVAILABLE' });
  }
  if (metricAvailable === true) {
    return Object.freeze({ route: 'metric', reasonCode: 'METRIC_AVAILABLE' });
  }
  if (allowLocalModel === true && localModelAvailable === true) {
    return Object.freeze({ route: 'small_local_model', reasonCode: 'LOCAL_MODEL_AVAILABLE' });
  }
  if (allowBrowserAi === true && browserAiAvailable === true) {
    return Object.freeze({ route: 'browser_built_in_ai', reasonCode: 'BROWSER_AI_AVAILABLE' });
  }
  return Object.freeze({ route: 'no_ai', reasonCode: 'NO_AI_GRACEFUL_FALLBACK' });
}

function assertCanonicalValue(value, seen) {
  if (value === null) return 'null';

  const type = typeof value;
  if (type === 'string') return JSON.stringify(value);
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Unsupported non-finite number in payload.');
    return JSON.stringify(value);
  }

  if (type !== 'object') throw new TypeError(`Unsupported ${type} value in payload.`);
  if (seen.has(value)) throw new TypeError('Unsupported cyclic value in payload.');
  seen.add(value);

  let serialized;
  if (Array.isArray(value)) {
    serialized = `[${value.map((item) => assertCanonicalValue(item, seen)).join(',')}]`;
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Unsupported object prototype in payload.');
    }
    serialized = `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${assertCanonicalValue(value[key], seen)}`)
      .join(',')}}`;
  }

  seen.delete(value);
  return serialized;
}

function canonicalJson(value) {
  return assertCanonicalValue(value, new Set());
}

function createPayloadDigest(payload) {
  return crypto.createHash('sha256').update(canonicalJson(payload), 'utf8').digest('hex');
}

function tryCreatePayloadDigest(payload) {
  try {
    return Object.freeze({ ok: true, digest: createPayloadDigest(payload) });
  } catch {
    return Object.freeze({ ok: false, reasonCode: 'INVALID_PAYLOAD' });
  }
}

function parseInstant(value) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function applyBudgetGate({ spent, requested, limit } = {}) {
  if (![spent, requested, limit].every(Number.isFinite) || spent < 0 || requested < 0 || limit < 0) {
    return Object.freeze({ ok: false, reasonCode: 'BUDGET_CONFIG_INVALID' });
  }
  if (spent + requested > limit) return Object.freeze({ ok: false, reasonCode: 'BUDGET_EXCEEDED' });
  return Object.freeze({ ok: true, reasonCode: 'BUDGET_AVAILABLE', remaining: limit - spent - requested });
}

function applyRateGate({ used, requested, limit } = {}) {
  if (![used, requested, limit].every(Number.isFinite) || used < 0 || requested < 0 || limit < 0) {
    return Object.freeze({ ok: false, reasonCode: 'RATE_CONFIG_INVALID' });
  }
  if (used + requested > limit) return Object.freeze({ ok: false, reasonCode: 'RATE_LIMIT_EXCEEDED' });
  return Object.freeze({ ok: true, reasonCode: 'RATE_AVAILABLE', remaining: limit - used - requested });
}

function cloneGateConfig(name, value, evaluator, invalidReason) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} state is invalid.`);
  }

  const allowedKeys = name === 'budget'
    ? ['spent', 'requested', 'limit']
    : ['used', 'requested', 'limit'];
  const keys = Object.keys(value);
  if (keys.length !== allowedKeys.length || keys.some((key) => !allowedKeys.includes(key))) {
    throw new TypeError(`${name} state is invalid.`);
  }

  const copy = Object.freeze(Object.fromEntries(allowedKeys.map((key) => [key, value[key]])));
  const result = evaluator(copy);
  if (result.reasonCode === invalidReason) throw new TypeError(`${name} state is invalid.`);
  return copy;
}

function normalizeKillSwitches(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Kill-switch state is invalid.');
  }
  const allowed = ['global', 'agent', 'tool'];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new TypeError('Kill-switch state is invalid.');
  }

  const output = {};
  for (const key of allowed) {
    const current = Object.prototype.hasOwnProperty.call(value, key) ? value[key] : false;
    if (typeof current !== 'boolean') throw new TypeError('Kill-switch state is invalid.');
    output[key] = current;
  }
  return Object.freeze(output);
}

function createSovereignSecurityKernel() {
  const trustedActors = new WeakSet();
  const trustedRuntimeStates = new WeakSet();
  const issuedApprovals = new WeakSet();
  const issuedApprovalIds = new Set();
  const consumedApprovalIds = new Set();

  function isTrustedActor(actor) {
    return Boolean(actor && typeof actor === 'object' && trustedActors.has(actor));
  }

  function isTrustedRuntimeState(runtimeState) {
    return Boolean(runtimeState && typeof runtimeState === 'object' && trustedRuntimeStates.has(runtimeState));
  }

  function issueActor({ id, role } = {}) {
    if (!id || !role) throw new TypeError('Trusted actor id and role are required.');
    if (!Object.prototype.hasOwnProperty.call(ACTOR_AGENT_SCOPES, role)) {
      throw new TypeError('Trusted actor role is invalid.');
    }

    const actor = Object.freeze({
      id: String(id),
      role,
      authenticated: true,
      issuer: 'TIGER_SOVEREIGN_SERVER',
    });
    trustedActors.add(actor);
    return actor;
  }

  function issueRuntimeState({
    featureEnabled = false,
    killSwitches = {},
    budget,
    rate,
  } = {}) {
    if (typeof featureEnabled !== 'boolean') throw new TypeError('Feature state is invalid.');

    const runtimeState = Object.freeze({
      featureEnabled,
      killSwitches: normalizeKillSwitches(killSwitches),
      budget: cloneGateConfig('budget', budget, applyBudgetGate, 'BUDGET_CONFIG_INVALID'),
      rate: cloneGateConfig('rate', rate, applyRateGate, 'RATE_CONFIG_INVALID'),
      issuer: 'TIGER_SOVEREIGN_SERVER',
    });
    trustedRuntimeStates.add(runtimeState);
    return runtimeState;
  }

  function issueApproval({
    approvalId,
    actor,
    agentId,
    action,
    payload,
    createdAt,
    expiresAt,
  } = {}) {
    if (!isTrustedActor(actor) || actor.role !== 'OWNER') {
      throw new TypeError('Trusted owner actor is required to issue approval.');
    }
    if (!approvalId || !agentId || !action) {
      throw new TypeError('Approval identity, agent and action are required.');
    }
    if (issuedApprovalIds.has(String(approvalId))) {
      throw new TypeError('Approval id has already been issued by this kernel.');
    }

    const rule = POLICY[action];
    if (!rule || rule.decision !== DECISIONS.OWNER_APPROVAL_REQUIRED) {
      throw new TypeError('Approval can only be issued for an owner-gated action.');
    }
    if (!AGENT_ACTIONS[agentId]?.includes(action)) {
      throw new TypeError('Approval agent scope is invalid.');
    }
    if (!ACTOR_AGENT_SCOPES.OWNER.includes(agentId)) {
      throw new TypeError('Approval agent is outside owner scope.');
    }

    const created = parseInstant(createdAt);
    const expires = parseInstant(expiresAt);
    if (created === null || expires === null || expires <= created) {
      throw new TypeError('Approval timestamps are invalid.');
    }

    const approval = Object.freeze({
      id: String(approvalId),
      ownerId: actor.id,
      agentId,
      action,
      payloadDigest: createPayloadDigest(payload),
      createdAt: new Date(created).toISOString(),
      expiresAt: new Date(expires).toISOString(),
      status: 'APPROVED',
      level: 'L4',
      issuer: 'TIGER_SOVEREIGN_SERVER',
    });

    issuedApprovalIds.add(approval.id);
    issuedApprovals.add(approval);
    return approval;
  }

  function verifyApprovalEnvelope({ approval, actor, agentId, action, payload, now } = {}) {
    if (!isTrustedActor(actor)) return Object.freeze({ ok: false, reasonCode: 'UNTRUSTED_ACTOR' });
    if (!approval || typeof approval !== 'object' || !issuedApprovals.has(approval)) {
      return Object.freeze({ ok: false, reasonCode: 'UNTRUSTED_APPROVAL' });
    }
    if (actor.role !== 'OWNER') return Object.freeze({ ok: false, reasonCode: 'TRUSTED_OWNER_REQUIRED' });
    if (actor.id !== approval.ownerId) return Object.freeze({ ok: false, reasonCode: 'OWNER_ID_MISMATCH' });
    if (approval.agentId !== agentId || approval.action !== action) {
      return Object.freeze({ ok: false, reasonCode: 'APPROVAL_SCOPE_MISMATCH' });
    }

    const payloadDigest = tryCreatePayloadDigest(payload);
    if (!payloadDigest.ok) return Object.freeze({ ok: false, reasonCode: payloadDigest.reasonCode });
    if (approval.payloadDigest !== payloadDigest.digest) {
      return Object.freeze({ ok: false, reasonCode: 'PAYLOAD_DIGEST_MISMATCH' });
    }
    if (consumedApprovalIds.has(approval.id)) {
      return Object.freeze({ ok: false, reasonCode: 'APPROVAL_REPLAY' });
    }

    const current = parseInstant(now || new Date().toISOString());
    const created = parseInstant(approval.createdAt);
    const expires = parseInstant(approval.expiresAt);
    if (current === null || created === null || expires === null || current < created) {
      return Object.freeze({ ok: false, reasonCode: 'APPROVAL_TIME_INVALID' });
    }
    if (current > expires) return Object.freeze({ ok: false, reasonCode: 'APPROVAL_EXPIRED' });
    return Object.freeze({ ok: true, reasonCode: 'TRUSTED_OWNER_APPROVAL' });
  }

  function consumeApproval(approval) {
    if (!approval || !issuedApprovals.has(approval)) {
      return Object.freeze({ ok: false, reasonCode: 'UNTRUSTED_APPROVAL' });
    }
    if (consumedApprovalIds.has(approval.id)) {
      return Object.freeze({ ok: false, reasonCode: 'APPROVAL_REPLAY' });
    }
    consumedApprovalIds.add(approval.id);
    return Object.freeze({ ok: true, reasonCode: 'APPROVAL_CONSUMED', approvalId: approval.id });
  }

  function evaluateTool(tool, agentId, action, policyLevel) {
    if (!tool) return null;
    const definition = TOOL_REGISTRY[tool.id];
    if (!definition) return deny('UNKNOWN_TOOL', { toolId: tool.id || 'unknown' });
    if (!definition.allowedAgents.includes(agentId)) return deny('TOOL_SCOPE_DENIED', { toolId: definition.id });
    if (definition.action !== action) return deny('TOOL_ACTION_MISMATCH', { toolId: definition.id, action });
    if (definition.level !== policyLevel) return deny('TOOL_LEVEL_MISMATCH', { toolId: definition.id, action, level: policyLevel });
    return null;
  }

  function evaluateSovereignRequest({
    actor,
    runtimeState,
    agentId,
    action,
    payload = {},
    tool,
    approval,
    now,
  } = {}) {
    const rule = POLICY[action];
    if (!rule) return deny('UNKNOWN_ACTION', { action });
    if (rule.decision === DECISIONS.DENY) {
      return deny('PERMANENTLY_FORBIDDEN', { action, level: rule.level });
    }
    if (!isTrustedActor(actor)) return deny('UNTRUSTED_ACTOR', { action, level: rule.level });
    if (!isTrustedRuntimeState(runtimeState)) {
      return deny('UNTRUSTED_RUNTIME_STATE', { action, level: rule.level });
    }
    if (!runtimeState.featureEnabled) return deny('FEATURE_DISABLED', { action, level: rule.level });
    if (runtimeState.killSwitches.global || runtimeState.killSwitches.agent || runtimeState.killSwitches.tool) {
      return deny('KILL_SWITCH_ACTIVE', { action, level: rule.level });
    }

    const allowedActions = AGENT_ACTIONS[agentId];
    if (!allowedActions) return deny('UNKNOWN_AGENT', { action, agentId, level: rule.level });
    if (!ACTOR_AGENT_SCOPES[actor.role]?.includes(agentId)) {
      return deny('ACTOR_AGENT_SCOPE_DENIED', { action, agentId, actorRole: actor.role, level: rule.level });
    }
    if (!allowedActions.includes(action)) {
      return deny('AGENT_SCOPE_DENIED', { action, agentId, level: rule.level });
    }

    const toolDecision = evaluateTool(tool, agentId, action, rule.level);
    if (toolDecision) return toolDecision;

    if (runtimeState.budget) {
      const result = applyBudgetGate(runtimeState.budget);
      if (!result.ok) return deny(result.reasonCode, { action, level: rule.level });
    }
    if (runtimeState.rate) {
      const result = applyRateGate(runtimeState.rate);
      if (!result.ok) return deny(result.reasonCode, { action, level: rule.level });
    }

    if (rule.decision === DECISIONS.OWNER_APPROVAL_REQUIRED) {
      if (!approval) {
        const payloadDigest = tryCreatePayloadDigest(payload);
        if (!payloadDigest.ok) {
          return deny(payloadDigest.reasonCode, { action, agentId, level: rule.level });
        }
        return Object.freeze({
          action,
          agentId,
          decision: DECISIONS.OWNER_APPROVAL_REQUIRED,
          reasonCode: 'OWNER_APPROVAL_REQUIRED',
          level: rule.level,
          payloadDigest: payloadDigest.digest,
        });
      }

      const verification = verifyApprovalEnvelope({ approval, actor, agentId, action, payload, now });
      if (!verification.ok) return deny(verification.reasonCode, { action, agentId, level: rule.level });

      const consumption = consumeApproval(approval);
      if (!consumption.ok) return deny(consumption.reasonCode, { action, agentId, level: rule.level });

      return allow('TRUSTED_OWNER_APPROVAL_CONSUMED', {
        action,
        agentId,
        level: rule.level,
        approvalId: approval.id,
        payloadDigest: approval.payloadDigest,
      });
    }

    return allow('POLICY_ALLOW', { action, agentId, level: rule.level });
  }

  const runtime = Object.freeze({
    evaluateSovereignRequest,
    verifyApprovalEnvelope,
  });

  const authority = Object.freeze({
    issueActor,
    issueRuntimeState,
    issueApproval,
  });

  return Object.freeze({ runtime, authority });
}

function sanitizeBlackBoxMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return Object.freeze({});
  const output = {};
  for (const key of BLACK_BOX_METADATA_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(metadata, key)) continue;
    const value = metadata[key];
    if (['string', 'number', 'boolean'].includes(typeof value) && String(value).length <= 512) {
      output[key] = value;
    }
  }
  return Object.freeze(output);
}

function createBlackBoxEvent({
  correlationId,
  actorId,
  agentId,
  action,
  decision,
  reasonCode,
  metadata,
  now = () => new Date().toISOString(),
  idFactory = () => crypto.randomUUID(),
} = {}) {
  return Object.freeze({
    id: String(idFactory()),
    correlationId: String(correlationId || 'unknown'),
    actorId: String(actorId || 'unknown'),
    agentId: String(agentId || 'unknown'),
    action: String(action || 'unknown'),
    decision: decision || DECISIONS.DENY,
    reasonCode: String(reasonCode || 'UNSPECIFIED'),
    metadata: sanitizeBlackBoxMetadata(metadata),
    createdAt: String(now()),
  });
}

module.exports = Object.freeze({
  ACTIONS,
  DECISIONS,
  POLICY,
  AGENT_ACTIONS,
  ACTOR_AGENT_SCOPES,
  TOOL_REGISTRY,
  PROFILES,
  INTELLIGENCE_LADDER,
  INFERENCE_POLICY,
  authorizeInferenceProvider,
  selectIntelligenceRoute,
  createSovereignSecurityKernel,
  canonicalJson,
  createPayloadDigest,
  applyBudgetGate,
  applyRateGate,
  sanitizeBlackBoxMetadata,
  createBlackBoxEvent,
});
