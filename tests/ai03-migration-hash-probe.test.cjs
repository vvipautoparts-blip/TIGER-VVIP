'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

test('print exact AI-03 migration SHA-256 for content-addressed review', () => {
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260813050000_tiger_sovereign_trust_fabric.sql',
  );
  const bytes = fs.readFileSync(migrationPath);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  console.log(`AI03_MODERN_TRUST_FABRIC_SHA256=${digest}`);
  assert.match(digest, /^[0-9a-f]{64}$/);
});
