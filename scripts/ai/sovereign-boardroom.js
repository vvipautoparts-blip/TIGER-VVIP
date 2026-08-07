'use strict';

const LEVEL_RANK = Object.freeze({ L1: 1, L2: 2, L3: 3, L4: 4 });

function frozenAgent(id, label, maxLevel, handoffTargets) {
  return Object.freeze({ id, label, maxLevel, handoffTargets: Object.freeze([...handoffTargets]) });
}

const AGENTS = Object.freeze({
  general_manager: frozenAgent('general_manager', 'AI General Manager', 'L2', ['technical_manager', 'financial_analytics_manager', 'user_assistant']),
  technical_manager: frozenAgent('technical_manager', 'AI Technical Manager', 'L3', ['general_manager']),
  financial_analytics_manager: frozenAgent('financial_analytics_manager', 'AI Financial & Analytics Manager', 'L2', ['general_manager']),
  user_assistant: frozenAgent('user_assistant', 'AI User Assistant', 'L2', ['general_manager']),
});

const DEFAULT_LIMITS = Object.freeze({
  maxHandoffs: 8,
  maxDepth: 4,
  maxToolCalls: 12,
  maxTokens: 50000,
  maxCostMicrousd: 5000000,
  maxElapsedMs: 120000,
  maxEvidenceItems: 32,
});

const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function outcome(ok, reasonCode, extra = {}) {
  return Object.freeze({ ok, reasonCode, ...extra });
}

function normalizeScope(scope) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) throw new TypeError('Scope is required.');
  const country = String(scope.country || '').trim();
  const sector = String(scope.sector || '').trim();
  const resource = String(scope.resource || '').trim();
  if (!country || !sector || !resource || country.length > 16 || sector.length > 64 || resource.length > 128) {
    throw new TypeError('Scope is invalid.');
  }
  return Object.freeze({ country, sector, resource });
}

function normalizeUsage(usage = {}) {
  const values = {
    handoffs: usage.handoffs ?? 0,
    toolCalls: usage.toolCalls ?? 0,
    tokens: usage.tokens ?? 0,
    costMicrousd: usage.costMicrousd ?? 0,
  };
  for (const value of Object.values(values)) {
    if (!Number.isInteger(value) || value < 0) throw new TypeError('Usage is invalid.');
  }
  return Object.freeze(values);
}

function makeSession(fields) {
  return Object.freeze({
    correlationId: fields.correlationId,
    ownerId: fields.ownerId,
    rootAgentId: fields.rootAgentId,
    currentAgentId: fields.currentAgentId,
    scope: fields.scope,
    startedAtMs: fields.startedAtMs,
    path: Object.freeze([...fields.path]),
    usage: fields.usage,
    evidence: Object.freeze([...fields.evidence]),
    limits: fields.limits,
  });
}

function createBoardroomSession({ correlationId, ownerId, rootAgentId, scope, startedAtMs = Date.now(), usage, limits } = {}) {
  const normalizedCorrelation = String(correlationId || '').trim();
  const normalizedOwner = String(ownerId || '').trim();
  if (!CORRELATION_PATTERN.test(normalizedCorrelation)) throw new TypeError('Correlation id is invalid.');
  if (!normalizedOwner || normalizedOwner.length > 256) throw new TypeError('Owner id is invalid.');
  if (!AGENTS[rootAgentId]) throw new TypeError('Root agent is invalid.');
  if (!Number.isFinite(startedAtMs) || startedAtMs < 0) throw new TypeError('Start time is invalid.');
  const boundedLimits = Object.freeze({ ...DEFAULT_LIMITS, ...(limits || {}) });
  return makeSession({
    correlationId: normalizedCorrelation,
    ownerId: normalizedOwner,
    rootAgentId,
    currentAgentId: rootAgentId,
    scope: normalizeScope(scope),
    startedAtMs,
    path: [rootAgentId],
    usage: normalizeUsage(usage),
    evidence: [],
    limits: boundedLimits,
  });
}

function fieldContained(parent, child) {
  return parent === '*' || parent === child;
}

function scopeContained(parentScope, childScope) {
  return fieldContained(parentScope.country, childScope.country)
    && fieldContained(parentScope.sector, childScope.sector)
    && fieldContained(parentScope.resource, childScope.resource);
}

function resourceLimitsExceeded(session, nowMs) {
  const elapsed = nowMs - session.startedAtMs;
  return elapsed > session.limits.maxElapsedMs
    || session.usage.handoffs > session.limits.maxHandoffs
    || session.usage.toolCalls >= session.limits.maxToolCalls
    || session.usage.tokens >= session.limits.maxTokens
    || session.usage.costMicrousd >= session.limits.maxCostMicrousd;
}

