'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONSTITUTION = path.join(ROOT, 'docs/owner-control/TIGER_2026_SOVEREIGN_OWNER_CONSTITUTION_AR.md');
const REGISTRY = path.join(ROOT, 'docs/owner-control/TIGER_2026_SOVEREIGN_EXECUTION_REGISTRY.json');
const SOURCE_RECORD = path.join(ROOT, 'docs/owner-control/source-records/OWNER_BASELINE_ATTACHMENT_20260820.md');
const OWNER_ENTRYPOINT = path.join(ROOT, 'docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md');
const MASTER_STATE = path.join(ROOT, 'docs/MASTER_PROJECT_STATE.md');

function readRequired(file) {
  assert.equal(fs.existsSync(file), true, `required sovereign memory file missing: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

test('owner sovereign constitution fixes authority, truth, cost and anti-illusion rules', () => {
  const text = readRequired(CONSTITUTION);
  for (const marker of [
    'CURRENT_ONLY / OWNER APPROVED',
    'Requirement → Code → Test → Rehearsal → Evidence → Exact SHA → Release Passport',
    'DESIGNED',
    'IMPLEMENTED',
    'VERIFIED',
    'PRODUCTION_ELIGIBLE',
    'P0 = 0',
    'P1 = 0',
    'Critical = 0',
    'High = 0',
    'REJECTED — UNNECESSARY COMPLEXITY',
    'لا توجد حماية تمنع التصوير بنسبة 100%',
    'الكاميرا الخارجية',
    'Facebook',
    'OpenSooq',
    'TIGER SYNAPSE User Intent',
    'Intent Capture → Consent → Normalize → Explainable Match → Safe Action → Evidence',
  ]) {
    assert.match(text, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.doesNotMatch(text, /TIGER\s+(?:هو|نظام)\s+غير قابل للاختراق|نضمن منع التصوير بنسبة 100%/i);
});

test('execution registry is machine-readable, ordered and fail-closed', () => {
  const registry = JSON.parse(readRequired(REGISTRY));
  assert.equal(registry.schema_version, 1);
  assert.equal(registry.authority_mode, 'CURRENT_ONLY');
  assert.equal(registry.fail_closed, true);
  assert.equal(registry.production_barricade, true);
  assert.equal(registry.current_cursor.pr, 290);
  assert.equal(registry.current_cursor.base_sha, '1ddfef3bd0a44e8ac976ac87074e029f5c2174c7');
  assert.equal(registry.current_cursor.next_gate, 5);
  assert.deepEqual(registry.execution_order.map((entry) => entry.gate), [2,3,4,5,6,7,8,9,10,11,12,13,14]);
  assert.equal(registry.execution_order.find((entry) => entry.gate === 4).status, 'IN_PROGRESS');
  assert.equal(registry.execution_order.find((entry) => entry.gate === 5).status, 'APPROVED');
  assert.equal(registry.launch_seals.length, 8);
  assert.equal(registry.screenshot_protection.absolute_prevention_claim, false);
  assert.equal(registry.user_intent.status, 'APPROVED');
  assert.equal(registry.user_intent.runtime_status, 'NOT_ACTIVE');
  assert.equal(registry.user_intent.authority, 'USER_CONTROLLED');
  assert.equal(registry.user_intent.may_grant_authority, false);
  assert.equal(registry.user_intent.may_make_financial_or_security_decisions, false);
});

test('owner entrypoint and master state point to the current sovereign memory and Gate 5 cursor', () => {
  const entrypoint = readRequired(OWNER_ENTRYPOINT);
  const master = readRequired(MASTER_STATE);
  const source = readRequired(SOURCE_RECORD);
  assert.match(entrypoint, /TIGER_2026_SOVEREIGN_OWNER_CONSTITUTION_AR\.md/);
  assert.match(entrypoint, /TIGER_2026_SOVEREIGN_EXECUTION_REGISTRY\.json/);
  assert.match(master, /PR #290/);
  assert.match(master, /1ddfef3bd0a44e8ac976ac87074e029f5c2174c7/);
  assert.match(master, /Gate 5/);
  assert.match(source, /IMMUTABLE SOURCE RECORD \/ NON-RUNTIME \/ NON-NORMATIVE/);
  assert.match(source, /TIGER 2026 — External Assurance & Standards Crosswalk/);
});
