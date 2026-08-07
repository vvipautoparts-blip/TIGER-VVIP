'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const toolRegistry = require('../scripts/ai/sovereign-tool-registry.js');
const stepup = require('../scripts/ai/sovereign-owner-stepup-authorization.js');
const protectedExecutor = require('../scripts/ai/sovereign-protected-tool-executor.js');

const H = (char) => char.repeat(64);
const owner = Object.freeze({ id: 'owner_001', role: 'OWNER', authenticated: true });

function mergeRequest() {
  return {
    toolId: 'engineering.merge_pr',
    agentId: 'technical_manager',
    arguments: { prNumber: 156, expectedHeadSha: 'abcdef123456' },
    correlationId: 'corr-ai18-merge-0001',
    idempotencyKey: 'idem-ai18-merge-0001',
  };
}

function deployRequest() {
  return {
    toolId: 'engineering.deploy_production',
    agentId: 'technical_manager',
    arguments: { releaseId: 'release-42', environment: 'production', expectedHeadSha: 'abcdef123456' },
    correlationId: 'corr-ai18-deploy-0001',
    idempotencyKey: 'idem-ai18-deploy-0001',
  };
}

async function verificationFor(request, releaseDigest = H('a'), scopeDigest = H('c')) {
  const binding = protectedExecutor.createProtectedToolBinding({ request, releaseDigest, scopeDigest });
  const verifier = stepup.createTrustedAuthenticatorVerifier({
    verifierId: 'owner-passkey-test',
    verifyAssertion: async ({ expectedOwnerSubject }) => ({
      verified: true,
      ownerSubject: expectedOwnerSubject,
      method: 'WEBAUTHN_PASSKEY',
      assurance: 'PHISHING_RESISTANT',
      authenticatorReference: 'credential-reference-test',
      verifiedAt: '2026-08-07T14:41:00.000Z',
    }),
  });
  const challenge = stepup.createOwnerStepUpChallenge({
    ownerSubject: owner.id,
    action: binding.stepUpAction,
    releaseDigest: binding.releaseDigest,
    payloadDigest: binding.payloadDigest,
    scopeDigest: binding.scopeDigest,
    environment: binding.environment,
    now: '2026-08-07T14:40:30.000Z',
    ttlSeconds: 180,
  });
  return stepup.verifyOwnerStepUp({
    challenge,
    trustedVerifier: verifier,
    authenticatorResponse: { assertion: 'opaque' },
    now: '2026-08-07T14:41:05.000Z',
  });
}

function approvalReceipt(request) {
  return toolRegistry.createTrustedApprovalReceipt({
    ownerId: owner.id,
    request,
    approvalId: `approval-${request.toolId}`,
  });
}

function persistentConsumer(result = { ok: true, reasonCode: 'STEPUP_CONSUMED' }) {
  return protectedExecutor.createTrustedPersistentStepUpConsumer({
    consumerId: 'supabase-stepup-test',
    consume: async () => result,
  });
}

test('AI-18 protected executor exports final L4 gate API', () => {
  assert.equal(typeof protectedExecutor.createProtectedToolBinding, 'function');
  assert.equal(typeof protectedExecutor.createTrustedPersistentStepUpConsumer, 'function');
  assert.equal(typeof protectedExecutor.executeProtectedRegisteredTool, 'function');
});

test('AI-18 maps each L4 tool to one sovereign step-up action/environment', () => {
  assert.equal(protectedExecutor.createProtectedToolBinding({ request: mergeRequest(), releaseDigest: H('a'), scopeDigest: H('c') }).stepUpAction, 'MERGE_RELEASE');
  assert.equal(protectedExecutor.createProtectedToolBinding({ request: deployRequest(), releaseDigest: H('a'), scopeDigest: H('c') }).stepUpAction, 'ACTIVATE_PRODUCTION');

  const priceRequest = {
    toolId: 'finance.change_prices', agentId: 'financial_analytics_manager',
    arguments: { country: 'JO', currency: 'JOD', price: 12, resourceId: 'listing-1' },
    correlationId: 'corr-ai18-price-0001', idempotencyKey: 'idem-ai18-price-0001',
  };
  const price = protectedExecutor.createProtectedToolBinding({ request: priceRequest, releaseDigest: H('a'), scopeDigest: H('c') });
  assert.equal(price.stepUpAction, 'CHANGE_PRICES');
  assert.equal(price.environment, 'PRODUCTION');
});

