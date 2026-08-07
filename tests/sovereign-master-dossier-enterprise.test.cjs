'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const enterprise = require('../scripts/ai/sovereign-master-dossier-enterprise');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql'), 'utf8');
const EDGE = fs.readFileSync(path.join(ROOT, 'supabase/functions/tiger-sovereign-ai/index.ts'), 'utf8');

function tableColumns(sql, tableName) {
  const pattern = new RegExp(`create table if not exists public\\.${tableName} \\(([\\s\\S]*?)\\n\\);`, 'i');
  const match = sql.match(pattern);
  assert.ok(match, `${tableName} definition must exist`);
  const typePattern = /^(id|owner_subject|requesting_agent|action|payload_digest|scope_digest|scope|decision_passport_id|reason|status|created_at|expires_at|approved_at|rejected_at|revoked_at|consumed_at|updated_at|correlation_id|actor_subject|agent_id|decision|reason_code|country_code|sector_code|resource|tool_id|approval_id|model_id|prompt_version|metadata|previous_hash|event_hash)\s+(uuid|text|jsonb|timestamptz)/i;
  return match[1]
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .map((line) => line.match(typePattern))
    .filter(Boolean)
    .map((entry) => entry[1]);
}

test('approval-request Enterprise spec is field-complete against the exact migration table definition', () => {
  const actual = tableColumns(MIGRATION, 'ai_approval_requests');
  const documented = enterprise.DATABASE_SPECS.ai_approval_requests.fields.map((field) => field.name);
  assert.deepEqual(documented, actual);
  assert.deepEqual(documented, [
    'id', 'owner_subject', 'requesting_agent', 'action', 'payload_digest', 'scope_digest', 'scope',
    'decision_passport_id', 'reason', 'status', 'created_at', 'expires_at', 'approved_at', 'rejected_at',
    'revoked_at', 'consumed_at', 'updated_at',
  ]);
});

test('audit-event Enterprise spec is field-complete against the exact migration table definition', () => {
  const actual = tableColumns(MIGRATION, 'ai_audit_events');
  const documented = enterprise.DATABASE_SPECS.ai_audit_events.fields.map((field) => field.name);
  assert.deepEqual(documented, actual);
  assert.deepEqual(documented, [
    'id', 'correlation_id', 'actor_subject', 'agent_id', 'action', 'decision', 'reason_code', 'country_code',
    'sector_code', 'resource', 'tool_id', 'approval_id', 'model_id', 'prompt_version', 'metadata',
    'previous_hash', 'event_hash', 'created_at',
  ]);
});

