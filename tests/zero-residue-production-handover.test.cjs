'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'project-control', 'production-handover', 'current-authority.v1.json');
const OWNER = path.join(ROOT, 'docs', 'MASTER_PROJECT_STATE.md');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const GITIGNORE = path.join(ROOT, '.gitignore');
const DOC_WORKFLOW = path.join(ROOT, '.github', 'workflows', 'documentation-sovereign-knowledge-plane.yml');

function loadManifest() {
  assert.ok(fs.existsSync(MANIFEST), 'current Production authority manifest must exist');
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

function activeLines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
}

test('handover has exactly one current human owner authority and one machine contract', () => {
  const m = loadManifest();
  assert.equal(m.schema_version, 'VVIP-ZRPH-1');
  assert.equal(m.platform, 'VVIP TIGER');
  assert.equal(m.mode, 'CURRENT_ONLY');
  assert.equal(m.human_authority, 'docs/MASTER_PROJECT_STATE.md');
  assert.equal(m.historical_evidence_authoritative, false);
  assert.ok(fs.existsSync(OWNER));
});

test('20-pass protocol is complete, ordered, unique and fail-closed', () => {
  const passes = loadManifest().passes;
  assert.equal(passes.length, 20);
  assert.deepEqual(passes.map((p) => p.id), Array.from({ length: 20 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`));
  for (const pass of passes) {
    assert.equal(pass.fail_closed, true, `${pass.id} must fail closed`);
    assert.ok(typeof pass.name === 'string' && pass.name.length > 3);
    assert.ok(Array.isArray(pass.evidence) && pass.evidence.length > 0);
  }
});

test('technical stack authority is explicit and path-addressable', () => {
  const s = loadManifest().stack;
  assert.deepEqual(s.frontend, ['HTML', 'CSS', 'JavaScript', 'TypeScript']);
  assert.equal(s.database, 'Supabase/PostgreSQL');
  assert.equal(s.database_migration_authority, 'supabase/migrations');
  assert.equal(s.edge_functions, 'supabase/functions');
  assert.equal(s.media_finalizer.runtime, 'AWS Lambda container / Node.js 24');
  assert.equal(s.media_finalizer.path, 'services/media-finalizer');
  assert.equal(s.cicd, 'GitHub Actions');
  assert.equal(s.production_artifact_builder, 'tools/vvip_public_release.py');
});

test('dangerous cleanup is never blanket or implicit', () => {
  const d = loadManifest().destructive_operations;
  for (const key of ['production_database_delete', 'git_history_rewrite', 'dns_delete', 'credential_revoke', 'docker_volume_prune', 'branch_delete', 'tag_delete']) {
    assert.equal(d[key].default_enabled, false, `${key} must default disabled`);
    assert.equal(d[key].requires_explicit_evidence, true, `${key} must require evidence`);
  }
  assert.equal(d.production_database_delete.requires_backup_proof, true);
  assert.equal(d.production_database_delete.requires_retention_allowlist, true);
  assert.equal(d.git_history_rewrite.rotate_or_revoke_first, true);
  assert.equal(d.docker_volume_prune.shared_or_production_blanket_prune_forbidden, true);
});

test('environment template matches the Production runtime contract without real values', () => {
  const text = fs.readFileSync(ENV_EXAMPLE, 'utf8');
  for (const name of [
    'TIGER_ENVIRONMENT', 'TIGER_CLERK_PUBLISHABLE_KEY', 'TIGER_SUPABASE_URL',
    'TIGER_SUPABASE_PUBLISHABLE_KEY', 'TIGER_DEFAULT_COUNTRY_CODE', 'TIGER_MEDIA_FINALIZER_URL'
  ]) assert.match(text, new RegExp(`^${name}=`, 'm'), `missing ${name}`);
  assert.doesNotMatch(text, /pk_live_[A-Za-z0-9_-]+|sbp_[A-Za-z0-9_-]+|sk_live_[A-Za-z0-9_-]+/);
});

test('.gitignore has no duplicate active rules', () => {
  const lines = activeLines(fs.readFileSync(GITIGNORE, 'utf8'));
  const duplicates = [...new Set(lines.filter((line, index) => lines.indexOf(line) !== index))];
  assert.deepEqual(duplicates, []);
});

test('documentation workflow is not pinned to an obsolete feature branch', () => {
  const text = fs.readFileSync(DOC_WORKFLOW, 'utf8');
  assert.doesNotMatch(text, /feat\/documentation-sovereign-knowledge-plane-20260808/);
});

test('database authority exists only under canonical migrations, never root SQL', () => {
  const rootSql = fs.readdirSync(ROOT).filter((name) => name.toLowerCase().endsWith('.sql')).sort();
  assert.deepEqual(rootSql, [], `root SQL creates parallel database authority: ${rootSql.join(', ')}`);
  assert.ok(fs.existsSync(path.join(ROOT, 'supabase', 'migrations')));
});

test('retired parallel deploy and unreviewed push bindings cannot return', () => {
  for (const relative of ['firebase.json', '.firebaserc', '.replit', '.git-auto-push.sh']) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), false, `${relative} is forbidden parallel authority`);
  }
});

test('Production handover is exact-SHA, sealed, attested and provider-neutral', () => {
  const h = loadManifest().production_handover;
  assert.equal(h.source_identity, 'EXACT_SHA_AND_TREE');
  assert.equal(h.build_once, true);
  assert.equal(h.sealed_artifact, true);
  assert.equal(h.sbom, 'CycloneDX');
  assert.equal(h.provenance_attestation, true);
  assert.equal(h.production_provider, 'AWS');
  assert.equal(h.deploy_requires_fresh_runtime_evidence, true);
});

test('external surfaces require live-provider reconciliation rather than repository inference', () => {
  const x = loadManifest().external_reconciliation;
  for (const key of ['aws', 'dns', 'identity', 'email', 'messaging', 'analytics', 'error_tracking', 'webhooks']) {
    assert.equal(x[key], 'LIVE_PROVIDER_EVIDENCE_REQUIRED');
  }
});
