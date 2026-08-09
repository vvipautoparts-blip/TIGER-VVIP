'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const ledgerPath = path.join(root, 'project-control', 'documentation', 'knowledge-ledger.v1.json');
const standardPath = path.join(root, 'docs', 'governance', 'VVIP_TIGER_DOCUMENTATION_SOVEREIGN_STANDARD.md');

function readLedger() {
  assert.ok(fs.existsSync(ledgerPath), 'canonical knowledge ledger must exist');
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
}

test('documentation plane has one canonical machine-readable ledger', () => {
  const ledger = readLedger();
  assert.equal(ledger.schema_version, 'VVIP-DOC-1');
  assert.equal(ledger.platform, 'VVIP TIGER');
  assert.equal(ledger.default_visibility, 'OWNER_CONTROL_ONLY');
  assert.ok(Array.isArray(ledger.entries) && ledger.entries.length >= 4);
});

test('every ledger entry is path, commit, environment and evidence addressable', () => {
  const ledger = readLedger();
  const required = [
    'id', 'recorded_at', 'category', 'title', 'source_sha', 'pr_number',
    'environment', 'exact_paths', 'decision', 'verification',
    'mutation_boundaries', 'confidentiality', 'platform_visibility'
  ];

  for (const entry of ledger.entries) {
    for (const field of required) {
      assert.ok(Object.hasOwn(entry, field), `${entry.id || '<unknown>'} missing ${field}`);
    }
    assert.match(entry.source_sha, /^[0-9a-f]{40}$/);
    assert.ok(Array.isArray(entry.exact_paths) && entry.exact_paths.length > 0);
    assert.ok(entry.exact_paths.every((item) => typeof item.path === 'string' && item.path.length > 0));
    assert.ok(Array.isArray(entry.verification) && entry.verification.length > 0);
    assert.ok(Array.isArray(entry.mutation_boundaries) && entry.mutation_boundaries.length > 0);
    assert.ok(['OWNER_CONTROL_ONLY', 'PUBLIC_SAFE'].includes(entry.platform_visibility));
    assert.ok(['INTERNAL', 'SECURITY_RESTRICTED', 'PUBLIC'].includes(entry.confidentiality));
  }
});

test('ledger records LC04, LC05, LC06 and global mobile launch state', () => {
  const ids = new Set(readLedger().entries.map((entry) => entry.id));
  for (const id of ['LC04-20260808', 'LC05-20260808', 'LC06-20260808', 'MOBILE-GLOBAL-20260808']) {
    assert.ok(ids.has(id), `missing documentation record ${id}`);
  }
});

test('documentation standard forbids secrets and requires exact reproducible evidence', () => {
  assert.ok(fs.existsSync(standardPath), 'documentation sovereign standard must exist');
  const text = fs.readFileSync(standardPath, 'utf8');
  for (const phrase of [
    'No secrets in documentation',
    'Exact path',
    'Exact SHA',
    'Environment',
    'Verification evidence',
    'Mutation boundary',
    'OWNER_CONTROL_ONLY',
    'Fail closed'
  ]) {
    assert.ok(text.includes(phrase), `documentation standard missing: ${phrase}`);
  }
});

test('ledger contains no obvious credential material', () => {
  const text = fs.readFileSync(ledgerPath, 'utf8');
  const forbidden = [
    /service_role\s*[:=]\s*[A-Za-z0-9._-]{20,}/i,
    /SUPABASE_DB_PASSWORD\s*[:=]/i,
    /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i,
    /sk_(live|test)_[A-Za-z0-9]+/i
  ];
  for (const pattern of forbidden) assert.doesNotMatch(text, pattern);
});
