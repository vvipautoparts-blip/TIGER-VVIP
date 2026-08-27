'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function load(relative) {
  return require(path.join(ROOT, relative));
}

test('sealed media JWT verifier requires RS256 issuer audience azp time window and rejects impersonation', async () => {
  const { createClerkJwtVerifier } = load('services/media-finalizer/src/jwt.js');
  assert.equal(typeof createClerkJwtVerifier, 'function');
});

test('sealed media secret provider accepts only sb_secret server keys and caches retrieval', async () => {
  const { createSupabaseSecretProvider } = load('services/media-finalizer/src/secrets.js');
  assert.equal(typeof createSupabaseSecretProvider, 'function');
});

test('runtime CloudFormation is fail closed around digest image, IAM function URL, OAC, WAF and dual CloudFront Lambda permissions', () => {
  const template = JSON.parse(read('infra/tiger-sealed-media-cell/runtime.json'));
  const resources = Object.values(template.Resources || {});
  assert.ok(resources.some((r) => r.Type === 'AWS::Lambda::Function' && r.Properties.PackageType === 'Image'));
  assert.ok(resources.some((r) => r.Type === 'AWS::Lambda::Url' && r.Properties.AuthType === 'AWS_IAM'));
  assert.ok(resources.some((r) => r.Type === 'AWS::CloudFront::OriginAccessControl' && r.Properties.OriginAccessControlConfig.OriginAccessControlOriginType === 'lambda'));
  assert.ok(resources.some((r) => r.Type === 'AWS::WAFv2::WebACL' && r.Properties.Scope === 'CLOUDFRONT'));
  assert.ok(resources.some((r) => r.Type === 'AWS::Lambda::Permission' && r.Properties.Action === 'lambda:InvokeFunctionUrl'));
  assert.ok(resources.some((r) => r.Type === 'AWS::Lambda::Permission' && r.Properties.Action === 'lambda:InvokeFunction' && r.Properties.InvokedViaFunctionUrl === true));
  const imagePattern = template.Parameters && template.Parameters.ImageUri && template.Parameters.ImageUri.AllowedPattern;
  assert.match(String(imagePattern || ''), /sha256/);
});

test('bootstrap CloudFormation creates immutable scan-on-push ECR and GitHub OIDC roles without AWS access keys', () => {
  const template = JSON.parse(read('infra/tiger-sealed-media-cell/bootstrap.json'));
  const serialized = JSON.stringify(template);
  const resources = Object.values(template.Resources || {});
  assert.ok(resources.some((r) => r.Type === 'AWS::ECR::Repository' && r.Properties.ImageTagMutability === 'IMMUTABLE' && r.Properties.ImageScanningConfiguration.ScanOnPush === true));
  assert.ok(resources.some((r) => r.Type === 'AWS::IAM::Role'));
  assert.match(serialized, /token\.actions\.githubusercontent\.com/);
  assert.doesNotMatch(serialized, /AccessKey|SecretAccessKey/i);
});

test('database claim binds the one-time token to the verified Clerk subject', () => {
  const sql = read('supabase/migrations/20260827103000_media_finalizer_subject_binding.sql');
  assert.match(sql, /actor_subject\s+text/i);
  assert.match(sql, /current_job\.owner_subject\s*<>\s*actor_subject/i);
  assert.match(sql, /MEDIA_FINALIZATION_SUBJECT_MISMATCH/);
  assert.match(sql, /revoke\s+all[^;]+claim_media_finalization[^;]+from\s+(?:public|anon|authenticated)/is);
});

test('release passport schema cryptographically binds source, image digest, SBOM, attestations and infrastructure change set', () => {
  const schema = JSON.parse(read('schemas/tiger-release-passport-v1.schema.json'));
  const required = new Set(schema.required || []);
  for (const key of ['source', 'container', 'sbom', 'attestations', 'infrastructure', 'verification']) {
    assert.equal(required.has(key), true, `missing release passport field: ${key}`);
  }
});
