'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'srpc-phase-b-source-proof.yml');

function source() {
  assert.equal(fs.existsSync(workflowPath), true, 'SRPC source-proof workflow must exist');
  return fs.readFileSync(workflowPath, 'utf8');
}

test('source proof triggers only from the isolated control-plane branch', () => {
  const yml = source();
  assert.match(yml, /push:\s*[\s\S]*branches:\s*[\s\S]*feat\/srpc-v1-control-plane-20260809/);
  assert.doesNotMatch(yml, /workflow_dispatch\s*:/);
  assert.doesNotMatch(yml, /pull_request\s*:/);
});

test('source proof has read-only permissions and no secrets', () => {
  const yml = source();
  assert.match(yml, /permissions:\s*\n\s+contents:\s*read\b/);
  assert.doesNotMatch(yml, /secrets\s*\./i);
  assert.doesNotMatch(yml, /id-token:\s*write/i);
  assert.doesNotMatch(yml, /contents:\s*write/i);
});

test('source proof locks both control-plane commit and frozen H0', () => {
  const yml = source();
  assert.match(yml, /ref:\s*\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(yml, /e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0/);
  assert.match(yml, /git\s+-C\s+control\s+rev-parse\s+HEAD/);
  assert.match(yml, /GITHUB_SHA/);
  assert.match(yml, /source_lock\.py/);
});

test('source proof runs the exact Phase B static test and verifies emitted digest', () => {
  const yml = source();
  assert.match(yml, /node\s+--test\s+source\/tests\/global-launch-phase-b-marketplace-convergence\.test\.cjs/);
  assert.match(yml, /GLOBAL_LAUNCH_PHASE_B_SHA256/);
  assert.match(yml, /9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9/);
});

test('all GitHub Actions in source proof are pinned to full SHAs', () => {
  const yml = source();
  const uses = [...yml.matchAll(/^\s*-?\s*uses:\s*([^\s]+)\s*$/gm)].map((m) => m[1]);
  assert.ok(uses.length >= 4, 'expected pinned checkout/setup-node/setup-python/upload-artifact actions');
  for (const use of uses) {
    assert.match(use, /^[^@]+@[0-9a-f]{40}$/, `action is not full-SHA pinned: ${use}`);
  }
  assert.match(yml, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(yml, /actions\/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1/);
  assert.match(yml, /actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
  assert.match(yml, /actions\/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f/);
});

test('source proof supports a non-semantic proof refresh path', () => {
  const yml = source();
  assert.match(yml, /\.srpc\/proof-refresh\.txt/);
});

test('artifact carries the exact H0 migration copied only after source lock', () => {
  const yml = source();
  assert.match(yml, /cp\s+source\/supabase\/migrations\/20260808224500_global_launch_phase_b_marketplace_convergence\.sql\s+"\$RUNNER_TEMP\/migration\.sql"/);
  assert.match(yml, /\$\{\{\s*runner\.temp\s*\}\}\/migration\.sql/);
});

test('source proof contains no database execution primitive', () => {
  const yml = source();
  for (const forbidden of [
    /supabase\s+db\s+push/i,
    /psql\b/i,
    /apply_migration/i,
    /database_url/i,
    /service_role/i,
    /production.*credential/i,
  ]) assert.doesNotMatch(yml, forbidden);
});
