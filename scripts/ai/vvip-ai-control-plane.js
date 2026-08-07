'use strict';

const RISK_LEVELS = Object.freeze({
  L0_READ: 'L0_READ',
  L1_PROPOSE: 'L1_PROPOSE',
  L2_REVERSIBLE_EXECUTION: 'L2_REVERSIBLE_EXECUTION',
  L3_OWNER_APPROVAL_REQUIRED: 'L3_OWNER_APPROVAL_REQUIRED'
});

const ACTION_STATES = Object.freeze({
  PROPOSED: 'PROPOSED',
  POLICY_EVALUATED: 'POLICY_EVALUATED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  APPROVED: 'APPROVED',
  EXECUTING: 'EXECUTING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  ROLLED_BACK: 'ROLLED_BACK',
  REJECTED: 'REJECTED'
});

const CAPABILITIES = deepFreeze({
  'platform.health.read': { risk: RISK_LEVELS.L0_READ, executable: false, reversible: false },
  'analytics.read': { risk: RISK_LEVELS.L0_READ, executable: false, reversible: false },
  'technical.metrics.read': { risk: RISK_LEVELS.L0_READ, executable: false, reversible: false },
  'finance.analytics.read': { risk: RISK_LEVELS.L0_READ, executable: false, reversible: false },
  'user.help.read': { risk: RISK_LEVELS.L0_READ, executable: false, reversible: false },
  'technical.change.propose': { risk: RISK_LEVELS.L1_PROPOSE, executable: false, reversible: false },
  'finance.change.propose': { risk: RISK_LEVELS.L1_PROPOSE, executable: false, reversible: false },
  'content.suggest': { risk: RISK_LEVELS.L1_PROPOSE, executable: false, reversible: false },
  'user.support.propose': { risk: RISK_LEVELS.L1_PROPOSE, executable: false, reversible: false },
  'reversible.operation.request': { risk: RISK_LEVELS.L2_REVERSIBLE_EXECUTION, executable: true, reversible: true },
  'account.restriction.request': { risk: RISK_LEVELS.L3_OWNER_APPROVAL_REQUIRED, executable: true, reversible: true },
  'role.change.request': { risk: RISK_LEVELS.L3_OWNER_APPROVAL_REQUIRED, executable: true, reversible: true },
  'production.change.request': { risk: RISK_LEVELS.L3_OWNER_APPROVAL_REQUIRED, executable: true, reversible: false },
  'finance.disbursement.request': { risk: RISK_LEVELS.L3_OWNER_APPROVAL_REQUIRED, executable: true, reversible: false }
});

const AGENTS = deepFreeze({
  'ai-general-manager': {
    name: 'AI General Manager',
    capabilities: [
      'platform.health.read',
      'analytics.read',
      'technical.change.propose',
      'finance.change.propose',
      'reversible.operation.request',
      'account.restriction.request',
      'role.change.request',
      'production.change.request'
    ]
  },
  'ai-technical-manager': {
    name: 'AI Technical Manager',
    capabilities: [
      'platform.health.read',
      'technical.metrics.read',
      'technical.change.propose',
      'reversible.operation.request',
      'production.change.request'
    ]
  },
  'ai-financial-analytics-manager': {
    name: 'AI Financial & Analytics Manager',
    capabilities: [
      'analytics.read',
      'finance.analytics.read',
      'finance.change.propose',
      'finance.disbursement.request'
    ]
  },
  'ai-user-assistant': {
    name: 'AI User Assistant',
    capabilities: [
      'user.help.read',
      'content.suggest',
      'user.support.propose'
    ]
  }
});

const RESERVED_INPUT_FIELDS = new Set([
  'risk', 'state', 'approvedBy', 'approval', 'executionAllowed',
  'createdAt', 'updatedAt', 'requestId', 'id'
]);

const SENSITIVE_KEY = /^(authorization|password|passwd|secret|service[_-]?role|api[_-]?key|access[_-]?token|refresh[_-]?token)$/i;
const SENSITIVE_VALUE = /\bsbp_[A-Za-z0-9_-]{8,}\b|postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/i;