test('AI-18 L4 cannot execute with owner approval alone', async () => {
  const request = deployRequest();
  let executed = false;
  const result = await protectedExecutor.executeProtectedRegisteredTool({
    request,
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L4' },
    approvalReceipt: approvalReceipt(request),
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    executors: { 'engineering.deploy_production': async () => { executed = true; } },
    idempotencyStore: new Map(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'OWNER_STEPUP_REQUIRED');
  assert.equal(executed, false);
});

test('AI-18 copied/forged persistent consumer cannot authorize execution', async () => {
  const request = mergeRequest();
  const verification = await verificationFor(request);
  const forgedConsumer = JSON.parse(JSON.stringify(persistentConsumer()));
  const result = await protectedExecutor.executeProtectedRegisteredTool({
    request,
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L4' },
    approvalReceipt: approvalReceipt(request),
    stepUpVerification: verification,
    stepUpAuthorizationId: '00000000-0000-4000-8000-000000000018',
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    persistentStepUpConsumer: forgedConsumer,
    executors: { 'engineering.merge_pr': async () => ({ merged: true }) },
    idempotencyStore: new Map(),
    now: '2026-08-07T14:41:10.000Z',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'STEPUP_PERSISTENCE_CONSUMER_UNTRUSTED');
});

test('AI-18 persistent consume failure prevents executor invocation', async () => {
  const request = mergeRequest();
  const verification = await verificationFor(request);
  let executed = false;
  const result = await protectedExecutor.executeProtectedRegisteredTool({
    request,
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L4' },
    approvalReceipt: approvalReceipt(request),
    stepUpVerification: verification,
    stepUpAuthorizationId: '00000000-0000-4000-8000-000000000018',
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    persistentStepUpConsumer: persistentConsumer({ ok: false, reasonCode: 'STEPUP_REPLAY_OR_CONFLICT' }),
    executors: { 'engineering.merge_pr': async () => { executed = true; } },
    idempotencyStore: new Map(),
    now: '2026-08-07T14:41:10.000Z',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'STEPUP_REPLAY_OR_CONFLICT');
  assert.equal(executed, false);
});

test('AI-18 exact trusted step-up + persistent consume + owner receipt permits final L4 executor', async () => {
  const request = mergeRequest();
  const verification = await verificationFor(request);
  let consumedInput;
  let executed = false;
  const consumer = protectedExecutor.createTrustedPersistentStepUpConsumer({
    consumerId: 'supabase-stepup-test',
    consume: async (input) => {
      consumedInput = input;
      return { ok: true, reasonCode: 'STEPUP_CONSUMED' };
    },
  });
  const result = await protectedExecutor.executeProtectedRegisteredTool({
    request,
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L4' },
    approvalReceipt: approvalReceipt(request),
    stepUpVerification: verification,
    stepUpAuthorizationId: '00000000-0000-4000-8000-000000000018',
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    persistentStepUpConsumer: consumer,
    executors: { 'engineering.merge_pr': async () => { executed = true; return { merged: true }; } },
    idempotencyStore: new Map(),
    now: '2026-08-07T14:41:10.000Z',
  });
  assert.equal(result.ok, true);
  assert.equal(result.reasonCode, 'EXECUTION_SUCCEEDED');
  assert.equal(executed, true);
  assert.equal(consumedInput.action, 'MERGE_RELEASE');
  assert.equal(consumedInput.environment, 'REPOSITORY');
  assert.equal(consumedInput.ownerSubject, owner.id);
  assert.equal(consumedInput.authorizationId, '00000000-0000-4000-8000-000000000018');
});

test('AI-18 non-L4 tools keep existing bounded execution path without step-up', async () => {
  const request = {
    toolId: 'engineering.run_tests', agentId: 'technical_manager',
    arguments: { suite: 'quality-gate' }, correlationId: 'corr-ai18-tests-0001',
  };
  const result = await protectedExecutor.executeProtectedRegisteredTool({
    request,
    actor: owner,
    featureEnabled: true,
    runtimeState: { enabled: true, killSwitch: false, maxLevel: 'L3' },
    executors: { 'engineering.run_tests': async () => ({ status: 'PASS' }) },
  });
  assert.equal(result.ok, true);
});
