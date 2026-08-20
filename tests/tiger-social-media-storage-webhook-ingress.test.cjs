'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260820003300_social_media_storage_event_ingress.sql');
const FUNCTION = path.join(ROOT, 'supabase/functions/social-media-storage-ingress/index.ts');

function read(file) {
  assert.equal(fs.existsSync(file), true, `Gate 2 artifact missing: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

test('storage event is mapped to media by the DB-owned quarantine path, never a client media id', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_social_media_webhook_accept_storage\s*\(/i);
  assert.match(sql, /event_bucket_id\s+text/i);
  assert.match(sql, /event_object_path\s+text/i);
  assert.match(sql, /asset\.bucket_id\s*=\s*event_bucket_id/i);
  assert.match(sql, /asset\.quarantine_storage_path\s*=\s*event_object_path/i);
  assert.match(sql, /for\s+update/i);
  assert.match(sql, /vvip_social_media_webhook_accept\s*\(/i);
  assert.match(sql, /grant\s+execute[^;]*vvip_social_media_webhook_accept_storage[^;]*to\s+service_role/i);
  assert.doesNotMatch(sql, /grant\s+execute[^;]*vvip_social_media_webhook_accept_storage[^;]*to\s+authenticated/i);
});

test('edge ingress uses a dedicated webhook secret rather than exposing the service-role key as bearer auth', () => {
  const source = read(FUNCTION);
  assert.match(source, /TIGER_STORAGE_WEBHOOK_SECRET/);
  assert.match(source, /x-tiger-storage-webhook-secret/i);
  assert.match(source, /constantTimeEqual/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /constantTimeEqual\s*\(\s*authorization\s*,\s*`Bearer\s+\$\{serviceRoleKey\}`\s*\)/i);
});

test('edge ingress accepts only authenticated INSERT events for the private quarantine bucket', () => {
  const source = read(FUNCTION);
  assert.match(source, /request\.method\s*!==\s*["']POST["']/);
  assert.match(source, /payload\.type\s*!==\s*["']INSERT["']/);
  assert.match(source, /payload\.schema\s*!==\s*["']storage["']/);
  assert.match(source, /payload\.table\s*!==\s*["']objects["']/);
  assert.match(source, /requireString\s*\(\s*record\.bucket_id\s*,\s*["']STORAGE_WEBHOOK_BUCKET_INVALID["']\s*\)/);
  assert.match(source, /bucketId\s*!==\s*EXPECTED_BUCKET/);
  assert.match(source, /requireString\s*\(\s*record\.name\s*,\s*["']STORAGE_WEBHOOK_PATH_INVALID["']\s*\)/);
  assert.match(source, /objectPath\.startsWith\s*\(\s*["']quarantine\//);
  assert.match(source, /vvip_social_media_webhook_accept_storage/);
  assert.doesNotMatch(source, /body\.(?:media_id|mime|mime_type|sha256|width|height|byte_size)/i);
});
