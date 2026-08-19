'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION_REL = 'supabase/migrations/20260819140000_social_private_media_boundary.sql';
const REVIEW_REL = 'docs/security/TIGER_SOCIAL_PRIVATE_MEDIA_BOUNDARY_SECURITY_REVIEW.md';
const SCANNER_REL = 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh';
const EXPECTED = 'REVIEW_PENDING_SHA256';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('Social private-media migration exposes its exact SHA-256 before review registration', () => {
  const bytes = fs.readFileSync(path.join(ROOT, MIGRATION_REL));
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(actual, EXPECTED, `SOCIAL_PRIVATE_MEDIA_MIGRATION_SHA256=${actual}`);
});

test('review and Steel Shield must bind the exact Social private-media bytes after review', () => {
  assert.equal(fs.existsSync(path.join(ROOT, REVIEW_REL)), true, 'security review must exist');
  const review = read(REVIEW_REL);
  const scanner = read(SCANNER_REL);
  assert.match(review, new RegExp(EXPECTED));
  assert.match(scanner, new RegExp(EXPECTED));
});
