'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');

const DURABLE = [
  'codeql.yml',
  'dependency-review.yml',
  'pages.yml',
  'production-release-artifact.yml',
  'project-control-integrity.yml',
  'quality-gate.yml',
  'release-candidate.yml',
  'supabase-security-gate.yml',
  'tiger-cleanguard.yml',
].sort();

const SUPERSEDED = [
  'documentation-sovereign-knowledge-plane.yml',
  'lc03-supabase-security-rehearsal.yml',
  'lc04-production-legacy-rpc-rehearsal.yml',
  'lc05-credential-surface-isolation-rehearsal.yml',
  'lc06-rls-performance-hardening-rehearsal.yml',
  'production-reconciliation-proof.yml',
  'tsrf-phone-otp-rehearsal.yml',
  'tsrf-semantic-convergence.yml',
  'tsrf-staging-evidence.yml',
  'v14-local-supabase-rehearsal.yml',
  'v14-release-candidate.yml',
  'vvip-quality-gate.yml',
];

const HISTORICAL_MARKERS = [
  'integration/v14-global-launch-readiness-20260806',
  'feat/tsrf-global-launch-proof-20260808',
  'feat/tsrf-launch-evidence-plane-20260808',
  'feat/lc04-production-legacy-rpc-hardening-20260808',
  'feat/lc05-credential-surface-isolation-20260808',
  'feat/lc06-rls-performance-hardening-20260808',
  'release/tiger-jo-convergence',
  'ops/production-reconciliation-20260810',
  '3d8bbfc8611e53510b3bb776b8d9752df6595d8d',
];

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function workflow(name) {
  return read(path.join('.github', 'workflows', name));
}

test('current executable workflow surface is exactly the durable nine-file allowlist', () => {
  const actual = fs.readdirSync(WORKFLOWS)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort();
  assert.deepEqual(actual, DURABLE);
  for (const name of SUPERSEDED) {
    assert.equal(fs.existsSync(path.join(WORKFLOWS, name)), false, `${name} must stay retired`);
  }
});

test('current workflows contain no known historical branch or stale reconciliation identity', () => {
  for (const name of DURABLE) {
    const source = workflow(name);
    for (const marker of HISTORICAL_MARKERS) {
      assert.equal(source.includes(marker), false, `${name} contains historical marker ${marker}`);
    }
  }
});

test('canonical quality gate is exact-head and targets current main only', () => {
  const source = workflow('quality-gate.yml');
  assert.match(source, /pull_request:[\s\S]*?branches:[\s\S]*?- main/);
  assert.match(source, /push:[\s\S]*?branches:[\s\S]*?- main/);
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /SOURCE_SHA:\s*\$\{\{\s*github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.sha \|\| github\.sha\s*\}\}/);
  assert.match(source, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(source, /test\s+"\$\(git rev-parse HEAD\)"\s*=\s*"\$SOURCE_SHA"/);
  assert.match(source, /bash scripts\/quality-gate\.sh/);
  assert.match(source, /contents:\s*read/);
});

test('release candidate preserves exact-source build and evidence binding without V14 branch coupling', () => {
  const source = workflow('release-candidate.yml');
  assert.match(source, /SOURCE_SHA:\s*\$\{\{\s*github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.sha \|\| github\.sha\s*\}\}/);
  assert.match(source, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(source, /test\s+"\$actual_sha"\s*=\s*"\$SOURCE_SHA"/);
  assert.match(source, /--mode candidate/);
  assert.match(source, /--source-sha\s+"\$SOURCE_SHA"/);
  assert.match(source, /release-candidate-\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
});

test('generic Supabase security gate is exact-head, local-only, pinned and fail closed', () => {
  const source = workflow('supabase-security-gate.yml');
  assert.match(source, /SOURCE_SHA:\s*\$\{\{\s*github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.sha \|\| github\.sha\s*\}\}/);
  assert.match(source, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(source, /SUPABASE_ACCESS_TOKEN\|SUPABASE_DB_PASSWORD\|SUPABASE_PROJECT_REF/);
  assert.match(source, /supabase\/setup-cli@ab058987d8d6c725971f6cf9d0b5c98467e30bd1/);
  assert.match(source, /version:\s*2\.109\.0/);
  assert.match(source, /supabase db reset --local/);
  assert.match(source, /supabase stop --no-backup/);
  assert.doesNotMatch(source, /supabase\s+link/i);
  assert.doesNotMatch(source, /supabase\s+db\s+push/i);
  assert.doesNotMatch(source, /supabase\s+db\s+reset[^\n]*--linked/i);
  assert.doesNotMatch(source, /environment:\s*(?:production|staging)/i);
});

test('generic Supabase security gate typechecks every Edge index and retains durable DB behavior proofs', () => {
  const source = workflow('supabase-security-gate.yml');
  assert.match(source, /find\s+supabase\/functions[^\n]*-name\s+'index\.ts'/);
  assert.match(source, /deno check/);
  for (const fixture of [
    'tests/sql/lc03-legacy-drift-reconciliation.sql',
    'tests/sql/lc04-production-legacy-rpc-behavior.sql',
    'tests/sql/lc04-production-legacy-drift-fixture.sql',
    'tests/sql/lc04-production-legacy-drift-convergence.sql',
    'tests/sql/lc05-credential-canonical-behavior.sql',
    'tests/sql/lc05-credential-production-drift-fixture.sql',
    'tests/sql/lc05-credential-drift-convergence.sql',
    'tests/sql/lc06-rls-performance-behavior.sql',
    'tests/sql/tsrf-phone-otp-behavior.sql',
  ]) {
    assert.match(source, new RegExp(fixture.replaceAll('/', '\\/').replaceAll('.', '\\.')));
  }
  assert.match(source, /ai_agent_runtime_state/);
  assert.match(source, /kill_switch=true/);
});

test('Release DNA binds only current security and release controls', () => {
  const source = read('scripts/tsrf/evidence/release-dna.cjs');
  const currentPaths = DURABLE.map((name) => `.github/workflows/${name}`);
  for (const current of currentPaths) {
    assert.match(source, new RegExp(`['\"]${current.replaceAll('.', '\\.')}['\"]`), `${current} missing from Release DNA`);
  }
  for (const retired of SUPERSEDED) {
    assert.equal(source.includes(`.github/workflows/${retired}`), false, `${retired} remains in Release DNA`);
  }
  for (const scanner of [
    'scripts/quality-gate.sh',
    'scripts/security/p08-steel-shield/scan-secret-leaks.sh',
    'scripts/security/p08-steel-shield/scan-dangerous-sql.sh',
  ]) {
    assert.equal(source.includes(scanner), true, `${scanner} missing from Release DNA`);
  }
});
