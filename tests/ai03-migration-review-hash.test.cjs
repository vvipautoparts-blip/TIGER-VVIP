'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const EXPECTED_SHA256 = '6efc63a05581987bf79f6f5cf4d7df3e144472ef0ddfd2c5e5c163fb527b5338';

test('AI-03 security review is bound to the exact migration bytes', () => {
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260813050000_tiger_sovereign_trust_fabric.sql',
  );
  const digest = crypto
    .createHash('sha256')
    .update(fs.readFileSync(migrationPath))
    .digest('hex');

  assert.equal(digest, EXPECTED_SHA256);
});
