'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE = path.resolve(__dirname, '../scripts/gate6/seed-synthetic.cjs');
const SHA = '0123456789abcdef0123456789abcdef01234567';

function loadSeed() {
  assert.equal(fs.existsSync(MODULE), true, 'Gate 6 synthetic seed module must exist');
  return require(MODULE);
}

test('Gate 6 synthetic seed is deterministic and visibly non-real', () => {
  const { buildSyntheticSeed } = loadSeed();
  const first = buildSyntheticSeed({ sourceSha: SHA });
  const second = buildSyntheticSeed({ sourceSha: SHA });
  assert.deepEqual(first, second);
  assert.equal(first.classification, 'SYNTHETIC_SANITIZED');
  assert.equal(first.source_sha, SHA);
  assert.match(first.digest_sha256, /^[0-9a-f]{64}$/);
  assert.equal(first.fixtures.length, 2);
  for (const fixture of first.fixtures) {
    assert.equal(fixture.synthetic, true);
    assert.match(fixture.email, /@example\.invalid$/);
    assert.match(fixture.display_name, /^TIGER Gate6 Synthetic /);
    assert.match(fixture.user_id, /^[0-9a-f-]{36}$/);
  }
});

test('Gate 6 synthetic seed rejects non-exact source identity', () => {
  const { buildSyntheticSeed } = loadSeed();
  assert.throws(() => buildSyntheticSeed({ sourceSha: 'bad' }), /exact.*SHA/i);
});
