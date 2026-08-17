(function attachVvipAiCommandCenter(root, factory) {
  'use strict';

  const registry = typeof module !== 'undefined' && module.exports
    ? require('./sovereign-intelligence-registry.js')
    : root && root.VVIPSovereignIntelligenceRegistry;
  const api = factory(registry);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.VVIPAICommandCenter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVvipAiCommandCenter(registry) {
  'use strict';

  const FEATURE_FLAGS = Object.freeze({
    AI_COMMAND_CENTER_ENABLED: false,
  });

  const AUDIT_METADATA_KEYS = Object.freeze([
    'target',
    'resource',
    'reasonCode',
    'ticketId',
    'prNumber',
  ]);

  if (!registry) {
    const DECISIONS = Object.freeze({ DENY: 'DENY' });
    const failClosed = (action) => Object.freeze({
      action,
      decision: DECISIONS.DENY,
      level: 'L4',
      reasonCode: 'SOVEREIGN_REGISTRY_UNAVAILABLE',
    });

    return Object.freeze({
      ACTIONS: Object.freeze({}),
      AGENTS: Object.freeze({}),
      DECISIONS,
      FEATURE_FLAGS,
      POLICY: Object.freeze({}),
      INFERENCE_POLICY: Object.freeze({ paidRemoteInferenceBudget: 0, paidRemoteFallback: false }),
      REGISTRY_AVAILABLE: false,
      evaluatePolicy: failClosed,
      authorizeAction: ({ action } = {}) => failClosed(action),
      createApprovalRequest: () => { throw new Error('Sovereign registry unavailable.'); },
      createAuditRecord: () => { throw new Error('Sovereign registry unavailable.'); },
      sanitizeAuditMetadata: () => Object.freeze({}),
    });
  }

  const {
    ACTIONS,
    DECISIONS,
    POLICY,
    PROFILES: AGENTS,
    INFERENCE_POLICY,
  } = registry;

  function evaluatePolicy(action) {
    const rule = POLICY[action];

    if (!rule) {
      return Object.freeze({
        action,
        decision: DECISIONS.DENY,
        level: 'L4',
        reasonCode: 'UNKNOWN_ACTION',
      });
    }

    const reasonCode = rule.decision === DECISIONS.DENY
      ? 'PERMANENTLY_FORBIDDEN'
      : rule.decision === DECISIONS.OWNER_APPROVAL_REQUIRED
        ? 'OWNER_APPROVAL_REQUIRED'
        : 'POLICY_ALLOW';

    return Object.freeze({
      action,
      decision: rule.decision,
      level: rule.level,
      reasonCode,
    });
  }

  function authorizeAction({
    agentId,
    action,
    featureEnabled = FEATURE_FLAGS.AI_COMMAND_CENTER_ENABLED,
  } = {}) {
    const policy = evaluatePolicy(action);

    if (policy.decision === DECISIONS.DENY) {
      return policy;
    }

    if (!featureEnabled) {
      return Object.freeze({
        action,
        agentId,
        decision: DECISIONS.DENY,
        level: policy.level,
        reasonCode: 'FEATURE_DISABLED',
      });
    }

    const agent = AGENTS[agentId];
    if (!agent) {
      return Object.freeze({
        action,
        agentId,
        decision: DECISIONS.DENY,
        level: policy.level,
        reasonCode: 'UNKNOWN_AGENT',
      });
    }

    if (!agent.allowedActions.includes(action)) {
      return Object.freeze({
        action,
        agentId,
        decision: DECISIONS.DENY,
        level: policy.level,
        reasonCode: 'AGENT_SCOPE_DENIED',
      });
    }

    if (policy.decision === DECISIONS.OWNER_APPROVAL_REQUIRED) {
      return Object.freeze({
        action,
        agentId,
        decision: DECISIONS.OWNER_APPROVAL_REQUIRED,
        level: policy.level,
        reasonCode: 'OWNER_APPROVAL_REQUIRED',
      });
    }

    return Object.freeze({
      action,
      agentId,
      decision: DECISIONS.ALLOW,
      level: policy.level,
      reasonCode: 'POLICY_ALLOW',
    });
  }

  function defaultIdFactory(prefix) {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
  }

  function sanitizeAuditMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return Object.freeze({});
    }

    const sanitized = {};
    for (const key of AUDIT_METADATA_KEYS) {
      if (Object.prototype.hasOwnProperty.call(metadata, key)) {
        sanitized[key] = metadata[key];
      }
    }

    return Object.freeze(sanitized);
  }

  function createApprovalRequest({
    agentId,
    action,
    requestedBy,
    summary,
    metadata,
    now = () => new Date().toISOString(),
    idFactory = () => defaultIdFactory('approval'),
  } = {}) {
    const policy = evaluatePolicy(action);
    if (policy.decision !== DECISIONS.OWNER_APPROVAL_REQUIRED) {
      throw new Error(`Action ${String(action)} does not require owner approval.`);
    }

    const agent = AGENTS[agentId];
    if (!agent || !agent.allowedActions.includes(action)) {
      throw new Error(`Agent ${String(agentId)} is not allowed to request action ${String(action)}.`);
    }

    return Object.freeze({
      id: idFactory(),
      agentId,
      action,
      requestedBy: requestedBy || 'unknown',
      summary: typeof summary === 'string' ? summary : '',
      status: 'PENDING_OWNER_APPROVAL',
      level: policy.level,
      metadata: sanitizeAuditMetadata(metadata),
      createdAt: now(),
    });
  }

  function createAuditRecord({
    agentId,
    action,
    decision,
    reasonCode,
    requestedBy,
    metadata,
    now = () => new Date().toISOString(),
    idFactory = () => defaultIdFactory('audit'),
  } = {}) {
    return Object.freeze({
      id: idFactory(),
      agentId: agentId || 'unknown',
      action: action || 'unknown',
      decision: decision || DECISIONS.DENY,
      reasonCode: reasonCode || 'UNSPECIFIED',
      requestedBy: requestedBy || 'unknown',
      metadata: sanitizeAuditMetadata(metadata),
      createdAt: now(),
    });
  }

  return Object.freeze({
    ACTIONS,
    AGENTS,
    DECISIONS,
    FEATURE_FLAGS,
    POLICY,
    INFERENCE_POLICY,
    REGISTRY_AVAILABLE: true,
    evaluatePolicy,
    authorizeAction,
    createApprovalRequest,
    createAuditRecord,
    sanitizeAuditMetadata,
  });
});
