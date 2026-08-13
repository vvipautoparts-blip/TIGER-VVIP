'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const EXPECTED_SHA256 = 'a2d17dc8ff57ed16b11950ea7d20834013535aaed8d3263dfe5ea2905c04d515';

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
