const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FINAL_CONSTITUTION = 'docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md';
const MASTER_ROADMAP = 'docs/superpowers/plans/2026-08-13-vvip-tiger-fusion-2026-master-roadmap.md';
const CATALOG_PATH = 'config/fusion/vvip-tiger-fusion-2026-decisions.json';
const ACTIVE_REFERENCE_FILES = [
  'docs/VVIP_TIGER_CURRENT_OWNER_REFERENCE.md',
  'docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md',
  'docs/VVIP_TIGER_MEMORY_MAP.md',
  'IMPLEMENTATION_CHECKLIST.md'
];

const LEGACY_IDS = new Set([
  'LEGACY_IDENTITY_SCOPE',
  'LEGACY_SECTOR_COUNT',
  'LEGACY_POST_QUOTA',
  'LEGACY_LISTING_TTL',
  'LEGACY_SUPPORT_SURFACE',
  'LEGACY_PRIVILEGE_MODEL',
  'LEGACY_ROLE_UI',
  'LEGACY_LOGIN_THEME'
]);

const FORBIDDEN_ACTIVE_PATTERNS = [
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

test('F00 current authority files exist and point to FINAL FUSION constitution', () => {
  for (const file of ACTIVE_REFERENCE_FILES) {
    assert.equal(exists(file), true, `missing active authority file: ${file}`);
    const text = read(file);
    assert.ok(text.includes(FINAL_CONSTITUTION), `${file} must point to FINAL FUSION constitution`);
  }

  const ownerReference = read('docs/VVIP_TIGER_CURRENT_OWNER_REFERENCE.md');
  assert.ok(ownerReference.includes(MASTER_ROADMAP), 'current owner reference must point to F00-F16 master roadmap');
});

test('F00 machine-readable decision catalog is canonical and supersedes legacy authority', () => {
  assert.equal(exists(CATALOG_PATH), true, `missing decision catalog: ${CATALOG_PATH}`);
  const catalog = JSON.parse(read(CATALOG_PATH));

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.product, 'VVIP TIGER FUSION 2026');
  assert.equal(catalog.identity, 'GLOBAL_FIRST');
  assert.equal(catalog.currentOwnerReference, FINAL_CONSTITUTION);
  assert.equal(catalog.masterRoadmap, MASTER_ROADMAP);
  assert.equal(Array.isArray(catalog.legacyDecisions), true);

  const byId = new Map(catalog.legacyDecisions.map((item) => [item.id, item]));
  assert.deepEqual(new Set(byId.keys()), LEGACY_IDS);

  for (const id of LEGACY_IDS) {
    const decision = byId.get(id);
    assert.equal(decision.state, 'SUPERSEDED', `${id} must be SUPERSEDED`);
    assert.equal(typeof decision.replacement, 'string');
    assert.ok(decision.replacement.length > 0, `${id} needs an explicit replacement`);
    assert.equal(decision.reason, 'FUSION_2026_SUPERSESSION');
  }
});

test('F00 active references contain no superseded implementation instructions', () => {
  for (const file of ACTIVE_REFERENCE_FILES) {
    const text = read(file);
    for (const pattern of FORBIDDEN_ACTIVE_PATTERNS) {
      assert.doesNotMatch(text, pattern, `${file} still contains superseded active rule: ${pattern}`);
    }
  }
});

test('F00 old authority paths are short tombstones, not alternate constitutions', () => {
  for (const file of [
    'docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md',
    'docs/VVIP_TIGER_MEMORY_MAP.md',
    'IMPLEMENTATION_CHECKLIST.md'
  ]) {
    const text = read(file);
    assert.match(text, /SUPERSEDED|HISTORICAL/i, `${file} must be explicitly tombstoned`);
    assert.match(text, /VVIP_TIGER_CURRENT_OWNER_REFERENCE\.md/, `${file} must point to current owner reference`);
    assert.ok(text.length < 5000, `${file} is too large for a tombstone and may still contain legacy operating rules`);
  }
});