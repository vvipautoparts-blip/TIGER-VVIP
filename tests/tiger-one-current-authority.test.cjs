const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const owner = fs.readFileSync('docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md', 'utf8');

test('TIGER ONE owner supersession authority is current-only', () => {
  assert.match(owner, /CURRENT_ONLY — BINDING OWNER AUTHORITY/);
  assert.match(owner, /SUPERSEDED \/ HISTORICAL ONLY/);
});

test('authoritative entrypoint declares TIGER ONE presentation authority', () => {
  assert.match(index, /data-tiger-one-surface/);
  assert.match(index, /data-tiger-one-app-bar/);
  assert.match(index, /data-tiger-one-pulse/);
  assert.match(index, /data-tiger-one-context-rail/);
});

test('legacy large hero and fixed numbered wizard are not current entrypoint authority', () => {
  assert.doesNotMatch(index, /class="hero"/);
  assert.doesNotMatch(index, /data-step="[1234]"/);
});
