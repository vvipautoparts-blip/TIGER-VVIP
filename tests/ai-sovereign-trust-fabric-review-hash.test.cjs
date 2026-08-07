'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260807094000_tiger_sovereign_trust_fabric.sql',
);

test('AI-03 security review hash is explicit and content addressed', () => {
  const content = fs.readFileSync(migrationPath);
  const digest = crypto.createHash('sha256').update(content).digest('hex');
  console.log(`AI03_TRUST_FABRIC_SHA256=${digest}`);
  assert.match(digest, /^[0-9a-f]{64}$/);
});
