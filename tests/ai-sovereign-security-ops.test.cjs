'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  AGENTIC_THREAT_CLASSES,
  createOperationalEvent,
  evaluateCircuitBreaker,
  evaluateOperationalAlerts,
  createIncidentState,
  advanceIncidentState,
} = require('../scripts/ai/sovereign-security-ops.js');

const evalPath = path.join(__dirname, '..', 'data', 'ai', 'sovereign-eval-catalog.json');
const threatModelPath = path.join(__dirname, '..', 'docs', 'ai', 'TIGER_SOVEREIGN_THREAT_MODEL_2026.md');
const incidentPath = path.join(__dirname, '..', 'docs', 'ai', 'TIGER_SOVEREIGN_INCIDENT_RUNBOOK.md');

test('agentic threat model covers the critical 2026 attack classes', () => {
  const expected = [
    'GOAL_HIJACKING', 'TOOL_MISUSE', 'IDENTITY_PRIVILEGE_ABUSE', 'MEMORY_CONTEXT_POISONING',
    'INSECURE_INTER_AGENT_COMMUNICATION', 'CASCADING_FAILURES', 'TRUST_EXPLOITATION', 'ROGUE_AGENT_BEHAVIOR',
  ];
  assert.deepEqual([...AGENTIC_THREAT_CLASSES].sort(), expected.sort());
  assert.equal(fs.existsSync(threatModelPath), true);
  const threatModel = fs.readFileSync(threatModelPath, 'utf8');
  for (const threat of expected) assert.match(threatModel, new RegExp(threat));
});

test('adversarial eval catalog is bilingual and includes injection, forged-owner, tool, secret and scope probes', () => {
  assert.equal(fs.existsSync(evalPath), true);
  const cases = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
  assert.ok(Array.isArray(cases));
  assert.ok(cases.length >= 10);
  assert.ok(cases.some((item) => item.locale === 'ar'));
  assert.ok(cases.some((item) => item.locale === 'en'));
  for (const category of ['PROMPT_INJECTION', 'FORGED_OWNER', 'TOOL_INVENTION', 'SECRET_EXFILTRATION', 'CROSS_SCOPE']) {
    assert.ok(cases.some((item) => item.category === category), `missing ${category}`);
  }
  for (const item of cases) {
    assert.equal(typeof item.id, 'string');
    assert.ok(['ar', 'en'].includes(item.locale));
    assert.ok(['REFUSE', 'ALLOW_SAFE', 'INSUFFICIENT_EVIDENCE'].includes(item.expected));
    assert.equal(JSON.stringify(item).includes('sk-'), false);
  }
});

test('operational events retain only bounded allowlisted metadata and never secret-shaped fields', () => {
  const event = createOperationalEvent({
    correlationId: 'corr-ops-0001', type: 'MODEL_REQUEST', agentId: 'general_manager',
    metadata: { latencyMs: 1200, costMicrousd: 2500, country: 'JO', token: ['private', 'value'].join('-'), rawPrompt: 'drop', arbitrary: 'drop' },
    at: '2026-08-07T10:20:00Z',
  });
  assert.deepEqual(event.metadata, { latencyMs: 1200, costMicrousd: 2500, country: 'JO' });
  assert.equal(JSON.stringify(event).includes('private-value'), false);
});

test('circuit breaker opens on repeated provider failures and requires explicit recovery state', () => {
  const open = evaluateCircuitBreaker({ requests: 100, failures: 25, consecutiveFailures: 6, currentState: 'CLOSED' });
  assert.equal(open.state, 'OPEN');
  assert.equal(open.allowRequest, false);
  const halfOpen = evaluateCircuitBreaker({ requests: 0, failures: 0, consecutiveFailures: 0, currentState: 'OPEN', humanRecoveryApproved: true });
  assert.equal(halfOpen.state, 'HALF_OPEN');
  assert.equal(halfOpen.allowRequest, true);
});

test('operational alerts trigger on cost runaway, error spike and repeated authorization denial', () => {
  const alerts = evaluateOperationalAlerts({
    dailyCostMicrousd: 12000000, dailyCostLimitMicrousd: 10000000,
    requestCount: 1000, errorCount: 90,
    authorizationDenials: 70, authorizationDenialLimit: 50,
  });
  assert.ok(alerts.some((item) => item.code === 'AI_COST_LIMIT_EXCEEDED'));
  assert.ok(alerts.some((item) => item.code === 'AI_ERROR_RATE_HIGH'));
  assert.ok(alerts.some((item) => item.code === 'AI_AUTHORIZATION_DENIAL_SPIKE'));
  assert.ok(alerts.every((item) => item.action === 'DISABLE_OR_REVIEW'));
});

test('incident lifecycle starts with AI disabled and cannot jump to recovery without evidence and owner approval', () => {
  const incident = createIncidentState({ id: 'INC-AI-001', severity: 'P0', reason: 'suspected credential exposure', openedAt: '2026-08-07T10:25:00Z' });
  assert.equal(incident.aiEnabled, false);
  assert.equal(incident.state, 'CONTAIN');
  const denied = advanceIncidentState({ incident, targetState: 'RECOVER', evidence: [], ownerApproved: false, at: '2026-08-07T10:30:00Z' });
  assert.equal(denied.reasonCode, 'RECOVERY_GATES_NOT_MET');
  const investigate = advanceIncidentState({ incident, targetState: 'INVESTIGATE', evidence: ['audit-preserved'], ownerApproved: false, at: '2026-08-07T10:30:00Z' });
  assert.equal(investigate.ok, true);
});

test('incident runbook codifies contain rotate preserve investigate recover verify sequence', () => {
  assert.equal(fs.existsSync(incidentPath), true);
  const runbook = fs.readFileSync(incidentPath, 'utf8');
  for (const word of ['CONTAIN', 'ROTATE', 'PRESERVE', 'INVESTIGATE', 'RECOVER', 'VERIFY']) assert.match(runbook, new RegExp(word));
});
