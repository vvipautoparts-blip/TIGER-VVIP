'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/tiger-social-media-db-rehearsal.yml', 'utf8');
const behavior = fs.readFileSync('tests/sql/tiger-social-media-boundary.sql', 'utf8');

test('Social Media DB rehearsal is exact-head and local-only', () => {
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow, /Checkout exact source SHA/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.doesNotMatch(workflow, /supabase db push|--linked|SUPABASE_ACCESS_TOKEN:\s*\$\{\{/);
});

test('Social Media DB rehearsal proves privacy and webhook invariants and preserves evidence', () => {
  assert.match(workflow, /tests\/sql\/tiger-social-media-boundary\.sql/);
  assert.match(workflow, /tiger-social-media-boundary-reviewed-migration-hash\.test\.cjs/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/i);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /supabase stop --no-backup/);

  for (const marker of [
    'SOCIAL_MEDIA_NO_DIRECT_BROWSER_CRUD=PASS',
    'SOCIAL_MEDIA_RPC_BOUNDARY=PASS',
    'OWNER_PRIVATE_PATH_REGISTERED=PASS',
    'BOB_PUBLIC_MEDIA_VISIBLE=PASS',
    'BOB_FRIEND_MEDIA_VISIBLE=PASS',
    'SOCIAL_MEDIA_ONLY_ME_WAS_NOT_DENIED',
    'SOCIAL_MEDIA_BLOCK_PUBLIC_WAS_NOT_DENIED',
    'WEBHOOK_DUPLICATE_IDEMPOTENT=PASS',
    'WEBHOOK_IDEMPOTENCY_CONFLICT_WAS_NOT_DENIED',
    'WEBHOOK_DEAD_LETTER=PASS',
    'WEBHOOK_DEAD_LETTER_PERSISTED=PASS',
    'TIGER_SOCIAL_MEDIA_DB_BEHAVIOR=PASS',
  ]) {
    assert.match(behavior, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(behavior, /rollback;/i);
});
