'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION_REL = 'supabase/migrations/20260819123000_social_media_boundary.sql';
const MIGRATION = path.join(ROOT, MIGRATION_REL);
const REVIEW = path.join(ROOT, 'docs/security/TIGER_SOCIAL_MEDIA_BOUNDARY_MIGRATION_SECURITY_REVIEW.md');
const SCANNER = path.join(ROOT, 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh');
const EXPECTED_SHA256 = '15da66a889d5908d57e05188bff6ebbefe39dce96e8e11903046ddb2f2c02d4e';

test('reviewed Social media boundary migration bytes stay exact', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(MIGRATION)).digest('hex');
  assert.equal(actual, EXPECTED_SHA256);

  const review = fs.readFileSync(REVIEW, 'utf8');
  assert.match(review, new RegExp(EXPECTED_SHA256));
  assert.match(review, /CRITICAL=0/);
  assert.match(review, /HIGH=19/);
  assert.match(review, /13 × `NOT_NULL_RISK`/);
  assert.match(review, /6 × `POLICY_CHANGE_REVIEW_REQUIRED`/);
});

test('Steel Shield recognizes exact Social media boundary migration as reviewed', () => {
  const result = spawnSync('bash', [SCANNER], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.status, 0, output);
  assert.match(output, new RegExp(`REVIEWED_BASELINE:${MIGRATION_REL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(output, /SUMMARY:CRITICAL=0 HIGH=0/);
});
