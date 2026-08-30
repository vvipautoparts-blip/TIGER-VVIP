const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'project-control/cleanup/phoenix-cleanroom-policy.v1.json');
const ownerPath = path.join(root, 'project-control/owner/TIGER_PHOENIX_CLEANROOM_2026_OWNER_DECISION.json');
const runtimePath = path.join(root, 'scripts/cleanup/phoenix-policy.mjs');
const digest = (b) => crypto.createHash('sha256').update(b).digest('hex');

async function runtime() { return import(pathToFileURL(runtimePath).href + `?t=${Date.now()}${Math.random()}`); }
function tempPolicy(mutator) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phoenix-policy-'));
  const p = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  mutator(p);
  const out = path.join(dir, 'policy.json');
  fs.writeFileSync(out, JSON.stringify(p, null, 2) + '\n');
  return out;
}

test('policy binds exactly to current owner decision and AION chain', async () => {
  const m = await runtime();
  const expected = digest(fs.readFileSync(ownerPath));
  const p = m.loadCleanupPolicy(policyPath, {repoRoot: root, expectedOwnerDecisionDigest: expected});
  assert.equal(p.verified_owner_decision_sha256, expected);
  assert.equal(p.aion.may_bypass, false);
  assert.deepEqual(p.aion.deletion_chain, ['DETECT','CLASSIFY','EXPLAIN','APPROVE','QUARANTINE','REHEARSE','VERIFY','DELETE','SEAL']);
});

test('unknown candidates fail closed instead of becoming ephemeral', async () => {
  const m = await runtime();
  const p = m.loadCleanupPolicy(policyPath, {repoRoot: root});
  assert.deepEqual(m.classifyCandidate({path:'mystery.bin'}, p), {classification:'S0_SOVEREIGN', locked:true, reason:'UNKNOWN_LOCK'});
});

test('all five classes are deterministic and ambiguity locks', async () => {
  const m = await runtime();
  const p = m.loadCleanupPolicy(policyPath, {repoRoot: root});
  assert.equal(m.classifyCandidate({authority:true}, p).classification, 'S0_SOVEREIGN');
  assert.equal(m.classifyCandidate({security_sensitive:true}, p).classification, 'S1_EVIDENCE');
  assert.equal(m.classifyCandidate({rebuildable:true}, p).classification, 'S2_REBUILDABLE');
  assert.equal(m.classifyCandidate({ephemeral:true}, p).classification, 'S3_EPHEMERAL');
  assert.equal(m.classifyCandidate({stateful_local:true}, p).classification, 'S4_STATEFUL_LOCAL');
  assert.equal(m.classifyCandidate({ephemeral:true,rebuildable:true}, p).reason, 'AMBIGUOUS_CLASSIFICATION');
});

test('loader rejects unknown keys, incomplete locks, duplicate rules and digest drift', async () => {
  const m = await runtime();
  const cases = [
    p => { p.surprise = true; },
    p => { p.hard_locks = p.hard_locks.slice(1); },
    p => { p.rules.push({...p.rules[0]}); },
    p => { p.owner_decision_sha256 = '0'.repeat(64); }
  ];
  for (const mutate of cases) {
    const f = tempPolicy(mutate);
    assert.throws(()=>m.loadCleanupPolicy(f, {repoRoot: root}));
  }
});

test('current status/router preserve PHOENIX continuity without superseding AION', () => {
  const master = fs.readFileSync(path.join(root, 'docs/MASTER_PROJECT_STATE.md'), 'utf8');
  const router = fs.readFileSync(path.join(root, 'docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md'), 'utf8');
  assert.match(master, /cleanup-governance CURRENT_ONLY/);
  assert.match(master, /TIGER AION ∞/);
  assert.match(master, /not superseded/i);
  assert.match(router, /TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(router, /TIGER_AION_2026_CURRENT_OWNER_AUTHORITY\.md/);
});
