'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260807173000_tiger_sovereign_owner_stepup_authorization.sql',
);

test('AI-18 emits exact migration SHA-256 for content-addressed security review', () => {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex');
  console.log(`::notice title=AI18_MIGRATION_SHA256::${digest}`);
});