const TRANSITIONS = Object.freeze({
  [ACTION_STATES.PROPOSED]: new Set([ACTION_STATES.POLICY_EVALUATED, ACTION_STATES.REJECTED]),
  [ACTION_STATES.POLICY_EVALUATED]: new Set([ACTION_STATES.APPROVAL_REQUIRED, ACTION_STATES.APPROVED, ACTION_STATES.REJECTED]),
  [ACTION_STATES.APPROVAL_REQUIRED]: new Set([ACTION_STATES.APPROVED, ACTION_STATES.REJECTED]),
  [ACTION_STATES.APPROVED]: new Set([ACTION_STATES.EXECUTING, ACTION_STATES.REJECTED]),
  [ACTION_STATES.EXECUTING]: new Set([ACTION_STATES.SUCCEEDED, ACTION_STATES.FAILED]),
  [ACTION_STATES.FAILED]: new Set([ACTION_STATES.ROLLED_BACK]),
  [ACTION_STATES.SUCCEEDED]: new Set(),
  [ACTION_STATES.ROLLED_BACK]: new Set(),
  [ACTION_STATES.REJECTED]: new Set()
});

class ControlPlaneError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ControlPlaneError';
    this.code = code;
  }
}

class VvipAiControlPlane {
  constructor(options = {}) {
    this.executionEnabled = options.executionEnabled === true;
    this.killSwitchEnabled = options.killSwitchEnabled !== false;
    this.ownerAuthorizer = typeof options.ownerAuthorizer === 'function' ? options.ownerAuthorizer : () => false;
    this.gatewayAuthorizer = typeof options.gatewayAuthorizer === 'function' ? options.gatewayAuthorizer : () => false;
    this.auditSink = typeof options.auditSink === 'function' ? options.auditSink : () => {};
    this.now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    this.idFactory = typeof options.idFactory === 'function' ? options.idFactory : defaultIdFactory();
    this.requests = new Map();
    this.idempotency = new Map();
    this.audit = [];
  }

  submit(input) {
    assertPlainObject(input, 'INVALID_REQUEST', 'Action request must be a plain object.');
    rejectReservedFields(input);

    const { agentId, capability, idempotencyKey } = input;
    if (!AGENTS[agentId]) throw new ControlPlaneError('UNKNOWN_AGENT', 'Unknown AI agent.');
    if (!CAPABILITIES[capability]) throw new ControlPlaneError('UNKNOWN_CAPABILITY', 'Unknown AI capability.');
    if (!AGENTS[agentId].capabilities.includes(capability)) {
      this._record(null, agentId, capability, ACTION_STATES.REJECTED, 'CAPABILITY_NOT_ASSIGNED');
      throw new ControlPlaneError('CAPABILITY_NOT_ASSIGNED', 'Capability is not assigned to this AI agent.');
    }
    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length < 8 || idempotencyKey.length > 128) {
      throw new ControlPlaneError('INVALID_IDEMPOTENCY_KEY', 'A stable idempotency key between 8 and 128 characters is required.');
    }

