'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION_REL = 'supabase/migrations/20260819132000_social_post_returning_rls_fix.sql';
const REVIEW_REL = 'docs/security/TIGER_SOCIAL_POST_RETURNING_RLS_FIX_SECURITY_REVIEW.md';
const SCANNER_REL = 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh';
const EXPECTED = 'f77360e08346827bbbcb0794fabcaf30bc87ae609917bf31dc49368638f1b6dd';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('post RETURNING RLS fix bytes match the exact reviewed SHA-256', () => {
  const bytes = fs.readFileSync(path.join(ROOT, MIGRATION_REL));
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(actual, EXPECTED);
});

test('security review and Steel Shield bind the same exact post RETURNING fix bytes', () => {
  const review = read(REVIEW_REL);
  const scanner = read(SCANNER_REL);
  assert.match(review, new RegExp(EXPECTED));
  assert.match(review, /CRITICAL=0/i);
  assert.match(review, /HIGH=1/i);
  assert.match(review, /No wildcard/i);
  assert.match(
    scanner,
    new RegExp(`\\["${MIGRATION_REL.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"\\]="${EXPECTED}"`),
    'Steel Shield must recognize only the exact reviewed post RETURNING fix bytes'
  );
});
