'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'project-control/scripts/privacy_proof.mjs');

async function loadPrivacyProof() {
  assert.equal(fs.existsSync(MODULE), true, 'privacy proof module must exist');
  return import(pathToFileURL(MODULE).href);
}

function pass(id) {
  return { status: 'PASS', unauthorizedCount: 0, evidence: [`evidence://${id}`] };
}

function safeProof(overrides = {}) {
  return {
    subject: 'user_bob',
    protectedObject: { type: 'social_post', audience: 'only_me', ownerSubject: 'user_alice' },
    dimensions: {
      database: pass('db-only-me'),
      realtime: pass('realtime-only-me'),
      media: pass('media-only-me'),
      cache: pass('cache-only-me'),
      ...(overrides.dimensions || {}),
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'dimensions')),
  };
}

test('privacy proof blocks when a required dimension is missing', async () => {
  const { evaluatePrivacyProof } = await loadPrivacyProof();
  const input = safeProof();
  delete input.dimensions.media;
  const result = evaluatePrivacyProof(input);
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((reason) => reason.code === 'MISSING_PRIVACY_DIMENSION' && reason.dimension === 'media'));
});

test('privacy proof blocks an unbound runtime dimension', async () => {
  const { evaluatePrivacyProof } = await loadPrivacyProof();
  const result = evaluatePrivacyProof(safeProof({
    dimensions: { realtime: { status: 'UNBOUND', unauthorizedCount: 0, evidence: [] } },
  }));
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.code === 'PRIVACY_DIMENSION_UNBOUND' && reason.dimension === 'realtime'));
});

test('privacy proof blocks any unauthorized exposure', async () => {
  const { evaluatePrivacyProof } = await loadPrivacyProof();
  const result = evaluatePrivacyProof(safeProof({
    dimensions: { media: { status: 'FAIL', unauthorizedCount: 1, evidence: ['evidence://media-leak'] } },
  }));
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.code === 'PRIVACY_EXPOSURE_DETECTED' && reason.dimension === 'media'));
});

test('privacy proof rejects PASS without evidence', async () => {
  const { evaluatePrivacyProof } = await loadPrivacyProof();
  const result = evaluatePrivacyProof(safeProof({
    dimensions: { cache: { status: 'PASS', unauthorizedCount: 0, evidence: [] } },
  }));
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.code === 'PASS_WITHOUT_EVIDENCE' && reason.dimension === 'cache'));
});

test('privacy proof blocks malformed unauthorized counts rather than coercing them', async () => {
  const { evaluatePrivacyProof } = await loadPrivacyProof();
  const result = evaluatePrivacyProof(safeProof({
    dimensions: { database: { status: 'PASS', unauthorizedCount: '0', evidence: ['evidence://db'] } },
  }));
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.code === 'INVALID_UNAUTHORIZED_COUNT' && reason.dimension === 'database'));
});

test('privacy proof is SAFE only when all four dimensions prove zero exposure', async () => {
  const { evaluatePrivacyProof } = await loadPrivacyProof();
  const result = evaluatePrivacyProof(safeProof());
  assert.equal(result.decision, 'SAFE');
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasons, []);
  assert.deepEqual(result.requiredDimensions, ['database', 'realtime', 'media', 'cache']);
});