function requestHandoff({ session, fromAgentId, toAgentId, scope, requestedLevel, nowMs = Date.now() } = {}) {
  if (!session || !AGENTS[fromAgentId] || !AGENTS[toAgentId]) return outcome(false, 'UNKNOWN_AGENT');
  if (session.currentAgentId !== fromAgentId) return outcome(false, 'HANDOFF_SOURCE_MISMATCH');
  if (!AGENTS[fromAgentId].handoffTargets.includes(toAgentId)) return outcome(false, 'HANDOFF_TARGET_DENIED');
  if (resourceLimitsExceeded(session, nowMs)) return outcome(false, 'RESOURCE_LIMIT_EXCEEDED');
  if (session.usage.handoffs + 1 > session.limits.maxHandoffs) return outcome(false, 'HANDOFF_LIMIT_EXCEEDED');
  if (session.path.length >= session.limits.maxDepth) return outcome(false, 'HANDOFF_DEPTH_EXCEEDED');
  if (session.path.includes(toAgentId)) return outcome(false, 'HANDOFF_CYCLE_DENIED');

  let normalizedScope;
  try {
    normalizedScope = normalizeScope(scope);
  } catch {
    return outcome(false, 'SCOPE_INVALID');
  }
  if (!scopeContained(session.scope, normalizedScope)) return outcome(false, 'SCOPE_EXPANSION_DENIED');

  const level = requestedLevel || AGENTS[toAgentId].maxLevel;
  if (!LEVEL_RANK[level] || LEVEL_RANK[level] > LEVEL_RANK[AGENTS[toAgentId].maxLevel]) {
    return outcome(false, 'PRIVILEGE_ELEVATION_DENIED');
  }

  const next = makeSession({
    ...session,
    currentAgentId: toAgentId,
    scope: normalizedScope,
    path: [...session.path, toAgentId],
    usage: Object.freeze({ ...session.usage, handoffs: session.usage.handoffs + 1 }),
    evidence: session.evidence,
  });
  return outcome(true, 'HANDOFF_ACCEPTED', { session: next, grantedLevel: level });
}

function recordEvidence({ session, agentId, sourceId, freshness, confidence, material = false } = {}) {
  if (!session || !AGENTS[agentId]) return outcome(false, 'UNKNOWN_AGENT');
  if (session.evidence.length >= session.limits.maxEvidenceItems) return outcome(false, 'EVIDENCE_LIMIT_EXCEEDED');
  const normalizedSource = String(sourceId || '').trim();
  if (!normalizedSource || normalizedSource.length > 256) return outcome(false, 'EVIDENCE_SOURCE_INVALID');
  if (!['fresh', 'stale', 'unknown'].includes(freshness)) return outcome(false, 'EVIDENCE_FRESHNESS_INVALID');
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return outcome(false, 'EVIDENCE_CONFIDENCE_INVALID');

  const item = Object.freeze({ agentId, sourceId: normalizedSource, freshness, confidence, material: Boolean(material) });
  const next = makeSession({ ...session, evidence: [...session.evidence, item] });
  return outcome(true, 'EVIDENCE_RECORDED', { session: next });
}

function evidenceCeiling(evidence) {
  const material = evidence.filter((item) => item.material);
  if (!material.length) return 0.55;
  if (material.some((item) => item.freshness !== 'fresh')) return 0.69;
  return Math.min(1, material.reduce((sum, item) => sum + item.confidence, 0) / material.length);
}

function normalizeRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) return Object.freeze([]);
  return Object.freeze(recommendations.slice(0, 12).map((item) => Object.freeze({
    title: String(item?.title || '').slice(0, 256),
    risk: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(item?.risk) ? item.risk : 'MEDIUM',
  })));
}

function finalizeBoardroomDecision({ session, summary, recommendations = [], requestedConfidence = 0, nowMs = Date.now() } = {}) {
  if (!session) return Object.freeze({ status: 'REFUSED', reasonCode: 'SESSION_REQUIRED', confidence: 0, summary: '', recommendations: [] });
  if (resourceLimitsExceeded(session, nowMs)) {
    return Object.freeze({ status: 'REFUSED', reasonCode: 'RESOURCE_LIMIT_EXCEEDED', confidence: 0, summary: String(summary || '').slice(0, 6000), recommendations: normalizeRecommendations(recommendations) });
  }
  const requested = Number.isFinite(requestedConfidence) ? Math.min(Math.max(requestedConfidence, 0), 1) : 0;
  const ceiling = evidenceCeiling(session.evidence);
  const confidence = Math.min(requested, ceiling);
  const materialRecommendation = recommendations.some((item) => ['HIGH', 'CRITICAL'].includes(item?.risk));
  const materialEvidenceReady = session.evidence.some((item) => item.material && item.freshness === 'fresh');
  const status = materialRecommendation && !materialEvidenceReady ? 'INSUFFICIENT_EVIDENCE' : 'OK';
  return Object.freeze({
    status,
    reasonCode: status === 'OK' ? 'BOARDROOM_DECISION_READY' : 'MATERIAL_EVIDENCE_REQUIRED',
    confidence,
    summary: String(summary || '').slice(0, 6000),
    recommendations: normalizeRecommendations(recommendations),
    evidence: session.evidence,
    correlationId: session.correlationId,
  });
}

module.exports = Object.freeze({
  AGENTS,
  DEFAULT_LIMITS,
  createBoardroomSession,
  requestHandoff,
  recordEvidence,
  finalizeBoardroomDecision,
  scopeContained,
});
