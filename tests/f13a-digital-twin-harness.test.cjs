const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'scripts', 'digital-twin', 'f13a-harness.js');
function loadHarness() { return require(modulePath); }

test('F13A declares the exact FUSION 4M + 4M digital twin targets', () => {
  const { DIGITAL_TWIN_GATE } = loadHarness();
  assert.deepEqual(DIGITAL_TWIN_GATE, { uniqueActors: 4_000_000, simultaneousActiveUsers: 4_000_000 });
});

test('F13A actor replay is deterministic by seed and index and unique across indexes', () => {
  const { generateActor } = loadHarness();
  const a = generateActor('fusion-2026', 1_234_567);
  const replay = generateActor('fusion-2026', 1_234_567);
  const b = generateActor('fusion-2026', 1_234_568);
  assert.deepEqual(a, replay);
  assert.notEqual(a.actorId, b.actorId);
  assert.notEqual(a.behaviorSeed, b.behaviorSeed);
  assert.equal(a.synthetic, true);
  assert.deepEqual(Object.keys(a).sort(), ['actorId','behaviorSeed','deviceClass','locale','market','networkProfile','persona','sector','synthetic'].sort());
});

test('F13A builds a memory-bounded non-overlapping plan for all 4M actors', () => {
  const { buildShardPlan } = loadHarness();
  const plan = buildShardPlan({ uniqueActors: 4_000_000, simultaneousActiveUsers: 4_000_000, shardSize: 100_000, seed: 'fusion-2026' });
  assert.equal(plan.shards.length, 40);
  assert.equal(plan.uniqueActors, 4_000_000);
  assert.equal(plan.simultaneousActiveUsers, 4_000_000);
  assert.equal(plan.shards[0].startIndex, 0);
  assert.equal(plan.shards.at(-1).endIndexExclusive, 4_000_000);
  let expectedStart = 0;
  let covered = 0;
  for (const shard of plan.shards) {
    assert.equal(shard.startIndex, expectedStart);
    assert.ok(shard.endIndexExclusive > shard.startIndex);
    covered += shard.endIndexExclusive - shard.startIndex;
    expectedStart = shard.endIndexExclusive;
  }
  assert.equal(covered, 4_000_000);
});

test('F13A rejects impossible or unsafe plan dimensions', () => {
  const { buildShardPlan } = loadHarness();
  assert.throws(() => buildShardPlan({ uniqueActors: 0, simultaneousActiveUsers: 0, shardSize: 1, seed: 'x' }), /F13_INVALID_PLAN/);
  assert.throws(() => buildShardPlan({ uniqueActors: 100, simultaneousActiveUsers: 101, shardSize: 10, seed: 'x' }), /F13_INVALID_PLAN/);
  assert.throws(() => buildShardPlan({ uniqueActors: 100, simultaneousActiveUsers: 100, shardSize: 0, seed: 'x' }), /F13_INVALID_PLAN/);
  assert.throws(() => buildShardPlan({ uniqueActors: 100, simultaneousActiveUsers: 100, shardSize: 10, seed: '' }), /F13_INVALID_PLAN/);
});

test('F13A planned manifest never claims PASS or launch eligibility before execution evidence', () => {
  const { buildPlannedManifest } = loadHarness();
  const manifest = buildPlannedManifest({ uniqueActors: 4_000_000, simultaneousActiveUsers: 4_000_000, shardSize: 100_000, seed: 'fusion-2026' });
  assert.equal(manifest.result, 'PLANNED');
  assert.equal(manifest.globalLaunchEligible, false);
  assert.equal(manifest.measuredUniqueActors, null);
  assert.equal(manifest.measuredPeakSimultaneousUsers, null);
});