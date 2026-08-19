'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION_REL = 'supabase/migrations/20260819140500_social_media_webhook_claim_fix.sql';
const REVIEW_REL = 'docs/security/TIGER_SOCIAL_MEDIA_WEBHOOK_CLAIM_FIX_SECURITY_REVIEW.md';
const SCANNER_REL = 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh';
const EXPECTED = '4a83063482a13034f4e04e15a4e964f62fa6a5138f0348d2a7d6b1d7cc376fb9';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('Social Media webhook claim fix bytes match the exact reviewed SHA-256', () => {
  const actual = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, MIGRATION_REL)))
    .digest('hex');
  assert.equal(actual, EXPECTED);
});

test('review and Steel Shield bind the same exact webhook claim fix bytes', () => {
  const review = read(REVIEW_REL);
  const scanner = read(SCANNER_REL);
  assert.match(review, new RegExp(EXPECTED));
  assert.match(review, /No wildcard/i);
  assert.match(
    scanner,
    new RegExp(`\\["${MIGRATION_REL.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"\\]="${EXPECTED}"`)
  );
});
