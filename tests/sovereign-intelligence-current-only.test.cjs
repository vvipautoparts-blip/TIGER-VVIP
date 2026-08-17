'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const registryPath = path.join(ROOT, 'scripts', 'ai', 'sovereign-intelligence-registry.js');
const kernelPath = path.join(ROOT, 'scripts', 'ai', 'sovereign-security-kernel.js');
const commandCenterPath = path.join(ROOT, 'scripts', 'ai', 'vvip-ai-command-center.js');
const ownerControlPath = path.join(ROOT, 'owner-control.html');
const authorityPath = path.join(ROOT, 'project-control', 'production-handover', 'current-authority.v1.json');

function loadRegistry() {
  delete require.cache[require.resolve(registryPath)];
  return require(registryPath);
}

function loadKernel() {
  delete require.cache[require.resolve(kernelPath)];
  return require(kernelPath);
}

test('one canonical sovereign intelligence registry exists and owns declarative authority', () => {
  assert.equal(fs.existsSync(registryPath), true, 'canonical registry file must exist');
  const registry = loadRegistry();

  for (const key of [
    'ACTIONS',
    'DECISIONS',
    'POLICY',
    'AGENT_ACTIONS',
    'ACTOR_AGENT_SCOPES',
    'TOOL_REGISTRY',
    'PROFILES',
    'INTELLIGENCE_LADDER',
    'INFERENCE_POLICY',
  ]) {
    assert.ok(registry[key], `${key} must be exported by the canonical registry`);
    assert.equal(Object.isFrozen(registry[key]), true, `${key} must be frozen`);
  }

  assert.deepEqual(registry.INTELLIGENCE_LADDER, [
    'deterministic_rule',
    'metric',
    'small_local_model',
    'browser_built_in_ai',
    'no_ai',
  ]);

  assert.deepEqual(Object.keys(registry.PROFILES).sort(), [
    'market_intelligence',
    'operations_sentinel',
    'owner_intelligence',
    'security_sentinel',
    'trust_abuse_sentinel',
    'user_assistant',
  ]);
});

test('zero-paid-inference and sensitive-boundary defaults are fail closed', () => {
  const { INFERENCE_POLICY } = loadRegistry();

  assert.equal(INFERENCE_POLICY.paidRemoteInferenceBudget, 0);
  assert.equal(INFERENCE_POLICY.paidRemoteFallback, false);
  assert.equal(INFERENCE_POLICY.directDatabaseAccess, false);
  assert.equal(INFERENCE_POLICY.serviceRoleAccess, false);
  assert.equal(INFERENCE_POLICY.awsCredentialAccess, false);
  assert.equal(INFERENCE_POLICY.iamMutation, false);
  assert.equal(INFERENCE_POLICY.secretReveal, false);
  assert.equal(INFERENCE_POLICY.destructiveProductionWrites, false);
  assert.equal(INFERENCE_POLICY.privateMessagesGeneralMemory, false);
});

