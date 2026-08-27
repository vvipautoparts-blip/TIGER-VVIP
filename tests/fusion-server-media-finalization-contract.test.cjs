'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260816090001_sovereign_media_finalization.sql');
const HANDLER = path.join(ROOT, 'services/media-finalizer/src/handler.js');
const CANONICALIZE = path.join(ROOT, 'services/media-finalizer/src/canonicalize.js');
const POLICY = path.join(ROOT, 'services/media-finalizer/src/policy.js');
const DOCKERFILE = path.join(ROOT, 'services/media-finalizer/Dockerfile');
const PACKAGE = path.join(ROOT, 'services/media-finalizer/package.json');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('database requires one-time trusted canonical-media finalization before publication', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'server media finalization migration must exist');
  const sql = read(MIGRATION);
  for (const token of [
    'finalization_state',
    'canonical_storage_path',
    'canonical_sha256',
    'canonical_mime_type',
    'canonical_byte_size',
    'canonical_width',
    'canonical_height',
    'canonical_verified_at',
    'vvip_media_finalization_jobs',
    'vvip_marketplace_request_media_finalization',
    'vvip_marketplace_claim_media_finalization',
    'vvip_marketplace_complete_media_finalization',
    "finalization_state <> 'CANONICAL'",
    'MEDIA_SERVER_FINALIZATION_REQUIRED',
    "'listing-media-canonical'",
    'force row level security',
    'vvip_private.vvip_marketplace_country_is_active'
  ]) {
    assert.ok(sql.includes(token), `missing trusted-media contract: ${token}`);
  }

  assert.match(sql, /revoke\s+all[^;]+vvip_media_finalization_jobs[^;]+from\s+(?:public|anon|authenticated)/is);
  assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete)[^;]+vvip_media_finalization_jobs[^;]+to\s+authenticated/is);
  assert.doesNotMatch(sql, /grant\s+execute[^;]+vvip_marketplace_(?:claim|complete)_media_finalization[^;]+to\s+authenticated/is);
  assert.match(sql, /MARKETPLACE_MEDIA_CANONICAL_FIELDS_TRUSTED_ONLY/);
  assert.match(sql, /drop policy if exists vvip_listing_media_storage_owner_update/i);
});

test('finalizer policy accepts only strict JPEG/WebP containers and rejects HEIC/HEIF and polyglot tails', () => {
  assert.equal(fs.existsSync(POLICY), true, 'media finalizer policy must exist');
  const source = read(POLICY);
  for (const token of [
    'assertStrictContainer',
    'image/jpeg',
    'image/webp',
    'JPEG_EOI_MISSING_OR_TRAILING_BYTES',
    'WEBP_RIFF_LENGTH_MISMATCH',
    'MEDIA_FORMAT_NOT_ALLOWED',
    'MAX_SOURCE_BYTES',
    'MAX_PIXELS'
  ]) {
    assert.ok(source.includes(token), `missing finalizer policy token: ${token}`);
  }
  assert.doesNotMatch(source, /image\/(?:hei[cf]|avif)/i);
});

test('AWS finalizer orchestrates bounded trusted storage while the isolated canonicalizer normalizes and re-encodes media', () => {
  assert.equal(fs.existsSync(HANDLER), true, 'Lambda handler must exist');
  assert.equal(fs.existsSync(CANONICALIZE), true, 'media canonicalizer must exist');
  const handler = read(HANDLER);
  const canonicalizer = read(CANONICALIZE);

  for (const token of [
    'claim_media_finalization',
    'complete_media_finalization',
    "const LISTING_SOURCE_BUCKET = 'listing-media'",
    "const LISTING_CANONICAL_BUCKET = 'listing-media-canonical'",
    'storage.from(LISTING_SOURCE_BUCKET)',
    'storage.from(LISTING_CANONICAL_BUCKET)',
    'canonicalSha256',
    'sourceSha256',
    'timingSafeEqual',
    "method === 'OPTIONS'",
    'access-control-allow-methods',
    'access-control-allow-headers',
    'MEDIA_FINALIZATION_OWNER_MISMATCH',
    'owner_subject !== identity.subject'
  ]) {
    assert.ok(handler.includes(token), `missing finalizer orchestration token: ${token}`);
  }

  for (const token of [
    "require('sharp')",
    '.timeout({ seconds',
    '.rotate()',
    ".toColourspace('srgb')",
    '.jpeg({',
    '.webp({'
  ]) {
    assert.ok(canonicalizer.includes(token), `missing strict canonicalizer token: ${token}`);
  }

  assert.doesNotMatch(canonicalizer, /keepMetadata|keepExif|keepXmp|withMetadata|withExif|withXmp/);
  assert.doesNotMatch(canonicalizer, /heic|heif/i);
  assert.doesNotMatch(handler, /SUPABASE_SERVICE_ROLE_KEY|Authorization\s*:\s*`Bearer/i);
});

test('Lambda is containerized on digest-pinned AL2023 Node 24 with exact reviewed runtime dependencies', () => {
  assert.equal(fs.existsSync(DOCKERFILE), true, 'Lambda Dockerfile must exist');
  assert.equal(fs.existsSync(PACKAGE), true, 'Lambda package manifest must exist');
  const docker = read(DOCKERFILE);
  const pkg = JSON.parse(read(PACKAGE));
  assert.match(docker, /public\.ecr\.aws\/lambda\/nodejs:24@sha256:[0-9a-f]{64}/);
  assert.equal(pkg.dependencies.sharp, '0.35.3');
  assert.equal(pkg.dependencies['@aws-sdk/client-secrets-manager'], '3.1117.0');
  assert.equal(pkg.private, true);
});

test('public runtime exposes only a HTTPS finalizer endpoint through the canonical repository, never server credentials', () => {
  const release = read(path.join(ROOT, 'tools/vvip_public_release.py'));
  const repository = read(path.join(ROOT, 'scripts/runtime/vvip-marketplace-repository.js'));
  const forbiddenSecretNames = /SUPABASE_SERVICE_ROLE_KEY|TIGER_SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY/i;
  assert.match(release, /TIGER_MEDIA_FINALIZER_URL/);
  assert.match(release, /mediaFinalizerUrl/);
  assert.match(repository, /MEDIA_FINALIZER_URL_REQUIRED/);
  assert.match(repository, /vvip_marketplace_request_media_finalization/);
  assert.match(repository, /listing-media-canonical/);
  assert.doesNotMatch(release, forbiddenSecretNames);
  assert.doesNotMatch(repository, forbiddenSecretNames);
});
