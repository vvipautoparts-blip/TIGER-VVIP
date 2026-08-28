'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'media-finalizer-supabase-advisor-classification.json');
const ALLOWED = new Set(['FIXED', 'INTENTIONAL_AND_TESTED', 'NOT_APPLICABLE_WITH_EVIDENCE']);
const REQUIRED_IDS = new Set([
  'media-table-anonymous-auth-policy',
  'media-storage-anonymous-auth-policy',
  'media-request-security-definer',
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function loadConfig() {
  assert.equal(fs.existsSync(CONFIG), true, 'MEDIA_SUPABASE_ADVISOR_CLASSIFICATION_MISSING');
  return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
}

test('advisor classification is bounded to the Seoul Media convergence slice', () => {
  const config = loadConfig();
  assert.deepEqual(Object.keys(config).sort(), [
    'classifications',
    'projectRef',
    'region',
    'schemaVersion',
    'scope',
  ]);
  assert.equal(config.schemaVersion, 'tiger-media-supabase-advisors-v1');
  assert.equal(config.projectRef, 'zelcngyyvbomuzokvuxo');
  assert.equal(config.region, 'ap-northeast-2');
  assert.equal(config.scope, 'MEDIA_DB_CONVERGENCE');
  assert.ok(Array.isArray(config.classifications));
  assert.equal(config.classifications.length, REQUIRED_IDS.size);
  assert.deepEqual(new Set(config.classifications.map((entry) => entry.id)), REQUIRED_IDS);
});

test('every release-relevant advisor warning has explicit evidence and no wildcard suppression', () => {
  const config = loadConfig();
  for (const entry of config.classifications) {
    assert.deepEqual(Object.keys(entry).sort(), [
      'cacheKey',
      'evidence',
      'id',
      'lint',
      'status',
    ]);
    assert.ok(ALLOWED.has(entry.status), `MEDIA_SUPABASE_ADVISOR_STATUS_INVALID:${entry.id}`);
    assert.equal(typeof entry.cacheKey, 'string');
    assert.ok(entry.cacheKey.length > 20);
    assert.doesNotMatch(entry.cacheKey, /[*?]/, `MEDIA_SUPABASE_ADVISOR_WILDCARD:${entry.id}`);
    assert.equal(typeof entry.lint, 'string');
    assert.ok(entry.lint.length > 3);
    assert.ok(Array.isArray(entry.evidence) && entry.evidence.length > 0);
    for (const evidence of entry.evidence) {
      assert.equal(typeof evidence, 'string');
      assert.doesNotMatch(evidence, /https?:|token|password|secret|jwt/i, `MEDIA_SUPABASE_ADVISOR_EVIDENCE_UNSAFE:${entry.id}`);
      assert.ok(fs.existsSync(path.join(ROOT, evidence)), `MEDIA_SUPABASE_ADVISOR_EVIDENCE_MISSING:${entry.id}:${evidence}`);
    }
  }
});

test('classification pins only known Media release warnings and does not suppress project-wide debt', () => {
  const config = loadConfig();
  const byId = Object.fromEntries(config.classifications.map((entry) => [entry.id, entry]));

  assert.equal(byId['media-table-anonymous-auth-policy'].lint, 'auth_allow_anonymous_sign_ins');
  assert.equal(byId['media-table-anonymous-auth-policy'].cacheKey, 'auth_allow_anonymous_sign_ins_public_vvip_marketplace_listing_media');

  assert.equal(byId['media-storage-anonymous-auth-policy'].lint, 'auth_allow_anonymous_sign_ins');
  assert.equal(byId['media-storage-anonymous-auth-policy'].cacheKey, 'auth_allow_anonymous_sign_ins_storage_objects');

  assert.equal(byId['media-request-security-definer'].lint, 'authenticated_security_definer_function_executable');
  assert.match(byId['media-request-security-definer'].cacheKey, /^authenticated_security_definer_function_executable_public_vvip_marketplace_request_media_finalization_/);

  const encoded = JSON.stringify(config);
  for (const forbidden of [
    'auth_leaked_password_protection',
    'vvip_marketplace_review_listing',
    'vvip_resolve_own_profile',
    'orders_',
    'commissions_',
    'gallery_images_',
  ]) {
    assert.equal(encoded.includes(forbidden), false, `MEDIA_SUPABASE_ADVISOR_SCOPE_LEAK:${forbidden}`);
  }
});

test('advisor classification digest is deterministic and timestamp-free', () => {
  const config = loadConfig();
  assert.equal(JSON.stringify(config).includes('observed_at'), false);
  assert.equal(JSON.stringify(config).includes('timestamp'), false);
  const canonical = JSON.stringify(canonicalize(config));
  const digest = crypto.createHash('sha256').update(canonical).digest('hex');
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(
    crypto.createHash('sha256').update(JSON.stringify(canonicalize(JSON.parse(JSON.stringify(config))))).digest('hex'),
    digest,
  );
});