test('security kernel consumes registry objects rather than maintaining a second policy table', () => {
  const registry = loadRegistry();
  const kernel = loadKernel();
  const source = fs.readFileSync(kernelPath, 'utf8');

  assert.match(source, /require\(['"]\.\/sovereign-intelligence-registry\.js['"]\)/);
  assert.equal(kernel.ACTIONS, registry.ACTIONS);
  assert.equal(kernel.DECISIONS, registry.DECISIONS);
  assert.equal(kernel.POLICY, registry.POLICY);
  assert.equal(kernel.AGENT_ACTIONS, registry.AGENT_ACTIONS);
  assert.equal(kernel.ACTOR_AGENT_SCOPES, registry.ACTOR_AGENT_SCOPES);
  assert.equal(kernel.TOOL_REGISTRY, registry.TOOL_REGISTRY);
  assert.equal(kernel.PROFILES, registry.PROFILES);
  assert.equal(kernel.INTELLIGENCE_LADDER, registry.INTELLIGENCE_LADDER);
  assert.equal(kernel.INFERENCE_POLICY, registry.INFERENCE_POLICY);

  assert.doesNotMatch(source, /const\s+POLICY\s*=\s*Object\.freeze/);
  assert.doesNotMatch(source, /const\s+AGENT_ACTIONS\s*=\s*Object\.freeze/);
});

test('intelligence ladder never selects paid remote inference and degrades to no-ai', () => {
  const { selectIntelligenceRoute, authorizeInferenceProvider } = loadKernel();

  assert.deepEqual(selectIntelligenceRoute({ deterministicAvailable: true }), {
    route: 'deterministic_rule',
    reasonCode: 'DETERMINISTIC_RULE_AVAILABLE',
  });

  assert.deepEqual(selectIntelligenceRoute({ metricAvailable: true, localModelAvailable: true, allowLocalModel: true }), {
    route: 'metric',
    reasonCode: 'METRIC_AVAILABLE',
  });

  assert.deepEqual(selectIntelligenceRoute({ localModelAvailable: true, allowLocalModel: true }), {
    route: 'small_local_model',
    reasonCode: 'LOCAL_MODEL_AVAILABLE',
  });

  assert.deepEqual(selectIntelligenceRoute({ browserAiAvailable: true, allowBrowserAi: true }), {
    route: 'browser_built_in_ai',
    reasonCode: 'BROWSER_AI_AVAILABLE',
  });

  assert.deepEqual(selectIntelligenceRoute({
    localModelAvailable: false,
    browserAiAvailable: false,
    paidRemoteAvailable: true,
  }), {
    route: 'no_ai',
    reasonCode: 'NO_AI_GRACEFUL_FALLBACK',
  });

  assert.deepEqual(authorizeInferenceProvider({ kind: 'remote_paid' }), {
    decision: 'DENY',
    reasonCode: 'PAID_REMOTE_INFERENCE_FORBIDDEN',
    kind: 'remote_paid',
  });
  assert.equal(authorizeInferenceProvider({ kind: 'small_local_model' }).decision, 'ALLOW');
  assert.equal(authorizeInferenceProvider({ kind: 'invented_provider' }).decision, 'DENY');
});

test('browser command center is a registry-backed facade, not a duplicate policy authority', () => {
  const source = fs.readFileSync(commandCenterPath, 'utf8');
  const commandCenter = require(commandCenterPath);
  const registry = loadRegistry();

  assert.match(source, /sovereign-intelligence-registry/);
  assert.doesNotMatch(source, /const\s+ACTIONS\s*=\s*Object\.freeze/);
  assert.doesNotMatch(source, /const\s+POLICY\s*=\s*Object\.freeze/);
  assert.doesNotMatch(source, /const\s+AGENTS\s*=\s*Object\.freeze/);
  assert.equal(commandCenter.ACTIONS, registry.ACTIONS);
  assert.equal(commandCenter.DECISIONS, registry.DECISIONS);
  assert.equal(commandCenter.POLICY, registry.POLICY);
  assert.equal(commandCenter.AGENTS, registry.PROFILES);
  assert.equal(commandCenter.INFERENCE_POLICY, registry.INFERENCE_POLICY);
});

test('owner control loads canonical registry before browser AI consumers', () => {
  const html = fs.readFileSync(ownerControlPath, 'utf8');
  const registryIndex = html.indexOf('scripts/ai/sovereign-intelligence-registry.js');
  const commandIndex = html.indexOf('scripts/ai/vvip-ai-command-center.js');
  const consoleIndex = html.indexOf('scripts/ai/vvip-ai-owner-console.js');

  assert.ok(registryIndex >= 0, 'owner control must load the sovereign registry');
  assert.ok(commandIndex > registryIndex, 'command center must load after registry');
  assert.ok(consoleIndex > commandIndex, 'owner console must load after command center');
});

test('machine authority names existing verification paths and canonical AI runtime paths', () => {
  const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
  const verification = authority.runtime_authorities.verification;
  const intelligence = authority.runtime_authorities.intelligence;

  assert.equal(verification.includes('scripts/test-all.sh'), false, 'authority must not point to nonexistent scripts/test-all.sh');
  assert.deepEqual(intelligence, [
    'scripts/ai/sovereign-intelligence-registry.js',
    'scripts/ai/sovereign-security-kernel.js',
    'scripts/ai/vvip-ai-command-center.js',
    'scripts/ai/vvip-ai-owner-console.js',
    'owner-control.html',
  ]);

  assert.equal(authority.hard_rules.paid_remote_ai_inference_default, 'forbidden');
  assert.equal(authority.hard_rules.ai_direct_database_access, 'forbidden');
  assert.equal(authority.hard_rules.ai_cloud_credentials, 'forbidden');
  assert.equal(authority.hard_rules.ai_destructive_production_authority, 'forbidden');
  assert.equal(authority.hard_rules.ai_policy_registry_authority, 'single_current_only');
});
