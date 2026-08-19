'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'project-control/scripts/preview_guard.mjs');

async function loadGuard() {
  assert.equal(fs.existsSync(MODULE), true, 'preview guard module must exist');
  return import(pathToFileURL(MODULE).href);
}

function safeCandidate(overrides = {}) {
  return {
    targetRing: 'R4_OWNER_PREVIEW',
    source: {
      commitSha: '0123456789abcdef0123456789abcdef01234567',
      treeSha: '89abcdef0123456789abcdef0123456789abcdef',
    },
    environment: 'PREVIEW',
    backend: {
      environment: 'STAGING',
      identity: 'tiger-staging-social-20260819',
    },
    seed: {
      classification: 'SYNTHETIC_SANITIZED',
      evidence: ['evidence://seed/twin-users-v1'],
    },
    browserConfig: {
      publicKeys: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'CLERK_PUBLISHABLE_KEY'],
      values: {
        SUPABASE_URL: 'https://staging-project.supabase.co',
        SUPABASE_ANON_KEY: 'public-anon-placeholder',
        CLERK_PUBLISHABLE_KEY: 'pk_live_public-placeholder',
      },
    },
    deployment: {
      url: 'https://preview.example.invalid/',
      evidence: ['evidence://deploy/exact-sha'],
      sourceSha: '0123456789abcdef0123456789abcdef01234567',
    },
    ...overrides,
  };
}

test('preview guard fails closed on malformed exact source SHA', async () => {
  const { evaluatePreviewCandidate } = await loadGuard();
  const candidate = safeCandidate();
  candidate.source.commitSha = 'not-a-sha';
  const result = evaluatePreviewCandidate(candidate);
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((reason) => reason.code === 'INVALID_COMMIT_SHA'));
});

test('preview guard requires PREVIEW surface and STAGING backend', async () => {
  const { evaluatePreviewCandidate } = await loadGuard();
  const candidate = safeCandidate({ environment: 'PRODUCTION' });
  candidate.backend = { environment: 'PRODUCTION', identity: 'tiger-production' };
  const result = evaluatePreviewCandidate(candidate);
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.code === 'INVALID_PREVIEW_ENVIRONMENT'));
  assert.ok(result.reasons.some((reason) => reason.code === 'BACKEND_NOT_STAGING'));
  assert.ok(result.reasons.some((reason) => reason.code === 'PRODUCTION_BACKEND_FORBIDDEN'));
});

test('preview guard requires synthetic sanitized seed evidence', async () => {
  const { evaluatePreviewCandidate } = await loadGuard();
  const candidate = safeCandidate();
  candidate.seed = { classification: 'REAL_DATA', evidence: [] };
  const result = evaluatePreviewCandidate(candidate);
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.code === 'SYNTHETIC_SEED_REQUIRED'));
  assert.ok(result.reasons.some((reason) => reason.code === 'SEED_EVIDENCE_REQUIRED'));
});

test('preview guard rejects private or privileged browser configuration names', async () => {
  const { evaluatePreviewCandidate } = await loadGuard();
  const candidate = safeCandidate();
  candidate.browserConfig.publicKeys.push('SUPABASE_SERVICE_ROLE_KEY');
  candidate.browserConfig.values.SUPABASE_SERVICE_ROLE_KEY = 'forbidden';
  const result = evaluatePreviewCandidate(candidate);
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.code === 'PRIVILEGED_BROWSER_CONFIG_FORBIDDEN'));
});

test('preview guard requires HTTPS deployment evidence bound to exact source', async () => {
  const { evaluatePreviewCandidate } = await loadGuard();
  const candidate = safeCandidate();
  candidate.deployment = { url: 'http://preview.example.invalid/', evidence: [], sourceSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
  const result = evaluatePreviewCandidate(candidate);
  assert.equal(result.decision, 'BLOCKED');
  assert.ok(result.reasons.some((reason) => reason.code === 'HTTPS_PREVIEW_REQUIRED'));
  assert.ok(result.reasons.some((reason) => reason.code === 'DEPLOYMENT_EVIDENCE_REQUIRED'));
  assert.ok(result.reasons.some((reason) => reason.code === 'DEPLOYMENT_SOURCE_MISMATCH'));
});

test('preview guard marks a complete isolated exact-SHA preview candidate safe', async () => {
  const { evaluatePreviewCandidate } = await loadGuard();
  const result = evaluatePreviewCandidate(safeCandidate());
  assert.equal(result.decision, 'SAFE');
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasons, []);
});
