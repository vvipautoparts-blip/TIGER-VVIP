'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const migrationRel = 'supabase/migrations/20260819130000_social_privacy_controls.sql';
const migration = path.join(root, migrationRel);
const review = path.join(root, 'docs/security/TIGER_SOCIAL_PRIVACY_CONTROLS_MIGRATION_SECURITY_REVIEW.md');
const scanner = path.join(root, 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh');
const expected = 'a6dca63b5b2775af7c6f0eb0a7b3f252e6d21e1cbbca224984498c1664a04490';

test('Social Privacy Controls reviewed migration bytes match the content-addressed security review', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex');
  assert.equal(actual, expected, `Social Privacy Controls reviewed hash drift: expected=${expected} actual=${actual}`);

  const reviewText = fs.readFileSync(review, 'utf8');
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=24/);
  assert.match(reviewText, /NOT_NULL_RISK = 16/);
  assert.match(reviewText, /POLICY_CHANGE_REVIEW_REQUIRED = 1/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED = 7/);
});

test('Steel Shield recognizes the exact Social Privacy Controls migration as reviewed', () => {
  const result = spawnSync('bash', [scanner], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.status, 0, output);
  assert.ok(
    output.includes(`REVIEWED_BASELINE:${migrationRel}`),
    `missing exact reviewed-baseline marker for ${migrationRel}\n${output}`
  );
});
