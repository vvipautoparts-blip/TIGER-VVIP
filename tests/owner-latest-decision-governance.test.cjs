'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const latestOwner = read('docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-15.md');
const legacyActiveTests = [
  'tests/pr72-p07-database-architecture.review.test.cjs',
  'tests/pr72-p07-erd-dictionary-integrity.runtime.test.cjs'
];

const retired120DayContract = /120[- ]day listing lifetime|120[- ]day expiry|120\\s\*day|120\\s\*days|published_at.*120\s*day/i;

test('latest owner decision is the canonical supersession contract', () => {
  assert.match(latestOwner, /LATEST/i);
  assert.match(latestOwner, /newest explicit owner decision is authoritative/i);
  assert.match(latestOwner, /120-day listing lifetime.*CANCELLED/i);
  assert.match(latestOwner, /maximum 7 images/i);
  assert.match(latestOwner, /activation card is a.*visibility entitlement/i);
  assert.match(latestOwner, /not a party/i);
  assert.match(latestOwner, /OpenSooq-style search/i);
  assert.match(latestOwner, /FUSION 2026/i);
});

test('active tests must not enforce the retired universal 120-day listing lifetime', () => {
  for (const relativePath of legacyActiveTests) {
    const source = read(relativePath);
    assert.doesNotMatch(
      source,
      retired120DayContract,
      `${relativePath} still enforces the superseded universal 120-day listing lifetime`
    );
  }
});

test('authoritative FUSION entrypoint does not expose a fixed 120-day lifetime', () => {
  const activeSurface = [
    read('index.html'),
    read('scripts/fusion/single-surface-controller.js'),
    read('scripts/fusion/runtime-adapters.js')
  ].join('\n');

  assert.doesNotMatch(activeSurface, /120[- ]day|120\s+days|120\s+يوم/i);
});
