const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FINAL_SPEC = 'docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md';
const ROADMAP = 'docs/superpowers/plans/2026-08-13-vvip-tiger-fusion-2026-master-roadmap.md';
const CATALOG = 'config/fusion/vvip-tiger-fusion-2026-decisions.json';
const CURRENT_REFERENCE = 'docs/VVIP_TIGER_CURRENT_REFERENCE.md';
const ACTIVE_PATHS = [
  CURRENT_REFERENCE,
  'docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md',
  'docs/VVIP_TIGER_MEMORY_MAP.md',
  'IMPLEMENTATION_CHECKLIST.md'
];

const EXPECTED_IDS = new Set([
  'LEGACY_IDENTITY_SCOPE',
  'LEGACY_SECTOR_COUNT',
  'LEGACY_POST_QUOTA',
  'LEGACY_LISTING_TTL',
  'LEGACY_SUPPORT_SURFACE',
  'LEGACY_PRIVILEGE_MODEL',
  'LEGACY_ROLE_UI',
  'LEGACY_LOGIN_THEME'
]);

const FORBIDDEN = [
  /Maximum\s+4\s+posts\s+per\s+week/i,
  /4\s+منشورات\s+أسبوعي/i,
  /automatically\s+deleted\s+after\s+120\s+days/i,
  /حذف\s+تلقائي\s+بعد\s+120\s+يوم/i,
  /platform\s+starts\s+with\s+three\s+sectors/i,
  /القطاعات\s+المعتمدة\s+من\s+البداية/i,
  /Tiger\s+Care\s+Contact\s+Request\s+is\s+officially\s+adopted\s+as\s+a\s+core/i,
  /Jordan-first\s*,?\s*Arab-first/i
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

test('F00 current references point to the final FUSION specification', () => {
  for (const file of ACTIVE_PATHS) {
    assert.equal(exists(file), true, `missing current reference file: ${file}`);
    assert.ok(read(file).includes(FINAL_SPEC), `${file} must point to FINAL FUSION specification`);
  }
  assert.ok(read(CURRENT_REFERENCE).includes(ROADMAP), 'current reference must point to F00-F16 roadmap');
});

test('F00 decision catalog is canonical and supersedes the full legacy set', () => {
  assert.equal(exists(CATALOG), true, `missing catalog: ${CATALOG}`);
  const catalog = JSON.parse(read(CATALOG));
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.product, 'VVIP TIGER FUSION 2026');
  assert.equal(catalog.identity, 'GLOBAL_FIRST');
  assert.equal(catalog.currentOwnerReference, FINAL_SPEC);
  assert.equal(catalog.masterRoadmap, ROADMAP);
  assert.equal(Array.isArray(catalog.legacyDecisions), true);

  const byId = new Map(catalog.legacyDecisions.map((item) => [item.id, item]));
  assert.deepEqual(new Set(byId.keys()), EXPECTED_IDS);
  for (const id of EXPECTED_IDS) {
    const item = byId.get(id);
    assert.equal(item.state, 'SUPERSEDED');
    assert.equal(typeof item.replacement, 'string');
    assert.ok(item.replacement.length > 0);
    assert.equal(item.reason, 'FUSION_2026_SUPERSESSION');
  }
});

test('F00 active references contain no superseded operating instructions', () => {
  for (const file of ACTIVE_PATHS) {
    const text = read(file);
    for (const pattern of FORBIDDEN) {
      assert.doesNotMatch(text, pattern, `${file} contains superseded instruction: ${pattern}`);
    }
  }
});

test('F00 legacy active paths are short tombstones', () => {
  for (const file of [
    'docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md',
    'docs/VVIP_TIGER_MEMORY_MAP.md',
    'IMPLEMENTATION_CHECKLIST.md'
  ]) {
    const text = read(file);
    assert.match(text, /SUPERSEDED|HISTORICAL/i);
    assert.match(text, /VVIP_TIGER_CURRENT_REFERENCE\.md/);
    assert.ok(text.length < 5000, `${file} is too large to be a tombstone`);
  }
});
