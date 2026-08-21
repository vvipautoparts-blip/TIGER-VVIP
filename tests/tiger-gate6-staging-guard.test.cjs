'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'project-control/scripts/gate6_staging_guard.mjs');
const SOURCE_SHA = '0123456789abcdef0123456789abcdef01234567';
const STAGING_REF = 'abcdefghijklmnopqrst';

async function loadGuard() {
  assert.equal(fs.existsSync(MODULE), true, 'Gate 6 staging guard module must exist');
  return import(pathToFileURL(MODULE).href);
}

function safeCandidate() {
  return {
    sourceSha: SOURCE_SHA,
    environment: 'staging',
    backend: {
      status: 'BOUND',
      provider: 'supabase',
      projectRef: STAGING_REF,
      url: `https://${STAGING_REF}.supabase.co`,
    },
    browserConfig: {
      publicKeys: ['TIGER_SUPABASE_URL', 'TIGER_SUPABASE_PUBLISHABLE_KEY'],
      values: {
        TIGER_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
        TIGER_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_gate6_test_value',
      },
    },
    dataMode: 'SYNTHETIC_SANITIZED',
    paymentMode: 'disabled',
    frontend: {
      provider: 'cloudflare-pages',
      url: 'https://01234567.tiger-vvip-staging.pages.dev',
      deploymentId: 'cf-pages-deploy-01234567',
      sourceSha: SOURCE_SHA,
    },
  };
}

async function evaluate(mutator) {
  const { evaluateGate6Candidate } = await loadGuard();
  const candidate = safeCandidate();
  mutator(candidate);
  return evaluateGate6Candidate(candidate);
}

function hasReason(result, code) {
  return result.reasons.some((reason) => reason.code === code);
}

test('Gate 6 rejects a malformed exact source SHA', async () => {
  const result = await evaluate((candidate) => { candidate.sourceSha = 'not-a-sha'; });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'INVALID_SOURCE_SHA'), true);
});

test('Gate 6 rejects Production environment', async () => {
  const result = await evaluate((candidate) => { candidate.environment = 'production'; });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'PRODUCTION_ENVIRONMENT_FORBIDDEN'), true);
});

test('Gate 6 rejects an unbound backend', async () => {
  const result = await evaluate((candidate) => { candidate.backend.status = 'UNBOUND'; });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'BACKEND_UNBOUND'), true);
});

test('Gate 6 rejects the known Production Supabase project', async () => {
  const result = await evaluate((candidate) => {
    candidate.backend.projectRef = 'zelcngyyvbomuzokvuxo';
    candidate.backend.url = 'https://zelcngyyvbomuzokvuxo.supabase.co';
    candidate.browserConfig.values.TIGER_SUPABASE_URL = candidate.backend.url;
  });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'PRODUCTION_SUPABASE_FORBIDDEN'), true);
});

test('Gate 6 rejects Supabase URL and project-ref mismatch', async () => {
  const result = await evaluate((candidate) => {
    candidate.backend.url = 'https://differentprojectref.supabase.co';
    candidate.browserConfig.values.TIGER_SUPABASE_URL = candidate.backend.url;
  });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'SUPABASE_URL_REF_MISMATCH'), true);
});

test('Gate 6 rejects privileged browser configuration', async () => {
  const privilegedKey = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
  const privilegedValue = ['service', 'role', 'forbidden'].join('_');
  const result = await evaluate((candidate) => {
    candidate.browserConfig.publicKeys.push(privilegedKey);
    candidate.browserConfig.values[privilegedKey] = privilegedValue;
  });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'PRIVILEGED_BROWSER_CONFIG_FORBIDDEN'), true);
});

test('Gate 6 requires synthetic sanitized data mode', async () => {
  const result = await evaluate((candidate) => { candidate.dataMode = 'REAL_DATA'; });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'SYNTHETIC_DATA_REQUIRED'), true);
});

test('Gate 6 rejects live payment mode', async () => {
  const result = await evaluate((candidate) => { candidate.paymentMode = 'live'; });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'LIVE_PAYMENT_FORBIDDEN'), true);
});

test('Gate 6 requires an HTTPS Cloudflare Pages deployment', async () => {
  const result = await evaluate((candidate) => { candidate.frontend.url = 'http://tiger-vvip-staging.pages.dev'; });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'HTTPS_STAGING_REQUIRED'), true);
});

test('Gate 6 requires deployment source SHA to equal artifact source SHA', async () => {
  const result = await evaluate((candidate) => { candidate.frontend.sourceSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; });
  assert.equal(result.eligible, false);
  assert.equal(hasReason(result, 'DEPLOYMENT_SOURCE_MISMATCH'), true);
});

test('Gate 6 accepts a complete isolated exact-SHA staging candidate', async () => {
  const { evaluateGate6Candidate } = await loadGuard();
  const result = evaluateGate6Candidate(safeCandidate());
  assert.equal(result.decision, 'SAFE');
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasons, []);
});
