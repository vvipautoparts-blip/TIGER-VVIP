'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github/workflows/tiger-gate6-exact-sha-staging.yml');

function workflowText() {
  assert.equal(fs.existsSync(WORKFLOW), true, 'Gate 6 exact-SHA staging workflow must exist');
  return fs.readFileSync(WORKFLOW, 'utf8');
}

test('Gate 6 workflow separates PR verification from explicit staging provider mutation', () => {
  const text = workflowText();
  assert.match(text, /pull_request:/);
  assert.match(text, /workflow_dispatch:/);
  assert.match(text, /source_sha:/);
  assert.match(text, /provider-staging:/);
  assert.match(text, /environment:\s*staging/);
  assert.match(text, /if:\s*github\.event_name == 'workflow_dispatch'/);
});

test('Gate 6 workflow checks out and proves the exact source SHA', () => {
  const text = workflowText();
  assert.match(text, /github\.event\.pull_request\.head\.sha/);
  assert.match(text, /inputs\.source_sha/);
  assert.match(text, /git rev-parse HEAD/);
  assert.match(text, /\^\[0-9a-f\]\{40\}\$/);
});

test('Gate 6 workflow executes focused contracts and full repository quality closure', () => {
  const text = workflowText();
  assert.match(text, /node --test tests\/tiger-gate6-\*\.test\.cjs/);
  assert.match(text, /pytest -q tests\/test_vvip_staging_release\.py/);
  assert.match(text, /bash scripts\/quality-gate\.sh/);
  assert.match(text, /node --test tests\/tiger-gate5-\*\.test\.\*/);
});

test('Gate 6 workflow builds only the staging artifact and synthetic proof', () => {
  const text = workflowText();
  assert.match(text, /tools\/vvip_staging_release\.py/);
  assert.match(text, /scripts\/gate6\/seed-synthetic\.cjs/);
  assert.doesNotMatch(text, /\.github\/workflows\/pages\.yml/);
  assert.doesNotMatch(text, /vvip-production-release/);
});

test('Gate 6 provider job fails closed on Production Supabase and missing provider configuration', () => {
  const text = workflowText();
  assert.match(text, /zelcngyyvbomuzokvuxo/);
  assert.match(text, /TIGER_STAGING_SUPABASE_PROJECT_REF/);
  assert.match(text, /TIGER_STAGING_SUPABASE_URL/);
  assert.match(text, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(text, /CLOUDFLARE_PAGES_PROJECT/);
  assert.match(text, /CLOUDFLARE_API_TOKEN/);
  assert.match(text, /BLOCKED_PROVIDER/);
});

test('Gate 6 Cloudflare deployment is exact-version pinned and exact-SHA attributed', () => {
  const text = workflowText();
  assert.match(text, /wrangler@4\.124\.0 pages deploy/);
  assert.match(text, /--commit-hash "\$SOURCE_SHA"/);
  assert.match(text, /pages deployment list/);
  assert.match(text, /--json/);
  assert.match(text, /deployment_trigger/);
  assert.match(text, /commit_hash/);
});

test('Gate 6 workflow runs live runtime verification and uploads sealed evidence', () => {
  const text = workflowText();
  assert.match(text, /scripts\/gate6\/verify-runtime\.cjs/);
  assert.match(text, /gate6-final-evidence\.json/);
  assert.match(text, /actions\/upload-artifact@/);
  assert.match(text, /tiger-gate6-staging-evidence-/);
});

test('Gate 6 workflow never prints privileged values directly', () => {
  const text = workflowText();
  assert.doesNotMatch(text, /echo\s+"?\$CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(text, /echo\s+"?\$TIGER_STAGING_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(text, /echo\s+"?\$TIGER_STAGING_SUPABASE_DB_URL/);
});
