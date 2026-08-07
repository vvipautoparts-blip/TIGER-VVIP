'use strict';

const {
  validateGatewayRequest,
  authorizeAgentForIdentity,
  normalizeModelEnvelope,
} = require('./sovereign-model-contract.js');

const LEVEL_RANK = Object.freeze({ L1: 1, L2: 2, L3: 3, L4: 4 });
const MANAGEMENT_AGENTS = Object.freeze(new Set([
  'general_manager',
  'technical_manager',
  'financial_analytics_manager',
]));

function frozenResult(ok, reasonCode, extra = {}) {
  return Object.freeze({ ok, reasonCode, ...extra });
}

function requireMethod(adapter, name, method) {
  if (!adapter || typeof adapter[method] !== 'function') {
    throw new TypeError(`${name}.${method} adapter is required.`);
  }
}

function validateAdapters(adapters) {
  if (!adapters || typeof adapters !== 'object') throw new TypeError('Runtime adapters are required.');
  requireMethod(adapters.identityVerifier, 'identityVerifier', 'verify');
  requireMethod(adapters.runtimeStateStore, 'runtimeStateStore', 'load');
  requireMethod(adapters.quotaManager, 'quotaManager', 'reserve');
  requireMethod(adapters.quotaManager, 'quotaManager', 'settle');
  requireMethod(adapters.quotaManager, 'quotaManager', 'release');
  requireMethod(adapters.evidenceProvider, 'evidenceProvider', 'load');
  requireMethod(adapters.modelAdapter, 'modelAdapter', 'run');
  requireMethod(adapters.usageStore, 'usageStore', 'append');
  requireMethod(adapters.auditStore, 'auditStore', 'append');
  if (adapters.clock !== undefined && typeof adapters.clock !== 'function') throw new TypeError('clock adapter must be a function.');
}

function validateRuntimeState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return frozenResult(false, 'RUNTIME_STATE_INVALID');
  if (state.enabled !== true) return frozenResult(false, 'AGENT_DISABLED');
  if (state.killSwitch === true) return frozenResult(false, 'KILL_SWITCH_ACTIVE');
  if (!LEVEL_RANK[state.maxLevel]) return frozenResult(false, 'RUNTIME_LEVEL_INVALID');
  if (LEVEL_RANK[state.maxLevel] < LEVEL_RANK.L1) return frozenResult(false, 'RUNTIME_LEVEL_CEILING');
  if (!Number.isFinite(state.dailyBudgetMicrousd) || state.dailyBudgetMicrousd < 0) return frozenResult(false, 'RUNTIME_BUDGET_INVALID');
  if (!Number.isFinite(state.requestsPerMinute) || state.requestsPerMinute < 0) return frozenResult(false, 'RUNTIME_RATE_INVALID');
  return frozenResult(true, 'RUNTIME_STATE_VALID');
}

function normalizeEvidenceContext(value) {
  if (!Array.isArray(value)) throw new TypeError('Evidence context must be an array.');
  const output = [];
  for (const item of value.slice(0, 20)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const sourceId = String(item.sourceId || '').trim();
    const content = String(item.content || '').trim();
    const freshness = String(item.freshness || 'unknown');
    const confidence = Number(item.confidence);
    if (!sourceId || sourceId.length > 256 || !content || content.length > 12000) continue;
    if (!['fresh', 'stale', 'unknown'].includes(freshness)) continue;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) continue;
    output.push(Object.freeze({ sourceId, content, freshness, confidence }));
  }
  return Object.freeze(output);
}

function normalizeUsage(raw, request, now) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const provider = String(raw.provider || '').trim();
  const model = String(raw.model || '').trim();
  const promptVersion = String(raw.promptVersion || '').trim();
  const numeric = ['inputTokens', 'outputTokens', 'cachedInputTokens', 'costMicrousd', 'latencyMs'];
  if (!provider || !model || !promptVersion) return null;
  for (const key of numeric) {
    if (!Number.isFinite(raw[key]) || raw[key] < 0) return null;
  }
  return Object.freeze({
    correlationId: request.correlationId,
    agentId: request.agentId,
    provider: provider.slice(0, 128),
    model: model.slice(0, 128),
    promptVersion: promptVersion.slice(0, 128),
    inputTokens: Math.trunc(raw.inputTokens),
    outputTokens: Math.trunc(raw.outputTokens),
    cachedInputTokens: Math.trunc(raw.cachedInputTokens),
    costMicrousd: Math.trunc(raw.costMicrousd),
    latencyMs: Math.trunc(raw.latencyMs),
    recordedAt: now,
  });
}

function buildAuditEvent({ request, identity, result, usage, now }) {
  return Object.freeze({
    correlationId: request.correlationId,
    actorSubject: identity.subject,
    agentId: request.agentId,
    decision: result.ok ? 'ALLOW' : 'ERROR',
    reasonCode: result.reasonCode,
    status: result.value?.status || null,
    confidence: Number.isFinite(result.value?.confidence) ? result.value.confidence : null,
    provider: usage?.provider || null,
    model: usage?.model || null,
    promptVersion: usage?.promptVersion || null,
    costMicrousd: usage?.costMicrousd ?? null,
    createdAt: now,
  });
}

function safeAuthorization(value) {
  const authorization = String(value || '').trim();
  if (!/^Bearer\s+\S+$/i.test(authorization) || authorization.length > 8192) return null;
  return authorization;
}

