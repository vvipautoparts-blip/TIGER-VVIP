'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { generateKeyPairSync, createSign } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function load(relative) {
  return require(path.join(ROOT, relative));
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signJwt(privateKey, header, payload) {
  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const signature = createSign('RSA-SHA256').update(signingInput).end().sign(privateKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

test('sealed media JWT verifier enforces Clerk RS256 issuer audience azp time window and rejects impersonation', async () => {
  const { createClerkJwtVerifier } = load('services/media-finalizer/src/jwt.js');
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  Object.assign(jwk, { kid: 'tiger-test-key', use: 'sig', alg: 'RS256' });
  let jwksLoads = 0;
  const now = 1_788_000_000;
  const verifier = createClerkJwtVerifier({
    issuer: 'https://clerk.example.test',
    audience: 'tiger-media-finalizer',
    authorizedParties: ['https://app.example.test'],
    nowSeconds: () => now,
    loadJwks: async () => { jwksLoads += 1; return { keys: [jwk] }; }
  });
  const baseClaims = {
    iss: 'https://clerk.example.test', aud: 'tiger-media-finalizer', azp: 'https://app.example.test',
    sub: 'user_abc123XYZ', sid: 'sess_123', iat: now - 5, nbf: now - 5, exp: now + 55
  };
  const valid = signJwt(privateKey, { alg: 'RS256', typ: 'JWT', kid: jwk.kid }, baseClaims);
  const identity = await verifier.verify(valid);
  assert.equal(identity.subject, baseClaims.sub);
  assert.equal(identity.authorizedParty, baseClaims.azp);
  assert.equal(jwksLoads, 1);
  await verifier.verify(valid);
  assert.equal(jwksLoads, 1, 'JWKS should be cached');

  const wrongAudience = signJwt(privateKey, { alg: 'RS256', typ: 'JWT', kid: jwk.kid }, { ...baseClaims, aud: 'wrong' });
  await assert.rejects(() => verifier.verify(wrongAudience), /JWT_AUDIENCE_INVALID/);
  const wrongParty = signJwt(privateKey, { alg: 'RS256', typ: 'JWT', kid: jwk.kid }, { ...baseClaims, azp: 'https://evil.example' });
  await assert.rejects(() => verifier.verify(wrongParty), /JWT_AUTHORIZED_PARTY_INVALID/);
  const expired = signJwt(privateKey, { alg: 'RS256', typ: 'JWT', kid: jwk.kid }, { ...baseClaims, exp: now - 61 });
  await assert.rejects(() => verifier.verify(expired), /JWT_EXPIRED/);
  const impersonated = signJwt(privateKey, { alg: 'RS256', typ: 'JWT', kid: jwk.kid }, { ...baseClaims, act: { sub: 'admin_1' } });
  await assert.rejects(() => verifier.verify(impersonated), /JWT_IMPERSONATION_FORBIDDEN/);
});

test('sealed media secret provider accepts only sb_secret server keys and caches retrieval', async () => {
  const { createSupabaseSecretProvider } = load('services/media-finalizer/src/secrets.js');
  let calls = 0;
  let now = 1000;
  const provider = createSupabaseSecretProvider({
    secretArn: 'arn:aws:secretsmanager:us-east-1:111122223333:secret:TIGER/supabase-server-test',
    nowMs: () => now,
    ttlMs: 60_000,
    loadSecret: async () => {
      calls += 1;
      return { SecretString: JSON.stringify({ supabaseSecretKey: 'sb_secret_abcdefghijklmnopqrstuvwxyz0123456789' }) };
    }
  });
  assert.equal(await provider.get(), 'sb_secret_abcdefghijklmnopqrstuvwxyz0123456789');
  assert.equal(await provider.get(), 'sb_secret_abcdefghijklmnopqrstuvwxyz0123456789');
  assert.equal(calls, 1);
  now += 60_001;
  assert.equal(await provider.get(), 'sb_secret_abcdefghijklmnopqrstuvwxyz0123456789');
  assert.equal(calls, 2);

  const unsafe = createSupabaseSecretProvider({
    secretArn: 'arn:aws:secretsmanager:us-east-1:111122223333:secret:TIGER/bad',
    loadSecret: async () => ({ SecretString: JSON.stringify({ supabaseSecretKey: 'service_role_legacy' }) })
  });
  await assert.rejects(() => unsafe.get(), /SUPABASE_SECRET_FORMAT_INVALID/);
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
  assert.doesNotMatch(JSON.stringify(template), /SUPABASE_SERVICE_ROLE_KEY/);
});

test('bootstrap CloudFormation creates immutable scan-on-push ECR and GitHub OIDC roles without AWS access keys', () => {
  const template = JSON.parse(read('infra/tiger-sealed-media-cell/bootstrap.json'));
  const serialized = JSON.stringify(template);
  const resources = Object.values(template.Resources || {});
  assert.ok(resources.some((r) => r.Type === 'AWS::ECR::Repository' && r.Properties.ImageTagMutability === 'IMMUTABLE' && r.Properties.ImageScanningConfiguration.ScanOnPush === true));
  assert.ok(resources.some((r) => r.Type === 'AWS::IAM::Role'));
  assert.match(serialized, /token\.actions\.githubusercontent\.com/);
  assert.match(serialized, /production-build/);
  assert.match(serialized, /production-deploy/);
  assert.doesNotMatch(serialized, /AccessKey|SecretAccessKey/i);
});

test('database claim removes the token-only fallback and binds capability to verified Clerk subject', () => {
  const sql = read('supabase/migrations/20260827103000_media_finalizer_subject_binding.sql');
  assert.match(sql, /drop\s+function\s+public\.vvip_marketplace_claim_media_finalization\s*\(uuid\s*,\s*text\s*\)/i);
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
  assert.equal(schema.additionalProperties, false);
});