    const payload = cloneJson(input.payload ?? {});
    assertNoSecrets(payload);
    const fingerprint = stableStringify({ agentId, capability, payload });
    const existing = this.idempotency.get(idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        this._record(existing.requestId, agentId, capability, ACTION_STATES.REJECTED, 'IDEMPOTENCY_TAMPER_DETECTED');
        throw new ControlPlaneError('IDEMPOTENCY_TAMPER_DETECTED', 'Idempotency key was reused with different request content.');
      }
      return this.getRequest(existing.requestId);
    }

    const cap = CAPABILITIES[capability];
    const timestamp = this.now();
    const request = {
      id: this.idFactory(),
      agentId,
      capability,
      risk: cap.risk,
      state: ACTION_STATES.PROPOSED,
      payload: deepFreeze(payload),
      idempotencyKey,
      approval: null,
      decision: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.requests.set(request.id, request);
    this.idempotency.set(idempotencyKey, { requestId: request.id, fingerprint });
    this._record(request.id, agentId, capability, ACTION_STATES.PROPOSED, 'REQUEST_ACCEPTED');
    this._transition(request, ACTION_STATES.POLICY_EVALUATED, 'POLICY_EVALUATED');

    if (cap.risk === RISK_LEVELS.L3_OWNER_APPROVAL_REQUIRED) {
      request.decision = 'OWNER_APPROVAL_REQUIRED';
      this._transition(request, ACTION_STATES.APPROVAL_REQUIRED, request.decision);
    } else {
      request.decision = cap.executable ? 'APPROVED_BUT_EXECUTION_GATED' : 'APPROVED_READ_OR_PROPOSE';
      this._transition(request, ACTION_STATES.APPROVED, request.decision);
    }

    return this.getRequest(request.id);
  }

  approve(requestId, actor) {
    const request = this._getMutable(requestId);
    if (request.risk !== RISK_LEVELS.L3_OWNER_APPROVAL_REQUIRED || request.state !== ACTION_STATES.APPROVAL_REQUIRED) {
      throw new ControlPlaneError('APPROVAL_NOT_APPLICABLE', 'This request is not awaiting owner approval.');
    }
    if (!this.ownerAuthorizer(actor)) {
      this._record(request.id, request.agentId, request.capability, ACTION_STATES.REJECTED, 'UNAUTHORIZED_APPROVER');
      throw new ControlPlaneError('OWNER_APPROVAL_REQUIRED', 'Only the verified owner may approve this request.');
    }

    request.approval = deepFreeze({ actorType: 'owner', approvedAt: this.now() });
    request.decision = 'OWNER_APPROVED';
    this._transition(request, ACTION_STATES.APPROVED, request.decision, 'owner');
    return this.getRequest(request.id);
  }

  reject(requestId, actor, reason = 'OWNER_REJECTED') {
    const request = this._getMutable(requestId);
    if (!this.ownerAuthorizer(actor)) throw new ControlPlaneError('OWNER_APPROVAL_REQUIRED', 'Only the verified owner may reject privileged requests.');
    if (![ACTION_STATES.APPROVAL_REQUIRED, ACTION_STATES.APPROVED].includes(request.state)) {
      throw new ControlPlaneError('INVALID_STATE_TRANSITION', 'Request cannot be rejected from its current state.');
    }
    this._transition(request, ACTION_STATES.REJECTED, reason, 'owner');
    return this.getRequest(request.id);
  }

  setKillSwitch(enabled, actor) {
    if (!this.ownerAuthorizer(actor)) throw new ControlPlaneError('OWNER_APPROVAL_REQUIRED', 'Only the verified owner may change the AI kill switch.');
    this.killSwitchEnabled = Boolean(enabled);
    this._record(null, 'owner', 'runtime.kill-switch', this.killSwitchEnabled ? 'KILL_SWITCH_ON' : 'KILL_SWITCH_OFF', 'OWNER_CONTROL', 'owner');
    return this.getRuntimeState();
  }

  startExecution(requestId, actor) {
    const request = this._getMutable(requestId);
    const cap = CAPABILITIES[request.capability];
    if (!cap.executable) throw new ControlPlaneError('NOT_EXECUTABLE', 'Read/propose capabilities cannot enter execution.');
    if (request.state !== ACTION_STATES.APPROVED) throw new ControlPlaneError('INVALID_STATE_TRANSITION', 'Only approved requests may execute.');
    if (!this.executionEnabled) throw new ControlPlaneError('EXECUTION_DISABLED_AI01', 'AI-01 is dry-run/read/propose only.');
    if (this.killSwitchEnabled) throw new ControlPlaneError('KILL_SWITCH_ACTIVE', 'AI execution is disabled by the owner kill switch.');
    if (!this.gatewayAuthorizer(actor)) throw new ControlPlaneError('TRUSTED_GATEWAY_REQUIRED', 'Execution requires the trusted server-side gateway.');
    if (request.risk === RISK_LEVELS.L3_OWNER_APPROVAL_REQUIRED && !request.approval) {
      throw new ControlPlaneError('OWNER_APPROVAL_REQUIRED', 'Privileged execution requires owner approval.');
    }
    this._transition(request, ACTION_STATES.EXECUTING, 'TRUSTED_GATEWAY_STARTED', 'gateway');
    return this.getRequest(request.id);
  }

  markSucceeded(requestId, actor) {
    const request = this._authorizedGatewayRequest(requestId, actor, ACTION_STATES.EXECUTING);
    this._transition(request, ACTION_STATES.SUCCEEDED, 'EXECUTION_SUCCEEDED', 'gateway');
    return this.getRequest(request.id);
  }

  markFailed(requestId, actor, reason = 'EXECUTION_FAILED') {
    const request = this._authorizedGatewayRequest(requestId, actor, ACTION_STATES.EXECUTING);
    this._transition(request, ACTION_STATES.FAILED, reason, 'gateway');
    return this.getRequest(request.id);
  }

  markRolledBack(requestId, actor) {
    const request = this._authorizedGatewayRequest(requestId, actor, ACTION_STATES.FAILED);
    if (!CAPABILITIES[request.capability].reversible) {
      throw new ControlPlaneError('ROLLBACK_NOT_SUPPORTED', 'Capability is not declared reversible.');
    }
    this._transition(request, ACTION_STATES.ROLLED_BACK, 'ROLLBACK_COMPLETED', 'gateway');
    return this.getRequest(request.id);
  }

  getRequest(requestId) {
    const request = this._getMutable(requestId);
    return deepFreeze(cloneJson(request));
  }

  getAuditLog() {
    return deepFreeze(cloneJson(this.audit));
  }

  getRuntimeState() {
    return Object.freeze({
      mode: this.executionEnabled ? 'EXECUTION_CAPABLE' : 'AI01_DRY_RUN',
      executionEnabled: this.executionEnabled,
      killSwitchEnabled: this.killSwitchEnabled
    });
  }

  _authorizedGatewayRequest(requestId, actor, requiredState) {
    const request = this._getMutable(requestId);
    if (!this.gatewayAuthorizer(actor)) throw new ControlPlaneError('TRUSTED_GATEWAY_REQUIRED', 'Trusted gateway authorization failed.');
    if (request.state !== requiredState) throw new ControlPlaneError('INVALID_STATE_TRANSITION', `Expected state ${requiredState}.`);
    return request;
  }

  _getMutable(requestId) {
    const request = this.requests.get(requestId);
    if (!request) throw new ControlPlaneError('REQUEST_NOT_FOUND', 'AI action request was not found.');
    return request;
  }

  _transition(request, nextState, reason, actorType = 'system') {
    const allowed = TRANSITIONS[request.state];
    if (!allowed || !allowed.has(nextState)) {
      throw new ControlPlaneError('INVALID_STATE_TRANSITION', `Cannot transition from ${request.state} to ${nextState}.`);
    }
    request.state = nextState;
    request.updatedAt = this.now();
    this._record(request.id, request.agentId, request.capability, nextState, reason, actorType);
  }

  _record(requestId, agentId, capability, state, reason, actorType = 'system') {
    const event = deepFreeze({
      sequence: this.audit.length + 1,
      timestamp: this.now(),
      requestId,
      agentId,
      capability,
      state,
      reason,
      actorType
    });
    this.audit.push(event);
    this.auditSink(event);
  }
}

