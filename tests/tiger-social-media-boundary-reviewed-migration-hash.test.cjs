'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION_REL = 'supabase/migrations/20260819140000_social_media_boundary.sql';
const REVIEW_REL = 'docs/security/TIGER_SOCIAL_MEDIA_BOUNDARY_SECURITY_REVIEW.md';
const SCANNER_REL = 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh';
const EXPECTED = '380e441125090827cf22d81e7cd7fc3487bf74c9de335295aa01f707f7bc79af';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('Social Media boundary bytes match the exact reviewed SHA-256', () => {
  const bytes = fs.readFileSync(path.join(ROOT, MIGRATION_REL));
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(actual, EXPECTED);
});

test('security review and Steel Shield bind the same exact Social Media bytes', () => {
  const review = read(REVIEW_REL);
  const scanner = read(SCANNER_REL);

  assert.match(review, new RegExp(EXPECTED));
  assert.match(review, /No wildcard/i);
  assert.match(
    scanner,
    new RegExp(`\\["${MIGRATION_REL.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"\\]="${EXPECTED}"`),
    'Steel Shield must recognize only the exact reviewed Social Media migration bytes'
  );
});
