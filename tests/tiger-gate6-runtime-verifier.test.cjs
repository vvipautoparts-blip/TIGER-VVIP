'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE = path.resolve(__dirname, '../scripts/gate6/verify-runtime.cjs');
const SOURCE_SHA = '0123456789abcdef0123456789abcdef01234567';
const PROJECT_REF = 'abcdefghijklmnopqrst';
const STAGING_URL = 'https://01234567.tiger-vvip-staging.pages.dev';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

function loadVerifier() {
  assert.equal(fs.existsSync(MODULE), true, 'Gate 6 runtime verifier must exist');
  return require(MODULE);
}

function okJson(value) {
  return { ok: true, status: 200, async json() { return value; }, async text() { return JSON.stringify(value); } };
}

function safeFetch(url, options = {}) {
  if (String(url).endsWith('/gate6-staging-manifest.json')) {
    return Promise.resolve(okJson({
      environment: 'staging',
      source_sha: SOURCE_SHA,
      backend: { provider: 'supabase', project_ref: PROJECT_REF, url_origin: SUPABASE_URL },
      data_mode: 'SYNTHETIC_SANITIZED',
      payment_mode: 'disabled',
    }));
  }
  assert.equal(url, `${SUPABASE_URL}/auth/v1/settings`);
  assert.equal(options.headers.apikey, 'sb_publishable_gate6_staging_public');
  return Promise.resolve(okJson({ external: {}, disable_signup: false }));
}

test('Gate 6 runtime verifier proves HTTPS exact-SHA frontend/backend binding', async () => {
  const { verifyGate6Runtime } = loadVerifier();
  const evidence = await verifyGate6Runtime({
    sourceSha: SOURCE_SHA,
    stagingUrl: STAGING_URL,
    supabaseUrl: SUPABASE_URL,
    supabaseProjectRef: PROJECT_REF,
    supabasePublishableKey: 'sb_publishable_gate6_staging_public',
    fetchImpl: safeFetch,
  });
  assert.equal(evidence.status, 'PASS');
  assert.equal(evidence.source_sha, SOURCE_SHA);
  assert.equal(evidence.backend.project_ref, PROJECT_REF);
  assert.equal(evidence.frontend.url, STAGING_URL);
});

test('Gate 6 runtime verifier rejects non-HTTPS staging URL', async () => {
  const { verifyGate6Runtime } = loadVerifier();
  await assert.rejects(() => verifyGate6Runtime({
    sourceSha: SOURCE_SHA,
    stagingUrl: 'http://insecure.invalid',
    supabaseUrl: SUPABASE_URL,
    supabaseProjectRef: PROJECT_REF,
    supabasePublishableKey: 'sb_publishable_gate6_staging_public',
    fetchImpl: safeFetch,
  }), /HTTPS/i);
});

test('Gate 6 runtime verifier rejects Production Supabase identity', async () => {
  const { verifyGate6Runtime } = loadVerifier();
  await assert.rejects(() => verifyGate6Runtime({
    sourceSha: SOURCE_SHA,
    stagingUrl: STAGING_URL,
    supabaseUrl: 'https://zelcngyyvbomuzokvuxo.supabase.co',
    supabaseProjectRef: 'zelcngyyvbomuzokvuxo',
    supabasePublishableKey: 'sb_publishable_gate6_staging_public',
    fetchImpl: safeFetch,
  }), /Production Supabase/i);
});

test('Gate 6 runtime verifier rejects deployed manifest SHA mismatch', async () => {
  const { verifyGate6Runtime } = loadVerifier();
  const fetchImpl = async (url, options) => {
    if (String(url).endsWith('/gate6-staging-manifest.json')) {
      return okJson({
        environment: 'staging',
        source_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        backend: { provider: 'supabase', project_ref: PROJECT_REF, url_origin: SUPABASE_URL },
        data_mode: 'SYNTHETIC_SANITIZED',
        payment_mode: 'disabled',
      });
    }
    return safeFetch(url, options);
  };
  await assert.rejects(() => verifyGate6Runtime({
    sourceSha: SOURCE_SHA,
    stagingUrl: STAGING_URL,
    supabaseUrl: SUPABASE_URL,
    supabaseProjectRef: PROJECT_REF,
    supabasePublishableKey: 'sb_publishable_gate6_staging_public',
    fetchImpl,
  }), /source SHA mismatch/i);
});

test('Gate 6 runtime verifier fails closed when backend health is unavailable', async () => {
  const { verifyGate6Runtime } = loadVerifier();
  const fetchImpl = async (url, options) => {
    if (String(url).endsWith('/gate6-staging-manifest.json')) return safeFetch(url, options);
    return { ok: false, status: 503, async text() { return 'unavailable'; } };
  };
  await assert.rejects(() => verifyGate6Runtime({
    sourceSha: SOURCE_SHA,
    stagingUrl: STAGING_URL,
    supabaseUrl: SUPABASE_URL,
    supabaseProjectRef: PROJECT_REF,
    supabasePublishableKey: 'sb_publishable_gate6_staging_public',
    fetchImpl,
  }), /backend health/i);
});
