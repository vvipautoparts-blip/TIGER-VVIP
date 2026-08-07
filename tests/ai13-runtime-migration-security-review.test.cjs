'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const EXPECTED_SHA256 = '892aad6818cf35e4a7135fa272091c5c2e2d7ea0a3173807a34298d2d49119e0';
const MIGRATION_RELATIVE = 'supabase/migrations/20260807104500_tiger_sovereign_runtime_atomicity.sql';
const MIGRATION = path.join(__dirname, '..', ...MIGRATION_RELATIVE.split('/'));
const REVIEW = path.join(
  __dirname,
  '..',
  'docs',
  'ai',
  'TIGER_SOVEREIGN_AI13_RUNTIME_PERSISTENCE_SECURITY_REVIEW.md',
);
const SCANNER = path.join(
  __dirname,
  '..',
  'scripts',
  'security',
  'p08-steel-shield',
  'scan-dangerous-sql.sh',
);

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('AI-13 security review is bound to the exact migration bytes', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'AI-13 migration must exist');
  assert.equal(
    sha256File(MIGRATION),
    EXPECTED_SHA256,
    'any migration byte change must invalidate the repository security review',
  );
});

test('AI-13 review document records exact hash and does not overstate staging or production', () => {
  assert.equal(fs.existsSync(REVIEW), true, 'AI-13 security review document must exist');
  const review = fs.readFileSync(REVIEW, 'utf8');

  assert.match(review, new RegExp(EXPECTED_SHA256));
  assert.match(review, /AI13_REPOSITORY_SECURITY_REVIEW=PASS_WITH_STAGING_EXECUTION_REQUIRED/);
  assert.match(review, /AI13_PRODUCTION_DB_APPROVAL=NOT_GRANTED/);
  assert.match(review, /CRITICAL=0/);
  assert.match(review, /38 `NOT_NULL_RISK`/);
  assert.match(review, /21 `UPDATE_WITHOUT_WHERE`/);
  assert.match(review, /Any one-byte change invalidates this review automatically/);
});

test('Steel Shield recognizes only the exact reviewed AI-13 migration hash', () => {
  const scanner = fs.readFileSync(SCANNER, 'utf8');
  const escapedPath = MIGRATION_RELATIVE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactPin = new RegExp(`\\["${escapedPath}"\\]="${EXPECTED_SHA256}"`);

  assert.match(scanner, exactPin);
  assert.match(scanner, /AI-13 TIGER SOVEREIGN atomic runtime persistence/);
  assert.match(scanner, /TIGER_SOVEREIGN_AI13_RUNTIME_PERSISTENCE_SECURITY_REVIEW\.md/);
});
