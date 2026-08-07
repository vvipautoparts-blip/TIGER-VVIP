'use strict';

const AGENTIC_THREAT_CLASSES = Object.freeze(new Set([
  'GOAL_HIJACKING',
  'TOOL_MISUSE',
  'IDENTITY_PRIVILEGE_ABUSE',
  'MEMORY_CONTEXT_POISONING',
  'INSECURE_INTER_AGENT_COMMUNICATION',
  'CASCADING_FAILURES',
  'TRUST_EXPLOITATION',
  'ROGUE_AGENT_BEHAVIOR',
]));

const OP_METADATA_KEYS = Object.freeze(new Set([
  'latencyMs',
  'costMicrousd',
  'country',
  'sector',
  'provider',
  'model',
  'promptVersion',
  'statusCode',
  'reasonCode',
  'toolId',
]));

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function result(ok, reasonCode, extra = {}) {
  return deepFreeze({ ok, reasonCode, ...extra });
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const output = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!OP_METADATA_KEYS.has(key)) continue;
    if (typeof value === 'string' && value.length <= 256) output[key] = value;
    else if (Number.isFinite(value) || typeof value === 'boolean') output[key] = value;
  }
  return output;
}

function createOperationalEvent({ correlationId, type, agentId, metadata, at } = {}) {
  const timestamp = Date.parse(String(at || ''));
  if (!Number.isFinite(timestamp)) throw new TypeError('Operational event time invalid.');
  return deepFreeze({
    correlationId: String(correlationId || '').slice(0, 128),
    type: String(type || '').slice(0, 128),
    agentId: String(agentId || '').slice(0, 128),
    metadata: sanitizeMetadata(metadata),
    at: new Date(timestamp).toISOString(),
  });
}

function evaluateCircuitBreaker({ requests, failures, consecutiveFailures, currentState, humanRecoveryApproved = false } = {}) {
  if (![requests, failures, consecutiveFailures].every((value) => Number.isInteger(value) && value >= 0)) throw new TypeError('Circuit metrics invalid.');
  if (!['CLOSED', 'OPEN', 'HALF_OPEN'].includes(currentState)) throw new TypeError('Circuit state invalid.');
  if (currentState === 'OPEN') {
    return deepFreeze(humanRecoveryApproved
      ? { state: 'HALF_OPEN', allowRequest: true, reasonCode: 'RECOVERY_PROBE_APPROVED' }
      : { state: 'OPEN', allowRequest: false, reasonCode: 'CIRCUIT_OPEN' });
  }
  const failureRate = requests > 0 ? failures / requests : 0;
  if (consecutiveFailures >= 5 || (requests >= 20 && failureRate >= 0.2)) {
    return deepFreeze({ state: 'OPEN', allowRequest: false, reasonCode: 'PROVIDER_FAILURE_THRESHOLD' });
  }
  if (currentState === 'HALF_OPEN') return deepFreeze({ state: 'CLOSED', allowRequest: true, reasonCode: 'RECOVERY_PROBE_PASSED' });
  return deepFreeze({ state: 'CLOSED', allowRequest: true, reasonCode: 'CIRCUIT_HEALTHY' });
}

function alert(code, severity, observed, limit) {
  return deepFreeze({ code, severity, observed, limit, action: 'DISABLE_OR_REVIEW' });
}

function evaluateOperationalAlerts({ dailyCostMicrousd, dailyCostLimitMicrousd, requestCount, errorCount, authorizationDenials, authorizationDenialLimit } = {}) {
  const alerts = [];
  if (Number.isFinite(dailyCostMicrousd) && Number.isFinite(dailyCostLimitMicrousd) && dailyCostMicrousd > dailyCostLimitMicrousd) {
    alerts.push(alert('AI_COST_LIMIT_EXCEEDED', 'P0', dailyCostMicrousd, dailyCostLimitMicrousd));
  }
  const errorRate = requestCount > 0 && Number.isFinite(errorCount) ? errorCount / requestCount : 0;
  if (requestCount >= 20 && errorRate >= 0.05) alerts.push(alert('AI_ERROR_RATE_HIGH', errorRate >= 0.15 ? 'P0' : 'P1', errorRate, 0.05));
  if (Number.isFinite(authorizationDenials) && Number.isFinite(authorizationDenialLimit) && authorizationDenials > authorizationDenialLimit) {
    alerts.push(alert('AI_AUTHORIZATION_DENIAL_SPIKE', 'P0', authorizationDenials, authorizationDenialLimit));
  }
  return deepFreeze(alerts);
}

function createIncidentState({ id, severity, reason, openedAt } = {}) {
  if (!['P0', 'P1', 'P2', 'P3'].includes(severity)) throw new TypeError('Incident severity invalid.');
  const timestamp = Date.parse(String(openedAt || ''));
  if (!Number.isFinite(timestamp)) throw new TypeError('Incident time invalid.');
  return deepFreeze({
    id: String(id || '').slice(0, 128),
    severity,
    reason: String(reason || '').slice(0, 2000),
    state: 'CONTAIN',
    aiEnabled: false,
    evidence: [],
    history: [{ state: 'CONTAIN', at: new Date(timestamp).toISOString() }],
    openedAt: new Date(timestamp).toISOString(),
  });
}

const ALLOWED_TRANSITIONS = Object.freeze({
  CONTAIN: Object.freeze(['INVESTIGATE']),
  INVESTIGATE: Object.freeze(['RECOVER']),
  RECOVER: Object.freeze(['VERIFY']),
  VERIFY: Object.freeze(['CLOSED', 'INVESTIGATE']),
  CLOSED: Object.freeze([]),
});

function advanceIncidentState({ incident, targetState, evidence = [], ownerApproved = false, at } = {}) {
  if (!incident || !ALLOWED_TRANSITIONS[incident.state]) return result(false, 'INCIDENT_INVALID');
  const timestamp = Date.parse(String(at || ''));
  if (!Number.isFinite(timestamp)) return result(false, 'INCIDENT_TIME_INVALID');
  const normalizedEvidence = Array.isArray(evidence) ? evidence.slice(0, 32).map((value) => String(value).slice(0, 256)).filter(Boolean) : [];

  // Recovery-class requests must never get a weaker transition error when the
  // mandatory human/evidence gates themselves are absent. This preserves the
  // fail-closed contract even when a caller attempts to skip lifecycle states.
  if (['RECOVER', 'VERIFY', 'CLOSED'].includes(targetState) && (!ownerApproved || normalizedEvidence.length === 0)) {
    return result(false, 'RECOVERY_GATES_NOT_MET');
  }
  if (!ALLOWED_TRANSITIONS[incident.state].includes(targetState)) return result(false, 'INCIDENT_TRANSITION_DENIED');
  if (targetState === 'INVESTIGATE' && normalizedEvidence.length === 0) return result(false, 'EVIDENCE_REQUIRED');

  const aiEnabled = targetState === 'CLOSED' && ownerApproved;
  return result(true, 'INCIDENT_ADVANCED', {
    incident: deepFreeze({
      ...incident,
      state: targetState,
      aiEnabled,
      evidence: [...incident.evidence, ...normalizedEvidence],
      history: [...incident.history, { state: targetState, at: new Date(timestamp).toISOString() }],
    }),
  });
}

module.exports = Object.freeze({
  AGENTIC_THREAT_CLASSES,
  createOperationalEvent,
  evaluateCircuitBreaker,
  evaluateOperationalAlerts,
  createIncidentState,
  advanceIncidentState,
});
