const test = require('node:test');
const assert = require('node:assert/strict');

const inventory = require('../scripts/fusion/runtime-inventory.cjs');
const registry = require('../config/fusion/runtime-inventory-registry.json');

test('F01 uses the exact neutral review vocabulary', () => {
  assert.deepEqual([...inventory.CLASSES], [
    'ACTIVE', 'BRIDGE', 'TEST', 'HISTORICAL', 'UNREFERENCED', 'REVIEW'
  ]);
});

test('F01 extracts only local references from an entrypoint', () => {
  assert.deepEqual(
    inventory.collectStaticReferences(
      '<link href="styles/app.css"><script src="scripts/app.js"></script><a href="https://example.com/x">x</a>',
      'index.html'
    ),
    ['scripts/app.js', 'styles/app.css']
  );
});

test('F01 report is deterministic and cannot authorize mutation', () => {
  const files = {
    'index.html': '<script src="scripts/app.js"></script>',
    'scripts/app.js': 'window.App = true;',
    'unused.js': 'window.Unused = true;'
  };
  const first = inventory.inventoryRepository({
    files,
    registry,
    sourceSha: 'a'.repeat(40)
  });
  const second = inventory.inventoryRepository({
    files: Object.fromEntries(Object.entries(files).reverse()),
    registry,
    sourceSha: 'a'.repeat(40)
  });

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.generatedFor, 'FUSION_F01_RUNTIME_INVENTORY');
  assert.equal(first.mutationAuthorized, false);
  assert.equal(first.sourceSha, 'a'.repeat(40));
  assert.equal(first.entries.find((entry) => entry.path === 'index.html').classification, 'ACTIVE');
  assert.equal(first.entries.find((entry) => entry.path === 'scripts/app.js').classification, 'ACTIVE');
  assert.equal(first.entries.find((entry) => entry.path === 'unused.js').classification, 'UNREFERENCED');
});
