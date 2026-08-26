'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MODULE_PATH = path.join(__dirname, '..', 'scripts', 'release', 'production-sbom.cjs');
const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_TREE = 'b'.repeat(40);
const FILES = Object.freeze({
  'z-last.js': 'f'.repeat(64),
  'a-first.css': 'e'.repeat(64),
});

function loadGenerator() {
  assert.equal(fs.existsSync(MODULE_PATH), true, 'Production SBOM generator must exist');
  return require(MODULE_PATH).createProductionFileInventorySbom;
}

test('Production SBOM is deterministic actions-attest compatible CycloneDX 1.7', () => {
  const createProductionFileInventorySbom = loadGenerator();
  const input = { sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, files: FILES };

  const first = createProductionFileInventorySbom(input);
  const second = createProductionFileInventorySbom(input);

  assert.deepEqual(second, first);
  assert.equal(first.$schema, 'https://cyclonedx.org/schema/bom-1.7.schema.json');
  assert.equal(first.bomFormat, 'CycloneDX');
  assert.equal(first.specVersion, '1.7');
  assert.equal(first.serialNumber, 'urn:uuid:7a3f24c1-b95c-5abb-90b5-7135865fabdf');
  assert.match(
    first.serialNumber,
    /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.equal(first.version, 1);
  assert.equal(first.metadata.component.type, 'application');
  assert.equal(first.metadata.component.name, 'VVIP-TIGER');
  assert.equal(first.metadata.component.version, SOURCE_SHA);
  assert.deepEqual(first.components.map(({ name }) => name), ['a-first.css', 'z-last.js']);
  assert.deepEqual(first.components[0].hashes, [{ alg: 'SHA-256', content: 'e'.repeat(64) }]);
});

test('Production SBOM identity is bound to both exact source SHA and tree', () => {
  const createProductionFileInventorySbom = loadGenerator();
  const base = createProductionFileInventorySbom({
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    files: FILES,
  });
  const changedSource = createProductionFileInventorySbom({
    sourceSha: `c${SOURCE_SHA.slice(1)}`,
    sourceTree: SOURCE_TREE,
    files: FILES,
  });
  const changedTree = createProductionFileInventorySbom({
    sourceSha: SOURCE_SHA,
    sourceTree: `d${SOURCE_TREE.slice(1)}`,
    files: FILES,
  });

  assert.notEqual(changedSource.serialNumber, base.serialNumber);
  assert.notEqual(changedTree.serialNumber, base.serialNumber);
});

test('Production SBOM fails closed on malformed source identity or file digests', () => {
  const createProductionFileInventorySbom = loadGenerator();

  assert.throws(
    () => createProductionFileInventorySbom({ sourceSha: 'main', sourceTree: SOURCE_TREE, files: FILES }),
    /PRODUCTION_SBOM_SOURCE_SHA_INVALID/,
  );
  assert.throws(
    () => createProductionFileInventorySbom({ sourceSha: SOURCE_SHA, sourceTree: 'tree', files: FILES }),
    /PRODUCTION_SBOM_SOURCE_TREE_INVALID/,
  );
  assert.throws(
    () => createProductionFileInventorySbom({ sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, files: { 'x.js': 'bad' } }),
    /PRODUCTION_SBOM_FILE_DIGEST_INVALID/,
  );
});