test('every documented database field has type, purpose and security semantics', () => {
  for (const table of Object.values(enterprise.DATABASE_SPECS)) {
    assert.match(table.sourcePath, /^supabase\/migrations\//);
    assert.equal(table.truthState, 'VERIFIED_REPOSITORY_CONTRACT');
    assert.ok(table.rls.length > 0);
    for (const field of table.fields) {
      assert.ok(field.name.length > 0);
      assert.ok(field.type.length > 0);
      assert.ok(field.purpose.length > 0);
      assert.ok(field.security.length > 0);
      assert.equal(Object.isFrozen(field), true);
    }
  }
});

test('API inventory separates the real Edge Function from designed /v1 aliases', () => {
  const actual = enterprise.API_SPECS.find((api) => api.id === 'AI-EDGE-TIGER-SOVEREIGN');
  assert.equal(actual.truthState, 'VERIFIED_REPOSITORY_CONTRACT');
  assert.equal(actual.sourcePath, 'supabase/functions/tiger-sovereign-ai/index.ts');
  assert.match(EDGE, /tiger-sovereign-ai|TIGER_AI_/i);
  for (const route of ['/v1/ai/execute', '/v1/ai/approval-requests', '/v1/ai/audit-events']) {
    const spec = enterprise.API_SPECS.find((api) => api.route === route);
    assert.ok(spec);
    assert.equal(spec.truthState, 'DESIGNED');
  }
  for (const field of ['agentId', 'input', 'correlationId', 'locale']) assert.match(EDGE, new RegExp(field));
});

test('UI inventory distinguishes existing surfaces from pending manual acceptance and designed audit UI', () => {
  const owner = enterprise.UI_SPECS.find((screen) => screen.id === 'OWNER-CONTROL-PANEL');
  const pr36 = enterprise.UI_SPECS.find((screen) => screen.id === 'PR36-MEDIA-JOURNEY');
  const audit = enterprise.UI_SPECS.find((screen) => screen.id === 'PERSISTENT-AUDIT-LOG-UI');
  assert.equal(owner.truthState, 'VERIFIED_REPOSITORY_CONTRACT');
  assert.equal(pr36.truthState, 'PENDING_MANUAL_ACCEPTANCE');
  assert.equal(audit.truthState, 'DESIGNED');
});

test('performance and load documentation cannot present the 150ms target as a measured result', () => {
  const latency = enterprise.SECURITY_OPS_SPECS.find((item) => item.id === 'P95-LATENCY-150MS');
  const k6 = enterprise.SECURITY_OPS_SPECS.find((item) => item.id === 'K6-LARGE-SCALE-SUITE');
  assert.equal(latency.truthState, 'PENDING_MEASUREMENT');
  assert.equal(latency.kind, 'TARGET');
  assert.equal(k6.truthState, 'DESIGNED');
});

test('DR and owner activation inventory preserves real-evidence and authority boundaries', () => {
  const restore = enterprise.OPERATIONS_SPECS.find((item) => item.id === 'BACKUP-RESTORE-DRILL');
  const rollback = enterprise.OPERATIONS_SPECS.find((item) => item.id === 'ROLLBACK-DRILL');
  const approvals = enterprise.OPERATIONS_SPECS.find((item) => item.id === 'OWNER-TRIPLE-APPROVAL');
  assert.equal(restore.truthState, 'PENDING_REAL_EVIDENCE');
  assert.equal(rollback.truthState, 'PENDING_REAL_EVIDENCE');
  assert.equal(approvals.truthState, 'VERIFIED_REPOSITORY_CONTRACT');
  assert.deepEqual(approvals.actions, ['MERGE_RELEASE', 'PROMOTE_DATABASE', 'ACTIVATE_PRODUCTION']);
});

test('complete dossier work plan covers provenance, evidence collectors, load/security, export, staging and production proof without auto-authority', () => {
  assert.deepEqual(enterprise.WORK_PLAN.map((phase) => phase.id), [
    'DOSSIER-P1-TRUTH-CORE',
    'DOSSIER-P2-RELEASE-PROVENANCE',
    'DOSSIER-P3-TRUSTED-EVIDENCE-COLLECTORS',
    'DOSSIER-P4-LOAD-SECURITY-EVIDENCE',
    'DOSSIER-P5-UI-MANUAL-ACCEPTANCE',
    'DOSSIER-P6-DOCX-PDF-EXPORT',
    'DOSSIER-P7-STAGING-PROOF-CAMPAIGN',
    'DOSSIER-P8-PRODUCTION-PASSPORT-CAMPAIGN',
  ]);
  assert.equal(enterprise.WORK_PLAN[0].status, 'IMPLEMENTED_REPOSITORY_SLICE');
  assert.equal(enterprise.WORK_PLAN.at(-1).requiresOwnerProductionActivation, true);
  for (const phase of enterprise.WORK_PLAN) {
    assert.ok(phase.exitCriteria.length > 0);
    assert.equal(Object.isFrozen(phase), true);
  }
});

test('Enterprise registries are deeply immutable', () => {
  assert.equal(Object.isFrozen(enterprise.DATABASE_SPECS), true);
  assert.equal(Object.isFrozen(enterprise.API_SPECS), true);
  assert.equal(Object.isFrozen(enterprise.UI_SPECS), true);
  assert.equal(Object.isFrozen(enterprise.SECURITY_OPS_SPECS), true);
  assert.equal(Object.isFrozen(enterprise.OPERATIONS_SPECS), true);
  assert.equal(Object.isFrozen(enterprise.WORK_PLAN), true);
});