function createSovereignRuntime(adapters) {
  validateAdapters(adapters);
  const now = adapters.clock || (() => new Date().toISOString());

  async function settleReservation(reservation, usage, outcomeCode) {
    try {
      await adapters.quotaManager.settle({
        reservationId: reservation.reservationId,
        costMicrousd: usage?.costMicrousd ?? null,
        outcomeCode,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function releaseReservation(reservation, outcomeCode) {
    try {
      await adapters.quotaManager.release({ reservationId: reservation.reservationId, outcomeCode });
      return true;
    } catch {
      return false;
    }
  }

  return Object.freeze({
    async execute({ request, authorization } = {}) {
      const validated = validateGatewayRequest(request);
      if (!validated.ok) return frozenResult(false, validated.reasonCode);
      const safeRequest = validated.value;

      const credential = safeAuthorization(authorization);
      if (!credential) return frozenResult(false, 'AUTHENTICATION_REQUIRED');

      let identity;
      try {
        identity = await adapters.identityVerifier.verify({ authorization: credential, correlationId: safeRequest.correlationId });
      } catch {
        return frozenResult(false, 'IDENTITY_VERIFICATION_FAILED');
      }

      const authorized = authorizeAgentForIdentity({ agentId: safeRequest.agentId, identity });
      if (!authorized.ok) return frozenResult(false, authorized.reasonCode);
      const verifiedIdentity = authorized.identity;

      let runtimeState;
      try {
        runtimeState = await adapters.runtimeStateStore.load({ agentId: safeRequest.agentId, actorSubject: verifiedIdentity.subject });
      } catch {
        return frozenResult(false, 'RUNTIME_STATE_UNAVAILABLE');
      }
      const runtimeCheck = validateRuntimeState(runtimeState);
      if (!runtimeCheck.ok) return runtimeCheck;

      let reservation;
      try {
        reservation = await adapters.quotaManager.reserve({
          actorSubject: verifiedIdentity.subject,
          agentId: safeRequest.agentId,
          correlationId: safeRequest.correlationId,
          dailyBudgetMicrousd: runtimeState.dailyBudgetMicrousd,
          requestsPerMinute: runtimeState.requestsPerMinute,
        });
      } catch {
        return frozenResult(false, 'QUOTA_GATE_UNAVAILABLE');
      }
      if (!reservation?.ok) return frozenResult(false, reservation?.reasonCode || 'QUOTA_DENIED');
      if (!reservation.reservationId) return frozenResult(false, 'QUOTA_RESERVATION_INVALID');

      let evidence;
      try {
        const rawEvidence = await adapters.evidenceProvider.load({
          agentId: safeRequest.agentId,
          identity: verifiedIdentity,
          correlationId: safeRequest.correlationId,
        });
        evidence = normalizeEvidenceContext(rawEvidence);
      } catch {
        await releaseReservation(reservation, 'EVIDENCE_UNAVAILABLE');
        return frozenResult(false, 'EVIDENCE_UNAVAILABLE');
      }

      let providerAttempted = false;
      let modelResult;
      try {
        providerAttempted = true;
        modelResult = await adapters.modelAdapter.run({
          agentId: safeRequest.agentId,
          input: safeRequest.input,
          locale: safeRequest.locale,
          correlationId: safeRequest.correlationId,
          evidence,
          identity: Object.freeze({ subject: verifiedIdentity.subject, scopes: verifiedIdentity.scopes }),
        });
      } catch {
        await settleReservation(reservation, null, 'MODEL_FAILED');
        return frozenResult(false, 'MODEL_FAILED');
      }

      const usage = normalizeUsage(modelResult?.usage, safeRequest, String(now()));
      if (!usage) {
        await settleReservation(reservation, null, 'USAGE_INVALID');
        return frozenResult(false, 'USAGE_INVALID');
      }

      const normalized = normalizeModelEnvelope(modelResult?.envelope);
      if (!normalized.ok) {
        await settleReservation(reservation, usage, normalized.reasonCode);
        return frozenResult(false, normalized.reasonCode);
      }

      try {
        await adapters.usageStore.append(usage);
      } catch {
        await settleReservation(reservation, usage, 'USAGE_PERSISTENCE_FAILED');
        return frozenResult(false, 'USAGE_PERSISTENCE_FAILED');
      }

      const successfulResult = frozenResult(true, 'MODEL_RESPONSE_READY', { value: normalized.value });
      try {
        await adapters.auditStore.append(buildAuditEvent({
          request: safeRequest,
          identity: verifiedIdentity,
          result: successfulResult,
          usage,
          now: String(now()),
        }));
      } catch {
        await settleReservation(reservation, usage, 'AUDIT_PERSISTENCE_FAILED');
        return frozenResult(false, 'AUDIT_PERSISTENCE_FAILED');
      }

      const settled = await settleReservation(reservation, usage, 'SUCCESS');
      if (!settled) return frozenResult(false, 'QUOTA_SETTLEMENT_FAILED');

      return Object.freeze({
        ok: true,
        reasonCode: 'MODEL_RESPONSE_READY',
        correlationId: safeRequest.correlationId,
        agentId: safeRequest.agentId,
        result: normalized.value,
      });
    },
  });
}

module.exports = Object.freeze({
  createSovereignRuntime,
  validateRuntimeState,
  normalizeEvidenceContext,
  normalizeUsage,
});
