'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github/workflows/tiger-gate2-media-rehearsal.yml');

function workflow() {
  assert.equal(fs.existsSync(WORKFLOW), true, `Gate 2 rehearsal workflow missing: ${WORKFLOW}`);
  return fs.readFileSync(WORKFLOW, 'utf8');
}

test('Gate 2 rehearsal is bound to the exact pull-request source SHA', () => {
  const text = workflow();
  assert.match(text, /SOURCE_SHA:\s*\$\{\{[^\n]*pull_request\.head\.sha[^\n]*github\.sha[^\n]*\}\}/);
  assert.match(text, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(text, /git rev-parse HEAD/);
  assert.match(text, /test\s+["']?\$actual_sha["']?\s*=\s*["']?\$SOURCE_SHA["']?/);
});

test('Gate 2 rehearsal is local-only and rebuilds the database from repository migrations', () => {
  const text = workflow();
  assert.match(text, /SUPABASE_ACCESS_TOKEN\|SUPABASE_DB_PASSWORD\|SUPABASE_PROJECT_REF/);
  assert.match(text, /supabase start/);
  assert.match(text, /supabase db reset --local/);
  assert.match(text, /supabase stop --no-backup/);
  assert.doesNotMatch(text, /supabase\s+(?:link|db\s+push|functions\s+deploy)/i);
});

test('Gate 2 rehearsal proves contracts, Edge type safety, transactional DB behavior and SHA evidence', () => {
  const text = workflow();
  for (const file of [
    'tests/tiger-social-media-canonical-authority-db.test.cjs',
    'tests/tiger-social-media-upload-ticket-contract.test.cjs',
    'tests/tiger-social-media-finalizer-contract.test.cjs',
    'tests/tiger-social-media-storage-webhook-ingress.test.cjs',
    'tests/tiger-social-media-reservation-content-identity-hardening.test.cjs',
    'tests/tiger-social-media-atomic-finalize-hardening.test.cjs',
    'tests/tiger-social-media-durable-quarantine-purge.test.cjs',
    'tests/tiger-social-media-unified-quarantine-cleanup.test.cjs',
  ]) {
    assert.ok(text.includes(file), `missing static contract in Gate 2 rehearsal: ${file}`);
  }
  for (const edge of [
    'supabase/functions/social-media-upload-ticket/index.ts',
    'supabase/functions/social-media-storage-ingress/index.ts',
    'supabase/functions/social-media-finalizer/index.ts',
  ]) {
    assert.match(text, new RegExp(`deno check\\s+${edge.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`));
  }
  assert.match(text, /tests\/sql\/tiger-gate2-canonical-media\.sql/);
  assert.match(text, /sha256sum/);
  assert.match(text, /SOURCE_SHA/);
  assert.match(text, /actions\/upload-artifact@/);
  assert.match(text, /tiger-gate2-media-rehearsal-/);
});
