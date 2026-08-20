'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE = path.join(ROOT, '.gitleaksignore');
const EXACT_FINGERPRINT = /^[0-9a-f]{40}:.+:(?:generic-api-key|gcp-api-key|jwt|github-pat):[1-9][0-9]*$/;

test('full-history Gitleaks exceptions are exact commit-scoped fingerprints only', () => {
  assert.equal(fs.existsSync(IGNORE), true, '.gitleaksignore must exist for reviewed historical findings');
  const lines = fs.readFileSync(IGNORE, 'utf8').split(/\r?\n/);
  const entries = lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  assert.equal(entries.length, 76, 'reviewed baseline must match the classified 76-finding evidence set');
  assert.equal(new Set(entries).size, entries.length, 'historical fingerprint exceptions must be unique');

  for (const entry of entries) {
    assert.match(entry, EXACT_FINGERPRINT, `exception must be exact commit:file:rule:line fingerprint: ${entry}`);
    assert.equal(entry.includes('*'), false, 'wildcard suppression is forbidden');
  }
});

test('review rationale stays explicit and no broad suppression language is introduced', () => {
  const text = fs.readFileSync(IGNORE, 'utf8');
  for (const group of [
    'TEST_FIXTURE (16)',
    'NON_SECRET_HASH (4)',
    'PUBLIC_CLIENT_IDENTIFIER (55)',
    'DOCUMENTATION_FALSE_POSITIVE (1)'
  ]) {
    assert.ok(text.includes(group), `missing reviewed classification: ${group}`);
  }
  assert.match(text, /No path-wide, rule-wide, or wildcard suppression is permitted/);
});
