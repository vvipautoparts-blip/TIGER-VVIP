(function attachSovereignIntelligenceRegistry(root, factory) {
  'use strict';

  const registry = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = registry;
  }

  if (root) {
    root.VVIPSovereignIntelligenceRegistry = registry;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSovereignIntelligenceRegistry() {
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

  const PROFILE_DEFINITIONS = Object.freeze({
    security_sentinel: Object.freeze({
      id: 'security_sentinel',
      label: 'Security Sentinel',
      mission: 'Assess security posture and verification evidence without changing production security, IAM or secrets.',
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
    trust_abuse_sentinel: Object.freeze({
      id: 'trust_abuse_sentinel',
      label: 'Trust & Abuse Sentinel',
      mission: 'Analyze abuse and trust signals through bounded approved data paths without destructive user or data authority.',
      allowedActions: Object.freeze([
        ACTIONS.READ_ANALYTICS,
        ACTIONS.GENERATE_REPORT,
      ]),
    }),
    market_intelligence: Object.freeze({
      id: 'market_intelligence',
      label: 'Market Intelligence',
      mission: 'Analyze marketplace, country and sector signals and prepare owner-gated pricing proposals without moving funds.',
      allowedActions: Object.freeze([
        ACTIONS.READ_ANALYTICS,
        ACTIONS.GENERATE_REPORT,
        ACTIONS.CHANGE_PRICES,
      ]),
    }),
    operations_sentinel: Object.freeze({
      id: 'operations_sentinel',
      label: 'Operations Sentinel',
      mission: 'Coordinate operational health and owner-facing summaries without bypassing specialist or owner controls.',
      allowedActions: Object.freeze([
        ACTIONS.READ_ANALYTICS,
        ACTIONS.GENERATE_REPORT,
      ]),
    }),
    owner_intelligence: Object.freeze({
      id: 'owner_intelligence',
      label: 'Owner Intelligence',
      mission: 'Synthesize approved cross-domain evidence for the owner while preserving specialist and policy boundaries.',
      allowedActions: Object.freeze([
        ACTIONS.READ_ANALYTICS,
        ACTIONS.GENERATE_REPORT,
      ]),
    }),
    user_assistant: Object.freeze({
      id: 'user_assistant',
      label: 'User Assistant',
      mission: 'Help users write, organize and classify their own content without management-control authority or general private-message memory.',
      allowedActions: Object.freeze([
        ACTIONS.ASSIST_USER_WRITING,
        ACTIONS.SUGGEST_LISTING_METADATA,
      ]),
    }),
  });

  const PROFILES = PROFILE_DEFINITIONS;

  const AGENT_ACTIONS = Object.freeze(Object.fromEntries(
    Object.entries(PROFILES).map(([id, profile]) => [id, profile.allowedActions]),
  ));

  const ACTOR_AGENT_SCOPES = Object.freeze({
    OWNER: Object.freeze([
      'security_sentinel',
      'trust_abuse_sentinel',
      'market_intelligence',
      'operations_sentinel',
      'owner_intelligence',
      'user_assistant',
    ]),
    STAFF: Object.freeze(['user_assistant']),
    USER: Object.freeze(['user_assistant']),
  });

  const TOOL_REGISTRY = Object.freeze({
    'engineering.run_tests': Object.freeze({
      id: 'engineering.run_tests',
      action: ACTIONS.RUN_TESTS,
      level: 'L3',
      mutating: false,
      allowedAgents: Object.freeze(['security_sentinel']),
    }),
    'engineering.create_pr': Object.freeze({
      id: 'engineering.create_pr',
      action: ACTIONS.CREATE_PR,
      level: 'L3',
      mutating: true,
      allowedAgents: Object.freeze(['security_sentinel']),
    }),
    'platform.read_analytics': Object.freeze({
      id: 'platform.read_analytics',
      action: ACTIONS.READ_ANALYTICS,
      level: 'L1',
      mutating: false,
      allowedAgents: Object.freeze([
        'security_sentinel',
        'trust_abuse_sentinel',
        'market_intelligence',
        'operations_sentinel',
        'owner_intelligence',
      ]),
    }),
    'user.assist_writing': Object.freeze({
      id: 'user.assist_writing',
      action: ACTIONS.ASSIST_USER_WRITING,
      level: 'L1',
      mutating: false,
      allowedAgents: Object.freeze(['user_assistant']),
    }),
  });

  const INTELLIGENCE_LADDER = Object.freeze([
    'deterministic_rule',
    'metric',
    'small_local_model',
    'browser_built_in_ai',
    'no_ai',
  ]);

  const INFERENCE_POLICY = Object.freeze({
    paidRemoteInferenceBudget: 0,
    paidRemoteFallback: false,
    directDatabaseAccess: false,
    serviceRoleAccess: false,
    awsCredentialAccess: false,
    iamMutation: false,
    secretReveal: false,
    destructiveProductionWrites: false,
    privateMessagesGeneralMemory: false,
    localModelLazyLoad: true,
    webWorkerPreferred: true,
    webGpuPreferred: true,
    wasmFallback: true,
    noAiFallback: true,
  });

  return Object.freeze({
    ACTIONS,
    DECISIONS,
    POLICY,
    AGENT_ACTIONS,
    ACTOR_AGENT_SCOPES,
    TOOL_REGISTRY,
    PROFILES,
    INTELLIGENCE_LADDER,
    INFERENCE_POLICY,
  });
});
