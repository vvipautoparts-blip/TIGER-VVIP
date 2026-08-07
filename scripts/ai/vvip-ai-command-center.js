(function attachVvipAiCommandCenter(root, factory) {
  'use strict';

  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.VVIPAICommandCenter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVvipAiCommandCenter() {
  'use strict';

  const DECISIONS = Object.freeze({
    ALLOW: 'ALLOW',
    OWNER_APPROVAL_REQUIRED: 'OWNER_APPROVAL_REQUIRED',
    DENY: 'DENY',
  });

  const ACTIONS = Object.freeze({
    READ_ANALYTICS: 'read_analytics',
    GENERATE_REPORT: 'generate_report',
    RUN_TESTS: 'run_tests',
    PROPOSE_CODE_PATCH: 'propose_code_patch',
    CREATE_PR: 'create_pr',
    MERGE_PR: 'merge_pr',
    DEPLOY_PRODUCTION: 'deploy_production',
    CHANGE_PRICES: 'change_prices',
    DELETE_DATA: 'delete_data',
    TRANSFER_FUNDS: 'transfer_funds',
    CHANGE_OWNER_PERMISSIONS: 'change_owner_permissions',
    ASSIST_USER_WRITING: 'assist_user_writing',
    SUGGEST_LISTING_METADATA: 'suggest_listing_metadata',
  });

  const FEATURE_FLAGS = Object.freeze({
    AI_COMMAND_CENTER_ENABLED: false,
  });

  const POLICY = Object.freeze({
    [ACTIONS.READ_ANALYTICS]: Object.freeze({ decision: DECISIONS.ALLOW, level: 'L1' }),
    [ACTIONS.GENERATE_REPORT]: Object.freeze({ decision: DECISIONS.ALLOW, level: 'L1' }),
    [ACTIONS.RUN_TESTS]: Object.freeze({ decision: DECISIONS.ALLOW, level: 'L3' }),
    [ACTIONS.PROPOSE_CODE_PATCH]: Object.freeze({ decision: DECISIONS.ALLOW, level: 'L2' }),
    [ACTIONS.CREATE_PR]: Object.freeze({ decision: DECISIONS.ALLOW, level: 'L3' }),
    [ACTIONS.MERGE_PR]: Object.freeze({ decision: DECISIONS.OWNER_APPROVAL_REQUIRED, level: 'L4' }),
    [ACTIONS.DEPLOY_PRODUCTION]: Object.freeze({ decision: DECISIONS.OWNER_APPROVAL_REQUIRED, level: 'L4' }),
    [ACTIONS.CHANGE_PRICES]: Object.freeze({ decision: DECISIONS.OWNER_APPROVAL_REQUIRED, level: 'L4' }),
    [ACTIONS.DELETE_DATA]: Object.freeze({ decision: DECISIONS.DENY, level: 'L4' }),
    [ACTIONS.TRANSFER_FUNDS]: Object.freeze({ decision: DECISIONS.DENY, level: 'L4' }),
    [ACTIONS.CHANGE_OWNER_PERMISSIONS]: Object.freeze({ decision: DECISIONS.DENY, level: 'L4' }),
    [ACTIONS.ASSIST_USER_WRITING]: Object.freeze({ decision: DECISIONS.ALLOW, level: 'L1' }),
    [ACTIONS.SUGGEST_LISTING_METADATA]: Object.freeze({ decision: DECISIONS.ALLOW, level: 'L2' }),
  });

  const AGENTS = Object.freeze({
    general_manager: Object.freeze({
      id: 'general_manager',
      label: 'AI General Manager',
      mission: 'Coordinate platform intelligence and owner-facing summaries without bypassing specialist or owner controls.',
      allowedActions: Object.freeze([
        ACTIONS.READ_ANALYTICS,
        ACTIONS.GENERATE_REPORT,
      ]),
    }),
    technical_manager: Object.freeze({
      id: 'technical_manager',
      label: 'AI Technical Manager',
      mission: 'Analyze engineering health, run verification, prepare safe patches and owner-gated release requests.',
      allowedActions: Object.freeze([
        ACTIONS.READ_ANALYTICS,
        ACTIONS.GENERATE_REPORT,
        ACTIONS.RUN_TESTS,
        ACTIONS.PROPOSE_CODE_PATCH,
        ACTIONS.CREATE_PR,
        ACTIONS.MERGE_PR,
        ACTIONS.DEPLOY_PRODUCTION,
      ]),
    }),
    financial_analytics_manager: Object.freeze({
      id: 'financial_analytics_manager',
      label: 'AI Financial & Analytics Manager',
      mission: 'Analyze revenue, cost and growth signals and prepare owner-gated pricing proposals without moving funds.',
      allowedActions: Object.freeze([
        ACTIONS.READ_ANALYTICS,
        ACTIONS.GENERATE_REPORT,
        ACTIONS.CHANGE_PRICES,
      ]),
    }),
    user_assistant: Object.freeze({
      id: 'user_assistant',
      label: 'AI User Assistant',
      mission: 'Help users write, organize and classify content without access to management controls.',
      allowedActions: Object.freeze([
        ACTIONS.ASSIST_USER_WRITING,
        ACTIONS.SUGGEST_LISTING_METADATA,
      ]),
    }),
  });

  const AUDIT_METADATA_KEYS = Object.freeze([
    'target',
    'resource',
    'reasonCode',
    'ticketId',
    'prNumber',
  ]);

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
    ownerApproved = false,
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

    if (policy.decision === DECISIONS.OWNER_APPROVAL_REQUIRED && !ownerApproved) {
      return Object.freeze({
        action,
        agentId,
        decision: DECISIONS.OWNER_APPROVAL_REQUIRED,
        level: policy.level,
        reasonCode: 'OWNER_APPROVAL_REQUIRED',
      });
    }

    if (policy.decision === DECISIONS.OWNER_APPROVAL_REQUIRED && ownerApproved) {
      return Object.freeze({
        action,
        agentId,
        decision: DECISIONS.ALLOW,
        level: policy.level,
        reasonCode: 'OWNER_APPROVAL_VERIFIED',
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
    evaluatePolicy,
    authorizeAction,
    createApprovalRequest,
    createAuditRecord,
    sanitizeAuditMetadata,
  });
});