function rejectReservedFields(input) {
  for (const field of RESERVED_INPUT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      throw new ControlPlaneError('REQUEST_TAMPERED', `Caller may not set reserved field: ${field}`);
    }
  }
}

function assertNoSecrets(value, path = 'payload') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) throw new ControlPlaneError('SENSITIVE_MATERIAL_REJECTED', `Sensitive field is not allowed in AI requests: ${path}.${key}`);
      assertNoSecrets(nested, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === 'string' && SENSITIVE_VALUE.test(value)) {
    throw new ControlPlaneError('SENSITIVE_MATERIAL_REJECTED', `Sensitive material is not allowed in AI requests: ${path}`);
  }
}

function cloneJson(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    throw new ControlPlaneError('INVALID_PAYLOAD', 'Payload must be JSON serializable.');
  }
}

function assertPlainObject(value, code, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ControlPlaneError(code, message);
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function defaultIdFactory() {
  let counter = 0;
  return () => {
    counter += 1;
    return `ai-action-${Date.now().toString(36)}-${counter.toString(36)}`;
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function createControlPlane(options) {
  return new VvipAiControlPlane(options);
}

module.exports = {
  ACTION_STATES,
  AGENTS,
  CAPABILITIES,
  ControlPlaneError,
  RISK_LEVELS,
  VvipAiControlPlane,
  createControlPlane
};
