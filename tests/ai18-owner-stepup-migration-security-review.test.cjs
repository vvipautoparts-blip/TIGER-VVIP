'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const EXPECTED_SHA256 = '4f5b7622ba45d26c5dc4151b5f2a307de178e9cd3cd8dc7e186997d0d0f3f16b';
const MIGRATION_RELATIVE = 'supabase/migrations/20260807173000_tiger_sovereign_owner_stepup_authorization.sql';
const MIGRATION = path.join(__dirname, '..', ...MIGRATION_RELATIVE.split('/'));
const REVIEW = path.join(__dirname, '..', 'docs', 'ai', 'TIGER_SOVEREIGN_AI18_OWNER_STEPUP_SECURITY_REVIEW.md');
const SCANNER = path.join(__dirname, '..', 'scripts', 'security', 'p08-steel-shield', 'scan-dangerous-sql.sh');

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('AI-18 security review is bound to the exact migration bytes', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'AI-18 migration must exist');
  assert.equal(
    sha256File(MIGRATION),
    EXPECTED_SHA256,
    'any migration byte change must invalidate the AI-18 repository security review',
  );
});

test('AI-18 review records exact scanner evidence and does not overstate production', () => {
  const review = fs.readFileSync(REVIEW, 'utf8');
  assert.match(review, new RegExp(EXPECTED_SHA256));
  assert.match(review, /AI18_REPOSITORY_SECURITY_REVIEW=PASS_WITH_STAGING_EXECUTION_REQUIRED/);
  assert.match(review, /AI18_PRODUCTION_DB_APPROVAL=NOT_GRANTED/);
  assert.match(review, /`CRITICAL=0`/);
  assert.match(review, /`NOT_NULL_RISK=20`/);
  assert.match(review, /`UPDATE_WITHOUT_WHERE=2`/);
  assert.match(review, /`OTHER_HIGH=0`/);
  assert.match(review, /Any one-byte change invalidates this review automatically/);
  assert.match(review, /does \*\*not\*\* replace/);
});

test('Steel Shield recognizes only the exact reviewed AI-18 migration hash', () => {
  const scanner = fs.readFileSync(SCANNER, 'utf8');
  const escapedPath = MIGRATION_RELATIVE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactPin = new RegExp(`\\["${escapedPath}"\\]="${EXPECTED_SHA256}"`);
  assert.match(scanner, exactPin);
  assert.match(scanner, /AI-18 TIGER SOVEREIGN owner step-up authorization/);
  assert.match(scanner, /TIGER_SOVEREIGN_AI18_OWNER_STEPUP_SECURITY_REVIEW\.md/);
});
