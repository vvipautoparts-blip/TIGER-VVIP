'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATION = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260807104500_tiger_sovereign_runtime_atomicity.sql',
);

test('AI-13 runtime migration exposes an exact SHA-256 for content-addressed security review', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'AI-13 migration must exist');
  const sql = fs.readFileSync(MIGRATION);
  const sha256 = crypto.createHash('sha256').update(sql).digest('hex');
  assert.match(sha256, /^[0-9a-f]{64}$/);
  console.log(`AI13_RUNTIME_MIGRATION_SHA256=${sha256}`);
});
