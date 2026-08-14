'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'ops', 'global-launch', 'otp-promotion-manifest.json');
const OTP_MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260808133000_phone_otp_challenges.sql');
const LC05 = path.join(ROOT, 'supabase', 'migrations', '20260808135000_lc05_credential_surface_isolation.sql');
const LC07 = path.join(ROOT, 'supabase', 'migrations', '20260812070600_lc07_legacy_otp_sequence_isolation.sql');
const EDGE = path.join(ROOT, 'supabase', 'functions', 'phone-verification', 'index.ts');

function read(file) {
  assert.equal(fs.existsSync(file), true, `${path.relative(ROOT, file)} must exist`);
  return fs.readFileSync(file, 'utf8');
}

function manifest() {
  return JSON.parse(read(MANIFEST));
}

test('OTP production promotion is an explicit four-artifact atomic bundle', () => {
  const data = manifest();
  assert.equal(data.schema_version, 1);
  assert.equal(data.verify_jwt, true);
  assert.deepEqual(data.artifacts.map((item) => item.path), [
    'supabase/migrations/20260808133000_phone_otp_challenges.sql',
    'supabase/migrations/20260808135000_lc05_credential_surface_isolation.sql',
    'supabase/migrations/20260812070600_lc07_legacy_otp_sequence_isolation.sql',
    'supabase/functions/phone-verification/index.ts',
  ]);
  for (const item of data.artifacts) {
    assert.match(item.git_blob_sha, /^[0-9a-f]{40}$/);
  }
});

test('promotion manifest classifies owner, optional and platform-provided configuration without secret values', () => {
  const data = manifest();
  assert.deepEqual(data.required_owner_configuration.sort(), [
    'OTP_ALLOWED_ORIGINS',
    'OTP_HMAC_SECRET',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_TEMPLATE_NAME',
  ].sort());
  assert.deepEqual(data.optional_configuration, ['WHATSAPP_TEMPLATE_LANG']);
  assert.deepEqual(data.platform_provided_configuration.sort(), [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL',
  ].sort());
  const serialized = JSON.stringify(data).toLowerCase();
  assert.equal(serialized.includes('secret_value'), false);
  assert.equal(serialized.includes('access_token_value'), false);
});

test('OTP database stores only hashed phone and code digest and is service-role only', () => {
  const sql = read(OTP_MIGRATION);
  assert.match(sql, /phone_hash\s+text\s+NOT NULL/i);
  assert.match(sql, /code_digest\s+text\s+NOT NULL/i);
  assert.doesNotMatch(sql, /\bphone\s+text\s+NOT NULL/i);
  assert.doesNotMatch(sql, /\bcode\s+text\s+NOT NULL/i);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/i);
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.phone_otp_challenges FROM anon, authenticated/i);
  assert.match(sql, /TO service_role/i);
});

test('OTP challenge RPCs enforce cooldown, hourly per-phone rate limit, expiry and bounded attempts', () => {
  const sql = read(OTP_MIGRATION);
  assert.match(sql, /OTP_COOLDOWN/);
  assert.match(sql, /created_at\s*>=\s*now\(\)\s*-\s*interval '1 hour'/i);
  assert.match(sql, /recent_count\s*>=\s*5/i);
  assert.match(sql, /OTP_RATE_LIMITED/);
  assert.match(sql, /max_attempts BETWEEN 1 AND 10/i);
  assert.match(sql, /attempt_count\s*>=\s*challenge\.max_attempts/i);
  assert.match(sql, /challenge\.expires_at\s*<=\s*now\(\)/i);
  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = pg_catalog, public/i);
});

test('legacy OTP/email tables and OTP sequence are isolated without being synthesized', () => {
  const lc05 = read(LC05);
  const lc07 = read(LC07);
  assert.match(lc05, /to_regclass\('public\.otp_codes'\) is not null/i);
  assert.match(lc05, /to_regclass\('public\.email_verifications'\) is not null/i);
  assert.match(lc05, /revoke all privileges on table public\.otp_codes from public, anon, authenticated/i);
  assert.match(lc05, /revoke all privileges on table public\.email_verifications from public, anon, authenticated/i);
  assert.match(lc07, /to_regclass\('public\.otp_codes_id_seq'\) is null/i);
  assert.match(lc07, /revoke all privileges on sequence public\.otp_codes_id_seq from public, anon, authenticated/i);
  assert.doesNotMatch(lc05 + lc07, /create\s+table\s+public\.(?:otp_codes|email_verifications)/i);
});

test('Edge start protocol generates OTP server-side and rejects caller-supplied code', () => {
  const source = read(EDGE);
  assert.match(source, /function unbiasedSixDigitCode\(\)/);
  assert.match(source, /crypto\.getRandomValues/);
  assert.match(source, /Object\.prototype\.hasOwnProperty\.call\(body, "code"\)/);
  assert.match(source, /const code = unbiasedSixDigitCode\(\)/);
  assert.match(source, /issue_phone_otp_challenge/);
  assert.match(source, /mark_phone_otp_delivery/);
  assert.match(source, /consume_phone_otp_challenge/);
});

test('Edge protocol is origin-bound, bounded, no-store and does not use wildcard CORS', () => {
  const source = read(EDGE);
  assert.match(source, /const MAX_BODY_BYTES = 16 \* 1024/);
  assert.match(source, /OTP_ALLOWED_ORIGINS/);
  assert.match(source, /Vary": "Origin"/);
  assert.match(source, /Cache-Control": "no-store"/);
  assert.match(source, /X-Content-Type-Options": "nosniff"/);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin": "\*"/);
  assert.match(source, /ORIGIN_DENIED/);
});

test('Edge protocol requires HMAC secret and does not persist or log raw OTP', () => {
  const source = read(EDGE);
  assert.match(source, /OTP_HMAC_SECRET/);
  assert.match(source, /byteLength < 32/);
  assert.match(source, /HMAC/);
  assert.match(source, /phoneHash\(/);
  assert.match(source, /codeDigest\(/);
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)\([^\n]*code/i);
  assert.doesNotMatch(source, /\.from\("phone_otp_challenges"\)/);
});

test('Edge responses do not echo phone number or OTP', () => {
  const source = read(EDGE);
  assert.match(source, /challenge_id: challengeId/);
  assert.match(source, /expires_in: OTP_TTL_SECONDS/);
  assert.doesNotMatch(source, /providerResponse/);
  assert.doesNotMatch(source, /phone:\s*(?:phone|recipient)/);
  assert.doesNotMatch(source, /code:\s*code/);
});
