'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION_REL = 'supabase/migrations/20260819131500_social_relationship_guard_authority_fix.sql';
const REVIEW_REL = 'docs/security/TIGER_SOCIAL_RELATIONSHIP_GUARD_AUTHORITY_FIX_SECURITY_REVIEW.md';
const SCANNER_REL = 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh';
const EXPECTED = '866129891ada5e74517f8909a488042716530f5dad896327d064084409c10b40';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('relationship guard authority fix bytes match the exact reviewed SHA-256', () => {
  const bytes = fs.readFileSync(path.join(ROOT, MIGRATION_REL));
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(actual, EXPECTED);
});

test('security review and Steel Shield bind the same exact migration bytes', () => {
  const review = read(REVIEW_REL);
  const scanner = read(SCANNER_REL);

  assert.match(review, new RegExp(EXPECTED));
  assert.match(review, /CRITICAL=0/i);
  assert.match(review, /HIGH=4/i);
  assert.match(review, /No wildcard/i);
  assert.match(
    scanner,
    new RegExp(`\\["${MIGRATION_REL.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"\\]="${EXPECTED}"`),
    'Steel Shield must recognize only the exact reviewed bytes'
  );
});
