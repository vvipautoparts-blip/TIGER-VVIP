'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'scripts', 'fusion', 'runtime-adapters.js');

function loadRuntimeAdapters() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'runtime-adapters.js' });
  return { source, api: context.window.VVIPFusionRuntime };
}

function assertFailure(result, code, dependency) {
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
  assert.equal(result.dependency, dependency);
  assert.equal(Object.isFrozen(result), true);
}

test('runtime adapter registry exposes one bounded factory and no legacy Supabase session authority', () => {
  const { source, api } = loadRuntimeAdapters();
  assert.equal(typeof api?.createRuntimeAdapters, 'function');
  assert.doesNotMatch(source, /vvipSupabase\.auth\.getSession/);
  assert.doesNotMatch(source, /getSession\s*\(/);
});

test('created runtime adapters and public adapter layers are frozen', () => {
  const { api } = loadRuntimeAdapters();
  const adapters = api.createRuntimeAdapters({});

  assert.equal(Object.isFrozen(adapters), true);
  for (const name of ['listings', 'search', 'media', 'capabilities', 'drafts', 'network']) {
    assert.equal(Object.isFrozen(adapters[name]), true, `${name} adapter must be frozen`);
  }
});

test('missing runtime dependencies fail closed without insecure fallback', () => {
  const { api } = loadRuntimeAdapters();
  const adapters = api.createRuntimeAdapters({});

  assertFailure(adapters.listings.readEligible({}), 'FUSION_DEPENDENCY_UNAVAILABLE', 'listings.readEligible');
  assertFailure(adapters.listings.openComposer(), 'FUSION_DEPENDENCY_UNAVAILABLE', 'listings.openComposer');
  assertFailure(adapters.search.run('mercedes', [], {}), 'FUSION_DEPENDENCY_UNAVAILABLE', 'search.run');
  assertFailure(adapters.media.openSession({}), 'FUSION_DEPENDENCY_UNAVAILABLE', 'media.openSession');
  assertFailure(adapters.capabilities.getPresentationView(), 'FUSION_DEPENDENCY_UNAVAILABLE', 'capabilities.getPresentationView');
  assertFailure(adapters.drafts.readLocal(), 'FUSION_DEPENDENCY_UNAVAILABLE', 'drafts.readLocal');
  assertFailure(adapters.network.snapshot(), 'FUSION_DEPENDENCY_UNAVAILABLE', 'network.snapshot');
});

test('dependency exceptions are converted to typed fail-closed results', () => {
  const { api } = loadRuntimeAdapters();
  const adapters = api.createRuntimeAdapters({
    search: { run() { throw new Error('boom'); } }
  });

  assertFailure(adapters.search.run('x', [], {}), 'FUSION_DEPENDENCY_FAILED', 'search.run');
});

test('successful dependency values are returned through immutable result envelopes and inputs are not mutated', () => {
  const { api } = loadRuntimeAdapters();
  const query = Object.freeze({ market: 'JO' });
  const deps = {
    listings: {
      readEligible(value) {
        assert.equal(value, query);
        return [{ id: 'listing-1' }];
      },
      openComposer() { return { opened: true }; }
    },
    search: { run(term) { return { term, ids: ['listing-1'] }; } },
    media: { openSession(options) { return { maxImages: options.maxImages }; } },
    capabilities: { getPresentationView() { return Object.freeze([]); } },
    drafts: { readLocal() { return null; } },
    network: { snapshot() { return { online: true }; } }
  };

  const adapters = api.createRuntimeAdapters(deps);
  const result = adapters.listings.readEligible(query);
  assert.equal(result.ok, true);
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(result.value, [{ id: 'listing-1' }]);
  assert.equal(query.market, 'JO');

  const search = adapters.search.run('mercedes', [], {});
  assert.equal(search.ok, true);
  assert.equal(search.value.term, 'mercedes');
});
