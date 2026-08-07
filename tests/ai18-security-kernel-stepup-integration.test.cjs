'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const kernel = require('../scripts/ai/sovereign-security-kernel.js');
const stepup = require('../scripts/ai/sovereign-owner-stepup-authorization.js');

const H = (char) => char.repeat(64);

const actor = Object.freeze({ id: 'owner_001', role: 'OWNER', authenticated: true });
const base = Object.freeze({
  featureEnabled: true,
  actor,
  agentId: 'technical_manager',
  killSwitches: Object.freeze({ global: false, agent: false, tool: false }),
});

function approval(action, payload) {
  return kernel.createApprovalEnvelope({
    approvalId: `apr_${action}`,
    ownerId: actor.id,
    agentId: action === kernel.ACTIONS.CHANGE_PRICES ? 'financial_analytics_manager' : 'technical_manager',
    action,
    payload,
    createdAt: '2026-08-07T14:30:00.000Z',
    expiresAt: '2026-08-07T14:35:00.000Z',
  });
}

async function verifiedStepUp({ action = 'ACTIVATE_PRODUCTION', environment = 'PRODUCTION', payloadDigest, releaseDigest = H('a'), scopeDigest = H('c') }) {
  const trustedVerifier = stepup.createTrustedAuthenticatorVerifier({
    verifierId: 'owner-passkey-test',
    verifyAssertion: async ({ expectedOwnerSubject }) => ({
      verified: true,
      ownerSubject: expectedOwnerSubject,
      method: 'WEBAUTHN_PASSKEY',
      assurance: 'PHISHING_RESISTANT',
      authenticatorReference: 'test-authenticator-reference',
      verifiedAt: '2026-08-07T14:31:00.000Z',
    }),
  });
  const challenge = stepup.createOwnerStepUpChallenge({
    ownerSubject: actor.id,
    action,
    releaseDigest,
    payloadDigest,
    scopeDigest,
    environment,
    now: '2026-08-07T14:30:30.000Z',
    ttlSeconds: 180,
  });
  return stepup.verifyOwnerStepUp({
    challenge,
    trustedVerifier,
    authenticatorResponse: { assertion: 'opaque-test-value' },
    now: '2026-08-07T14:31:05.000Z',
  });
}

test('AI-18 L4 approval alone is insufficient after step-up integration', () => {
  const payload = { release: 'release-42', environment: 'production' };
  const result = kernel.evaluateSovereignRequest({
    ...base,
    action: kernel.ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval: approval(kernel.ACTIONS.DEPLOY_PRODUCTION, payload),
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    now: '2026-08-07T14:31:10.000Z',
  });
  assert.equal(result.decision, kernel.DECISIONS.DENY);
  assert.equal(result.reasonCode, 'OWNER_STEPUP_REQUIRED');
});

test('AI-18 rejects browser-forged or JSON-copied step-up verification', () => {
  const payload = { release: 'release-42', environment: 'production' };
  const result = kernel.evaluateSovereignRequest({
    ...base,
    action: kernel.ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval: approval(kernel.ACTIONS.DEPLOY_PRODUCTION, payload),
    stepUpVerification: { verified: true, assurance: 'PHISHING_RESISTANT' },
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    now: '2026-08-07T14:31:10.000Z',
  });
  assert.equal(result.decision, kernel.DECISIONS.DENY);
  assert.equal(result.reasonCode, 'STEPUP_VERIFICATION_UNTRUSTED');
});

test('AI-18 allows L4 policy only when trusted approval and exact step-up binding both verify', async () => {
  const payload = { release: 'release-42', environment: 'production' };
  const payloadDigest = kernel.createPayloadDigest(payload);
  const verification = await verifiedStepUp({ payloadDigest });
  const result = kernel.evaluateSovereignRequest({
    ...base,
    action: kernel.ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval: approval(kernel.ACTIONS.DEPLOY_PRODUCTION, payload),
    stepUpVerification: verification,
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    now: '2026-08-07T14:31:10.000Z',
  });
  assert.equal(result.decision, kernel.DECISIONS.ALLOW);
  assert.equal(result.reasonCode, 'TRUSTED_OWNER_APPROVAL_AND_STEPUP');
  assert.equal(result.stepUpVerificationDigest, verification.digest);
});

test('AI-18 blocks L4 when step-up is bound to a different release or scope', async () => {
  const payload = { release: 'release-42', environment: 'production' };
  const payloadDigest = kernel.createPayloadDigest(payload);
  const wrongRelease = await verifiedStepUp({ payloadDigest, releaseDigest: H('d') });
  const wrongScope = await verifiedStepUp({ payloadDigest, scopeDigest: H('e') });
  const ownerApproval = approval(kernel.ACTIONS.DEPLOY_PRODUCTION, payload);

  const releaseResult = kernel.evaluateSovereignRequest({
    ...base,
    action: kernel.ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval: ownerApproval,
    stepUpVerification: wrongRelease,
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    now: '2026-08-07T14:31:10.000Z',
  });
  assert.equal(releaseResult.reasonCode, 'STEPUP_RELEASE_MISMATCH');

  const scopeResult = kernel.evaluateSovereignRequest({
    ...base,
    action: kernel.ACTIONS.DEPLOY_PRODUCTION,
    payload,
    approval: ownerApproval,
    stepUpVerification: wrongScope,
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    now: '2026-08-07T14:31:10.000Z',
  });
  assert.equal(scopeResult.reasonCode, 'STEPUP_SCOPE_MISMATCH');
});

test('AI-18 maps repository merge and production price mutation to separate step-up actions', async () => {
  const mergePayload = { prNumber: 156 };
  const mergeDigest = kernel.createPayloadDigest(mergePayload);
  const mergeVerification = await verifiedStepUp({
    action: 'MERGE_RELEASE',
    environment: 'REPOSITORY',
    payloadDigest: mergeDigest,
  });
  const mergeResult = kernel.evaluateSovereignRequest({
    ...base,
    action: kernel.ACTIONS.MERGE_PR,
    payload: mergePayload,
    approval: approval(kernel.ACTIONS.MERGE_PR, mergePayload),
    stepUpVerification: mergeVerification,
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    now: '2026-08-07T14:31:10.000Z',
  });
  assert.equal(mergeResult.decision, kernel.DECISIONS.ALLOW);

  const pricePayload = { price: 12, currency: 'JOD' };
  const priceDigest = kernel.createPayloadDigest(pricePayload);
  const priceVerification = await verifiedStepUp({ action: 'CHANGE_PRICES', payloadDigest: priceDigest });
  const priceResult = kernel.evaluateSovereignRequest({
    ...base,
    agentId: 'financial_analytics_manager',
    action: kernel.ACTIONS.CHANGE_PRICES,
    payload: pricePayload,
    approval: approval(kernel.ACTIONS.CHANGE_PRICES, pricePayload),
    stepUpVerification: priceVerification,
    releaseDigest: H('a'),
    scopeDigest: H('c'),
    now: '2026-08-07T14:31:10.000Z',
  });
  assert.equal(priceResult.decision, kernel.DECISIONS.ALLOW);
});
