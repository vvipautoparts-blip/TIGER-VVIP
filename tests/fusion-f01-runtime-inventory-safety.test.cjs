const test = require('node:test');
const assert = require('node:assert/strict');

const inventory = require('../scripts/fusion/runtime-inventory.cjs');
const registry = require('../config/fusion/runtime-inventory-registry.json');

test('F01 active inbound references override a review hint', () => {
  const report = inventory.inventoryRepository({
    files: {
      'index.html': '<script src="candidate.js"></script>',
      'candidate.js': 'window.Candidate = true;'
    },
    registry: {
      ...registry,
      entrypoints: ['index.html'],
      explicit: {
        'index.html': { classification: 'ACTIVE', reasonCodes: ['ENTRYPOINT'] },
        'candidate.js': { classification: 'REVIEW', reasonCodes: ['PRIOR_REVIEW_HINT'] }
      }
    },
    sourceSha: 'b'.repeat(40)
  });
  const item = report.entries.find((entry) => entry.path === 'candidate.js');
  assert.equal(item.classification, 'ACTIVE');
  assert.ok(item.reasonCodes.includes('ACTIVE_INBOUND_REFERENCE'));
});

test('F01 protected prefixes are recognized and excluded from runtime entries', () => {
  assert.equal(inventory.isProtectedPath('docs/example.md', registry), true);
  assert.equal(inventory.isProtectedPath('tests/example.test.cjs', registry), true);
  assert.equal(inventory.isProtectedPath('supabase/migrations/20260101_example.sql', registry), true);

  const report = inventory.inventoryRepository({
    files: {
      'index.html': '<main>VVIP</main>',
      'docs/example.md': 'history',
      'tests/example.test.cjs': 'test',
      'supabase/migrations/20260101_example.sql': 'select 1;'
    },
    registry,
    sourceSha: 'c'.repeat(40)
  });
  assert.deepEqual(report.entries.map((entry) => entry.path), ['index.html']);
});

test('F01 bridge entries require an explicit replacement target', () => {
  const report = inventory.inventoryRepository({
    files: {
      'index.html': '<a href="private-profile.html">profile</a>',
      'private-profile.html': '<a href="private-profile-p03.html">go</a>',
      'private-profile-p03.html': '<main>profile</main>'
    },
    registry: {
      ...registry,
      entrypoints: ['index.html'],
      explicit: {
        'index.html': { classification: 'ACTIVE', reasonCodes: ['ENTRYPOINT'] },
        'private-profile.html': {
          classification: 'BRIDGE',
          reasonCodes: ['PROFILE_REDIRECT'],
          replacement: 'private-profile-p03.html'
        },
        'private-profile-p03.html': { classification: 'ACTIVE', reasonCodes: ['CANONICAL'] }
      }
    },
    sourceSha: 'd'.repeat(40)
  });
  const bridge = report.entries.find((entry) => entry.path === 'private-profile.html');
  assert.equal(bridge.classification, 'BRIDGE');
  assert.equal(bridge.replacement, 'private-profile-p03.html');
});

test('F01 canonical serialization is byte-stable', () => {
  const value = {
    schemaVersion: 1,
    mutationAuthorized: false,
    entries: [{ path: 'b.js' }, { path: 'a.js' }]
  };
  assert.equal(inventory.canonicalizeInventory(value), inventory.canonicalizeInventory(value));
  assert.ok(inventory.canonicalizeInventory(value).endsWith('\n'));
});
